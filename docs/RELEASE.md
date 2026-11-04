PanelTag 0.5.0 brings the same compact settings layout to Linux, macOS, and Windows.

- Inline name editing with a computer-name button.
- Icon-only device buttons, circular system/preset/custom colors, and size/style button rows.
- One startup-and-quit row and the same small designer/version footer.
- Mac now uses a custom popover; Windows uses a custom popup. No nested settings menus or separate name dialogs.
- macOS placement remains controlled by the OS. Its position row explains Command-drag instead of offering unsupported left/middle/right controls.
- All three website demos now show the shared menu, while retaining each platform's desktop shell.
- Optional Mac terminal installation downloads and checks the release. An explicit `--allow-unsigned` flag removes quarantine only from the installed PanelTag app.

### Installation
macOS: open the DMG and drag PanelTag to Applications before launching it. This build is ad-hoc signed, **not Apple-notarized**. Gatekeeper may block it. If you trust this release, use macOS System Settings → Privacy & Security → Open Anyway after attempting to open it. No security setting needs to be disabled. macOS may request approval for login startup.

Windows: run the matching setup.exe. This build is **not Authenticode-signed**; Windows may show an unknown-publisher/SmartScreen warning. Choose Launch PanelTag at the end of setup. The tray icon may initially be in the overflow menu. Uninstall through Windows Settings → Apps; saved preferences remain in your local app-data folder.

Ubuntu: install the .deb with apt. Log out and back in if GNOME has not discovered the extension or is still running an older version.

### Validation and limits
CI compiles both macOS architectures and both Windows architectures, renders the badge and new settings panel on macOS and Windows x64, runs Linux installer/input tests, and tests browser OS detection. Windows ARM64 is cross-compiled. These checks do not replace interactive desktop testing. Login approval, downloaded-app security prompts, multi-monitor/DPI changes, and upgrade/uninstall flows still need testing on real Macs and Windows PCs. Windows smoke checks also exercise inline name, size, and hostname controls. Interactive OS testing remains necessary.

All preferences remain local. No accounts, analytics, or network service. SHA256SUMS covers every installer.
