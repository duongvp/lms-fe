export function yesterdayRegistrationDate(now = new Date()) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(now).map(part => [part.type, part.value]));
    const date = new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() - 1);
    return date.toISOString().slice(0, 10);
}

export function isYesterdayRegistrationRange(from?: string, to?: string, now = new Date()) {
    const yesterday = yesterdayRegistrationDate(now);
    return from === yesterday && to === yesterday;
}
