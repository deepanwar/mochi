// Pure reminder logic. No gi:// imports here, so this file runs in
// GNOME Shell, in the preferences window, and in Node for unit tests.

export const REPEAT = Object.freeze({
    ONCE: 'once',
    WORKDAYS: 'workdays',
    DAILY: 'daily',
    HOURLY: 'hourly',
    WEEKLY: 'weekly',
});

// Order matters: the preferences "Repeat" dropdown uses this order.
export const REPEAT_OPTIONS = Object.freeze([
    {id: REPEAT.ONCE, label: 'Just once'},
    {id: REPEAT.WORKDAYS, label: 'Every workday'},
    {id: REPEAT.DAILY, label: 'Every day'},
    {id: REPEAT.HOURLY, label: 'Every hour'},
    {id: REPEAT.WEEKLY, label: 'Once a week'},
]);

// Index = JS Date.getDay() (0 = Sunday).
export const WEEKDAY_NAMES = Object.freeze([
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
]);
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const DEFAULT_WORKDAYS = Object.freeze([1, 2, 3, 4, 5]);
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

const pad = n => String(n).padStart(2, '0');

/** "13:05" -> {h: 13, m: 5}. Returns null for anything invalid. */
export function parseTime(value) {
    const match = /^(\d{1,2}):(\d{2})$/.exec(String(value ?? '').trim());
    if (!match)
        return null;
    const h = Number(match[1]);
    const m = Number(match[2]);
    if (h > 23 || m > 59)
        return null;
    return {h, m};
}

export function toTimeString(h, m) {
    return `${pad(h)}:${pad(m)}`;
}

/** Local calendar date as "YYYY-MM-DD". */
export function dateKey(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function atTime(day, h, m) {
    return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m, 0, 0);
}

function minutesOf(t) {
    return t.h * 60 + t.m;
}

/**
 * Every moment a reminder should fire on a given calendar day.
 * Workday-only rules (workdays, hourly) respect the `workdays` list.
 */
export function occurrencesOn(reminder, day, workdays = DEFAULT_WORKDAYS) {
    if (!reminder || reminder.enabled === false)
        return [];
    const t = parseTime(reminder.time);
    if (!t)
        return [];

    const weekday = day.getDay();
    switch (reminder.repeat) {
    case REPEAT.ONCE:
        return reminder.date === dateKey(day) ? [atTime(day, t.h, t.m)] : [];
    case REPEAT.DAILY:
        return [atTime(day, t.h, t.m)];
    case REPEAT.WORKDAYS:
        return workdays.includes(weekday) ? [atTime(day, t.h, t.m)] : [];
    case REPEAT.WEEKLY:
        return Number(reminder.weekday) === weekday ? [atTime(day, t.h, t.m)] : [];
    case REPEAT.HOURLY: {
        if (!workdays.includes(weekday))
            return [];
        const end = parseTime(reminder.endTime);
        const last = end && minutesOf(end) >= minutesOf(t) ? minutesOf(end) : minutesOf(t);
        const out = [];
        for (let mins = minutesOf(t); mins <= last; mins += 60)
            out.push(atTime(day, Math.floor(mins / 60), mins % 60));
        return out;
    }
    default:
        return [];
    }
}

/** Lunch and checkout are built-in reminders driven by their own settings. */
export function builtinReminders(cfg) {
    return [
        {
            id: 'lunch',
            kind: 'lunch',
            title: 'Lunch break',
            time: cfg.lunchTime,
            repeat: REPEAT.WORKDAYS,
            enabled: cfg.lunchEnabled,
        },
        {
            id: 'checkout',
            kind: 'checkout',
            title: 'Checkout',
            time: cfg.checkoutTime,
            repeat: REPEAT.WORKDAYS,
            enabled: cfg.checkoutEnabled,
        },
    ];
}

export function allReminders(cfg) {
    const custom = (cfg.custom ?? []).map(r => ({...r, kind: 'custom'}));
    return [...builtinReminders(cfg), ...custom];
}

/** Every occurrence with from < at <= to, sorted by time. */
export function dueBetween(reminders, from, to, workdays = DEFAULT_WORKDAYS) {
    const out = [];
    if (to <= from)
        return out;
    for (let day = startOfDay(from); day <= to; day = addDays(day, 1)) {
        for (const reminder of reminders) {
            for (const at of occurrencesOn(reminder, day, workdays)) {
                if (at > from && at <= to)
                    out.push({reminder, at});
            }
        }
    }
    return out.sort((a, b) => a.at - b.at);
}

