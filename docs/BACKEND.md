# Owly backend setup

The frontend calls the Owly CLI. Its JSON additions are distributed as a separate patch so this repository does not contain a duplicate of the whole Owly source tree.

## Pinned base

- Upstream: https://github.com/t4t5/owly
- Base commit: `21171d8f9a08bfa2c625a1fa338e877a67913e54`
- Patch: `patches/0001-cli-json-interface.patch`
- Changed files: `crates/owly-cli/src/{airdrop,main,radio}.rs`

No radio daemon, Wi-Fi driver or AirDrop protocol state machine changes are included.

## Prerequisites

Automatic system installation targets a GNOME desktop using systemd and NetworkManager. It is not a NixOS installation mechanism.

Install these using your distribution's package manager before setup:

- Git, Rust/Cargo 1.88 or newer, a C compiler (`cc`) and the usual native build toolchain.
- GJS, GTK 4 introspection support, GNOME Shell and its `gnome-extensions` command.
- sudo, D-Bus, systemd, polkit, NetworkManager (`nmcli`), iproute2 (`ip`), iputils (`ping`) and util-linux (`mount`). These runtime requirements follow the pinned Owly packaging.
- BlueZ for Bluetooth wake-up advertisements; hostapd is needed for radio modes that use a hidden AP.

Package names and installation paths vary by distribution. The scripts report missing commands and do not run a package manager. Wi-Fi hardware support and firewall setup remain upstream Owly requirements. A successful preflight does not establish that the radio works.

## Guided setup

From the frontend repository root, without sudo:

```sh
./scripts/setup.sh --check
./scripts/setup.sh
```

The first command performs desktop/build prerequisite checks only. It does not download, patch, compile, contact the daemon, request sudo or change settings. It does not prove network access or native/runtime completeness.

The second command clones the pinned backend into a versioned folder under `${XDG_CACHE_HOME:-$HOME/.cache}/owly-gnome/`, applies the supplied patch, runs CLI tests and builds release binaries. Only after successful tests/build does it invoke the upstream system installer using sudo, reload/start/restart owlyd and reload NetworkManager configuration. Then it installs/enables the extension for the current user. Log out and back in afterward.

This overwrites Owly's existing system installation paths and restarts its daemon. Turn off sharing first. The installer is not transactional: a system-install failure is reported, but already installed system files are not automatically rolled back. Removing the frontend does not uninstall Owly.

A different fresh clone location can be selected:

```sh
./scripts/setup.sh --work-dir /path/to/new/owly-backend
```

For an existing checkout at the pinned base:

```sh
./scripts/setup.sh --source /path/to/owly-backend
```

Only clean sources or sources containing exactly this project's patch are accepted. Other tracked changes, untracked files, and the wrong base are rejected without resetting or cleaning the checkout. Repeating setup with exactly the supplied patch is supported.

To test/build without changing system files:

```sh
./scripts/backend.sh --source /path/to/owly-backend
```

Add `--install-system` to explicitly install that build. The script uses the checkout's `target/` directory, and `/usr/libexec` on detected SELinux systems. Offline builds require both an existing checkout and cached Cargo dependencies; use `CARGO_NET_OFFLINE=true` if required. Downloading from GitHub and crates.io on a new machine still requires working networking.

## Manual build


Install Rust 1.88 or newer and upstream Owly's distribution-specific dependencies first. From this frontend checkout:

```sh
git clone https://github.com/t4t5/owly.git ../owly-backend
git -C ../owly-backend checkout 21171d8f9a08bfa2c625a1fa338e877a67913e54
git -C ../owly-backend apply --check "$PWD/patches/0001-cli-json-interface.patch"
git -C ../owly-backend apply "$PWD/patches/0001-cli-json-interface.patch"
cd ../owly-backend
cargo build --release --locked -p owlyd -p owly-cli
sudo sh packaging/install.sh owly
sudo systemctl daemon-reload
sudo systemctl enable --now owlyd
sudo systemctl restart owlyd
sudo nmcli general reload conf
```

The pinned checkout is detached intentionally. Use a fresh checkout; do not apply this patch twice. Review upstream packaging for your distribution. On SELinux systems, review `LIBEXECDIR` before installation. The upstream install script documents its environment overrides.

Run `owly doctor`. Ensure the firewall permits the upstream receiver requirements (TCP 8771 on awdl0). Do not broadly disable your firewall.

Return to the frontend checkout and run `./scripts/install.sh --check` and `./scripts/install.sh`.

## Upstream contribution

The JSON interface is a candidate for a separate upstream PR. The supplied patch includes JSON output, explicit flushing, stdin decisions tied to request IDs, and decision-parser tests. No upstream acceptance or release support is implied.
