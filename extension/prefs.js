// Mochi's settings window. Opens from the gear in the pill, or with:
//   gnome-extensions prefs mochi-buddy@local

import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {KEYS, readConfig, writeCustom, writeWorkdays} from './lib/store.js';
import {
    REPEAT, REPEAT_OPTIONS, WEEKDAY_NAMES,
    describeReminder, formatHM, newId, nextDateFor, parseTime, toTimeString,
} from './lib/scheduler.js';

const CSS = `
.mochi-hero-title { font-size: 20px; font-weight: 800; }
.mochi-accent { background: #FFB86B; color: #1F1408; }
.mochi-accent:hover { background: #FFC88E; }
.mochi-tile { border-radius: 10px; padding: 9px; }
.mochi-tile.peach { background: alpha(#FFB86B, 0.18); color: #E5852A; }
.mochi-tile.lavender { background: alpha(#B9A6FF, 0.20); color: #8A72E6; }
.mochi-tile.mint { background: alpha(#7FD4A8, 0.20); color: #2FA36B; }
.mochi-tile.grey { background: alpha(currentColor, 0.08); }
.mochi-day { min-width: 34px; min-height: 34px; padding: 0; font-weight: 700; }
.mochi-day:checked { background: #FFB86B; color: #1F1408; }
.mochi-time-spin { font-feature-settings: "tnum"; }
.mochi-prefs switch:checked { background: #FFB86B; }
.mochi-prefs switch:checked > slider { background: #FFFFFF; }
`;

// Monday first, like the design.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default class MochiBuddyPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const iface = new Gio.Settings({schema_id: 'org.gnome.desktop.interface'});
        const use24h = iface.get_string('clock-format') === '24h';

        // Keep references alive for as long as the window exists.
        window._mochiSettings = settings;
        window.set_default_size(680, 860);
        window.title = 'Mochi Settings';
        window.add_css_class('mochi-prefs'); // Scopes our switch colour to this window only.
        installCss();

        const toast = (title, extra = {}) => {
            const t = new Adw.Toast({title, timeout: 3, ...extra});
            window.add_toast(t);
            return t;
        };

        const page = new Adw.PreferencesPage({title: 'Mochi', icon_name: 'alarm-symbolic'});
        page.add(this._heroGroup());
        page.add(routineGroup(settings, use24h));

        const reminders = remindersGroup(settings, use24h, toast);
        page.add(reminders.group);
        page.add(addReminderGroup(settings, use24h, toast));
        page.add(mannersGroup(settings, toast));
        window.add(page);

        window.connect('close-request', () => {
            reminders.disconnect();
            return false;
        });
    }

    _heroGroup() {
        const group = new Adw.PreferencesGroup();
        const box = new Gtk.Box({spacing: 18, margin_bottom: 6});

        const face = this.dir.get_child('assets').get_child('mochi-awake.svg');
        box.append(new Gtk.Image({file: face.get_path(), pixel_size: 72}));

        const words = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 4,
            valign: Gtk.Align.CENTER,
        });
        words.append(new Gtk.Label({
            label: "Hi, I'm Mochi.",
            xalign: 0,
            css_classes: ['mochi-hero-title'],
        }));
        words.append(new Gtk.Label({
            label: "I'll nudge you about lunch, checkout, and anything else you add below.",
            xalign: 0,
            wrap: true,
            css_classes: ['dim-label'],
        }));
        box.append(words);
        group.add(box);
        return group;
    }
}

// ---- Daily routine --------------------------------------------------------