/** The soonest upcoming occurrence after `now`, looking ahead a week. */
export function nextOccurrence(reminders, now, workdays = DEFAULT_WORKDAYS, lookaheadDays = 8) {
    let best = null;
    for (let i = 0; i <= lookaheadDays; i++) {
        const day = addDays(startOfDay(now), i);
        for (const reminder of reminders) {
            for (const at of occurrencesOn(reminder, day, workdays)) {
                if (at > now && (!best || at < best.at))
                    best = {reminder, at};
            }
        }
        if (best)
            return best; // Days are checked in order, so the first hit is the soonest.
    }
    return null;
}

export function formatHM(h, m, use24h = false) {
    if (use24h)
        return `${pad(h)}:${pad(m)}`;
    return `${h % 12 || 12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`;
}

export function formatClock(date, use24h = false) {
    return formatHM(date.getHours(), date.getMinutes(), use24h);
}

/** "1:00 PM", "Tomorrow 1:00 PM" or "Mon 1:00 PM". */
export function formatWhen(at, now, use24h = false) {
    const days = Math.round((startOfDay(at) - startOfDay(now)) / DAY);
    const clock = formatClock(at, use24h);
    if (days <= 0)
        return clock;
    if (days === 1)
        return `Tomorrow ${clock}`;
    return `${WEEKDAY_SHORT[at.getDay()]} ${clock}`;
}

/** "now", "in 42 min", "in 2 h 5 min". Empty string when more than a day away. */
export function formatCountdown(ms) {
    if (ms < MINUTE)
        return 'now';
    const mins = Math.ceil(ms / MINUTE);
    if (mins < 60)
        return `in ${mins} min`;
    if (mins >= 24 * 60)
        return '';
    const h = Math.floor(mins / 60);
    const rest = mins % 60;
    return rest ? `in ${h} h ${rest} min` : `in ${h} h`;
}

/** Short subtitle used in the settings list, e.g. "Workdays · 10:30 AM". */
export function describeReminder(reminder, use24h = false) {
    const t = parseTime(reminder.time);
    const clock = t ? formatHM(t.h, t.m, use24h) : '--:--';
    let text;
    switch (reminder.repeat) {
    case REPEAT.ONCE: {
        const [y, mo, d] = String(reminder.date ?? '').split('-').map(Number);
        text = y ? `Once · ${MONTH_SHORT[mo - 1]} ${d}, ${clock}` : `Once · ${clock}`;
        break;
    }
    case REPEAT.DAILY:
        text = `Every day · ${clock}`;
        break;
    case REPEAT.WEEKLY:
        text = `${WEEKDAY_NAMES[Number(reminder.weekday)] ?? 'Weekly'}s · ${clock}`;
        break;
    case REPEAT.HOURLY: {
        const end = parseTime(reminder.endTime);
        text = end
            ? `Every hour · ${clock} to ${formatHM(end.h, end.m, use24h)}`
            : `Every hour from ${clock}`;
        break;
    }
    case REPEAT.WORKDAYS:
    default:
        text = `Workdays · ${clock}`;
    }
    return reminder.enabled === false ? `${text} · paused` : text;
}

/** The date a "Just once" reminder should use: today if the time is still ahead, else tomorrow. */
export function nextDateFor(time, now) {
    const t = parseTime(time);
    if (!t)
        return dateKey(now);
    const today = atTime(now, t.h, t.m);
    return dateKey(today > now ? now : addDays(now, 1));
}

export function newId() {
    return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Parse the JSON stored in settings and drop anything malformed. */
export function sanitizeReminders(raw) {
    let list;
    try {
        list = typeof raw === 'string' ? JSON.parse(raw || '[]') : raw;
    } catch {
        return [];
    }
    if (!Array.isArray(list))
        return [];
    const repeats = new Set(Object.values(REPEAT));
    return list
        .filter(r => r && typeof r === 'object' && typeof r.title === 'string' && r.title.trim())
        .filter(r => parseTime(r.time) && repeats.has(r.repeat))
        .map(r => ({
            ...r,
            id: typeof r.id === 'string' && r.id ? r.id : newId(),
            title: r.title.trim().slice(0, 80),
            enabled: r.enabled !== false,
        }));
}
