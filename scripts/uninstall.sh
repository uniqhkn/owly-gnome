#!/usr/bin/env bash
set -euo pipefail
if (( $# )); then printf 'Usage: ./scripts/uninstall.sh\n' >&2; exit 2; fi
if (( EUID == 0 )); then printf 'Run as your desktop user, without sudo.\n' >&2; exit 1; fi
uuid=owly-quick-settings@owly.local
printf 'Disabling and removing %s for the current user.\n' "$uuid"
gnome-extensions disable "$uuid"
gnome-extensions uninstall "$uuid"
printf 'Removed. Owly and received files are unchanged. Log out and back in if needed.\n'
