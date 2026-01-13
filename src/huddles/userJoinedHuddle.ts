import { mirrorMessage } from "../slack/logger";
import { t } from "../util/transcript";
import { Config } from "../config";

import { whisper } from "../slack/whisper";
import { prisma } from "../util/prisma";
import start from "../sessions/start";
import state from "../sessions/state";
import { hasDeadlinePassed } from "../endTime";

/*

User joins call -> bot asks user to post goal/scrap

*/

export default async (args: {
    slackId: string,
    callId: string
}) => {
    console.log(`User ${args.slackId} joined the huddle`);

    mirrorMessage({
        message: `${args.slackId} joined the huddle`,
        user: args.slackId,
        channel: Config.MAIN_CHANNEL,
        type: 'huddle_join'
    });

    if (hasDeadlinePassed()) {
        // await whisper({
        //     user: args.slackId,
        //     text: `cafe has ended!`
        // });

        return;
    }

    const sessionState = await state({ slackId: args.slackId });

    if (sessionState === 'PAUSED_SESSION') {
        // unpause the session
        await prisma.session.updateMany({
            where: {
                state: 'WAITING_FOR_FINAL_SCRAP',
                paused: true,
                leftAt: {
                    not: null
                },
                slackId: args.slackId,
            },
            data: {
                state: 'SESSION_PENDING',
                paused: false,
                leftAt: null,
                lastUpdate: new Date(),
            }
        });

        whisper({
            channel: Config.MAIN_CHANNEL,
            user: args.slackId,
            text: 'welcome back! i\'ve unpaused your session'
        });
    } else if (sessionState === 'NOT_IN_SESSION') {
        await start({
            slackId: args.slackId,
            callId: args.callId
        })
    
        console.log(`bot asked what they're working on`)


        whisper({
            channel: Config.MAIN_CHANNEL,
            user: args.slackId,
            text: t('huddle_join')
        });
    }
}