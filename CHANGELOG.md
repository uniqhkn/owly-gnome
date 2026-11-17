# Changelog

## 0.1.0

- Extracted the working Quick Settings frontend into its own repository.
- Preserved the original development UUID and integer extension version 4 for update compatibility.
- Added an Owly on/off tile, nearby discovery, inline refresh, GTK file selection, sending and incoming approval/decline.
- Added Downloads integration, notifications and English interface text.
- Added distinct device/action styling, hover/focus states and approval colors.
- Preserved send errors and guarded child-process cleanup and output ordering.
- Added user install/uninstall, checks and packaging scripts with automated checks.
- Separated the required Owly CLI JSON changes into a patch against a pinned upstream commit.
- Added English usage, dependency, contribution and release documentation with upstream attribution.

The earlier panel-menu prototype remains in the original development workspace and is not included as a second extension in this release. The source extraction does not modify the installed working extension.
