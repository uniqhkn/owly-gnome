# Owly GNOME 0.1.0

First standalone release of an unofficial GNOME Quick Settings frontend for Owly.

Discover nearby AirDrop devices, send selected files, and approve incoming transfers from the system menu. Includes English UI, a GTK chooser, clear action states and refresh without closing the menu.

## New-machine setup

The source package includes guided setup for the required patched Owly backend and GNOME frontend:

```sh
./scripts/setup.sh --check
./scripts/setup.sh
```

Install the documented system prerequisites first and run as your desktop user. Setup fetches a pinned Owly revision, applies the supplied JSON patch, runs CLI tests, builds release binaries and then requests sudo for backend installation. It installs the frontend afterward. Distribution packages and firewall rules are not changed automatically.

The actual backend build and all 13 CLI tests passed in a separate clean source checkout using cached dependencies. Privileged installation and desktop operations were tested with mocks; a second-machine installation and fresh internet downloads remain unverified.

## Assets

- `owly-quick-settings@owly.local.shell-extension.zip`: frontend only.
- `owly-gnome-0.1.0-source.tar.gz`: source, scripts, docs, tests and the required backend patch.

The ZIP is not a complete AirDrop stack. Install the patched Owly backend described in docs/BACKEND.md first. This release is not an approved GNOME Extensions listing or an official upstream Owly release.

User testing has been on GNOME 51.1 with successful iPhone/iPad transfers in both directions. Other GNOME versions are not verified; intermittent connectivity issues have occurred. A reboot resolved one observation, without establishing a root cause.

Turn sharing off before updating and log out/back in afterward. See README.md for installation and removal. Owly attribution and MIT notices are included.
