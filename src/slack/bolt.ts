import { App, ExpressReceiver } from '@slack/bolt';
import { Config } from '../config';
import { registerRoutes } from '../routes/event';

const expressReciever = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
  endpoints: '/slack/events',
})

expressReciever.app.get('/health', async (req, res) => {
  await app.client.chat.postMessage({
    channel: Config.LOGS_CHANNEL,
    text: 'recieved health check!'
  });
 
  res.status(200).send('OK');
});

registerRoutes(expressReciever.app);

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,

  receiver: expressReciever,
});

export { app };