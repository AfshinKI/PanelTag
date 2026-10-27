# Developing PanelTag

Build with Python 3, GLib tools and dpkg-deb:

```sh
bash scripts/build.sh
python3 tests/test_login.py
python3 tests/test_install.py
node tests/test_input.cjs
```

The universal package and checksum appear in `dist/`. GNOME before 45 uses `legacy/extension.js`; GNOME 45–51 uses the ES module in `extension/extension.js`. The package selects the appropriate file during configuration and after GNOME Shell upgrades through a file trigger. Both implementations must stay in sync. Shared icons and schemas live in `extension/`.

The app launcher enables the extension in the user's session. Installation through sudo attempts activation for the invoking user. A fresh GNOME session may be required for discovery or updated JavaScript. Installation never restarts the shell or logs the user out. Startup preferences remain per-user.

The website in `site/` mirrors the controls and icons. It is a simulation; left-click and the yellow tag also open its menu for browser/touch access. Native menus open on right-click or keyboard activation.

## Releases

Update the numeric version and version-name in `extension/metadata.json` and the download links in the README and website. Push to main. GitHub Actions runs checks, builds the universal .deb and publishes a release with a version tag if it doesn't exist. Published versions are immutable; fixes require a new version. Document live desktop validation and known compatibility limits in each release.

Package and mocked input/installer tests are not substitutes for running the extension in each GNOME version. Check hover, clock alignment, distinct icons, startup, Close/reopen and custom colors in live sessions.

GitHub Pages publishes `site/`. No API keys, analytics or backend are required. Settings stay local; CI uses GitHub's automatic token.
