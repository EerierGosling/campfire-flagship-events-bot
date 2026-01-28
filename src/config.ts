import { minutes } from "./util/math"

const isDev = process.env.DEVELOPMENT === 'true';
export const cmd = (name: string) => isDev ? `${name}-dev` : name;

export const Config = {
    MAIN_CHANNEL: process.env.MAIN_CHANNEL!,
    SCRAPS_CHANNEL: process.env.SCRAPS_CHANNEL!,
    LOGS_CHANNEL: process.env.LOGS_CHANNEL!
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



export const Admins = [
    'U056J6JURFF', // sofia
    'U05D1G4H754', // evan
    'U07FCRNHS1J', // augie
    'U080YU735H8', // violet
    'U089924LMK8', // astra
    'U095T5UB8DS', // noob
    'U08TYFNC9GC', // shyla
    'U06MYDS2LHX', // luke
    'U078ZJHUKFW', // max h
    'U0943NG73PA', // julia do
    'U07GLQY6UN4', // daamin 
    'U09G78T3MM2', // joy su
    'U097MAY9ZL4', // jeremy
    'U04JG4J6BQD', // andra yang
]