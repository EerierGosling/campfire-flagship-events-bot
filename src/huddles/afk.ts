import { Config, Intervals } from "../config";
import cancel from "../sessions/cancel";
import { app } from "../slack/bolt";
import { sendDM } from "../slack/dm";
import { whisper } from "../slack/whisper";
import { minutes, msToSeconds } from "../util/math";
import { prisma } from "../util/prisma";
import { t } from "../util/transcript";

/*

Cancel a session if the user goes AFK 10 minutes after leaving the call

*/
const pauseJob = async () => {
    console.log("checking for paused sessions");

    // get all paused sessions
    const paused = await prisma.session.findMany({
        where: {
            paused: true,
            state: 'WAITING_FOR_FINAL_SCRAP',
        }
    })

    console.log(`found ${paused.length} paused sessions`);

    let i = 0;
    for (const session of paused) {
        if (!session.leftAt) { continue; }
        const now = new Date();

        console.log(`it has been ${msToSeconds(now.getTime() - session.leftAt.getTime())}s since ${session.slackId} left the call`);
        if (session.leftAt.getTime() + (Intervals.PAUSE_TIMEOUT) < now.getTime()) {
            console.log(`session ${session.id} has gone afk after leaving the call`);

            const currentElapsed = session.elapsed + (session.leftAt.getTime() - session.lastUpdate.getTime());
            const ONE_HOUR_MS = 60 * 60 * 1000;
            const hadEnoughTime = currentElapsed >= ONE_HOUR_MS;

            const existingScraps = await prisma.scrap.count({
                where: { sessionId: session.id }
            });

            if (existingScraps > 0 && hadEnoughTime) {
                await prisma.session.update({
                    where: { id: session.id },
                    data: { state: 'COMPLETED', paused: false }
                });
                console.log(`session ${session.id} auto-completed - had scrap posted during call`);
            } else if (hadEnoughTime) {
                await whisper({
                    channel: Config.MAIN_CHANNEL,
                    user: session.slackId,
                    text: t('pause_timeout', {
                        slackId: session.slackId
                    })
                });
                await cancel(session, "did not post final ship");
            } else {
                const minutesInCall = Math.floor(currentElapsed / 60000);
                await whisper({
                    channel: Config.MAIN_CHANNEL,
                    user: session.slackId,
                    text: `<@${session.slackId}> it's been 10 minutes since you left and you haven't rejoined the call! I'm clearing your time for this session. you were only in the call for ${minutesInCall} minutes - you need to stay for at least 60 minutes for it to count towards a boost!`
                });
                await cancel(session, "less than 60 minutes");
            }

            i++;
        }
    }

    console.log(`terminated ${i} paused sessions`);
}

setInterval(pauseJob, Intervals.PAUSE_CHECK);