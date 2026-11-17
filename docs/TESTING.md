# Validation

Run `./scripts/check.sh`. It checks shell and JavaScript syntax, stream/exit ordering, late callbacks after stop, refresh behavior, and installer command flow using mocked desktop commands. These checks do not simulate an AirDrop radio or a GNOME compositor.

For backend tests, after applying the patch in an Owly checkout:

```sh
cargo fmt --all --check
cargo test --locked -p owly-cli
```

User-reported desktop: GNOME Shell 51.1. Transfers have succeeded in both directions with iPhone and iPad. GNOME 45–50 are API targets, not verified platforms. Device models and OS versions were not recorded. A later login/reboot cleared an intermittent connectivity failure without establishing its cause.

Before a release, manually check: off/on state, discovery with an empty list and a responding device, refresh without closing the menu, file chooser cancellation, sending one/multiple files, receiving accept/decline/timeout, shutdown during activity, and persistence after login. Check light/dark themes, keyboard focus and Shell logs. Record exact device models and OS versions when available.

## Recorded extraction checks

During standalone extraction, `cargo test --locked --offline -p owly-cli` passed all 13 tests against the working patched Owly checkout. The exported backend patch applied cleanly to the pinned base and reproduced all three modified CLI files byte for byte. Frontend checks and extension/source packaging also passed. No additional live GNOME or device test was performed during extraction, and the GitHub Actions workflow has not yet run remotely.

## Guided installation validation

`tests/backend.py` uses real disposable Git fixtures and mocked Cargo/desktop/system commands. It checks a fresh clone path (mapped to a local Git fixture), patch application, exact-patch reruns, dirty/untracked source refusal, Rust version rejection, failed-test prevention of sudo, and the setup-to-frontend flow. These tests do not install packages, restart services or modify the user's desktop.

A separate clean pinned checkout was created from locally available upstream Git objects, with no previous target directory. The actual backend script was run with cached Cargo dependencies and offline mode. All 13 CLI tests passed and both release binaries were built. The completed script was rerun successfully against the exact patched checkout without privileged installation. This validates real patch/test/build behavior locally, not an internet download, a new OS installation or a second physical machine. Privileged installation and the GNOME session were not altered during this verification.
