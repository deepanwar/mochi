# Design

Look: **dark, soft and cute**. Calm dark surfaces that match the Ubuntu dark desktop, rounded shapes, and one warm peach accent. Mochi brings the personality, so everything else stays quiet.

Design canvas (mockups of every state): https://claude.ai/artifact/Phzr7y4DLjV8jrz5hSA2EA

## Colours

| Name | Hex | Used for |
| --- | --- | --- |
| Ink | `#141416` | Pill and card background |
| Surface | `#232326` | Secondary buttons |
| Tile (day) | `#2A2219` | Behind Mochi in the pill and card |
| Tile (evening) | `#24203A` | Behind Mochi on the checkout card |
| Text | `#F2EFEA` | Main text |
| Soft text | `#CFCAC3` | Card body text, icons |
| Muted | `#A8A39C` | Labels like "NEXT UP" and times |
| Peach | `#FFB86B` | Primary buttons, orange dot, switches |
| Peach text | `#FFC48A` | Countdown chip text |
| Lavender | `#B9A6FF` | Evening accent (moon, checkout) |
| Mint | `#7FD4A8` | Mochi's leaf, custom reminder icons |

Dark text on peach buttons is `#1F1408` so it stays easy to read.

## Type

Ubuntu font (falls back to Cantarell, then any sans-serif). Sizes: 9 px eyebrow labels, 12 px meta, 14 px body, 20 px card titles.

## Shapes and sizes

| Thing | Size |
| --- | --- |
| Mochi button | 40 x 40, round |
| Mochi face in pill | 30 px |
| Open pill | 48 px tall, 24 px corner radius |
| Card | 384 px wide, 22 px radius, 18 px padding |
| Card buttons | 44 px tall, 14 px radius |
| Gap from screen edge | 12 px |

## Mochi

Mochi is a round rice-cake with a small leaf on top and pink cheeks. The four faces live in `extension/assets/` as 64 x 64 SVGs:

| File | Mood | Face |
| --- | --- | --- |
| `mochi-sleepy.svg` | Sleepy | Closed curved eyes, tiny mouth |
| `mochi-awake.svg` | Awake | Round eyes with sparkles, small smile |
| `mochi-excited.svg` | Excited | Happy ^ ^ eyes, open mouth |
| `mochi-proud.svg` | Proud | Closed eyes, smile, little moon |

To add a mood: draw a new SVG with the same body, add its name to `MOODS` in `lib/ui/mascot.js`, and return it from `alertCopy()` in `lib/messages.js`.

## Motion

| Moment | Animation |
| --- | --- |
| Closed | Mochi slowly grows and shrinks ("breathing"), 1.6 s each way |
| Opening | Pill pops out from the left with a small overshoot, text fades in |
| Card appears | Grows from the bottom-left corner with a small bounce |
| Heads-up | Quick side-to-side wiggle |

All motion turns off when the user has animations off or "reduce motion" on.

## Writing style

Mochi talks like a kind friend: short, warm, never bossy. Use "I'll keep your spot", not "Lunch break required". Change the words in `lib/messages.js`.
