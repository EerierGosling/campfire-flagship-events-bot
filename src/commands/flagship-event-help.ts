import type { AnyBlock } from "@slack/types";
import { app } from "../slack/bolt";
import { mirrorMessage } from "../slack/logger";
import { prisma } from "../util/prisma";
import { users, sessions } from "../util/airtable";
import { getProgressImageUrl } from "../util/progressImageUrls";

app.command("/flagship-event-help", async ({ ack, payload }) => {
    await ack();

    await mirrorMessage({
        message: 'user ran `/flagship-event-help`',
        user: payload.user_id,
        channel: payload.channel_id,
        type: 'slash-command'
    });

    let blocks: AnyBlock[] = [];

    const user = await prisma.user.findUnique({
        where: { slackId: payload.user_id }
    });

    if (user) {
        const airtableUser = await users.find(user.airtableRecId);
        const sessionIds = (airtableUser.fields['Sessions'] || []) as string[];
        
        let approvedCount = 0;
        let pendingCount = 0;
        if (sessionIds.length > 0) {
            const userSessions = await Promise.all(
                sessionIds.map(id => sessions.find(id))
            );
            approvedCount = userSessions.filter(s => s.fields['Approval Status'] === 'Approved').length;
            pendingCount = userSessions.filter(s => s.fields['Approval Status'] === 'Pending').length;
        }

        const progressImageUrl = getProgressImageUrl(approvedCount, pendingCount);

        if (progressImageUrl) {
            blocks.push({
                type: 'image',
                image_url: progressImageUrl,
                alt_text: 'your progress'
            });
        }

        const boostThresholds = [1, 2, 4, 6, 9];
        const nextBoostThreshold = boostThresholds.find(t => t > approvedCount);
        const callsUntilNextBoost = nextBoostThreshold ? nextBoostThreshold - approvedCount : 0;

        let progressText = `you have *${approvedCount}* approved calls and *${pendingCount}* pending calls.`;
        if (nextBoostThreshold) {
            progressText += ` you need *${callsUntilNextBoost}* more call${callsUntilNextBoost === 1 ? '' : 's'} to unlock your next boost!`;
        } else {
            progressText += ` you've unlocked all available boosts!`;
        }
        progressText += `\n\n:red-star: = approved  :grey-star: = pending approval`;

        blocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: progressText
            }
        });

        blocks.push({ type: 'divider' });
    }

    blocks.push({
        type: 'section',
        text: {
            type: 'mrkdwn',
            text: `*how to earn boosts through community events:*

1. join the huddle while an event is running (your session starts automatically!)
2. stay in the huddle for at least an hour
3. when you leave, post what you worked on in <#C0A82QMCQBZ> with an attached image
4. once your attendance is verified, it counts towards your next boost!

*boost milestones:*
• 1 call → 1 hour boost
• 2 calls → 1 hour boost
• 4 calls → 1 hour boost
• 6 calls → 1 hour boost
• 9 calls → 1 hour boost

*commands:*
• \`/start-eventing\` - manually start a session (if you joined before an event started)
• \`/check-progress\` - see your progress and how many calls until your next boost
• \`/check-event-running\` - check if an event is currently running
• \`/flagship-event-help\` - show this message`
        }
    });

    await app.client.chat.postEphemeral({
        channel: payload.channel_id,
        user: payload.user_id,
        blocks
    });
});
