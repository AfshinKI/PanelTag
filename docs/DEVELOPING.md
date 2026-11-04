# Developing PanelTag

## Linux

Build with Python 3, GLib tools and dpkg-deb:

```sh
bash scripts/build.sh
python3 tests/test_login.py
python3 tests/test_install.py
node tests/test_input.cjs
node tests/test_downloads.cjs
```

GNOME before 45 uses `legacy/extension.js`; newer GNOME uses `extension/extension.js`. Keep both synchronized. The .deb chooses the engine during installation or GNOME upgrades. Login preferences are per-user; installation never restarts GNOME or logs the user out.

## macOS

`native/macos/PanelTag.swift` uses AppKit, SwiftUI and ServiceManagement, without third-party packages. Build on a Mac with Xcode command-line tools and Python 3:

```sh
bash scripts/build-macos.sh
```

The script compiles arm64 and x86_64 for macOS 13+, combines them into a universal app, applies an ad-hoc signature, runs a rendering smoke test, and produces a DMG. This is not Developer ID signing or notarization. Login startup uses `SMAppService.mainApp`; the user may need to approve it. Settings use UserDefaults. macOS owns menu-bar placement.

## Windows

`native/windows` uses .NET 10 Windows Forms without third-party runtime packages. On Windows with .NET 10 SDK and Inno Setup 6:

```powershell
dotnet publish native/windows/PanelTag.csproj -c Release -r win-x64 -p:Version=0.5.0 -o build/windows-x64
& 'C:\Program Files (x86)\Inno Setup 6\ISCC.exe' /DAppVersion=0.5.0 /DArch=x64 native/windows/installer.iss
```

Repeat with `win-arm64` and `Arch=arm64`. Each setup bundles a self-contained runtime. Run the x64 executable with `--smoke-test` to render all badge styles/icons and create the menu without persisting settings or registering startup. The badge is a separate topmost window, not a taskbar injection. Settings are in `%LOCALAPPDATA%\PanelTag\settings.json`; startup uses the current user's Run key. The installer creates an app-list shortcut and removes the Run entry on uninstall. Settings are retained. Binaries are not Authenticode-signed.

## Website and releases

`site/` is a static website with automatic, noninteractive Linux, macOS, and Windows demonstrations. `downloads.js` detects OS locally, optionally reads browser architecture hints, and provides a manual override. No analytics or server API. Unknown/mobile platforms default to the Linux preview. Compact platform buttons synchronize the preview and download; Windows processor buttons select x64 or ARM64.

Update `extension/metadata.json`, `site/downloads.js`, website and README versions, and `docs/RELEASE.md`. Push a `release/**` branch to validate all platforms without publishing. Main builds the same checks, waits for every installer, then publishes one release with checksums. Pages deploys after a successful main release workflow. No signing credentials are stored in the repository. CI uses GitHub's automatic token.

Smoke/build checks are not interactive desktop validation. Before claiming full platform validation, test a downloaded app under normal OS security, login startup/approval, custom colors, right-click settings, DPI/display changes, quit/reopen, upgrade and uninstall. ARM64 Windows builds are cross-compiled on x64 CI.

The settings layout is shared visually: name/hostname, icon buttons, eight color circles, position, text size, style, startup/quit, credit/version. Mac uses a SwiftUI view in an AppKit popover and replaces position buttons with Command-drag guidance. Windows uses `SettingsPopup.cs`; Linux uses GNOME St controls. Keep these and the demo in sync.
