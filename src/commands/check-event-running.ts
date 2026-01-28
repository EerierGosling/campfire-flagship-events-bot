import { app } from "../slack/bolt";
import { mirrorMessage } from "../slack/logger";
import { prisma } from "../util/prisma";
import { cmd } from "../config";

app.command(cmd("/check-event-running"), async ({ ack, payload }) => {
    await ack();

    await mirrorMessage({
        message: 'user ran `/check-event-running`',
        user: payload.user_id,
        channel: payload.channel_id,
        type: 'slash-command'
    });

    const activeEvent = await prisma.event.findFirst({
        where: { active: true }
    });

    let text: string;
    if (activeEvent) {
        text = `an event is currently running: *${activeEvent.name}*`;
    } else {
        text = `no event is currently running.`;
    }

    await app.client.chat.postEphemeral({
        channel: payload.channel_id,
        user: payload.user_id,
        text
    });
});
