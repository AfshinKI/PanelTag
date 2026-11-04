PanelTag now has native macOS and Windows apps alongside the Ubuntu GNOME extension.

- macOS 13+: a menu-bar badge with name, device icon, color, text size, style, and Start at login. One universal DMG supports Apple silicon and Intel. Hold Command and drag to reorder the badge in the menu bar; macOS controls its placement.
- Windows 10 1809+/11: a floating badge at the top of the primary screen, with a tray icon, right-click settings, system accent color, and Start at login. Separate x64 and ARM64 installers include the runtime and install for the current user without administrator access.
- Ubuntu GNOME: the same universal .deb and existing panel features.
- Website: recommends a download for your OS, with a manual OS/architecture selector. The automatic animation shows the GNOME edition.

### Installation
macOS: open the DMG and drag PanelTag to Applications before launching it. This initial build is ad-hoc signed, **not Apple-notarized**. Gatekeeper may block it. If you trust this release, use macOS System Settings → Privacy & Security → Open Anyway after attempting to open it. No security setting needs to be disabled. macOS may request approval for login startup.

Windows: run the matching setup.exe. This initial build is **not Authenticode-signed**; Windows may show an unknown-publisher/SmartScreen warning. Choose Launch PanelTag at the end of setup. The tray icon may initially be in the overflow menu. Uninstall through Windows Settings → Apps; saved preferences remain in your local app-data folder.

Ubuntu: install the .deb with apt. Log out and back in if GNOME has not discovered the extension or is still running an older version.

### Validation and limits
CI compiles both macOS architectures and both Windows architectures, renders the badge on macOS and Windows x64, runs Linux installer/input tests, and tests browser OS detection. Windows ARM64 is cross-compiled. These checks do not replace interactive desktop testing. Login approval, downloaded-app security prompts, multi-monitor/DPI changes, and upgrade/uninstall flows still need testing on real Macs and Windows PCs. This is the first public release of the new platform editions.

All preferences remain local. No accounts, analytics, or network service. SHA256SUMS covers every installer.
