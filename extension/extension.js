// Mochi Buddy: a small desktop assistant that lives in the bottom-left corner.

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {ReminderEngine} from './lib/engine.js';
import {alertCopy, nextUpCopy} from './lib/messages.js';
import {KEYS, pauseReminder, readConfig} from './lib/store.js';
import {REPEAT} from './lib/scheduler.js';
import {MochiAlertCard} from './lib/ui/alertCard.js';
import {MascotIcons} from './lib/ui/mascot.js';
import {MochiPill} from './lib/ui/pill.js';

const TICK_SECONDS = 15;        // How often Mochi checks the clock.
const MARGIN = 12;              // Gap from the screen edge (px).
const CARD_GAP = 10;            // Gap between the card and Mochi (px).
const BADGE_WINDOW_MINUTES = 15; // Show the orange dot when something is this close.
const HEADS_UP_MINUTES = 5;     // Wiggle this many minutes before a reminder.

export default class MochiBuddyExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._interface = new Gio.Settings({schema_id: 'org.gnome.desktop.interface'});
        this._notifications = new Gio.Settings({schema_id: 'org.gnome.desktop.notifications'});

        this._cfg = null;
        this._queue = [];
        this._current = null;
        this._engine = new ReminderEngine();
        this._engine.reset(new Date());

        const icons = new MascotIcons(this.dir);
        this._pill = new MochiPill(icons);
        this._card = new MochiAlertCard(icons);

        const chrome = {affectsInputRegion: true, trackFullscreen: true};
        Main.layoutManager.addChrome(this._card, chrome);
        Main.layoutManager.addChrome(this._pill, chrome);

        this._pill.connect('toggled', () => this._setExpanded(!this._pill.expanded));
        this._pill.connect('settings-clicked', () => {
            this._setExpanded(false);
            this.openPreferences();
        });
        this._pill.connect('notify::height', () => this._reposition());

        this._card.connect('done', () => this._finishCurrent(false));
        this._card.connect('dismiss', () => this._finishCurrent(false));
        this._card.connect('snooze', () => this._finishCurrent(true));
        this._card.connect('notify::height', () => this._reposition());

        this._settingsId = this._settings.connect('changed', (_s, key) => this._onSettingChanged(key));
        this._clockId = this._interface.connect('changed::clock-format', () => this._refresh());
        this._monitorsId = Main.layoutManager.connect('monitors-changed', () => this._reposition());

        this._timerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, TICK_SECONDS, () => {
            this._tick();
            return GLib.SOURCE_CONTINUE;
        });

        this._reposition();
        this._refresh();
    }

    disable() {
        if (this._timerId) {
            GLib.source_remove(this._timerId);
            this._timerId = null;
        }
        if (this._monitorsId) {
            Main.layoutManager.disconnect(this._monitorsId);
            this._monitorsId = null;
        }
        this._interface?.disconnect(this._clockId);
        this._settings?.disconnect(this._settingsId);

        // Destroying a chrome actor also removes it from the layout manager.
        this._pill?.destroy();
        this._card?.destroy();

        this._pill = null;
        this._card = null;
        this._engine = null;
        this._queue = [];
        this._current = null;
        this._cfg = null;
        this._interface = null;
        this._notifications = null;
        this._settings = null;
    }

    // ---- state -------------------------------------------------------------

    get _use24h() {
        return this._interface.get_string('clock-format') === '24h';
    }

    _config() {
        this._cfg ??= readConfig(this._settings);
        return this._cfg;
    }

    _onSettingChanged(key) {
        this._cfg = null;
        if (key === KEYS.TEST_REMINDER) {
            this._enqueue({
                key: `test@${Date.now()}`,
                reminder: {
                    id: 'test',
                    kind: 'custom',
                    title: 'This is a test reminder',
                    note: 'If you can see me, Mochi is working. Hi!',
                },
                at: new Date(),
                snoozed: false,
            });
        }
        this._refresh();
    }

    _tick() {
        const now = new Date();
        const cfg = this._config();

        for (const item of this._engine.tick(cfg, now)) {
            this._enqueue(item);
            // A "Just once" reminder is switched off after it fires.
            if (item.reminder.kind === 'custom' && item.reminder.repeat === REPEAT.ONCE && !item.snoozed)
                pauseReminder(this._settings, item.reminder.id);
        }

        if (cfg.headsUp && !this._current && this._engine.headsUp(cfg, now, HEADS_UP_MINUTES))
            this._pill.wiggle();

        this._refresh(now);
    }

    // ---- reminders ---------------------------------------------------------

    _enqueue(item) {
        this._queue.push(item);
        if (!this._current)
            this._showNext();
    }

    _showNext() {
        this._current = this._queue.shift() ?? null;
        if (!this._current) {
            this._card.dismiss();
            this._refresh();
            return;
        }

        const copy = alertCopy(this._current, this._config().snoozeMinutes, this._use24h);
        this._card.present(copy);
        this._playSound();
        this._refresh();
        this._reposition();
    }

    _finishCurrent(snooze) {
        if (!this._current)
            return;
        if (snooze)
            this._engine.snooze(this._current, this._config().snoozeMinutes, new Date());
        this._current = null;
        this._showNext();
    }

    _playSound() {
        if (!this._config().playSound)
            return;
        // Respect Do Not Disturb: the card still shows, but quietly.
        if (!this._notifications.get_boolean('show-banners'))
            return;
        try {
            global.display.get_sound_player().play_from_theme(
                'message-new-instant', 'Mochi reminder', null);
        } catch (e) {
            console.warn(`[Mochi] Could not play sound: ${e.message}`);
        }
    }

    // ---- view --------------------------------------------------------------

    _setExpanded(expanded) {
        this._pill.setExpanded(expanded);
        this._refresh();
    }

    _refresh(now = new Date()) {
        if (!this._pill)
            return;
        const cfg = this._config();
        const next = this._engine.nextUp(cfg, now);

        this._pill.setNextUp(nextUpCopy(next, now, this._use24h));

        const soon = next && next.at - now <= BADGE_WINDOW_MINUTES * 60 * 1000;
        this._pill.setBadge(Boolean(soon) || Boolean(this._current));

        let mood = this._pill.expanded ? 'awake' : 'sleepy';
        if (this._current)
            mood = alertCopy(this._current, cfg.snoozeMinutes).mood;
        this._pill.setMood(mood);
    }

    _reposition() {
        const monitor = Main.layoutManager.primaryMonitor;
        if (!monitor || !this._pill)
            return;

        const [, pillHeight] = this._pill.get_preferred_height(-1);
        const pillY = monitor.y + monitor.height - pillHeight - MARGIN;
        this._pill.set_position(monitor.x + MARGIN, Math.round(pillY));

        const [, cardWidth] = this._card.get_preferred_width(-1);
        const [, cardHeight] = this._card.get_preferred_height(cardWidth);
        this._card.set_position(monitor.x + MARGIN, Math.round(pillY - cardHeight - CARD_GAP));
    }
}
