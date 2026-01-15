import { Admins } from "../config";
import { mirrorMessage } from "../slack/logger";
import { whisper } from "../slack/whisper";
import { app } from "../slack/bolt";
import { prisma } from "../util/prisma";

app.command('/start-event', async ({ ack, payload }) => {
    await ack();

    if (!Admins.includes(payload.user_id)) {
        await whisper({
            user: payload.user_id,
            text: "You don't have permission to do that!"
        });
        return;
    }

    const eventName = payload.text.trim();

    if (!eventName) {
        await whisper({
            user: payload.user_id,
            text: "Please provide an event name: `/start-event <name>`"
        });
        return;
    }

    const existingEvent = await prisma.event.findFirst({
        where: { active: true }
    });

    if (existingEvent) {
        await whisper({
            user: payload.user_id,
            text: `there's already an active event: "${existingEvent.name}". end it first with \`/end-event\``
        });
        return;
    }

    const event = await prisma.event.create({
        data: { name: eventName }
    });

    await mirrorMessage({
        message: `started event: "${event.name}"`,
        user: payload.user_id,
        channel: payload.channel_id,
        type: 'event'
    });
});
