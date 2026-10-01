// The bottom-left widget. Closed: just Mochi. Open: Mochi + "Next up" + settings.

import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import Pango from 'gi://Pango';
import St from 'gi://St';

import {motionAllowed, vbox} from './compat.js';

const ICON_SIZE = 30;

export const MochiPill = GObject.registerClass({
    GTypeName: 'MochiBuddyPill',
    Signals: {
        'toggled': {},
        'settings-clicked': {},
    },
}, class MochiPill extends St.BoxLayout {
    _init(icons) {
        super._init({
            style_class: 'mochi-pill',
            reactive: true,
            y_align: Clutter.ActorAlign.END,
        });
        this._icons = icons;
        this._mood = 'sleepy';
        this._expanded = false;
        this._breathing = false;

        // Mochi + the little orange "something is coming" dot.
        this._icon = new St.Icon({
            gicon: icons.get('sleepy'),
            icon_size: ICON_SIZE,
            style_class: 'mochi-mascot-icon',
        });
        this._icon.set_pivot_point(0.5, 0.5);

        this._badge = new St.Widget({
            style_class: 'mochi-badge',
            x_align: Clutter.ActorAlign.END,
            y_align: Clutter.ActorAlign.START,
            visible: false,
        });

        const stack = new St.Widget({layout_manager: new Clutter.BinLayout()});
        stack.add_child(this._icon);
        stack.add_child(this._badge);

        this._mascotButton = new St.Button({
            style_class: 'mochi-mascot-button',
            child: stack,
            can_focus: true,
            track_hover: true,
            accessible_name: 'Open Mochi',
        });
        this._mascotButton.connect('clicked', () => this.emit('toggled'));
        this.add_child(this._mascotButton);

        // Everything below only shows when the pill is open.
        this._extras = new St.BoxLayout({
            style_class: 'mochi-pill-extras',
            y_align: Clutter.ActorAlign.CENTER,
            visible: false,
        });

        const info = vbox({style_class: 'mochi-next', y_align: Clutter.ActorAlign.CENTER});
        info.add_child(new St.Label({text: 'NEXT UP', style_class: 'mochi-eyebrow'}));
        this._title = new St.Label({style_class: 'mochi-next-title'});
        this._title.clutter_text.ellipsize = Pango.EllipsizeMode.END;
        info.add_child(this._title);
        this._extras.add_child(info);

        this._chip = new St.Label({
            style_class: 'mochi-chip',
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._extras.add_child(this._chip);

        this._extras.add_child(new St.Widget({
            style_class: 'mochi-divider',
            y_align: Clutter.ActorAlign.CENTER,
        }));

        const settingsButton = new St.Button({
            style_class: 'mochi-icon-button',
            child: new St.Icon({icon_name: 'emblem-system-symbolic', icon_size: 16}),
            can_focus: true,
            track_hover: true,
            accessible_name: 'Mochi settings',
            y_align: Clutter.ActorAlign.CENTER,
        });
        settingsButton.connect('clicked', () => this.emit('settings-clicked'));
        this._extras.add_child(settingsButton);

        this.add_child(this._extras);

        this.add_style_class_name('collapsed');
        this._updateBreathing();
    }

    get expanded() {
        return this._expanded;
    }

    setExpanded(expanded, animate = true) {
        if (expanded === this._expanded)
            return;
        this._expanded = expanded;

        this._extras.visible = expanded;
        if (expanded) {
            this.remove_style_class_name('collapsed');
            this.add_style_class_name('expanded');
        } else {
            this.remove_style_class_name('expanded');
            this.add_style_class_name('collapsed');
        }
        this._mascotButton.accessible_name = expanded ? 'Close Mochi' : 'Open Mochi';

        if (animate && motionAllowed() && expanded) {
            this.remove_all_transitions();
            this._extras.remove_all_transitions();
            this.set_pivot_point(0, 0.5);
            this.scale_x = 0.86;
            this.scale_y = 0.86;
            this._extras.opacity = 0;
            this.ease({
                scale_x: 1,
                scale_y: 1,
                duration: 280,
                mode: Clutter.AnimationMode.EASE_OUT_BACK,
            });
            this._extras.ease({
                opacity: 255,
                delay: 60,
                duration: 200,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            });
        } else {
            this.scale_x = 1;
            this.scale_y = 1;
            this._extras.opacity = 255;
        }
        this._updateBreathing();
    }

    setMood(mood) {
        if (mood === this._mood)
            return;
        this._mood = mood;
        this._icon.gicon = this._icons.get(mood);
        this._updateBreathing();
    }

    /** @param {{title: string, countdown: string}} copy */
    setNextUp(copy) {
        this._title.text = copy.title;
        this._chip.text = copy.countdown;
        this._chip.visible = Boolean(copy.countdown);
    }

    setBadge(visible) {
        this._badge.visible = visible;
    }

    /** A short wiggle as a heads-up that something is coming. */
    wiggle() {
        if (!motionAllowed())
            return;
        this._stopBreathing();
        this._icon.rotation_angle_z = 0;
        this._icon.ease({
            rotation_angle_z: 10,
            duration: 90,
            repeatCount: 5,
            autoReverse: true,
            mode: Clutter.AnimationMode.EASE_IN_OUT_SINE,
            onStopped: () => {
                this._icon.rotation_angle_z = 0;
                this._updateBreathing();
            },
        });
    }

    // Slow "breathing" while Mochi naps in the corner.
    _updateBreathing() {
        const shouldBreathe = !this._expanded && this._mood === 'sleepy' && motionAllowed();
        if (shouldBreathe === this._breathing)
            return;
        if (shouldBreathe) {
            this._breathing = true;
            this._icon.ease({
                scale_x: 1.07,
                scale_y: 1.07,
                duration: 1600,
                repeatCount: -1,
                autoReverse: true,
                mode: Clutter.AnimationMode.EASE_IN_OUT_SINE,
            });
        } else {
            this._stopBreathing();
        }
    }

    _stopBreathing() {
        this._breathing = false;
        this._icon.remove_all_transitions();
        this._icon.scale_x = 1;
        this._icon.scale_y = 1;
    }
});
