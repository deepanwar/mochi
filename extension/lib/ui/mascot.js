// Loads Mochi's face for each mood from extension/assets/.

import Gio from 'gi://Gio';

export const MOODS = Object.freeze(['sleepy', 'awake', 'excited', 'proud']);

export class MascotIcons {
    /** @param {Gio.File} extensionDir `this.dir` from the Extension class */
    constructor(extensionDir) {
        this._icons = new Map();
        for (const mood of MOODS) {
            const file = extensionDir.get_child('assets').get_child(`mochi-${mood}.svg`);
            this._icons.set(mood, new Gio.FileIcon({file}));
        }
    }

    get(mood) {
        return this._icons.get(mood) ?? this._icons.get('awake');
    }
}
