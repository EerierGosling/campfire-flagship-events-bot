// Adds a scrap to a session

import type { $Enums, Session } from "@prisma/client";
import { prisma } from "../util/prisma";
import { app } from "../slack/bolt";
import { t } from "../util/transcript";

import end from "../sessions/end";
import { Config } from "../config";
import { msToCups } from "../util/math";
import { scraps } from "../util/airtable";
import type { Attachment } from "airtable";

/*

When we add a scrap to a session, we update the time elapsed on the session and update the lastUpdate field. We also create a new scrap record in the database.

*/
type Scrap = {
    type: 'goal' | 'scrap',
    ts: string,

    text: string,
    files: string[] // list of file IDs
}

export async function addScrap(args: {
    session: Session,
    scrap: Scrap
}) {
    const now = new Date();

    let scrapState: $Enums.ScrapState = 'IN_PROGRESS';
    switch (args.session.state) {
        case 'WAITING_FOR_INITAL_SCRAP':
            scrapState = 'INITIAL';
            break;
        case 'WAITING_FOR_FINAL_SCRAP':
            scrapState = 'FINAL';
            break;
    }

    let nextSessionState: $Enums.State = 'SESSION_PENDING';
    switch (args.session.state) {
        case 'WAITING_FOR_INITAL_SCRAP':
            nextSessionState = 'SESSION_PENDING';
            break;
        case 'SESSION_PENDING':
            break;
        case 'WAITING_FOR_FINAL_SCRAP':
            nextSessionState = 'COMPLETED';
            break;
    }

    const updatedSession = await prisma.session.update({
        where: {
            id: args.session.id
        },
        data: {
            state: nextSessionState,

            lastUpdate: now,
            elapsed: args.session.leftAt ? 
            args.session.elapsed + (args.session.leftAt.getTime() - args.session.lastUpdate.getTime()) :
            args.session.elapsed + (now.getTime() - args.session.lastUpdate.getTime()),
            
            scraps: {
                create: {
                    state: scrapState,
                    type: args.scrap.type,
                    createdAt: now,
                    ts: args.scrap.ts,
                    text: args.scrap.text,
                    files: args.scrap.files,                    
                    
                    user: {
                        connect: {
                            slackId: args.session.slackId
                        }
                    }
                }
            }
        },
        include: {
            user: {
                select: {
                    airtableRecId: true
                }
            }
        }
    });

    switch (args.session.state) {
        case 'WAITING_FOR_INITAL_SCRAP':  
            await app.client.chat.postMessage({
                channel: Config.SCRAPS_CHANNEL,
                text: t('logged_goal'),
                thread_ts: args.scrap.ts
            });

            break;
        case 'SESSION_PENDING':
            await app.client.chat.postMessage({
                channel: Config.SCRAPS_CHANNEL,
                text: t('logged_scrap', {
                    cups: msToCups(updatedSession.elapsed)
                }),
                thread_ts: args.scrap.ts
            });

            break;
        case 'WAITING_FOR_FINAL_SCRAP':
            if (!updatedSession.leftAt) {
                throw new Error('Session is in WAITING_FOR_FINAL_SCRAP state but leftAt is null');
            }

            end(updatedSession);

            const lifetimeElapsed = await prisma.session.aggregate({
                where: {
                    slackId: updatedSession.slackId,
                    state: 'COMPLETED',                
                },
                _sum: {
                    elapsed: true,
                }
            });

            const totalCups = lifetimeElapsed._sum.elapsed ? lifetimeElapsed._sum.elapsed : 0;

            console.log(`session completed. total cups lifetime: ${msToCups(totalCups)} cups`);
 
            await app.client.chat.postMessage({
                channel: Config.SCRAPS_CHANNEL,
                text: t('finish', {
                    cups: msToCups(updatedSession.elapsed),
                    totalCups: msToCups(totalCups)
                }),
                thread_ts: args.scrap.ts
            });
    }

    // prepare files to be attached to airtable
    const publicFileLinks: Attachment[] = [];
    try {
        for (const fileId of args.scrap.files) {
            const result = await app.client.files.sharedPublicURL({
                file: fileId,
                token: process.env.SLACK_USER_TOKEN
            });

            if (result.file && result.file.permalink_public && result.file.name) {
                const pubSecret = result.file.permalink_public.split('-').pop();
                const escapedFileName = result.file.name.replace(/ /g, '_').replace(/ /g, '___').toLowerCase();

                const directLink = `https://files.slack.com/files-pri/T0266FRGM-${fileId}/${escapedFileName}?pub_secret=${pubSecret}`

                publicFileLinks.push({
                    url: directLink
                } as Attachment);
            }
        }
    } catch (e) {
        console.error('Error getting public file links', e);
        // let's just leave the publicFileLinks empty
    }

    // generate a url for the thread
    const messageUrl = await app.client.chat.getPermalink({
        channel: Config.SCRAPS_CHANNEL,
        message_ts: args.scrap.ts,
        token: process.env.SLACK_USER_TOKEN // put this on my tab :wink: 
    });

    console.log(publicFileLinks);

    scraps.create({
        "Timestamp": args.scrap.ts,
        "URL": messageUrl.permalink,

        "Session": [updatedSession.airtableRecId],
        "User": [updatedSession.user.airtableRecId],

        "Type": args.scrap.type,
        "State": scrapState,

        "Text": args.scrap.text,
        "Created At": now.toISOString(),

        "Attachments": publicFileLinks
    });
} 