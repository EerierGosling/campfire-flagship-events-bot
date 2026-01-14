import type { AnyBlock } from "@slack/types";
import { app } from "../slack/bolt";
import { mirrorMessage } from "../slack/logger";
import { prisma } from "../util/prisma";
import { msToCups, msToFormattedHours, msToMinutes, seconds } from "../util/math";
import { genProgressBar } from "../util/transcript";
import { Commands, Intervals } from "../config";
import { users } from "../util/airtable";

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
            text: `You haven't joined a huddle yet!`
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
    const addedCups = seconds((airtableUser.fields['Add time'] || 0) as number);

    const lifetimeElapsed = (lifetimeElapsedRaw._sum.elapsed ? lifetimeElapsedRaw._sum.elapsed : 0) + addedCups;

    let blocks: AnyBlock[] = [{
        type: 'context',
        elements: [{
            type: 'mrkdwn',
            text: '_psst..._'
        }]
    },
    {
        type: 'section',
        text: {
            type: 'mrkdwn',
            text: `You have ${msToCups(lifetimeElapsed)} _total_ cups!\n(that's ${msToFormattedHours(lifetimeElapsed)} hours)`
        }
    }];

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
        const minutesSinceHour = minutesSinceJoin % 60;
        const minutesToNextHour = 60 - (minutesSinceJoin % 60);
        const expectedCups = msToCups(sinceJoin);

        const minutesCounted = msToMinutes(inProgressSession.elapsed);
        const countedCups = msToCups(inProgressSession.elapsed);

        const msUntilNextScrap = (inProgressSession.lastUpdate.getTime() + Intervals.REMIND_AFTER) - now.getTime();
        const minutesUntilNextScrap = msToMinutes(msUntilNextScrap);

        blocks.push({
            type: 'divider'
        }, {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `${genProgressBar(10, minutesSinceHour/60)} ${minutesToNextHour}min before I pour your next cup!`
            }
        }, {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `you've been in the huddle for ${minutesSinceJoin.toFixed(0)}m! that's ${expectedCups} cups of coffee!

i've only counted ${minutesCounted.toFixed(0)}m so far. 
that means you'll earn ${countedCups} :cup: (cups) of coffee once you ship!
_(i count time everytime you post a scrap. once you post a scrap, this number will update!)_ 
                
you have ${minutesUntilNextScrap}m to send your next scrap before I boot you out!`

//oh and btw you can end early and stay on call by using \`/yap\``
            }
        });
    }
    
    await app.client.chat.postEphemeral({
        channel: payload.channel_id,
        user: payload.user_id,
        blocks
    });
});