# Mochi Buddy - handy commands. Run `make help` to see them.

UUID     := mochi-buddy@local
SRC      := extension
DEST     := $(HOME)/.local/share/gnome-shell/extensions/$(UUID)
DIST     := dist

.PHONY: help schemas install link uninstall enable disable prefs pack test check logs nested clean

help:
	@echo "make install    Copy the extension into ~/.local/share/gnome-shell/extensions"
	@echo "make link       Symlink it instead (edit here, reload to see changes)"
	@echo "make enable     Turn it on"
	@echo "make disable    Turn it off"
	@echo "make prefs      Open the settings window"
	@echo "make test       Run the unit tests (needs Node 18+)"
	@echo "make check      Syntax-check every JS file and validate the schema"
	@echo "make pack       Build a zip in ./dist"
	@echo "make logs       Follow GNOME Shell logs (look for [Mochi] / JS ERROR)"
	@echo "make nested     Start a test GNOME Shell in a window"
	@echo "make uninstall  Remove the installed copy"

schemas:
	glib-compile-schemas $(SRC)/schemas

install: schemas
	rm -rf $(DEST)
	mkdir -p $(DEST)
	cp -r $(SRC)/. $(DEST)/
	@echo "Installed to $(DEST). On Wayland, log out and back in once, then: make enable"

link: schemas
	rm -rf $(DEST)
	mkdir -p $(dir $(DEST))
	ln -s $(CURDIR)/$(SRC) $(DEST)
	@echo "Linked $(DEST) -> $(CURDIR)/$(SRC)"

uninstall:
	-gnome-extensions disable $(UUID)
	rm -rf $(DEST)

enable:
	gnome-extensions enable $(UUID)

disable:
	gnome-extensions disable $(UUID)

prefs:
	gnome-extensions prefs $(UUID)

pack:
	mkdir -p $(DIST)
	gnome-extensions pack $(SRC) --force --out-dir=$(DIST) \
		--extra-source=lib --extra-source=assets
	@ls -1 $(DIST)

test:
	node --test tests/*.test.js

check:
	@for f in $(SRC)/*.js $(SRC)/lib/*.js $(SRC)/lib/ui/*.js; do node --check $$f || exit 1; done
	glib-compile-schemas --strict --dry-run $(SRC)/schemas
	@echo "All good."

logs:
	journalctl -f -o cat /usr/bin/gnome-shell

# GNOME 49+ uses --devkit; older versions use --nested --wayland.
nested:
	@if gnome-shell --help 2>/dev/null | grep -q -- --devkit; then \
		dbus-run-session -- gnome-shell --devkit; \
	else \
		dbus-run-session -- gnome-shell --nested --wayland; \
	fi

clean:
	rm -rf $(DIST) $(SRC)/schemas/gschemas.compiled
