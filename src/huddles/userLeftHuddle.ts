import { mirrorMessage } from "../slack/logger";
import { t } from "../util/transcript";
import { Config } from "../config";
import state from "../sessions/state";
import { whisper } from "../slack/whisper";
import { prisma } from "../util/prisma";
import current from "../sessions/current";
import cancel from "../sessions/cancel";

/*

User leaves call -> bot reminds user to ship

*/

export default async (args: {
    slackId: string,
}) => {
    console.log(`User ${args.slackId} left the huddle`); 

    mirrorMessage({
        message: `${args.slackId} left the huddle`,
        user: args.slackId,
        channel: Config.MAIN_CHANNEL,
        type: 'huddle_left'
    });    

    const session = await current({ slackId: args.slackId })

    if (!session) { return; }

    if (session.state === 'WAITING_FOR_INITIAL_SCRAP') {
        // delete if there's no scrap
        await cancel(session, "left without posting goal");
        
        whisper({
            user: args.slackId,
            text: 'you left the huddle!'
        });
    } else if (session.state === 'SESSION_PENDING') {
        const now = new Date();

        await prisma.session.update({
            where: {
                id: session.id
            },
            data: {
                state: 'WAITING_FOR_FINAL_SCRAP',
                leftAt: now,
                // lastUpdate: now,
                // elapsed: session.elapsed + (now.getTime() - session.lastUpdate.getTime()), - do not update the time if the user goes afk
                paused: true
            }
        });

        whisper({
            user: args.slackId,
            text: t('huddle_left', {
                slackId: args.slackId
            })
        });
    } else {
        whisper({
            user: args.slackId,
            text: 'you left the huddle!'
        });
    }
}