import { app } from "../slack/bolt";
import { Config } from "../config";

export async function isAdmin(userId: string): Promise<boolean> {
    try {
        const result = await app.client.conversations.members({
            channel: Config.TEAM_CHANNEL
        });
        return result.members?.includes(userId) ?? false;
    } catch {
        return false;
    }
}
