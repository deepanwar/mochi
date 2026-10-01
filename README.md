# Mochi Buddy

A tiny desktop buddy for GNOME on Ubuntu. Mochi sits in the bottom-left corner of your screen and reminds you about lunch, checkout time, and anything else you add.

- **Click Mochi** to open a small bar that shows what is coming up next.
- **Click again** to close it.
- When a reminder is due, a card pops up with two choices: **Done** or **Snooze**.
- Change everything from the **settings** window (the gear in the bar).

Works on GNOME Shell 45 to 51 (Ubuntu 24.04 and newer).

## Quick start

```bash
# 1. Install
make install

# 2. On Wayland (the Ubuntu default), log out and log back in once.

# 3. Turn it on
make enable
```

Mochi should now be napping in the bottom-left corner. Open settings with `make prefs` or the gear button, then press **Test** under "Mochi's manners" to see a reminder right away.

Don't have `make`? Run `sudo apt install make`, or follow the manual steps in [docs/getting-started.md](docs/getting-started.md).

## Project layout

```
mochi-buddy/
├── extension/              Everything that ships to GNOME Shell
│   ├── metadata.json       Name, UUID, supported GNOME versions
│   ├── extension.js        Entry point: creates Mochi, runs the timer
│   ├── prefs.js            The settings window
│   ├── stylesheet.css      Colours, sizes, shapes
│   ├── lib/
│   │   ├── scheduler.js    When does each reminder happen? (pure JS)
│   │   ├── engine.js       What should fire right now? Snooze, heads-up (pure JS)
│   │   ├── messages.js     What Mochi says (pure JS)
│   │   ├── store.js        Read and write settings
│   │   └── ui/             The pill, the pop-up card, the mascot, helpers
│   ├── assets/             Mochi's four faces (SVG)
│   └── schemas/            The settings schema (GSettings)
├── docs/                   How it all works
├── tests/                  Unit tests (run with Node)
└── Makefile                Handy commands
```

## Docs

Start at [docs/README.md](docs/README.md).

## Development

```bash
make test     # unit tests for the reminder logic (needs Node 18+)
make check    # syntax-check every file and validate the schema
make logs     # watch GNOME Shell logs while you test
make pack     # build a zip in ./dist
```

See [docs/getting-started.md](docs/getting-started.md) for the full dev loop.
