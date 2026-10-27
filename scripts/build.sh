#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
root=$PWD
version=$(python3 -c 'import json; print(json.load(open("extension/metadata.json"))["version-name"])')
uuid=paneltag@afshinki.github.io
mkdir -p dist
stage=$(mktemp -d)
trap 'rm -rf "$stage"' EXIT
pkg="$stage/package"
ext="$pkg/usr/share/gnome-shell/extensions/$uuid"
mkdir -p "$ext/schemas" "$pkg/DEBIAN" "$pkg/usr/share/doc/paneltag" "$pkg/usr/share/paneltag" "$pkg/usr/bin" "$pkg/etc/xdg/autostart" "$pkg/usr/share/applications" "$pkg/usr/share/icons/hicolor/scalable/apps"
cp extension/extension.js "$ext/"
cp extension/extension.js "$pkg/usr/share/paneltag/modern.js"
cp legacy/extension.js "$pkg/usr/share/paneltag/legacy.js"
cp extension/metadata.json extension/color-picker.js extension/color-wheel.svg "$ext/"
cp -r extension/icons "$ext/"
cp extension/schemas/*.xml "$ext/schemas/"
glib-compile-schemas --strict "$ext/schemas"
cp packaging/paneltag.desktop "$pkg/etc/xdg/autostart/"
cp packaging/paneltag-app.desktop "$pkg/usr/share/applications/paneltag.desktop"
install -m 755 packaging/paneltag-login packaging/paneltag-launch "$pkg/usr/bin/"
install -m 755 packaging/postinst "$pkg/DEBIAN/postinst"
printf '%s\n' 'interest-noawait /usr/bin/gnome-shell' > "$pkg/DEBIAN/triggers"
cp site/paneltag.svg "$pkg/usr/share/icons/hicolor/scalable/apps/paneltag.svg"
cp LICENSE "$pkg/usr/share/doc/paneltag/copyright"
cat > "$pkg/DEBIAN/control" <<CONTROL
Package: paneltag
Version: $version
Architecture: all
Maintainer: AfshinKI <noreply@github.com>
Depends: gnome-shell (>= 3.36), gnome-shell (<< 52), gjs, libnotify-bin, gir1.2-gtk-3.0
Section: gnome
Priority: optional
Homepage: https://github.com/AfshinKI/PanelTag
Description: A customizable machine badge for the GNOME top panel
 Automatically selects the extension engine for your GNOME version.
CONTROL
size=$(du -sk "$pkg/usr" "$pkg/etc" | awk '{s+=$1} END {print s}')
printf 'Installed-Size: %s\n' "$size" >> "$pkg/DEBIAN/control"
chmod -R go-w "$pkg"
deb="paneltag_${version}_all.deb"
dpkg-deb --root-owner-group --build "$pkg" "$root/dist/$deb"
(cd dist && sha256sum "$deb" > SHA256SUMS)
