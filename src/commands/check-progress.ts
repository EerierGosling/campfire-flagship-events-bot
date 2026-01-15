import type { AnyBlock } from "@slack/types";
import { app } from "../slack/bolt";
import { mirrorMessage } from "../slack/logger";
import { prisma } from "../util/prisma";
import { msToMinutes } from "../util/math";
import { users, sessions } from "../util/airtable";
import { getProgressImageUrl } from "../util/progressImageUrls";

app.command("/check-progress", async ({ ack, payload }) => {
    await ack();

    await mirrorMessage({
        message: 'user ran `/check-progress`',
        user: payload.user_id,
        channel: payload.channel_id,
        type: 'slash-command'
    })

    const user = await prisma.user.findUnique({
        where: {
            slackId: payload.user_id
        }
    });

    if (!user) {
        await app.client.chat.postEphemeral({
            channel: payload.channel_id,
            user: payload.user_id,
            text: `you haven't joined a huddle yet!`
        });
        return;
    }

    const lifetimeElapsedRaw = await prisma.session.aggregate({
        where: {
            slackId: payload.user_id,
            state: 'COMPLETED',
        },
        _sum: {
            elapsed: true,
        }
    });

    const airtableUser = await users.find(user.airtableRecId);
    console.log(airtableUser);

    const completedSessionCount = await prisma.session.count({
        where: {
            slackId: payload.user_id,
            state: 'COMPLETED'
        }
    });

    const sessionIds = (airtableUser.fields['Sessions'] || []) as string[];
    
    let approvedCount = 0;
    if (sessionIds.length > 0) {
        const userSessions = await Promise.all(
            sessionIds.map(id => sessions.find(id))
        );
        approvedCount = userSessions.filter(s => s.fields['Approved']).length;
        
        console.log('User sessions from Airtable:', userSessions.map(s => ({
            id: s.id,
            Approved: s.fields['Approved']
        })));
    }
    
    console.log(`User ${payload.user_id}: ${sessionIds.length} sessions, ${approvedCount} approved, ${completedSessionCount} completed`);

    const progressImageUrl = getProgressImageUrl(approvedCount, completedSessionCount);

    let blocks: AnyBlock[] = [];
    
    if (progressImageUrl) {
        blocks.push({
            type: 'image',
            image_url: progressImageUrl,
            alt_text: 'Your progress'
        });
    }
    
    const boostThresholds = [1, 2, 4, 6, 9];
    const nextBoostThreshold = boostThresholds.find(t => t > completedSessionCount);
    const callsUntilNextBoost = nextBoostThreshold ? nextBoostThreshold - completedSessionCount : 0;
    
    let progressText = `you have *${approvedCount}* approved calls and *${completedSessionCount}* completed calls.`;
    
    if (nextBoostThreshold) {
        progressText += `\n\nyou need *${callsUntilNextBoost}* more call${callsUntilNextBoost === 1 ? '' : 's'} to unlock your next boost!`;
    } else {
        progressText += `\n\nyou've unlocked all available boosts!`;
    }
    
    progressText += `\n\n:red-star: = approved  :grey-star: = completed (pending approval)`;

    blocks.push({
        type: 'section',
        text: {
            type: 'mrkdwn',
            text: progressText
        }
    });

    const inProgressSession = await prisma.session.findFirst({
        where: {
            slackId: payload.user_id,
            state: {
                notIn: ['COMPLETED', 'CANCELLED']
            }
        }
    });

    if (inProgressSession) {
        const now = new Date();
        const sinceJoin = now.getTime() - inProgressSession.joinedAt.getTime();
        const minutesSinceJoin = msToMinutes(sinceJoin);

        blocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `you're currently in a session! you've been in the huddle for ${minutesSinceJoin.toFixed(0)} minutes.`
            }
        });
    }
    
    await app.client.chat.postEphemeral({
        channel: payload.channel_id,
        user: payload.user_id,
        blocks
    });
});