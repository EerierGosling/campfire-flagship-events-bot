import cancel from "../sessions/cancel";
import { app } from "../slack/bolt";
import { mirrorMessage } from "../slack/logger";
import { whisper } from "../slack/whisper";
import { prisma } from "../util/prisma";
import { cmd, Config } from "../config";

app.command(cmd('/event-opt-out'), async ({ ack, payload }) => {
    await ack();

    await mirrorMessage({
        message: 'user ran `/event-opt-out`',
        user: payload.user_id,
        channel: payload.channel_id,
        type: 'slash-command'
    });

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
            text: `you don't have an active session right now.`
        });
        return;
    }

    const now = new Date();
    const currentElapsed = session.elapsed + (now.getTime() - session.lastUpdate.getTime());
    const ONE_HOUR_MS = 60 * 60 * 1000;
    const hasEnoughTime = currentElapsed >= ONE_HOUR_MS;

    const scrapCount = await prisma.scrap.count({
        where: { sessionId: session.id }
    });

    if (scrapCount > 0 && hasEnoughTime) {
        await prisma.session.update({
            where: { id: session.id },
            data: { state: 'COMPLETED' }
        });
        await whisper({
            user: payload.user_id,
            text: `your session has been completed! thanks for participating.`
        });
    } else if (hasEnoughTime) {
        await prisma.session.update({
            where: { id: session.id },
            data: {
                state: 'WAITING_FOR_FINAL_SCRAP',
                leftAt: now,
                paused: true
            }
        });
        await whisper({
            user: payload.user_id,
            text: `you've opted out of the event. post what you worked on in <#${Config.SCRAPS_CHANNEL}> with an attached image to complete your session.`
        });
    } else {
        await cancel(session, "opted out early");
        await whisper({
            user: payload.user_id,
            text: `you've opted out of the event. have fun talking!`
        });
    }
});
