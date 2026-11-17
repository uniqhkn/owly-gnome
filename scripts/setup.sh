#!/usr/bin/env bash
# New-machine entry point; run as the desktop user, never through sudo.
set -euo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
if [[ ${1:-} == --help || ${1:-} == -h ]]; then
    cat <<'HELP'
Usage: ./scripts/setup.sh [--check] [--work-dir DIR | --source DIR]

Check the desktop, build/test/install patched Owly, then install the extension.
Backend installation uses sudo and restarts owlyd. Turn sharing off first.
--check performs prerequisite checks only. No packages or firewall rules are changed.
HELP
    exit 0
fi
backend_args=()
check=false
while (( $# )); do
    case "$1" in
        --check) check=true; shift ;;
        --work-dir|--source)
            (( $# >= 2 )) && [[ -n $2 ]] || { printf 'Missing value for %s\n' "$1" >&2; exit 2; }
            backend_args+=("$1" "$2"); shift 2 ;;
        *) printf 'Unknown option: %s\n' "$1" >&2; exit 2 ;;
    esac
done
"$root/scripts/install.sh" --check-desktop
if $check; then
    "$root/scripts/backend.sh" --check --install-system "${backend_args[@]}"
    exit 0
fi
[[ -n ${DBUS_SESSION_BUS_ADDRESS:-} ]] || { printf 'Run inside your GNOME desktop session.\n' >&2; exit 1; }
printf 'Turn off Owly sharing before setup. Backend installation requires sudo.\n'
"$root/scripts/backend.sh" --install-system "${backend_args[@]}"
"$root/scripts/install.sh"
