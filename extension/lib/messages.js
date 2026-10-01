// What Mochi says. Kept in one place so the wording is easy to change.
// Pure JS (no gi:// imports).

import {formatClock, formatCountdown, formatWhen} from './scheduler.js';

/**
 * Text and mood for the pop-up card.
 * @returns {{mood, tone, meta, title, body, primary, secondary}}
 */
export function alertCopy(item, snoozeMinutes, use24h = false) {
    const when = formatClock(item.originalAt ?? item.at, use24h);
    const meta = `${item.snoozed ? 'Snoozed reminder' : 'Reminder'} · ${when}`;
    const r = item.reminder;

    switch (r.kind) {
    case 'lunch':
        return {
            mood: 'excited',
            tone: 'day',
            meta,
            title: 'Lunch time!',
            body: "Step away from the screen and eat something warm. I'll keep your spot.",
            primary: 'Done, eating now',
            secondary: `Snooze ${snoozeMinutes} min`,
        };
    case 'checkout':
        return {
            mood: 'proud',
            tone: 'evening',
            meta,
            title: 'Time to check out',
            body: "Save your work, note tomorrow's first task, and log off. Nice work today.",
            primary: 'Logging off',
            secondary: `${snoozeMinutes} more min`,
        };
    default:
        return {
            mood: 'excited',
            tone: 'day',
            meta,
            title: r.title,
            body: r.note || 'You asked me to remind you about this one.',
            primary: 'Done',
            secondary: `Snooze ${snoozeMinutes} min`,
        };
    }
}

/** Text for the open pill. */
export function nextUpCopy(next, now, use24h = false) {
    if (!next)
        return {title: 'All clear for now', countdown: ''};
    return {
        title: `${next.reminder.title} · ${formatWhen(next.at, now, use24h)}`,
        countdown: formatCountdown(next.at - now),
    };
}
