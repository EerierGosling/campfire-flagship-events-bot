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
import { prisma } from './util/prisma';
import { activeMembers } from './slack/huddleInfo';

async function cleanupOrphanedSessions() {
    const pendingSessions = await prisma.session.findMany({
        where: { state: 'SESSION_PENDING' }
    });

    if (pendingSessions.length === 0) return;

    const currentMembers = await activeMembers();
    const now = new Date();
    let cleaned = 0;

    for (const session of pendingSessions) {
        if (!currentMembers.includes(session.slackId)) {
            await prisma.session.update({
                where: { id: session.id },
                data: {
                    state: 'WAITING_FOR_FINAL_SCRAP',
                    leftAt: now,
                    paused: true
                }
            });
            cleaned++;
        }
    }

    if (cleaned > 0) {
        console.log(`Cleaned up ${cleaned} orphaned sessions on startup`);
    }
}

await app.start(process.env.PORT || 3000).then(async () => {
    console.log('⚡️ Bolt app is running!');

    await cleanupOrphanedSessions();

    app.client.chat.postMessage({
        channel: Config.LOGS_CHANNEL,
        text: 'Started!'
    });
});