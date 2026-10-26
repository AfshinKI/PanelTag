#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
version=$(python3 -c 'import json; print(json.load(open("extension/metadata.json"))["version-name"])')
uuid=paneltag@afshinki.github.io
mkdir -p dist
stage=$(mktemp -d)
trap 'rm -rf "$stage"' EXIT
ext="$stage/usr/share/gnome-shell/extensions/$uuid"
mkdir -p "$ext" "$stage/DEBIAN"
cp -r extension/. "$ext/"
glib-compile-schemas --strict "$ext/schemas"
cat > "$stage/DEBIAN/control" <<CONTROL
Package: paneltag
Version: $version
Architecture: all
Maintainer: AfshinKI <noreply@github.com>
Depends: gnome-shell (>= 46), gnome-shell (<< 47)
Section: gnome
Priority: optional
Homepage: https://github.com/AfshinKI/PanelTag
Description: Customizable machine badge for the GNOME top panel
 A small persistent badge with a compact settings menu.
CONTROL
chmod 755 "$stage"
chmod -R go-w "$stage"
dpkg-deb --root-owner-group --build "$stage" "dist/paneltag_${version}_all.deb"
(cd "$ext" && zip -qr "$OLDPWD/dist/paneltag@afshinki.github.io.zip" .)
(cd dist && sha256sum ./*.deb ./*.zip > SHA256SUMS)
