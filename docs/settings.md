# Settings reference

Schema id: `org.gnome.shell.extensions.mochi-buddy`
Path: `/org/gnome/shell/extensions/mochi-buddy/`

| Key | Type | Default | Meaning |
| --- | --- | --- | --- |
| `lunch-enabled` | boolean | `true` | Remind me about lunch |
| `lunch-time` | string | `'13:00'` | Lunch time, 24-hour `HH:MM` |
| `checkout-enabled` | boolean | `true` | Remind me to check out |
| `checkout-time` | string | `'18:00'` | Checkout time, 24-hour `HH:MM` |
| `workdays` | int array | `[1,2,3,4,5]` | Days Mochi is on duty. 0 = Sunday, 6 = Saturday |
| `custom-reminders` | string (JSON) | `'[]'` | Your own reminders, see below |
| `play-sound` | boolean | `true` | Play a sound when a card shows |
| `snooze-minutes` | int (1 to 120) | `10` | How long Snooze waits |
| `heads-up` | boolean | `true` | Wiggle 5 minutes before a reminder |
| `test-reminder` | int | `0` | Bump it to show a test card (dev helper) |

Times are always stored in 24-hour form. The screen shows 12 or 24 hour based on your GNOME clock setting.

## Custom reminder format

`custom-reminders` holds a JSON list. Each item:

```json
{
  "id": "r-mf2k1x-a8c3d",
  "title": "Drink water",
  "time": "10:00",
  "repeat": "hourly",
  "endTime": "18:00",
  "enabled": true
}
```

| Field | Needed for | Notes |
| --- | --- | --- |
| `id` | all | Any unique string. Made automatically if missing. |
| `title` | all | Shown on the card. Trimmed to 80 characters. |
| `time` | all | `HH:MM`, 24-hour |
| `repeat` | all | `once`, `workdays`, `daily`, `hourly` or `weekly` |
| `enabled` | all | `false` = paused |
| `date` | `once` | `YYYY-MM-DD` |
| `endTime` | `hourly` | Last reminder of the day, `HH:MM` |
| `weekday` | `weekly` | 0 = Sunday ... 6 = Saturday |
| `note` | optional | Replaces the card's body text |

Items that are broken (no title, bad time, unknown repeat) are skipped quietly.

## Handy terminal commands

The schema must be installed (it is, after `make install`). If it isn't found, add `--schemadir ~/.local/share/gnome-shell/extensions/mochi-buddy@local/schemas` after `gsettings`.

```bash
S=org.gnome.shell.extensions.mochi-buddy

gsettings get $S custom-reminders          # see your reminders
gsettings set $S lunch-time '12:30'        # move lunch
gsettings set $S workdays '[1,2,3,4,5,6]'  # add Saturday
gsettings reset-recursively $S             # back to defaults
```

## Back up and restore

```bash
dconf dump /org/gnome/shell/extensions/mochi-buddy/ > mochi-backup.ini
dconf load /org/gnome/shell/extensions/mochi-buddy/ < mochi-backup.ini
```
