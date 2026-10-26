#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
root=$PWD
version=$(python3 -c 'import json; print(json.load(open("extension/metadata.json"))["version-name"])')
uuid=paneltag@afshinki.github.io
mkdir -p dist
stage=$(mktemp -d)
trap 'rm -rf "$stage"' EXIT
artifacts=()
for target in '20.04:3.36:3.37:legacy' '22.04:42:43:legacy' '24.04:46:47:extension'; do
  IFS=: read -r ubuntu shell ceiling source <<< "$target"
  pkg="$stage/$ubuntu"
  ext="$pkg/usr/share/gnome-shell/extensions/$uuid"
  mkdir -p "$ext/schemas" "$pkg/DEBIAN" "$pkg/usr/share/doc/paneltag"
  cp "$source/extension.js" "$ext/"
  cp extension/color-picker.js extension/color-wheel.svg "$ext/"
  mkdir -p "$pkg/etc/xdg/autostart" "$pkg/usr/bin"
  cp packaging/paneltag.desktop "$pkg/etc/xdg/autostart/"
  install -m 755 packaging/paneltag-login "$pkg/usr/bin/paneltag-login"
  gtk=4.0
  if [ "$ubuntu" = 20.04 ]; then gtk=3.0; fi
  cp extension/schemas/*.xml "$ext/schemas/"
  mkdir -p "$pkg/usr/share/icons/hicolor/scalable/apps"
  cp site/paneltag.svg "$pkg/usr/share/icons/hicolor/scalable/apps/paneltag.svg"
  cp LICENSE "$pkg/usr/share/doc/paneltag/copyright"
  python3 - "$shell" "$ext/metadata.json" <<'PY'
import json,sys
m=json.load(open('extension/metadata.json')); m['shell-version']=[sys.argv[1]]
with open(sys.argv[2],'w') as f: json.dump(m,f,indent=2)
PY
  glib-compile-schemas --strict "$ext/schemas"
  cat > "$pkg/DEBIAN/control" <<CONTROL
Package: paneltag
Version: $version
Architecture: all
Maintainer: AfshinKI <noreply@github.com>
Depends: gnome-shell (>= $shell), gnome-shell (<< $ceiling), gjs, gir1.2-gtk-$gtk
Section: gnome
Priority: optional
Homepage: https://github.com/AfshinKI/PanelTag
Description: Customizable machine badge for Ubuntu $ubuntu GNOME
 A small persistent badge with a compact settings menu.
CONTROL
  chmod 755 "$pkg"
  chmod -R go-w "$pkg"
  deb="paneltag_${version}_ubuntu${ubuntu}_all.deb"
  archive="paneltag_${version}_ubuntu${ubuntu}.zip"
  dpkg-deb --root-owner-group --build "$pkg" "$root/dist/$deb"
  (cd "$ext" && zip -qr "$stage/$archive" .)
  cp "$stage/$archive" "$root/dist/$archive"
  artifacts+=("$deb" "$archive")
done
(cd dist && sha256sum "${artifacts[@]}" > SHA256SUMS)
