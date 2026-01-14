import { Commands } from "../config";
import { app } from "../slack/bolt";
import { mirrorMessage } from "../slack/logger";
import { whisper } from "../slack/whisper";
import { prisma } from "../util/prisma";
import { t } from "../util/transcript";

app.command(Commands.HELP, async ({ ack, payload }) => {
    try {
        await ack();

        await mirrorMessage({
            message: 'user ran `/help`',
            user: payload.user_id,
            channel: payload.channel_id,
            type: 'slash-command'
        })

        const session = await prisma.session.findFirst({
            where: {
                slackId: payload.user_id,
                state: {
                    notIn: ['COMPLETED', 'CANCELLED']
                }
            }
        });

        if (!session || session.state === 'CANCELLED' || session.state === 'COMPLETED') {
            await whisper({
                user: payload.user_id,
                header: t('help.no_session.header'),
                text: t('help.no_session.text'),
                image: t('flow_img')
            })
        } else if (session.state === 'SESSION_PENDING') {
            await whisper({
                user: payload.user_id,
                header: t('help.session_pending.header'),
                text: t('help.session_pending.text'),
                image: t('flow_img')
            })
        } else if (session.state === 'WAITING_FOR_FINAL_SCRAP') {
            await whisper({
                user: payload.user_id,
                header: t('help.final_scrap.header'),
                text: t('help.final_scrap.text'),
                image: t('flow_img')
            })
        } else {
            await whisper({
                user: payload.user_id,
                header: t('help.unknown_state.header'),
                text: t('help.unknown_state.text'),
                image: t('flow_img')
            })
        }
    } catch (e) {
        console.error(e);
    }
});