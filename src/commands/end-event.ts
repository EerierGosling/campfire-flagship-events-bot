import { Admins } from "../config";
import { mirrorMessage } from "../slack/logger";
import { whisper } from "../slack/whisper";
import { app } from "../slack/bolt";
import { prisma } from "../util/prisma";
import { cmd } from "../config";

app.command(cmd('/end-event'), async ({ ack, payload }) => {
    await ack();

    if (!Admins.includes(payload.user_id)) {
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

    await mirrorMessage({
        message: `ended event: "${event.name}"`,
        user: payload.user_id,
        channel: payload.channel_id,
        type: 'event'
    });
});
