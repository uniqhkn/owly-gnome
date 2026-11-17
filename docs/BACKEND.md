# Owly backend setup

The frontend calls the Owly CLI. Its JSON additions are distributed as a separate patch so this repository does not contain a duplicate of the whole Owly source tree.

## Pinned base

- Upstream: https://github.com/t4t5/owly
- Base commit: `21171d8f9a08bfa2c625a1fa338e877a67913e54`
- Patch: `patches/0001-cli-json-interface.patch`
- Changed files: `crates/owly-cli/src/{airdrop,main,radio}.rs`

No radio daemon, Wi-Fi driver or AirDrop protocol state machine changes are included.

## Build

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
