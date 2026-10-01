# How reminders work

## Built-in reminders

| Reminder | Default | Repeats | Card says |
| --- | --- | --- | --- |
| Lunch break | 1:00 PM | Workdays | "Lunch time!" with **Done, eating now** / **Snooze** |
| Checkout | 6:00 PM | Workdays | "Time to check out" with **Logging off** / **N more min** |

Both can be switched off or moved in settings.

## Repeat options for your own reminders

| Option | Fires | Respects workdays? |
| --- | --- | --- |
| Just once | One time, today if the time is still ahead, otherwise tomorrow. Switched off after it fires. | No |
| Every workday | Once a day on your workdays | Yes |
| Every day | Once a day, every day | No |
| Every hour | Every hour from the start time until the "Until" time | Yes |
| Once a week | Once a week on the day you pick | No |

To use a finished "Just once" reminder again, switch it back on. It moves to the next time that clock time comes around.

## Timing rules

- Mochi checks the clock **every 15 seconds**, so a reminder can show up to 15 seconds late.
- **Starting up never fires old reminders.** If you log in at 2 PM, you will not get the 1 PM lunch card.
- **Asleep or locked?** If your computer wakes up within **15 minutes** of a reminder, it still fires. Older ones are skipped, so you don't get a pile of stale cards.
- Each reminder fires **once** per time slot, even if settings change.

## The card queue

If two reminders are due together, cards show **one at a time**. Pressing Done, Snooze or the close button shows the next one.

## Snooze

Snooze brings the same card back after the snooze length (10 minutes by default, set in settings). The card then says "Snoozed reminder · 1:00 PM" so you know when it was first due. Snoozed reminders also show in the pill as "Next up".

Snoozes live in memory. If you log out, they are forgotten.

## The orange dot and the wiggle

- The **orange dot** on Mochi appears when something is due within **15 minutes**, or while a card is showing.
- With **Wiggle before reminders** on, Mochi wiggles once, **5 minutes** before a reminder.

## Mochi's mood

| Mood | When |
| --- | --- |
| Sleepy | Closed, nothing showing. Slowly "breathes". |
| Awake | The pill is open. |
| Excited | A lunch or custom reminder card is showing. |
| Proud | The checkout card is showing. |

## Sound

A soft system sound plays when a card appears, if **Play a soft sound** is on. It stays quiet when Do Not Disturb is on. The card still shows.
