# Getting started

## What you need

- Ubuntu 24.04 or newer (GNOME Shell 45 to 51). Check with `gnome-shell --version`.
- `make` and `glib-compile-schemas` (comes with Ubuntu). For tests: Node 18 or newer.

## Install

```bash
make install
```

This copies `extension/` to `~/.local/share/gnome-shell/extensions/mochi-buddy@local/` and compiles the settings schema.

GNOME only notices brand-new extensions at login. On **Wayland** (the Ubuntu default) log out and back in once. On **X11** you can press `Alt+F2`, type `r`, and press Enter instead. GNOME 50 and newer are Wayland only.

Then turn it on:

```bash
make enable
```

### Without make

```bash
glib-compile-schemas extension/schemas
mkdir -p ~/.local/share/gnome-shell/extensions/mochi-buddy@local
cp -r extension/. ~/.local/share/gnome-shell/extensions/mochi-buddy@local/
# log out and back in, then:
gnome-extensions enable mochi-buddy@local
```

## The dev loop

1. Use `make link` once. It points GNOME at this folder, so you edit files here directly.
2. Make your change.
3. Reload:
   - **Settings window changes** (`prefs.js`): just close and reopen settings.
   - **Shell changes** (`extension.js`, `lib/`, `stylesheet.css`): GNOME caches extension code. On Wayland you need to log out and in, or use a nested shell (below), which is much faster.
4. Watch for errors with `make logs`.

### Nested shell (fast testing on Wayland)

```bash
make nested
```

This opens a whole GNOME Shell inside a window. Your extension is loaded there, and closing the window throws it away. Inside it, open a terminal and run `gnome-extensions enable mochi-buddy@local` if needed.

On GNOME 49 and newer this uses `gnome-shell --devkit`. If it complains that the devkit viewer is missing, install your distro's mutter development tools package. Older versions use `gnome-shell --nested --wayland`.

### Try a reminder without waiting

Open settings and press **Test** under "Mochi's manners". A test card pops up straight away.

You can also do it from a terminal:

```bash
gsettings --schemadir extension/schemas set org.gnome.shell.extensions.mochi-buddy \
  test-reminder $(( $(gsettings --schemadir extension/schemas get org.gnome.shell.extensions.mochi-buddy test-reminder) + 1 ))
```

## Tests

```bash
make test    # unit tests for scheduler, engine and messages
make check   # syntax check + schema validation
```

The reminder logic (`lib/scheduler.js`, `lib/engine.js`, `lib/messages.js`) has no GNOME imports on purpose, so it runs in plain Node. If you add logic, try to put it there and add a test.

## Build a zip

```bash
make pack
```

The zip lands in `dist/`. Install it on another machine with `gnome-extensions install --force dist/*.zip`.