function routineGroup(settings, use24h) {
    const group = new Adw.PreferencesGroup({
        title: 'Daily routine',
        description: 'Mochi stays quiet on days off.',
    });

    const routines = [
        {title: 'Lunch break', subtitle: 'Every workday', icon: 'emoji-food-symbolic',
            tone: 'peach', timeKey: KEYS.LUNCH_TIME, enabledKey: KEYS.LUNCH_ENABLED},
        {title: 'Checkout', subtitle: 'Wrap up and log off', icon: 'system-log-out-symbolic',
            tone: 'lavender', timeKey: KEYS.CHECKOUT_TIME, enabledKey: KEYS.CHECKOUT_ENABLED},
    ];

    for (const r of routines) {
        const row = new Adw.ActionRow({title: r.title, subtitle: r.subtitle});
        row.add_prefix(tile(r.icon, r.tone));

        const picker = timePicker(settings.get_string(r.timeKey), use24h,
            value => settings.set_string(r.timeKey, value));
        settings.bind(r.enabledKey, picker, 'sensitive', Gio.SettingsBindFlags.GET);
        row.add_suffix(picker);

        const toggle = new Gtk.Switch({valign: Gtk.Align.CENTER});
        settings.bind(r.enabledKey, toggle, 'active', Gio.SettingsBindFlags.DEFAULT);
        row.add_suffix(toggle);
        row.activatable_widget = toggle;

        group.add(row);
    }

    // Workdays: seven round toggles.
    const daysRow = new Adw.ActionRow({title: 'Workdays'});
    daysRow.add_prefix(tile('x-office-calendar-symbolic', 'grey'));
    const days = new Gtk.Box({spacing: 4, valign: Gtk.Align.CENTER});
    const current = new Set(readConfig(settings).workdays);
    const buttons = new Map();

    for (const day of WEEK_ORDER) {
        const button = new Gtk.ToggleButton({
            label: DAY_LETTER[day],
            active: current.has(day),
            tooltip_text: WEEKDAY_NAMES[day],
            css_classes: ['circular', 'mochi-day'],
        });
        button.update_property([Gtk.AccessibleProperty.LABEL], [WEEKDAY_NAMES[day]]);
        button.connect('toggled', () => {
            const selected = [...buttons].filter(([, b]) => b.active).map(([d]) => d);
            writeWorkdays(settings, selected);
        });
        buttons.set(day, button);
        days.append(button);
    }
    daysRow.add_suffix(days);
    group.add(daysRow);

    return group;
}

// ---- My reminders ---------------------------------------------------------

function remindersGroup(settings, use24h, toast) {
    const group = new Adw.PreferencesGroup({title: 'My reminders'});
    let rows = [];
    let quiet = false; // Skip a rebuild when the change came from a row itself.

    const save = list => {
        quiet = true;
        writeCustom(settings, list);
        quiet = false;
    };

    const render = () => {
        for (const row of rows)
            group.remove(row);
        rows = [];

        const list = readConfig(settings).custom;
        group.description = list.length === 1 ? '1 reminder' : `${list.length} reminders`;

        if (!list.length) {
            const empty = new Adw.ActionRow({
                title: 'No reminders yet',
                subtitle: 'Add one below and Mochi will take care of it.',
            });
            empty.add_prefix(tile('alarm-symbolic', 'grey'));
            group.add(empty);
            rows.push(empty);
            return;
        }

        for (const reminder of list) {
            const row = new Adw.ActionRow({
                title: GLib.markup_escape_text(reminder.title, -1),
                subtitle: describeReminder(reminder, use24h),
            });
            const icon = reminder.repeat === REPEAT.HOURLY ? 'view-refresh-symbolic' : 'alarm-symbolic';
            row.add_prefix(tile(icon, reminder.enabled ? 'mint' : 'grey'));

            const toggle = new Gtk.Switch({active: reminder.enabled, valign: Gtk.Align.CENTER});
            toggle.connect('notify::active', () => {
                const fresh = readConfig(settings).custom;
                const updated = fresh.map(r => {
                    if (r.id !== reminder.id)
                        return r;
                    const next = {...r, enabled: toggle.active};
                    // Turning a finished "Just once" back on moves it to its next slot.
                    if (next.enabled && next.repeat === REPEAT.ONCE)
                        next.date = nextDateFor(next.time, new Date());
                    return next;
                });
                save(updated);
                const now = updated.find(r => r.id === reminder.id);
                if (now)
                    row.subtitle = describeReminder(now, use24h);
            });
            row.add_suffix(toggle);

            const remove = new Gtk.Button({
                icon_name: 'user-trash-symbolic',
                valign: Gtk.Align.CENTER,
                tooltip_text: 'Delete',
                css_classes: ['flat', 'circular'],
            });
            remove.update_property([Gtk.AccessibleProperty.LABEL], [`Delete ${reminder.title}`]);
            remove.connect('clicked', () => {
                const before = readConfig(settings).custom;
                writeCustom(settings, before.filter(r => r.id !== reminder.id));
                const t = toast(`Deleted "${reminder.title}"`, {button_label: 'Undo'});
                t.connect('button-clicked', () => writeCustom(settings, before));
            });
            row.add_suffix(remove);

            group.add(row);
            rows.push(row);
        }
    };

    const id = settings.connect(`changed::${KEYS.CUSTOM}`, () => {
        if (!quiet)
            render();
    });
    render();

    return {group, disconnect: () => settings.disconnect(id)};
}

