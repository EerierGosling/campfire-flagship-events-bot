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

    if (session.state === 'SESSION_PENDING') {
        const now = new Date();
        const currentElapsed = session.elapsed + (now.getTime() - session.lastUpdate.getTime());
        const ONE_HOUR_MS = 60 * 60 * 1000;
        const hasEnoughTime = currentElapsed >= ONE_HOUR_MS;
        const minutesRemaining = Math.ceil((ONE_HOUR_MS - currentElapsed) / 60000);

        await prisma.session.update({
            where: {
                id: session.id
            },
            data: {
                state: 'WAITING_FOR_FINAL_SCRAP',
                leftAt: now,
                paused: true
            }
        });

        if (hasEnoughTime) {
            whisper({
                user: args.slackId,
                text: t('huddle_left', {
                    slackId: args.slackId
                })
            });
        } else {
            whisper({
                user: args.slackId,
                text: `<@${args.slackId}> you left the huddle, but you've only been here for ${Math.floor(currentElapsed / 60000)} minutes! you need at least 60 minutes for it to count.\n\ncome back and stay for ${minutesRemaining} more minute${minutesRemaining === 1 ? '' : 's'}, then post what you worked on in <#C0A82QMCQBZ> with an image.`
            });
        }
    } else {
        whisper({
            user: args.slackId,
            text: 'You left the huddle!'
        });
    }
}