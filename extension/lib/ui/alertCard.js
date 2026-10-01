// The card that pops up above Mochi when a reminder fires.

import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import Pango from 'gi://Pango';
import St from 'gi://St';

import {motionAllowed, vbox, verticalParams} from './compat.js';

export const MochiAlertCard = GObject.registerClass({
    GTypeName: 'MochiBuddyAlertCard',
    Signals: {
        'done': {},
        'snooze': {},
        'dismiss': {},
    },
}, class MochiAlertCard extends St.BoxLayout {
    _init(icons) {
        super._init({
            style_class: 'mochi-card',
            reactive: true,
            visible: false,
            ...verticalParams(),
        });
        this._icons = icons;

        // Top row: face tile, words, close button.
        const top = new St.BoxLayout({style_class: 'mochi-card-top'});

        this._tile = new St.Bin({style_class: 'mochi-card-tile', y_align: Clutter.ActorAlign.START});
        this._face = new St.Icon({icon_size: 52});
        this._tile.set_child(this._face);
        top.add_child(this._tile);

        const words = vbox({style_class: 'mochi-card-words', x_expand: true});
        this._meta = new St.Label({style_class: 'mochi-card-meta'});
        this._title = new St.Label({style_class: 'mochi-card-title'});
        this._body = new St.Label({style_class: 'mochi-card-body'});
        for (const label of [this._title, this._body]) {
            label.clutter_text.line_wrap = true;
            label.clutter_text.line_wrap_mode = Pango.WrapMode.WORD_CHAR;
            label.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
        }
        words.add_child(this._meta);
        words.add_child(this._title);
        words.add_child(this._body);
        top.add_child(words);

        const close = new St.Button({
            style_class: 'mochi-icon-button mochi-card-close',
            child: new St.Icon({icon_name: 'window-close-symbolic', icon_size: 14}),
            can_focus: true,
            track_hover: true,
            accessible_name: 'Dismiss reminder',
            y_align: Clutter.ActorAlign.START,
        });
        close.connect('clicked', () => this.emit('dismiss'));
        top.add_child(close);
        this.add_child(top);

        // Bottom row: the two choices.
        const actions = new St.BoxLayout({style_class: 'mochi-card-actions'});
        this._primary = new St.Button({
            style_class: 'mochi-btn mochi-btn-primary',
            x_expand: true,
            can_focus: true,
        });
        this._secondary = new St.Button({
            style_class: 'mochi-btn mochi-btn-secondary',
            x_expand: true,
            can_focus: true,
        });
        this._primary.connect('clicked', () => this.emit('done'));
        this._secondary.connect('clicked', () => this.emit('snooze'));
        actions.add_child(this._primary);
        actions.add_child(this._secondary);
        this.add_child(actions);
    }

    /** @param {{mood, tone, meta, title, body, primary, secondary}} copy */
    present(copy) {
        this._face.gicon = this._icons.get(copy.mood);
        this._meta.text = copy.meta;
        this._title.text = copy.title;
        this._body.text = copy.body;
        this._primary.label = copy.primary;
        this._secondary.label = copy.secondary;

        this._tile.remove_style_class_name('evening');
        if (copy.tone === 'evening')
            this._tile.add_style_class_name('evening');

        this.remove_all_transitions();
        this.show();
        if (motionAllowed()) {
            this.set_pivot_point(0, 1);
            this.opacity = 0;
            this.scale_x = 0.9;
            this.scale_y = 0.9;
            this.ease({
                opacity: 255,
                scale_x: 1,
                scale_y: 1,
                duration: 300,
                mode: Clutter.AnimationMode.EASE_OUT_BACK,
            });
        } else {
            this.opacity = 255;
        }
        // We do not grab keyboard focus here on purpose: a reminder should
        // never steal the keys from whatever the user is typing in.
    }

    dismiss() {
        this.remove_all_transitions();
        if (!motionAllowed()) {
            this.hide();
            return;
        }
        this.ease({
            opacity: 0,
            scale_x: 0.94,
            scale_y: 0.94,
            duration: 160,
            mode: Clutter.AnimationMode.EASE_IN_QUAD,
            onStopped: () => this.hide(),
        });
    }
});
