import { hasDeadlinePassed } from "../endTime";
import cancel from "../sessions/cancel";
import { app } from "../slack/bolt";
import { mirrorMessage } from "../slack/logger";
import { whisper } from "../slack/whisper";
import { prisma } from "../util/prisma";
import { t } from "../util/transcript";

// pretty much treat this as the user leaving the huddle

app.command('/yap', async ({ ack, payload }) => {
    await ack();

    await mirrorMessage({
        message: 'user ran `/yap`',
        user: payload.user_id,
        channel: payload.channel_id,
        type: 'slash-command'
    })

    if (hasDeadlinePassed()) {
        await whisper({
            user: payload.user_id,
            text: `cafe has ended!`
        });

        return;
    }

    const session = await prisma.session.findFirst({
        where: {
            slackId: payload.user_id,
            state: {
                notIn: ['COMPLETED', 'CANCELLED']
            }
        }
    });

    if (!session) { 
        await whisper({
            user: payload.user_id,
            text: `doesn't seem like you're in a session rn! see ya later!`
        })

        return;
    }

    if (session.state === 'SESSION_PENDING') {
        const now = new Date();
        await prisma.session.update({
            where: {
                id: session.id
            },
            data: {
                state: 'WAITING_FOR_FINAL_SCRAP',
                leftAt: now,
                lastUpdate: now,
                elapsed: session.elapsed + (now.getTime() - session.lastUpdate.getTime()),            
            }
        });

        await whisper({
            user: session.slackId,
            text: t('yap.final_scrap', {
                slackId: session.slackId
            })
        })

        console.log(`user wants to yap, requested to ship early`)
        console.log(`waiting for final scrap`)
    }
    else {
        await whisper({
            user: session.slackId,
            text: `seems like it's not the time to yap!`
        })
    }
});