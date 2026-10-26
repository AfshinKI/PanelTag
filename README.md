<p align="center"><img src="docs/banner.svg" alt="PanelTag — a little label, the right machine. Work, Home and Server badges in a Linux panel." width="1000"></p>

<p align="center"><strong>Work laptop? Home desktop? That server you keep mixing up?</strong><br>Give each machine a little name badge that stays in sight.</p>

<p align="center">Designed by <strong>Afshin K.I.</strong></p>

<p align="center"><a href="https://afshinki.github.io/PanelTag/"><strong>🎨 Play with the demo</strong></a> &nbsp; · &nbsp; <a href="https://github.com/AfshinKI/PanelTag/releases/tag/v0.2.4"><strong>↓ Get PanelTag</strong></a> &nbsp; · &nbsp; <a href="LICENSE">MIT licensed</a></p>

## Small badge. Plenty of personality.

- **Name it.** Work, Home, Lab — or tap the small computer button beside the name field to use your hostname.
- **Color it.** Choose a preset or your own hex color.
- **Match your desktop.** System color is on by default from first launch, with no setup required. PanelTag reads the shell theme’s selection accent and follows theme changes; if the theme exposes no accent, it uses a light/dark fallback. Picking a badge color overrides this; Restore returns to System. Existing saved preferences are preserved.
- **Style it.** Filled, outline, or text only. Computer, laptop, server, or no icon.
- **Place it.** Left, middle, or right, with three text sizes.
- **Forget about it.** It enables itself at login and remembers your choices.

Right-click the badge for its compact settings menu: icon-only choices, circular colors, and separate rows for position, size and style. Left-click and keyboard activation work too. Hover to see the hostname.

**Our favorite starting point:** middle · no icon · medium text · blue outline.

## Pick your Ubuntu

| Desktop | GNOME | Download |
| --- | --- | --- |
| Ubuntu 24.04 | 46 | [24.04 package](https://github.com/AfshinKI/PanelTag/releases/download/v0.2.4/paneltag_0.2.4_ubuntu24.04_all.deb) |
| Ubuntu 22.04 | 42 | [22.04 package](https://github.com/AfshinKI/PanelTag/releases/download/v0.2.4/paneltag_0.2.4_ubuntu22.04_all.deb) |
| Ubuntu 20.04 | 3.36 | [20.04 package](https://github.com/AfshinKI/PanelTag/releases/download/v0.2.4/paneltag_0.2.4_ubuntu20.04_all.deb) |

> **Compatibility preview:** packages target the default GNOME desktop on these releases. Build, schema and package checks pass; live-session testing is still pending, especially on the older releases. KDE, Cinnamon, MATE and other desktops are not supported. Choose by your installed GNOME version if you have customized Ubuntu.

In your download folder, install the matching file. For Ubuntu 24.04:

```sh
sudo apt install ./paneltag_0.2.4_ubuntu24.04_all.deb
```

After the first installation, log out and back in. PanelTag discovers and enables itself in your GNOME session. The **Start at login** switch is on by default; switch it off to prevent the badge returning at your next login. Your current badge stays visible. To enable it manually:

```sh
gnome-extensions enable paneltag@afshinki.github.io
```

That’s it — PanelTag returns at future logins. Download checksums and extension ZIPs from the [release page](https://github.com/AfshinKI/PanelTag/releases/tag/v0.2.4).

<details>
<summary>Taking the badge off?</summary>

Disable it with `gnome-extensions disable paneltag@afshinki.github.io`, or uninstall with `sudo apt remove paneltag`. Settings are stored per user through GSettings.

</details>

## Try before you install

The [interactive website](https://afshinki.github.io/PanelTag/) cycles through Work, Home and Server examples. Click the badge to try your own settings. The menu starts open and the simulated desktop stays the same size when you close it. After 8 seconds closed, the demo cycles through examples, occasionally opening the settings menu. Open the menu to take control, or click the badge to take control. The original landscape wallpaper is included as SVG.

The website is a browser preview, not a running GNOME session. The app and demo use compact icon-button rows. The first color circle follows system appearance; the rainbow circle opens a custom color picker. The example hostname is fictional. Nothing in the demo changes your computer.

## For the curious 🛠️

Build with Python 3, GLib tools, dpkg-deb and zip:

```sh
bash scripts/build.sh
```

This builds three version-specific `.deb` files and extension ZIPs, plus checksums under `dist/`. The legacy implementation in `legacy/` supports GNOME’s pre-45 loader; `extension/` uses the modern ES-module loader. Package dependencies prevent installing the wrong build for the running GNOME version.

To release: update both version fields in `extension/metadata.json`, update download links, and merge to `main`. CI builds packages, creates the matching version tag and publishes a prerelease if it does not exist. Explicit version tags also work. Promote releases after live desktop testing.

## Open source, no mystery ingredients

[MIT licensed](LICENSE). No account, API keys, analytics, external scripts, or backend are needed. Settings stay local. GitHub Pages publishes `site/`; GitHub Actions uses its automatic short-lived token, not a committed personal token. Credential files are ignored by Git.

Found a bug or tried an older Ubuntu release? [Tell us how it went](https://github.com/AfshinKI/PanelTag/issues) — include your Ubuntu and GNOME versions.
