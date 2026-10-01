// Small helpers that hide differences between GNOME Shell versions.

import Clutter from 'gi://Clutter';
import St from 'gi://St';

let _verticalParams = null;

/**
 * Constructor params for a vertical St.BoxLayout.
 * GNOME 48+ uses `orientation`; GNOME 51 removed the old `vertical` flag;
 * GNOME 45 to 47 only know `vertical`.
 */
export function verticalParams() {
    if (_verticalParams)
        return _verticalParams;
    try {
        const probe = new St.BoxLayout({orientation: Clutter.Orientation.VERTICAL});
        probe.destroy();
        _verticalParams = {orientation: Clutter.Orientation.VERTICAL};
    } catch {
        _verticalParams = {vertical: true};
    }
    return _verticalParams;
}

export function vbox(params = {}) {
    return new St.BoxLayout({...params, ...verticalParams()});
}

/** False when the user turned off animations or asked for reduced motion. */
export function motionAllowed() {
    const settings = St.Settings.get();
    if (St.ReducedMotion !== undefined && settings.reducedMotion === St.ReducedMotion.REDUCE)
        return false;
    return settings.enable_animations !== false;
}
