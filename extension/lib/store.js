// Reads and writes Mochi's GSettings. Used by both extension.js and prefs.js.

import GLib from 'gi://GLib';

import {DEFAULT_WORKDAYS, sanitizeReminders} from './scheduler.js';

export const KEYS = Object.freeze({
    LUNCH_ENABLED: 'lunch-enabled',
    LUNCH_TIME: 'lunch-time',
    CHECKOUT_ENABLED: 'checkout-enabled',
    CHECKOUT_TIME: 'checkout-time',
    WORKDAYS: 'workdays',
    CUSTOM: 'custom-reminders',
    PLAY_SOUND: 'play-sound',
    SNOOZE_MINUTES: 'snooze-minutes',
    HEADS_UP: 'heads-up',
    TEST_REMINDER: 'test-reminder',
});

/** A plain snapshot of all settings the scheduler needs. */
export function readConfig(settings) {
    let workdays = settings.get_value(KEYS.WORKDAYS).deepUnpack();
    if (!Array.isArray(workdays))
        workdays = [...DEFAULT_WORKDAYS];

    return {
        lunchEnabled: settings.get_boolean(KEYS.LUNCH_ENABLED),
        lunchTime: settings.get_string(KEYS.LUNCH_TIME),
        checkoutEnabled: settings.get_boolean(KEYS.CHECKOUT_ENABLED),
        checkoutTime: settings.get_string(KEYS.CHECKOUT_TIME),
        workdays,
        custom: sanitizeReminders(settings.get_string(KEYS.CUSTOM)),
        playSound: settings.get_boolean(KEYS.PLAY_SOUND),
        snoozeMinutes: Math.max(1, settings.get_int(KEYS.SNOOZE_MINUTES)),
        headsUp: settings.get_boolean(KEYS.HEADS_UP),
    };
}

export function writeCustom(settings, list) {
    settings.set_string(KEYS.CUSTOM, JSON.stringify(list));
}

export function writeWorkdays(settings, days) {
    const unique = [...new Set(days)].filter(d => d >= 0 && d <= 6).sort();
    settings.set_value(KEYS.WORKDAYS, new GLib.Variant('ai', unique));
}

/** Turn off a "Just once" reminder after it fired, so it shows as done. */
export function pauseReminder(settings, id) {
    const list = sanitizeReminders(settings.get_string(KEYS.CUSTOM));
    const next = list.map(r => (r.id === id ? {...r, enabled: false} : r));
    writeCustom(settings, next);
}
