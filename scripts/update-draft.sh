#!/usr/bin/env bash
# Refresh only an existing draft; never publish or change a published release.
set -euo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$root"
repo=uniqhkn/owly-gnome
tag=v0.1.0
command -v gh >/dev/null || { printf 'GitHub CLI (gh) is required.\n' >&2; exit 1; }
[[ -z $(git status --porcelain) ]] || { printf 'Commit or stash local changes before packaging a release.\n' >&2; exit 1; }
gh auth status >/dev/null
[[ $(gh release view "$tag" --repo "$repo" --json isDraft --jq .isDraft) == true ]] || {
    printf 'Refusing to update: release is missing or is not a draft.\n' >&2; exit 1;
}
[[ $(git rev-parse HEAD) == "$(gh api "repos/$repo/commits/main" --jq .sha)" ]] || {
    printf 'Check out the latest main commit before updating the draft.\n' >&2; exit 1;
}
./scripts/check.sh
./scripts/pack.sh
gh release edit "$tag" --repo "$repo" --target main --notes-file docs/RELEASE-0.1.0.md
gh release upload "$tag" --repo "$repo" --clobber \
    dist/owly-quick-settings@owly.local.shell-extension.zip \
    dist/owly-gnome-0.1.0-source.tar.gz
printf 'Draft updated. It has not been published.\n'
