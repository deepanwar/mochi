// Run with: make test   (or: node --test tests/)
import test from 'node:test';
import assert from 'node:assert/strict';

import {
    REPEAT, dueBetween, describeReminder, formatCountdown, formatWhen,
    nextDateFor, nextOccurrence, occurrencesOn, parseTime, sanitizeReminders, allReminders,
} from '../extension/lib/scheduler.js';
import {ReminderEngine} from '../extension/lib/engine.js';
import {alertCopy, nextUpCopy} from '../extension/lib/messages.js';

// 2026-10-01 is a Thursday.
const THU = (h, m = 0) => new Date(2026, 9, 1, h, m);
const SAT = (h, m = 0) => new Date(2026, 9, 3, h, m);

const baseCfg = (extra = {}) => ({
    lunchEnabled: true,
    lunchTime: '13:00',
    checkoutEnabled: true,
    checkoutTime: '18:00',
    workdays: [1, 2, 3, 4, 5],
    custom: [],
    snoozeMinutes: 10,
    ...extra,
});

test('parseTime accepts HH:MM and rejects junk', () => {
    assert.deepEqual(parseTime('13:05'), {h: 13, m: 5});
    assert.deepEqual(parseTime('9:00'), {h: 9, m: 0});
    assert.equal(parseTime('24:00'), null);
    assert.equal(parseTime('12:60'), null);
    assert.equal(parseTime('lunch'), null);
    assert.equal(parseTime(undefined), null);
});

test('workday reminders skip weekends', () => {
    const r = {time: '13:00', repeat: REPEAT.WORKDAYS};
    assert.equal(occurrencesOn(r, THU(0)).length, 1);
    assert.equal(occurrencesOn(r, SAT(0)).length, 0);
});

test('paused reminders never fire', () => {
    const r = {time: '13:00', repeat: REPEAT.DAILY, enabled: false};
    assert.equal(occurrencesOn(r, THU(0)).length, 0);
});

test('hourly reminders fire every hour until the end time', () => {
    const r = {time: '10:00', endTime: '13:00', repeat: REPEAT.HOURLY};
    const hours = occurrencesOn(r, THU(0)).map(d => d.getHours());
    assert.deepEqual(hours, [10, 11, 12, 13]);
});

test('weekly and once reminders match only their day', () => {
    assert.equal(occurrencesOn({time: '19:00', repeat: REPEAT.WEEKLY, weekday: 4}, THU(0)).length, 1);
    assert.equal(occurrencesOn({time: '19:00', repeat: REPEAT.WEEKLY, weekday: 0}, THU(0)).length, 0);
    assert.equal(occurrencesOn({time: '15:00', repeat: REPEAT.ONCE, date: '2026-10-01'}, THU(0)).length, 1);
    assert.equal(occurrencesOn({time: '15:00', repeat: REPEAT.ONCE, date: '2026-10-02'}, THU(0)).length, 0);
});

test('dueBetween finds lunch in the window and nothing outside it', () => {
    const list = allReminders(baseCfg());
    assert.equal(dueBetween(list, THU(12, 59), THU(13, 0)).length, 1);
    assert.equal(dueBetween(list, THU(13, 0), THU(13, 1)).length, 0);
});

test('nextOccurrence rolls over the weekend to Monday', () => {
    const next = nextOccurrence(allReminders(baseCfg()), new Date(2026, 9, 2, 19, 0));
    assert.equal(next.reminder.id, 'lunch');
    assert.equal(next.at.getDay(), 1);
});

test('formatting helpers', () => {
    assert.equal(formatCountdown(30 * 1000), 'now');
    assert.equal(formatCountdown(42 * 60 * 1000), 'in 42 min');
    assert.equal(formatCountdown(125 * 60 * 1000), 'in 2 h 5 min');
    assert.equal(formatCountdown(26 * 60 * 60 * 1000), '');
    assert.equal(formatWhen(THU(13), THU(12)), '1:00 PM');
    assert.equal(formatWhen(new Date(2026, 9, 2, 9), THU(20)), 'Tomorrow 9:00 AM');
    assert.equal(formatWhen(THU(13), THU(12), true), '13:00');
});

