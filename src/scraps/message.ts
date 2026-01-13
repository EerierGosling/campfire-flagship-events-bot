import { app } from "../slack/bolt";
import { prisma } from "../util/prisma";

import { addScrap } from "./addScrap";

import { Config } from "../config";

app.event('message', async ({ event, client }) => {
    if (event.channel !== Config.SCRAPS_CHANNEL) { return; }

    switch (event.subtype) {
        case 'file_share': 
        case undefined:
            if (event.thread_ts) { return; } // don't accept scraps in threads

            const session = await prisma.session.findFirst({
                where: {
                    slackId: event.user,
                    state: {
                        notIn: ['COMPLETED', 'CANCELLED']
                    }
                }
            });

            if (!session) { return; }

            // if (await checkInactivity(session)) { //returns true if there is a timeout
            //     return;
            // }

            if (event.subtype === undefined && session.state !== 'WAITING_FOR_INITAL_SCRAP') { return; }

            addScrap({
                session,
                scrap: {
                    type: event.subtype === 'file_share' ? 'scrap' : 'goal',
                    text: event.text!,
                    ts: event.ts,

                    files: event.files ? event.files.map(file => file.id) : []
                }
            })
            
            break;
    }
});