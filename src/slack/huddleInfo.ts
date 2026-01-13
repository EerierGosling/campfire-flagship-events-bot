import { Config } from "../config";
import { mirrorMessage } from "./logger";

// huddles.info
const headers = new Headers();
const headerData = JSON.parse(process.env.HEADERS!) as { [key: string]: string };

for (const key in headerData) {
    headers.append(key, headerData[key]);
}

const body = JSON.stringify({
    "token": process.env.SLACK_CLIENT_TOKEN,
    "channel_ids": ["C08C6BZCE11"],
});

export type Huddle = {
    channel_id: string,
    call_id: string,
    active_members: string[],
    dropped_members: string[],
    background_id: string,
    thread_root_ts: string,
    created_by: string,
    start_date: number,
    recording: {
        can_record_summary: string,
    },
    expiration: number,
    locale: string,
}

export default function huddleInfo(): Promise<{ huddles: Huddle[] } | undefined> {
    return fetch("https://edgeapi.slack.com/cache/E09V59WQY1E/huddles/info?_x_app_name=client&fp=f5&_x_num_retries=0", {
        method: "POST",
        headers,
        body,
        redirect: "follow"
      })
      .then((response) => {
        const x = response.json()
        x.then((data) => { console.log(data) })
        return x;
    })
      .catch((error) => {
        mirrorMessage({
            channel: Config.LOGS_CHANNEL,
            message: `Error fetching huddle info: ${error}`,
            type: "error",
            user: "self"
        });
        console.error(error)
      });
}

export function grabAllMembers(huddle: Huddle[]): string[] {
    let active = [];
    for (const h of huddle) {
        active.push(...h.active_members);
    }
    return active;
}

export function grabActiveHuddle(huddle: Huddle[]): Huddle | undefined {
    for (const h of huddle) {
        if (h.active_members.length > 0) {
            return h;
        }
    }
    return undefined;
}

export async function activeHuddle(): Promise<Huddle | undefined> {
    const huddles = await huddleInfo();
    if (huddles) {
        return grabActiveHuddle(huddles.huddles);
    }
    return undefined;
}

export async function activeMembers(): Promise<string[]> { 
    const huddle = await activeHuddle();
    if (huddle) {
        return huddle.active_members;
    }
    return [];
}

export function allMembers(huddle: Huddle | undefined): string[] {
    if (huddle) {
        return huddle.active_members;
    }
    return [];
}