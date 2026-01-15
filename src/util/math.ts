export function msToSeconds(ms: number): number {
    return Math.floor(ms / 1000);
}

export function msToMinutes(ms: number): number {
    return Math.floor(ms / 1000 / 60);
}

export function minutes(min: number): number {
    return min * 60 * 1000;
}

export function seconds(sec: number): number {
    return sec * 1000;
}