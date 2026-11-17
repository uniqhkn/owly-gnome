#!/usr/bin/env bash
# Install the GNOME frontend for the current user; never run as root.
set -euo pipefail

usage() {
    cat <<'HELP'
Usage: ./scripts/install.sh [--check|--check-desktop] [--help]

Check GNOME, GTK and the installed Owly JSON interface, then pack and
install Owly Quick Settings for the current user and try to enable it.
--check   Check desktop and Owly prerequisites without changing settings.
--check-desktop   Check desktop prerequisites only (before backend setup).

Run from a terminal in your GNOME desktop session, without sudo.
Turn off sharing before installing. Log out and back in after an update.
The Owly backend must already include the supplied JSON interface patch.
HELP
}
check_only=false
desktop_only=false
case "${1:-}" in
    --check) check_only=true ;;
    --check-desktop) check_only=true; desktop_only=true ;;
    --help|-h) usage; exit 0 ;;
    '') ;;
    *) usage >&2; exit 2 ;;
esac
if (( $# > 1 )); then usage >&2; exit 2; fi
fail() { printf 'Error: %s\n' "$*" >&2; exit 1; }
[[ $EUID -ne 0 ]] || fail 'Run this script as your desktop user, without sudo.'
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
uuid=owly-quick-settings@owly.local
for command_name in gnome-shell gnome-extensions gjs; do
    command -v "$command_name" >/dev/null || fail "Missing command: $command_name"
done
shell_version=$(gnome-shell --version)
if [[ $shell_version =~ ([0-9]+)\. ]]; then
    shell_major=${BASH_REMATCH[1]}
else
    fail "Cannot determine GNOME Shell version: $shell_version"
fi
(( shell_major >= 45 && shell_major <= 51 )) || fail "Unsupported GNOME Shell target: $shell_version (expected 45–51)."
printf 'GNOME: %s\n' "$shell_version"
gjs -c "imports.gi.versions.Gtk = '4.0'; const Gtk = imports.gi.Gtk;" || fail 'GJS cannot load GTK 4.'
if $desktop_only; then
    printf 'Desktop prerequisites are available.\n'
    exit 0
fi
command -v owly >/dev/null || fail 'Owly is missing. Run ./scripts/setup.sh or see docs/BACKEND.md.'
for subcommand in browse receive 'radio up'; do
    read -r -a args <<< "$subcommand"
    help_output=$(owly "${args[@]}" --help) || fail "Cannot inspect owly $subcommand."
    [[ $help_output == *--json* ]] || fail "owly $subcommand lacks --json. Apply the supplied Owly patch and install the backend; see docs/BACKEND.md."
done
printf 'Owly JSON interface and GTK 4 are available.\n'
printf 'Daemon/radio/hardware operation must be verified with owly doctor.\n'
if $check_only; then exit 0; fi
[[ -n ${DBUS_SESSION_BUS_ADDRESS:-} ]] || fail 'Run inside your GNOME desktop session (no session D-Bus address found).'
[[ -d $script_dir/extension ]] || fail 'Extension source directory is missing.'
# Pack before touching the running extension or its enabled state.
install_tmp=$(mktemp -d "${TMPDIR:-/tmp}/owly-gnome-install.XXXXXX")
trap 'rm -rf -- "$install_tmp"' EXIT
gnome-extensions pack --force --extra-source=chooser.js --extra-source=README.md --extra-source=LICENSE \
    --out-dir="$install_tmp" "$script_dir/extension"
# Preserve the other edition on disk, but avoid simultaneous radio users.
enabled_extensions=$(gnome-extensions list --enabled)
while IFS= read -r enabled_uuid; do
    if [[ $enabled_uuid == owly@owly.local ]]; then
        gnome-extensions disable "$enabled_uuid"
    fi
done <<< "$enabled_extensions"
gnome-extensions install --force "$install_tmp/$uuid.shell-extension.zip"
if gnome-extensions enable "$uuid"; then
    printf 'Owly Quick Settings installed and enabled.\n'
else
    printf 'Installed. GNOME may need a new session before it recognizes the extension.\n'
    printf 'After logging out and back in, run: gnome-extensions enable %s\n' "$uuid"
fi
printf 'Log out and back in to load updated code. This script does not log you out.\n'
