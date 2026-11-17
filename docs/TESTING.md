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
