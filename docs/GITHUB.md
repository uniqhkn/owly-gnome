# First GitHub publication

The local repository is prepared for `uniqhkn/owly-gnome`. No remote repository or release is created by the local packaging scripts.

## 1. Authenticate

From a terminal on your computer:

```sh
gh auth login --hostname github.com --git-protocol https --web
gh auth status
```

Sign in to the `uniqhkn` account using the browser. Do not share passwords, tokens or device codes in issues or chat.

## 2. Create and push

From this repository root (the folder containing this README and `scripts/`):

```sh
gh repo create uniqhkn/owly-gnome --public --source=. --remote=origin --push --description "Unofficial GNOME Quick Settings frontend for Owly AirDrop"
```

This command publishes the committed source publicly. If GitHub says the name already exists, inspect that repository before adding a remote or pushing; do not overwrite an unrelated project.

Open the repository and verify README rendering, attribution and the Actions checks:

```sh
gh repo view --web
```

## 3. Create a draft release

After reviewing the repository and passing checks:

```sh
./scripts/check.sh
./scripts/pack.sh
gh release create v0.1.0 --draft --title "Owly GNOME 0.1.0" --notes-file docs/RELEASE-0.1.0.md dist/owly-quick-settings@owly.local.shell-extension.zip dist/owly-gnome-0.1.0-source.tar.gz
```

Review the draft before publishing. Add a real screenshot of the working Owly Quick Settings submenu if available; do not use a mockup as evidence of compatibility. The extension ZIP requires the separately patched Owly backend.

## 4. Later upstream work

Open a separate Owly contribution proposing the JSON CLI interface. Keep it independent of this repository's UI. Do not present the patch as accepted upstream. Plan GNOME Extensions submission as a separate review task.

## Refresh an existing draft after merging setup improvements

From a clean checkout of the latest main commit:

```sh
./scripts/update-draft.sh
```

This verifies authentication, requires the existing release to be a draft and the local commit to match GitHub main, runs checks and packaging, then updates notes and replaces the two assets. It never publishes the release. It requires terminal network access and the GitHub CLI; the connected repository tools do not provide release asset uploads.
