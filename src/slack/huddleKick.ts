// to kick someone from a huddle, remove then add them to the channel

import { sleep } from 'bun';
import { Config } from '../config';
import { app } from './bolt';

export default async function huddleKick(slackId: string) {
    try {
        await app.client.conversations.kick({
            token: process.env.SLACK_USER_TOKEN,
            channel: Config.MAIN_CHANNEL,
            user: slackId
        });

        await sleep(5000);
    
        await app.client.conversations.invite({
            token: process.env.SLACK_USER_TOKEN,
            channel: Config.MAIN_CHANNEL,
            users: slackId
        });
    } catch (e) {
        console.error(e);
    }
}
