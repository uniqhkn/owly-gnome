# Owly Quick Settings

An unofficial GNOME frontend for Owly. Project source and installation guide:
https://github.com/uniqhkn/owly-gnome

Requires GJS, GTK 4, and an Owly CLI with the JSON interface patch supplied by that project. A stock CLI without `browse --json`, `receive --json` and `radio up --json` is insufficient.

Turn sharing off before updating this ZIP. Install as your desktop user, then log out and back in. Enable with:

```sh
gnome-extensions enable owly-quick-settings@owly.local
```

The tile remains available when sharing is off. For hardware and network requirements, see https://github.com/t4t5/owly.

Licensed under MIT; see LICENSE. This is not an official Owly release or an approved GNOME Extensions listing.
