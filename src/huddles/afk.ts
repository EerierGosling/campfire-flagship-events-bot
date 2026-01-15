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

            // Send a message to the user
            await whisper({
                channel: Config.MAIN_CHANNEL,
                user: session.slackId,
                text: t('pause_timeout', {
                    slackId: session.slackId
                })
            });

            // End the session
            // todo: do I consider it cancelled or completed? how do i treat it - does it count or not?
            // for now, just complete it and move on
            await cancel(session, "did not post final ship");

            i++;
        }
    }

    console.log(`terminated ${i} paused sessions`);
}

setInterval(pauseJob, Intervals.PAUSE_CHECK);