# Owly GNOME

An unofficial GNOME Quick Settings frontend for [Owly](https://github.com/t4t5/owly), maintained in [uniqhkn/owly-gnome](https://github.com/uniqhkn/owly-gnome).

Send files to an iPhone or iPad, discover nearby AirDrop receivers, and approve incoming transfers from the system menu. Owly provides the radio and AirDrop implementation; this project provides the GNOME interface.

## Features

- An Owly tile in Quick Settings, available even when sharing is off.
- Nearby device discovery with refresh that keeps the menu open.
- A GTK file chooser for sending one or multiple files.
- Incoming transfer approval and decline, with notifications.
- Received files in Downloads and an action to open that folder.
- English labels, bordered device rows, and distinct action colors.

## Requirements

- GNOME Shell 45–51 are API targets. User testing has been on GNOME 51.1; other versions are not verified.
- GJS, GTK 4, and `gnome-extensions`.
- Supported Owly hardware, daemon, polkit and network configuration.
- **An Owly CLI containing this project's JSON interface additions.** Do not assume an unmodified upstream release supports them. See [backend setup](docs/BACKEND.md).

## Install

Clone this repository or extract a source release, then run from its root:

```sh
./scripts/install.sh --check
./scripts/install.sh
```

Run as your desktop user, without sudo, from a GNOME terminal. Turn sharing off before updating. The script checks dependencies, installs the extension and attempts to enable it. It does not install the backend or change firewall rules.

Log out and back in. If GNOME did not recognize the extension during installation:

```sh
gnome-extensions enable owly-quick-settings@owly.local
```

GNOME remembers the enabled extension across logins. Sharing itself starts off when the extension loads. The UUID is retained from the working development version so existing installations update in place.

To install a release ZIP after setting up the backend:

```sh
gnome-extensions install --force owly-quick-settings@owly.local.shell-extension.zip
```

Then log out and back in and enable the extension as above if necessary.

## Use

1. Open Quick Settings and click **Owly** to turn sharing on.
2. Set the iPhone or iPad AirDrop setting to **Everyone for 10 Minutes** and keep it awake.
3. Open the tile's arrow and choose **Refresh nearby devices**. Discovery takes up to 15 seconds.
4. Select a device, choose files, and accept on the receiving device.
5. For incoming files, choose **Accept** or **Decline** within 15 seconds.

Files go to your XDG Downloads directory, falling back to `~/Downloads`. Links are shown and never opened automatically. Owly cards using exclusive radio mode may disconnect Wi-Fi while sharing is on. Turn sharing off to release the radio.

Do not run another Owly receiver or radio lease at the same time. The installer disables the earlier `owly@owly.local` panel edition if enabled; it does not remove it.

## Uninstall

Turn sharing off, then:

```sh
./scripts/uninstall.sh
```

This removes only this user's Quick Settings extension. It leaves Owly, received files and the original panel edition installed. Log out and back in if the tile remains visible until Shell reloads.

## Troubleshooting

Run `owly doctor` for radio/hardware diagnostics. Check `journalctl --user -b -o cat` for Shell errors. Send failures include the CLI outcome when available.

The initial user reported successful transfers in both directions with iPhone and iPad. Intermittent outgoing/connectivity failures also occurred and later cleared; one cleared after reboot. Their cause is unverified, and no protocol fix is claimed. See [testing](docs/TESTING.md) for the limits of validation.

## Development and packaging

```sh
./scripts/check.sh
./scripts/pack.sh
```

Packaging writes the extension ZIP and a versioned source archive into `dist/`. These files are ignored by Git. The frontend release version is `0.1.0`; GNOME's integer metadata version remains `4` from the working development iteration.

See [changes](CHANGELOG.md), [CLI interface](docs/CLI.md), [contribution notes](CONTRIBUTING.md) and [release notes](docs/RELEASE-0.1.0.md).

## Attribution and status

Owly and the backend code in the supplied patch originate from [T4T5's Owly project](https://github.com/t4t5/owly). This frontend is an independent integration and is not an official Owly release. The backend patch has not been submitted or accepted upstream. This repository is not an approved extensions.gnome.org listing.

The existing [MIT license](LICENSE) and upstream copyright notice are preserved, including in the extension ZIP. Further GNOME Extensions review work is deferred; a packaged release is not a claim of review compliance.
