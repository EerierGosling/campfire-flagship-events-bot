import { hasDeadlinePassed } from "../endTime";
import start from "../sessions/start";
import { app } from "../slack/bolt";
import { activeHuddle, activeMembers } from "../slack/huddleInfo";
import { mirrorMessage } from "../slack/logger";
import { whisper } from "../slack/whisper";
import { prisma } from "../util/prisma";
import { t } from "../util/transcript";

// pretty much treat this as the user joining the huddle

app.command('/hack', async ({ ack, payload }) => {
    await ack();

    await mirrorMessage({
        message: 'user ran `/hack`',
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

    const activeEvent = await prisma.event.findFirst({
        where: { active: true }
    });

    if (!activeEvent) {
        await whisper({
            user: payload.user_id,
            text: `there's no active event right now! ask an admin to start one.`
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

    if (!session || session.state === 'CANCELLED' || session.state === 'COMPLETED') { 
        // check if the user is in a huddle
        const huddle = await activeHuddle();

        if (!huddle) {
            await whisper({
                user: payload.user_id,
                text: `seems like no one is in a huddle rn. you should start one!`
            });

            return;
        } else if (!huddle.active_members.includes(payload.user_id)) {
            await whisper({
                user: payload.user_id,
                text: `seems like you're not in the huddle! you should join!`
            });

            return;
        } else {
            await whisper({
                user: payload.user_id,
                header: "yooooo! ready to hack? here's what you gotta do...",
                text: t('hack.initial_scrap')
            })

            await start({
                slackId: payload.user_id,
                callId: huddle.call_id,
                event: activeEvent.name
            });

            return;
        }
    }
    else {
        await whisper({
            user: session.slackId,
            text: `seems like it's not the time to hack! (or you're already hacking, in which case, keep hacking!!!!)`
        })
    }
});