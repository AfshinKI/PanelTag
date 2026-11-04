#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
version=$(python3 -c 'import json; print(json.load(open("extension/metadata.json"))["version-name"])')
build=build/macos
app="$build/PanelTag.app"
mkdir -p "$app/Contents/MacOS" dist
for arch in arm64 x86_64; do
  xcrun swiftc native/macos/PanelTag.swift -O -swift-version 5 -target "$arch-apple-macosx13.0" -o "$build/paneltag-$arch" -framework AppKit -framework ServiceManagement
done
lipo -create "$build/paneltag-arm64" "$build/paneltag-x86_64" -output "$app/Contents/MacOS/PanelTag"
cat > "$app/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleIdentifier</key><string>io.github.afshinki.PanelTag</string>
<key>CFBundleName</key><string>PanelTag</string>
<key>CFBundleExecutable</key><string>PanelTag</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleShortVersionString</key><string>$version</string>
<key>CFBundleVersion</key><string>$version</string>
<key>LSMinimumSystemVersion</key><string>13.0</string>
<key>LSUIElement</key><true/>
<key>NSHighResolutionCapable</key><true/>
</dict></plist>
EOF
codesign --force --sign - "$app"
codesign --verify --deep --strict "$app"
"$app/Contents/MacOS/PanelTag" --smoke-test
mkdir -p "$build/dmg"
ditto "$app" "$build/dmg/PanelTag.app"
ln -s /Applications "$build/dmg/Applications"
hdiutil create -volname PanelTag -srcfolder "$build/dmg" -ov -format UDZO "dist/PanelTag-$version-macos-universal.dmg"
