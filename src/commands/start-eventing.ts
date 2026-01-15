import { hasDeadlinePassed } from "../endTime";
import start from "../sessions/start";
import { app } from "../slack/bolt";
import { activeHuddle, activeMembers } from "../slack/huddleInfo";
import { mirrorMessage } from "../slack/logger";
import { whisper } from "../slack/whisper";
import { prisma } from "../util/prisma";
import { t } from "../util/transcript";

// pretty much treat this as the user joining the huddle

app.command('/start-eventing', async ({ ack, payload }) => {
    await ack();

    await mirrorMessage({
        message: 'user ran `/start-eventing`',
        user: payload.user_id,
        channel: payload.channel_id,
        type: 'slash-command'
    })

    if (hasDeadlinePassed()) {
        await whisper({
            user: payload.user_id,
            text: `campfire flagship is over!`
        });

        return;
    }

    const activeEvent = await prisma.event.findFirst({
        where: { active: true }
    });

    if (!activeEvent) {
        await whisper({
            user: payload.user_id,
            text: `there's no active event right now! ask an admin to start one if you think there should be.`
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

    if (session) {
        await whisper({
            user: payload.user_id,
            text: 'you already have a pending session!'
        });
        return;
    }

    // check if the user is in a huddle
    const huddle = await activeHuddle();

    if (!huddle) {
        await whisper({
            user: payload.user_id,
            text: `seems like there's no huddle right now.`
        });
        return;
    }
    
    if (!huddle.active_members.includes(payload.user_id)) {
        await whisper({
            user: payload.user_id,
            text: `seems like you're not in the huddle - you should join!`
        });
        return;
    }

    await whisper({
        user: payload.user_id,
        text: t('start_eventing.initial_scrap')
    });

    await start({
        slackId: payload.user_id,
        callId: huddle.call_id,
        event: activeEvent.name
    });
});