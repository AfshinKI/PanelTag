#!/bin/bash
# PanelTag's optional per-user installer. No sudo and no global Gatekeeper changes.
set -euo pipefail
version=0.5.0
allow_unsigned=false
case "${1:-}" in
  --allow-unsigned) allow_unsigned=true ;;
  '') ;;
  *) echo 'Usage: bash install-macos.sh [--allow-unsigned]' >&2; exit 2 ;;
esac
[ "$(uname -s)" = Darwin ] || { echo 'This installer is for macOS only.' >&2; exit 1; }
major=$(sw_vers -productVersion | cut -d. -f1)
[ "$major" -ge 13 ] || { echo 'PanelTag requires macOS 13 or later.' >&2; exit 1; }
asset="PanelTag-$version-macos-universal.dmg"
base="https://github.com/AfshinKI/PanelTag/releases/download/v$version"
task_dir=$(mktemp -d "${TMPDIR:-/tmp}/paneltag.XXXXXX")
mount="$task_dir/mount"
staging=''
cleanup() { hdiutil detach "$mount" -quiet 2>/dev/null || true; rm -rf "$task_dir"; if [ -n "$staging" ] && [ -d "$staging" ]; then rm -rf "$staging"; fi; }
trap cleanup EXIT
mkdir "$mount"
curl --fail --location --proto '=https' --tlsv1.2 "$base/$asset" -o "$task_dir/$asset"
curl --fail --location --proto '=https' --tlsv1.2 "$base/SHA256SUMS" -o "$task_dir/SHA256SUMS"
expected=$(awk -v file="$asset" '$2 == file { print $1 }' "$task_dir/SHA256SUMS")
[[ "$expected" =~ ^[0-9a-f]{64}$ ]] || { echo 'Missing or invalid release checksum.' >&2; exit 1; }
actual=$(shasum -a 256 "$task_dir/$asset" | awk '{print $1}')
[ "$expected" = "$actual" ] || { echo 'Checksum mismatch; installation stopped.' >&2; exit 1; }
hdiutil attach "$task_dir/$asset" -nobrowse -readonly -mountpoint "$mount" -quiet
codesign --verify --deep --strict "$mount/PanelTag.app"
app_root="$HOME/Applications"
mkdir -p "$app_root"
destination="$app_root/PanelTag.app"
# Stage on the same volume before touching an existing installation.
staging=$(mktemp -d "$app_root/.paneltag.XXXXXX")
ditto "$mount/PanelTag.app" "$staging/PanelTag.app"
if [ "$allow_unsigned" = true ]; then
  echo 'Trusting this unsigned release: removing quarantine from PanelTag only.'
  xattr -dr com.apple.quarantine "$staging/PanelTag.app" 2>/dev/null || true
  if xattr -lr "$staging/PanelTag.app" | grep -q com.apple.quarantine; then
    echo 'Could not remove quarantine; installation stopped.' >&2; exit 1
  fi
fi
if pgrep -u "$(id -u)" -x PanelTag >/dev/null; then
  echo 'Quit PanelTag with its power button, then run this installer again.' >&2
  rm -rf "$staging"
  exit 1
fi
backup="$app_root/PanelTag.previous.app"
if [ -e "$destination" ]; then
  [ ! -e "$backup" ] || { echo "Move $backup aside before updating." >&2; rm -rf "$staging"; exit 1; }
  mv "$destination" "$backup"
fi
if ! mv "$staging/PanelTag.app" "$destination"; then
  [ ! -e "$backup" ] || mv "$backup" "$destination"
  rm -rf "$staging"
  exit 1
fi
rmdir "$staging"
echo "Installed PanelTag $version in $destination"
[ ! -e "$backup" ] || echo "Previous version kept at $backup"
if [ "$allow_unsigned" != true ]; then
  echo 'This build is not Apple-notarized. If blocked, use System Settings > Privacy & Security > Open Anyway.'
fi
open "$destination"
