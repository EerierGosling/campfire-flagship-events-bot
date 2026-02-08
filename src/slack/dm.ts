import { app } from "./bolt";
import { BLOCKED_SLACK_IDS } from "../config";

export async function sendDM(args: {
    user: string,
    text: string
}) {
    // Block DMs to blocked Slack IDs
    if (BLOCKED_SLACK_IDS.includes(args.user)) {
        console.log(`Blocked DM to ${args.user}`);
        return;
    }

    await app.client.chat.postMessage({
        channel: args.user,
        text: args.text,
        blocks: [
            {
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": "_psst..._"
                    }
                ]
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": args.text
                }
            }            
        ]
    });
}