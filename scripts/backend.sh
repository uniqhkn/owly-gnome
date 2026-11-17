#!/usr/bin/env bash
# Build the pinned backend; system installation is an explicit option.
set -euo pipefail
usage() {
    cat <<'HELP'
Usage: ./scripts/backend.sh [--check] [--install-system] [--work-dir DIR | --source DIR]

Default: fetch, patch, test and build the pinned Owly backend without sudo.
--check           Check build prerequisites only; no source/settings changes.
--install-system  Install the build using sudo and restart owlyd afterward.
--work-dir DIR    Directory for a fresh clone (default: a versioned cache folder).
--source DIR      Use an existing checkout of the pinned commit (offline-friendly).

Existing source must be clean or contain exactly the supplied patch.
No system packages or firewall rules are installed automatically.
HELP
}
fail() { printf 'Error: %s\n' "$*" >&2; exit 1; }
check=false
install_system=false
source_dir=''
work_dir=''
while (( $# )); do
    case "$1" in
        --check) check=true; shift ;;
        --install-system) install_system=true; shift ;;
        --source|--work-dir)
            (( $# >= 2 )) && [[ -n $2 ]] || fail "Missing value for $1"
            if [[ $1 == --source ]]; then source_dir=$2; else work_dir=$2; fi
            shift 2 ;;
        --help|-h) usage; exit 0 ;;
        *) usage >&2; exit 2 ;;
    esac
done
[[ $EUID -ne 0 ]] || fail 'Run as your desktop user; only system installation uses sudo.'
[[ -z $source_dir || -z $work_dir ]] || fail 'Choose --source or --work-dir, not both.'
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
base=21171d8f9a08bfa2c625a1fa338e877a67913e54
patch=$root/patches/0001-cli-json-interface.patch
for tool in git cargo rustc cmp cc; do command -v "$tool" >/dev/null || fail "Missing build command: $tool"; done
rust_version=$(rustc --version)
if [[ $rust_version =~ rustc\ ([0-9]+)\.([0-9]+) ]]; then
    (( BASH_REMATCH[1] > 1 || (BASH_REMATCH[1] == 1 && BASH_REMATCH[2] >= 88) )) || fail 'Rust 1.88 or newer is required.'
else fail "Cannot determine Rust version: $rust_version"; fi
if $install_system; then
    for tool in sudo systemctl nmcli; do command -v "$tool" >/dev/null || fail "Missing system-install command: $tool"; done
fi
printf 'Build prerequisites available: %s\n' "$rust_version"
printf 'Native dependencies and runtime hardware requirements are documented in docs/BACKEND.md.\n'
if $check; then exit 0; fi
if [[ -n $source_dir ]]; then
    [[ -d $source_dir ]] || fail 'The --source directory does not exist.'
else
    source_dir=${work_dir:-${XDG_CACHE_HOME:-$HOME/.cache}/owly-gnome/backend-$base}
    if [[ ! -e $source_dir ]]; then
        mkdir -p -- "$(dirname -- "$source_dir")"
        git clone --no-checkout https://github.com/t4t5/owly.git "$source_dir"
        git -C "$source_dir" checkout --detach "$base"
    fi
fi
source_dir=$(cd -- "$source_dir" && pwd)
[[ $(git -C "$source_dir" rev-parse --show-toplevel) == "$source_dir" ]] || fail 'Source must be the root of its own Git checkout.'
[[ $(git -C "$source_dir" rev-parse HEAD) == "$base" ]] || fail "Source must be pinned to $base; it was not changed."
[[ -z $(git -C "$source_dir" ls-files --others --exclude-standard) ]] || fail 'Source has untracked files; use a fresh checkout.'
if [[ -z $(git -C "$source_dir" status --porcelain --untracked-files=no) ]]; then
    git -C "$source_dir" apply --check "$patch"
    git -C "$source_dir" apply "$patch"
elif ! cmp -s <(git -C "$source_dir" diff --binary HEAD) "$patch"; then
    fail 'Source contains changes other than the exact supplied patch; it was not changed.'
fi
printf 'Testing and building patched Owly in %s\n' "$source_dir"
# Use a fixed build directory so the upstream installer finds these binaries.
(cd -- "$source_dir" && CARGO_TARGET_DIR="$source_dir/target" cargo test --locked -p owly-cli)
(cd -- "$source_dir" && CARGO_TARGET_DIR="$source_dir/target" cargo build --release --locked -p owlyd -p owly-cli)
if ! $install_system; then
    printf 'Build complete; system files were not changed. To install, rerun with --install-system.\n'
    exit 0
fi
printf 'Installing to system paths and restarting owlyd. A sudo prompt may appear.\n'
install_args=("TARGET=$source_dir/target")
# The upstream service needs /usr/libexec under SELinux.
if [[ -d /sys/fs/selinux ]]; then install_args+=(LIBEXECDIR=/usr/libexec); fi
(cd -- "$source_dir" && sudo env "${install_args[@]}" sh packaging/install.sh owly)
sudo systemctl daemon-reload
sudo systemctl enable --now owlyd
sudo systemctl restart owlyd
sudo nmcli general reload conf
printf 'Backend installed. Run owly doctor to verify radio/hardware operation.\n'
