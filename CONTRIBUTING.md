# Contributing

Keep source, interface text, documentation and issue reports in English. Run `./scripts/check.sh` and describe manual GNOME/device tests. Avoid claiming support for untested GNOME releases.

Keep radio/protocol changes in the Owly backend and frontend changes here. The current backend patch targets the exact commit in docs/BACKEND.md. Preserve upstream attribution and licensing notices.

For bugs, provide GNOME version, extension version, Owly revision, phone/tablet model and OS, transfer direction, the full error, and whether an approval prompt appeared. Redact personal device names, paths and network identifiers from logs.

This project does not yet have a GNOME Extensions listing. Before applying there, review its current requirements, choose a stable public UUID strategy and audit subprocess/UI lifecycle behavior. Do not treat local checks as certification.
