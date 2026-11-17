#!/usr/bin/env bash
set -euo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
mkdir -p "$root/dist"
gnome-extensions pack --force --extra-source=chooser.js --extra-source=README.md --extra-source=LICENSE --out-dir="$root/dist" "$root/extension"
# Build from a fixed source allowlist; exclude local Git state and generated files.
tar -czf "$root/dist/owly-gnome-0.1.0-source.tar.gz" --transform='s,^,owly-gnome-0.1.0/,' -C "$root" \
    README.md LICENSE CHANGELOG.md CONTRIBUTING.md .gitignore .gitattributes .github extension scripts tests patches docs
printf 'Release artifacts written to %s/dist\n' "$root"
