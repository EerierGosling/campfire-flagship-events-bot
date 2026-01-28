import { isAdmin } from "../util/isAdmin";
import { mirrorMessage } from "../slack/logger";
import { whisper } from "../slack/whisper";
import { app } from "../slack/bolt";
import { prisma } from "../util/prisma";
import { cmd } from "../config";

app.command(cmd('/end-event'), async ({ ack, payload }) => {
    await ack();

    if (!await isAdmin(payload.user_id)) {
        await whisper({
            user: payload.user_id,
            text: "you don't have permission to do that!"
        });
        return;
    }

    const event = await prisma.event.findFirst({
        where: { active: true }
    });

    if (!event) {
        await whisper({
            user: payload.user_id,
            text: "there's no active event to end!"
        });
        return;
    }

    await prisma.event.update({
        where: { id: event.id },
        data: { active: false }
    });

    // Transition all active sessions to WAITING_FOR_FINAL_SCRAP
    const activeSessions = await prisma.session.findMany({
        where: { state: 'SESSION_PENDING' }
    });

    const now = new Date();
    const ONE_HOUR_MS = 60 * 60 * 1000;
    
    for (const session of activeSessions) {
        const scrapCount = await prisma.scrap.count({
            where: { sessionId: session.id }
        });
        const elapsed = session.elapsed + (now.getTime() - session.lastUpdate.getTime());
        
        if (scrapCount > 0 && elapsed >= ONE_HOUR_MS) {
            await prisma.session.update({
                where: { id: session.id },
                data: { state: 'COMPLETED' }
            });
            await whisper({
                user: session.slackId,
                text: `the event "${event.name}" has ended! your session has been completed automatically since you already posted your work.`
            });
        } else {
            await prisma.session.update({
                where: { id: session.id },
                data: {
                    state: 'WAITING_FOR_FINAL_SCRAP',
                    leftAt: now,
                    paused: true
                }
            });
            await whisper({
                user: session.slackId,
                text: `the event "${event.name}" has ended! post what you worked on in <#${process.env.SCRAPS_CHANNEL}> with an attached image to complete your session.`
            });
        }
    }

    await mirrorMessage({
        message: `ended event: "${event.name}" (${activeSessions.length} sessions transitioned)`,
        user: payload.user_id,
        channel: payload.channel_id,
        type: 'event'
    });
});
