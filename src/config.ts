import { minutes } from "./util/math"

export const Config = {
    MAIN_CHANNEL: 'C08C6BZCE11',
    SCRAPS_CHANNEL: 'C0A82QMCQBZ',
    LOGS_CHANNEL: 'C0A8CU5PY9K'
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

export const Commands = process.env.DEV ? {
    CUPS: '/test-cups',
    BOARD: '/test-board',
    HELP: '/test-help',
}: {
    CUPS: '/cups',
    BOARD: '/board',
    HELP: '/cafe-help',
}

export const Admins = [
    'U056J6JURFF', // sofia
    'U05D1G4H754', // evan
    'U07FCRNHS1J', // augie
    'U080YU735H8', // violet
]