test('describeReminder reads like the design', () => {
    assert.equal(describeReminder({time: '10:30', repeat: REPEAT.WORKDAYS}), 'Workdays · 10:30 AM');
    assert.equal(describeReminder({time: '10:00', endTime: '18:00', repeat: REPEAT.HOURLY}),
        'Every hour · 10:00 AM to 6:00 PM');
    assert.equal(describeReminder({time: '19:00', repeat: REPEAT.WEEKLY, weekday: 0, enabled: false}),
        'Sundays · 7:00 PM · paused');
});

test('nextDateFor picks today or tomorrow', () => {
    assert.equal(nextDateFor('15:00', THU(9)), '2026-10-01');
    assert.equal(nextDateFor('08:00', THU(9)), '2026-10-02');
});

test('sanitizeReminders drops broken entries', () => {
    const list = sanitizeReminders(JSON.stringify([
        {title: 'Water', time: '10:00', repeat: 'hourly'},
        {title: '', time: '10:00', repeat: 'daily'},
        {title: 'Bad time', time: '99:00', repeat: 'daily'},
        {title: 'Bad repeat', time: '10:00', repeat: 'sometimes'},
        null,
    ]));
    assert.equal(list.length, 1);
    assert.equal(list[0].enabled, true);
    assert.ok(list[0].id);
    assert.deepEqual(sanitizeReminders('not json'), []);
});

test('engine fires each reminder once and not on startup', () => {
    const engine = new ReminderEngine();
    const cfg = baseCfg();
    engine.reset(THU(13, 5)); // Started after lunch: lunch must not fire.
    assert.equal(engine.tick(cfg, THU(13, 6)).length, 0);

    const fresh = new ReminderEngine();
    fresh.reset(THU(12, 59));
    const due = fresh.tick(cfg, THU(13, 0));
    assert.equal(due.length, 1);
    assert.equal(due[0].reminder.kind, 'lunch');
    assert.equal(fresh.tick(cfg, THU(13, 0)).length, 0);
});

test('engine skips reminders missed long ago (computer was asleep)', () => {
    const engine = new ReminderEngine({graceMinutes: 15});
    engine.reset(THU(12, 0));
    assert.equal(engine.tick(baseCfg(), THU(14, 0)).length, 0);

    const recent = new ReminderEngine({graceMinutes: 15});
    recent.reset(THU(12, 0));
    assert.equal(recent.tick(baseCfg(), THU(13, 10)).length, 1);
});

test('snooze brings a reminder back later', () => {
    const engine = new ReminderEngine();
    const cfg = baseCfg();
    engine.reset(THU(12, 59));
    const [lunch] = engine.tick(cfg, THU(13, 0));
    engine.snooze(lunch, 10, THU(13, 0));
    assert.equal(engine.nextUp(cfg, THU(13, 1)).at.getTime(), THU(13, 10).getTime());
    assert.equal(engine.tick(cfg, THU(13, 5)).length, 0);
    const back = engine.tick(cfg, THU(13, 10));
    assert.equal(back.length, 1);
    assert.equal(back[0].snoozed, true);
    assert.equal(back[0].originalAt.getTime(), THU(13, 0).getTime());
});

test('heads-up triggers once, five minutes before', () => {
    const engine = new ReminderEngine();
    const cfg = baseCfg();
    assert.equal(engine.headsUp(cfg, THU(12, 50), 5), null);
    assert.ok(engine.headsUp(cfg, THU(12, 56), 5));
    assert.equal(engine.headsUp(cfg, THU(12, 57), 5), null);
});

test('messages match the design copy', () => {
    const item = {reminder: {kind: 'lunch', title: 'Lunch break'}, at: THU(13), snoozed: false};
    const copy = alertCopy(item, 10);
    assert.equal(copy.title, 'Lunch time!');
    assert.equal(copy.meta, 'Reminder · 1:00 PM');
    assert.equal(copy.secondary, 'Snooze 10 min');

    const checkout = alertCopy({reminder: {kind: 'checkout'}, at: THU(18)}, 15);
    assert.equal(checkout.mood, 'proud');
    assert.equal(checkout.secondary, '15 more min');

    const pill = nextUpCopy({reminder: {title: 'Lunch break'}, at: THU(13)}, THU(12, 18));
    assert.deepEqual(pill, {title: 'Lunch break · 1:00 PM', countdown: 'in 42 min'});
    assert.equal(nextUpCopy(null, THU(12)).title, 'All clear for now');
});
