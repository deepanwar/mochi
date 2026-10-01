// Decides which reminders fire on each tick. Pure JS (no gi:// imports),
// so it is unit-tested in Node. The extension calls tick() on a timer.

import {allReminders, dueBetween, nextOccurrence} from './scheduler.js';

const MINUTE = 60 * 1000;

export class ReminderEngine {
    /**
     * @param {object} [options]
     * @param {number} [options.graceMinutes] If the computer was asleep, reminders
     *   missed within this many minutes still fire on wake. Older ones are skipped.
     */
    constructor({graceMinutes = 15} = {}) {
        this._graceMs = graceMinutes * MINUTE;
        this._lastCheck = null;
        this._fired = new Map();   // key -> time it fired (ms)
        this._headsUp = new Set(); // keys we already wiggled for
        this._snoozed = [];        // items waiting to come back
    }

    /** Start counting from `now`, so nothing in the past fires on startup. */
    reset(now) {
        this._lastCheck = now;
    }

    /**
     * Returns the items that became due since the last tick.
     * Each item: {key, reminder, at, originalAt, snoozed}
     */
    tick(cfg, now) {
        if (!this._lastCheck)
            this._lastCheck = now;

        const from = new Date(Math.max(this._lastCheck.getTime(), now.getTime() - this._graceMs));
        const out = [];

        for (const {reminder, at} of dueBetween(allReminders(cfg), from, now, cfg.workdays)) {
            const key = `${reminder.id}@${at.getTime()}`;
            if (this._fired.has(key))
                continue;
            this._fired.set(key, now.getTime());
            out.push({key, reminder, at, originalAt: at, snoozed: false});
        }

        const stillWaiting = [];
        for (const item of this._snoozed) {
            if (item.at <= now)
                out.push(item);
            else
                stillWaiting.push(item);
        }
        this._snoozed = stillWaiting;

        this._lastCheck = now;
        this._prune(now);
        return out;
    }

    /** Bring an item back after `minutes`. */
    snooze(item, minutes, now) {
        const at = new Date(now.getTime() + minutes * MINUTE);
        this._snoozed.push({
            ...item,
            key: `${item.key}+${at.getTime()}`,
            at,
            originalAt: item.originalAt ?? item.at,
            snoozed: true,
        });
    }

    /** The next thing Mochi will remind about (a scheduled one or a snoozed one). */
    nextUp(cfg, now) {
        let best = nextOccurrence(allReminders(cfg), now, cfg.workdays);
        for (const item of this._snoozed) {
            if (!best || item.at < best.at)
                best = {reminder: item.reminder, at: item.at};
        }
        return best;
    }

    /**
     * Returns the upcoming item once, when it is within `minutes`.
     * Used for the little "heads-up" wiggle.
     */
    headsUp(cfg, now, minutes = 5) {
        const next = this.nextUp(cfg, now);
        if (!next || next.at - now > minutes * MINUTE)
            return null;
        const key = `${next.reminder.id}@${next.at.getTime()}`;
        if (this._headsUp.has(key))
            return null;
        this._headsUp.add(key);
        return next;
    }

    _prune(now) {
        const cutoff = now.getTime() - 2 * 24 * 60 * MINUTE;
        for (const [key, firedAt] of this._fired) {
            if (firedAt < cutoff)
                this._fired.delete(key);
        }
        if (this._headsUp.size > 200)
            this._headsUp.clear();
    }
}
