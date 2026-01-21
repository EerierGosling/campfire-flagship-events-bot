import type { AnyBlock } from "@slack/types";
import { Config } from "../config";
import { app } from "./bolt"; 
import { t } from "../util/transcript";

export async function whisper(args: {
    user: string,
    text: string,
    channel?: string,
    header?: string,
    image?: string
}) {
    const blocks: AnyBlock[] = [
        {
			"type": "context",
			"elements": [
				{
					"type": "mrkdwn",
					"text": `_psst..._ <@${args.user}>`
				}
			]
		},
    ];

    if (args.header) {
        blocks.push(
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": args.header
			}
		},
		{
			"type": "divider"
		});
    }

    blocks.push({
        "type": "section",
        "text": {
            "type": "mrkdwn",
            "text": args.text
        }
    });

    if (args.image) {
        blocks.push({
			"type": "image",
			"image_url": "https://cloud-1u362wm6h-hack-club-bot.vercel.app/0image.png",
			"alt_text": "image1"
        });
    }

    blocks.push({
        "type": "context",
        "elements": [
            {
                "type": "mrkdwn",
                "text": t('tip')
            }
        ]
    })

    try {
        await app.client.chat.postEphemeral({
            channel: args.channel || Config.MAIN_CHANNEL,
            user: args.user,
            text: args.text,
            blocks
        });
    } catch (e: any) {
        if (e?.data?.error === 'user_not_in_channel') {
            console.log(`whisper failed: user ${args.user} not in channel`);
        } else {
            throw e;
        }
    }
}