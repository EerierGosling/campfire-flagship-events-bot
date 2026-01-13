import { app } from "../slack/bolt";
import { Config } from "../config";
import { t } from "../util/transcript";
import { hasDeadlinePassed } from "../endTime";
import { whisper } from "../slack/whisper";

app.event('member_joined_channel', async ({ event, client }) => {
});