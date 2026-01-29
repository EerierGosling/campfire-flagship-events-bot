import type { AnyBlock } from "@slack/types";
import { app } from "../slack/bolt";
import { mirrorMessage } from "../slack/logger";
import { prisma } from "../util/prisma";
import { msToMinutes } from "../util/math";
import { users } from "../util/airtable";
import { getProgressImageUrl } from "../util/progressImageUrls";
import { cmd } from "../config";

app.command(cmd("/check-progress"), async ({ ack, payload }) => {
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
    
    const approvedCount = (airtableUser.fields['# Approved Sessions'] as number) || 0;
    const pendingCount = (airtableUser.fields['# Pending Sessions'] as number) || 0;

    const progressImageUrl = getProgressImageUrl(approvedCount, pendingCount);

    let blocks: AnyBlock[] = [];
    
    if (progressImageUrl) {
        blocks.push({
            type: 'image',
            image_url: progressImageUrl,
            alt_text: 'Your progress'
        });
    }
    
    const totalValidCalls = approvedCount + pendingCount;
    const boostThresholds = [1, 2, 4, 6, 9];
    const nextBoostThreshold = boostThresholds.find(t => t > approvedCount);
    const callsUntilNextBoost = nextBoostThreshold ? nextBoostThreshold - approvedCount : 0;
    
    let progressText = `you have *${approvedCount}* approved calls and *${pendingCount}* pending calls.`;
    
    if (nextBoostThreshold) {
        progressText += `\n\nyou need *${callsUntilNextBoost}* more call${callsUntilNextBoost === 1 ? '' : 's'} to unlock your next boost!`;
    } else {
        progressText += `\n\nyou've unlocked all available boosts!`;
    }
    
    progressText += `\n\n:red-star: = approved  :grey-star: = pending approval`;

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
        text: progressText,
        blocks
    });
});