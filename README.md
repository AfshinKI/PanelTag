# PanelTag

A small customizable GNOME top-panel badge. Defaults: Middle, no icon, Medium text, blue outline.

## Install the prerelease

Target: Ubuntu 24.04 with GNOME Shell 46. Download the `.deb` from [Releases](https://github.com/AfshinKI/PanelTag/releases), then:

```sh
sudo apt install ./paneltag_0.1.1_all.deb
```

Log out and log in after the first installation so GNOME discovers the extension. Then run:

```sh
gnome-extensions enable paneltag@afshinki.github.io
```

The enabled extension starts on subsequent logins. The package does not alter session settings as root. Remove with `sudo apt remove paneltag`; disable with `gnome-extensions disable paneltag@afshinki.github.io`.

## Features

Right-click (or left-click) the badge for its compact native menu. Set a custom name or hostname, icon (None/Computer/Laptop/Server), preset or hex color, Left/Middle/Right position, Small/Medium/Large text, and Filled/Outline/Text-only style. Reset restores the defaults. Hover shows the hostname. GSettings saves choices between sessions. Text is vertically centered at every size.

The native menu uses compact submenus and a hex color entry; the website uses browser controls and a color picker. Website settings are illustrative and do not change your desktop.

## Build

Requires Python 3, GLib schema compiler, dpkg-deb and zip:

```sh
bash scripts/build.sh
```

Outputs a `.deb`, extension ZIP, and SHA256SUMS under `dist/`. GNOME extension source lives in `extension/`. Website source is `site/index.html`; `design/index.html` retains the design prototype.

## Release flow

Push changes through review to `main`. CI validates JavaScript and builds packages. Set `version-name` and increment `version` in `extension/metadata.json`, update the website install filename, commit and merge to `main`. CI creates the matching `vX.Y.Z` tag and publishes a prerelease only if that version does not already exist. Explicit matching version tags also publish packages and checksums. Promote a release only after live-session testing.

## Validation status

Schema compilation, JavaScript syntax, package construction and package contents are checked locally. Live GNOME enable/disable, right-click interaction, login persistence, and clean-machine installation/upgrade/removal still require desktop testing. GNOME versions beyond 46 are deliberately not advertised.

## Website

Interactive preview opens with settings visible. Supports right-click, keyboard activation, Escape and outside-click dismissal. The hostname displayed on the website is example data. Hosted preview uses Sites; `site/index.html` is also deployable to any static host.