// ---- Add a reminder -------------------------------------------------------

function addReminderGroup(settings, use24h, toast) {
    const group = new Adw.PreferencesGroup({title: 'Add a reminder'});

    const titleRow = new Adw.EntryRow({title: 'What should I remind you about?'});
    titleRow.connect('changed', () => titleRow.remove_css_class('error'));
    group.add(titleRow);

    const nextHour = (new Date().getHours() + 1) % 24;
    let time = toTimeString(nextHour, 0);
    let endTime = '18:00';

    const timeRow = new Adw.ActionRow({title: 'Time'});
    timeRow.add_suffix(timePicker(time, use24h, v => (time = v)));
    group.add(timeRow);

    const repeatRow = new Adw.ComboRow({
        title: 'Repeat',
        model: Gtk.StringList.new(REPEAT_OPTIONS.map(o => o.label)),
        selected: REPEAT_OPTIONS.findIndex(o => o.id === REPEAT.WORKDAYS),
    });
    group.add(repeatRow);

    const untilRow = new Adw.ActionRow({title: 'Until', subtitle: 'Last reminder of the day'});
    untilRow.add_suffix(timePicker(endTime, use24h, v => (endTime = v)));
    group.add(untilRow);

    const dayRow = new Adw.ComboRow({
        title: 'Day',
        model: Gtk.StringList.new([...WEEKDAY_NAMES]),
        selected: new Date().getDay(),
    });
    group.add(dayRow);

    const syncVisibility = () => {
        const repeat = REPEAT_OPTIONS[repeatRow.selected]?.id;
        untilRow.visible = repeat === REPEAT.HOURLY;
        dayRow.visible = repeat === REPEAT.WEEKLY;
    };
    repeatRow.connect('notify::selected', syncVisibility);
    syncVisibility();

    const addButton = new Gtk.Button({
        label: 'Add reminder',
        halign: Gtk.Align.END,
        margin_top: 12,
        css_classes: ['pill', 'mochi-accent'],
    });

    const add = () => {
        const title = titleRow.text.trim();
        if (!title) {
            titleRow.add_css_class('error');
            toast('Give your reminder a name first');
            return;
        }
        const repeat = REPEAT_OPTIONS[repeatRow.selected]?.id ?? REPEAT.WORKDAYS;
        const reminder = {id: newId(), title, time, repeat, enabled: true};
        if (repeat === REPEAT.HOURLY)
            reminder.endTime = endTime;
        if (repeat === REPEAT.WEEKLY)
            reminder.weekday = dayRow.selected;
        if (repeat === REPEAT.ONCE)
            reminder.date = nextDateFor(time, new Date());

        writeCustom(settings, [...readConfig(settings).custom, reminder]);
        titleRow.text = '';
        toast('Added. Mochi will remind you.');
    };
    addButton.connect('clicked', add);
    titleRow.connect('entry-activated', add);
    group.add(addButton);

    return group;
}

// ---- Mochi's manners ------------------------------------------------------

