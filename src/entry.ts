import dotenv from 'dotenv';
dotenv.config();

import { app } from './slack/bolt';

import './events/appMention';

import './huddles/huddles';
import './huddles/poll';
import './huddles/afk';

import './commands/check-progress';
import './commands/start-eventing'
import './commands/start-event'
import './commands/end-event'
import './commands/flagship-event-help'
import './commands/check-event-running'

import './scraps/message';

import { Config } from './config';

await app.start(process.env.PORT || 3000).then(() => {
    console.log('⚡️ Bolt app is running!');

    app.client.chat.postMessage({
        channel: Config.LOGS_CHANNEL,
        text: 'Started!'
    });
});