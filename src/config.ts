import { minutes } from "./util/math"

const isDev = process.env.DEVELOPMENT === 'true';
export const cmd = (name: string) => isDev ? `${name}-dev` : name;

export const Config = {
    MAIN_CHANNEL: process.env.MAIN_CHANNEL!,
    SCRAPS_CHANNEL: process.env.SCRAPS_CHANNEL!,
    LOGS_CHANNEL: process.env.LOGS_CHANNEL!,
    TEAM_CHANNEL: process.env.TEAM_CHANNEL!
}

export const Intervals = {
    PAUSE_CHECK: minutes(1),
    PAUSE_TIMEOUT: minutes(10),

    KICK_CHECK: minutes(5),
    KICK_AFTER: minutes(60),

    REMINDER_CHECK: minutes(5),
    REMIND_AFTER: minutes(45),

    HUDDLE_CHECK: minutes(1),
}