function mannersGroup(settings, toast) {
    const group = new Adw.PreferencesGroup({title: "Mochi's manners"});

    const sound = new Adw.SwitchRow({
        title: 'Play a soft sound',
        subtitle: 'A little chime when a reminder pops up. Silent in Do Not Disturb.',
    });
    settings.bind(KEYS.PLAY_SOUND, sound, 'active', Gio.SettingsBindFlags.DEFAULT);
    group.add(sound);

    const snooze = new Adw.SpinRow({
        title: 'Snooze length',
        subtitle: 'Minutes',
        adjustment: new Gtk.Adjustment({lower: 1, upper: 120, step_increment: 5, page_increment: 15}),
    });
    snooze.value = settings.get_int(KEYS.SNOOZE_MINUTES);
    snooze.connect('notify::value', () => settings.set_int(KEYS.SNOOZE_MINUTES, Math.round(snooze.value)));
    group.add(snooze);

    const headsUp = new Adw.SwitchRow({
        title: 'Wiggle before reminders',
        subtitle: 'Mochi wiggles 5 minutes early as a heads-up',
    });
    settings.bind(KEYS.HEADS_UP, headsUp, 'active', Gio.SettingsBindFlags.DEFAULT);
    group.add(headsUp);

    const testRow = new Adw.ActionRow({
        title: 'Try a test reminder',
        subtitle: 'Check that Mochi can reach you',
    });
    const testButton = new Gtk.Button({label: 'Test', valign: Gtk.Align.CENTER});
    testButton.connect('clicked', () => {
        settings.set_int(KEYS.TEST_REMINDER, settings.get_int(KEYS.TEST_REMINDER) + 1);
        toast('Look at the bottom-left corner');
    });
    testRow.add_suffix(testButton);
    group.add(testRow);

    return group;
}

// ---- Small widgets --------------------------------------------------------

function tile(iconName, tone) {
    return new Gtk.Image({
        icon_name: iconName,
        pixel_size: 18,
        valign: Gtk.Align.CENTER,
        css_classes: ['mochi-tile', tone],
    });
}

/** A button showing "1:00 PM" that opens hour and minute spinners. */
function timePicker(initial, use24h, onChange) {
    const t = parseTime(initial) ?? {h: 9, m: 0};
    const label = new Gtk.Label({label: formatHM(t.h, t.m, use24h)});
    const button = new Gtk.MenuButton({
        child: label,
        valign: Gtk.Align.CENTER,
        tooltip_text: 'Change time',
    });

    const spinner = (upper, value, step) => {
        const spin = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({lower: 0, upper, step_increment: step, page_increment: step * 3}),
            orientation: Gtk.Orientation.VERTICAL,
            numeric: true,
            wrap: true,
            css_classes: ['mochi-time-spin'],
        });
        spin.value = value;
        spin.connect('output', () => {
            spin.text = String(spin.get_value_as_int()).padStart(2, '0');
            return true;
        });
        return spin;
    };

    const hour = spinner(23, t.h, 1);
    const minute = spinner(59, t.m, 5);
    hour.update_property([Gtk.AccessibleProperty.LABEL], ['Hour']);
    minute.update_property([Gtk.AccessibleProperty.LABEL], ['Minute']);

    const box = new Gtk.Box({
        spacing: 6,
        margin_top: 6, margin_bottom: 6, margin_start: 6, margin_end: 6,
    });
    box.append(hour);
    box.append(new Gtk.Label({label: ':', css_classes: ['title-2']}));
    box.append(minute);
    button.set_popover(new Gtk.Popover({child: box}));

    const update = () => {
        const h = hour.get_value_as_int();
        const m = minute.get_value_as_int();
        label.label = formatHM(h, m, use24h);
        onChange(toTimeString(h, m));
    };
    hour.connect('value-changed', update);
    minute.connect('value-changed', update);

    return button;
}

let cssInstalled = false;
function installCss() {
    if (cssInstalled)
        return;
    const provider = new Gtk.CssProvider();
    if (provider.load_from_string)
        provider.load_from_string(CSS);
    else
        provider.load_from_data(CSS, -1);
    Gtk.StyleContext.add_provider_for_display(
        Gdk.Display.get_default(), provider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
    cssInstalled = true;
}
