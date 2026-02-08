import { app } from './bolt';
import { Config, BLOCKED_SLACK_IDS } from '../config';

// error logging
export async function error(error: Error, slackId: string, channelId: string | undefined = undefined) {
    // Block error messages to blocked Slack IDs
    if (BLOCKED_SLACK_IDS.includes(slackId)) {
        console.log(`Blocked error message for ${slackId}`);
        return;
    }

    app.logger.error(error);

    await app.client.chat.postEphemeral({
        channel: channelId ?? slackId,
        user: slackId,
        text: `An error occurred: ${error.message}` //todo: better error message
    });
}

export async function mirrorMessage({ message, user, channel, type }: {
    message: string,
    user: string,
    channel: string,
    type: string
}) {
    // Block mirror messages from blocked Slack IDs
    if (BLOCKED_SLACK_IDS.includes(user)) {
        console.log(`Blocked mirror message from ${user}`);
        return;
    }

    try {
        const context = `a ${type} from <@${user}> in <#${channel}>`
        await app.client.chat.postMessage({
            channel: Config.LOGS_CHANNEL,
            text: context,
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `> ${message}`,
                    },
                },
                {
                    type: 'context',
                    elements: [
                        {
                            type: 'mrkdwn',
                            text: context,
                        },
                    ],
                },
            ],
        })
    } catch (e) {
        console.error(e)
    }
}