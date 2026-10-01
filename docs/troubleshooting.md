# Troubleshooting

## Mochi doesn't show up

1. Is it on? `gnome-extensions info mochi-buddy@local` should say `State: ACTIVE`.
2. Did you log out and back in after the first install? GNOME only finds new extensions at login (on Wayland).
3. Is your GNOME version supported? `gnome-shell --version` must be 45 to 51. If it is newer, add it to `shell-version` in `extension/metadata.json` and try.
4. Look for errors: `make logs`, then turn it off and on: `make disable && make enable`.

## "State: ERROR" or "OUT OF DATE"

- **ERROR**: run `gnome-extensions info mochi-buddy@local` and `make logs`, the error message tells you the file and line.
- **OUT OF DATE**: your GNOME version is not in `metadata.json`.

## Settings window says the schema is missing

The schema was not compiled. Run `make schemas` (or `glib-compile-schemas extension/schemas`) and install again.

## A reminder didn't fire

- Is today one of your **workdays**? Lunch, checkout, "Every workday" and "Every hour" skip days off.
- Was the computer asleep for more than 15 minutes past the time? Old reminders are skipped on purpose.
- Was an app full screen? Mochi hides in full screen, the card shows again when you leave full screen.
- "Just once" reminders switch themselves off after they fire.

## No sound

- Check **Play a soft sound** in settings.
- Do Not Disturb silences Mochi.
- Check that system sounds are on: Settings, Sound, Alert Sound.

## Mochi covers something in the corner

Mochi sits 12 px from the bottom-left of your main monitor. To move it, change `MARGIN` in `extension.js` (a position setting is on the roadmap).

## My changes don't show up

GNOME caches shell code. Settings window changes show when you reopen it. Shell changes need a log out and in, or use `make nested`. See [getting-started.md](getting-started.md).
