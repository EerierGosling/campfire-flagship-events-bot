export function getProgressImageUrl(approved: number, completed: number): string {
    const total = approved + completed;
    if (approved < 0 || approved > total) return "";
    return `https://flagship.hackclub.com/events-progress-images/progress-${approved>9 ? 9 : approved}-${total>9 ? 9 : total}.png`;
}
