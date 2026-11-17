"""Exercise backend setup against real disposable Git repositories, with a fake compiler."""
import os
import subprocess
import tempfile
from pathlib import Path

root = Path(__file__).resolve().parents[1]
script_source = (root / "scripts/backend.sh").read_text()
with tempfile.TemporaryDirectory(prefix="owly-backend-test-") as temp:
    temp = Path(temp)
    fixture = temp / "fixture"
    fixture.mkdir()
    def git(*args):
        return subprocess.check_output(["git", "-C", str(fixture), *args], stderr=subprocess.DEVNULL)
    git("init", "-q")
    git("config", "user.name", "Test")
    git("config", "user.email", "test@example.invalid")
    (fixture / "file").write_text("before\n")
    git("add", ".")
    git("commit", "-qm", "Fixture")
    base = git("rev-parse", "HEAD").decode().strip()
    (fixture / "file").write_text("after\n")
    patch = git("diff", "--binary", "HEAD")
    git("checkout", "--", "file")
    project = temp / "project"
    (project / "scripts").mkdir(parents=True)
    (project / "patches").mkdir()
    runner = project / "scripts/backend.sh"
    runner.write_text(script_source.replace("21171d8f9a08bfa2c625a1fa338e877a67913e54", base))
    runner.chmod(0o755)
    (project / "patches/0001-cli-json-interface.patch").write_bytes(patch)
    import shutil
    for name in ["install.sh", "setup.sh"]:
        shutil.copy(root / "scripts" / name, project / "scripts" / name)
    (project / "extension").mkdir()
    commands = temp / "bin"
    commands.mkdir()
    log = temp / "calls"
    for name, body in {
        "rustc": 'echo "rustc ${TEST_RUST_VERSION:-1.88.0}"',
        "cargo": 'echo "cargo $*" >> "$TEST_LOG"; exit "${TEST_CARGO_EXIT:-0}"',
        "sudo": 'echo "sudo $*" >> "$TEST_LOG"; exit 0',
        "systemctl": "exit 0", "nmcli": "exit 0",
        "gnome-shell": 'echo "GNOME Shell 51.1"',
        "gjs": "exit 0", "owly": 'echo --json',
        "gnome-extensions": '''echo "gnome-extensions $*" >> "$TEST_LOG"
case "$1" in
    pack) for arg in "$@"; do case "$arg" in --out-dir=*) dest=${arg#--out-dir=} ;; esac; done
          touch "$dest/owly-quick-settings@owly.local.shell-extension.zip" ;;
    install) test -f "$3" ;;
esac''',
    }.items():
        path = commands / name
        path.write_text("#!/bin/bash\n" + body + "\n")
        path.chmod(0o755)
    real_git = shutil.which("git")
    git_wrapper = commands / "git"
    git_wrapper.write_text('''#!/bin/bash
if [[ $1 == clone ]]; then
    exec "$TEST_REAL_GIT" clone --no-checkout "$TEST_FIXTURE" "${@: -1}"
fi
exec "$TEST_REAL_GIT" "$@"
''')
    git_wrapper.chmod(0o755)
    env = {**os.environ, "TEST_REAL_GIT": real_git, "TEST_FIXTURE": str(fixture), "PATH": str(commands) + ":" + os.environ["PATH"], "TEST_LOG": str(log)}
    def run(*args, success=True, extra=None):
        result = subprocess.run([str(runner), *args], env={**env, **(extra or {})}, capture_output=True, text=True)
        assert (result.returncode == 0) == success, result.stdout + result.stderr
        return result
    run("--check", "--source", str(fixture))
    assert not log.exists()
    assert not git("diff")
    run("--check", success=False, extra={"TEST_RUST_VERSION": "1.87.0"})
    run("--source", success=False)
    run("--source", str(fixture))
    assert git("diff", "--binary", "HEAD") == patch
    assert "sudo" not in log.read_text()
    run("--source", str(fixture))  # Exact-patch reruns are accepted.
    (fixture / "file").write_text("user change\n")
    previous_calls = log.read_text()
    run("--source", str(fixture), success=False)
    assert (fixture / "file").read_text() == "user change\n"
    assert log.read_text() == previous_calls
    git("checkout", "--", "file")
    (fixture / "untracked").touch()
    run("--source", str(fixture), success=False)
    (fixture / "untracked").unlink()
    run("--source", str(fixture), "--install-system", success=False, extra={"TEST_CARGO_EXIT": "1"})
    assert "sudo" not in log.read_text(), "Failed builds must not reach system installation"
    run("--source", str(fixture), "--install-system")
    assert "sudo systemctl restart owlyd" in log.read_text()
    assert "sudo nmcli general reload conf" in log.read_text()
    env["DBUS_SESSION_BUS_ADDRESS"] = "mock"
    setup = project / "scripts/setup.sh"
    before = log.read_text()
    subprocess.run([str(setup), "--check"], env=env, check=True, capture_output=True)
    assert log.read_text() == before
    subprocess.run([str(setup), "--source", str(fixture)], env=env, check=True, capture_output=True)
    assert "gnome-extensions install --force" in log.read_text()
    assert "gnome-extensions enable owly-quick-settings@owly.local" in log.read_text()
    clone_dir = temp / "fresh checkout with spaces"
    run("--work-dir", str(clone_dir))
    assert (clone_dir / "file").read_text() == "after\n"
    run("--work-dir", str(clone_dir))
    invalid = temp / "not a checkout"
    invalid.mkdir()
    run("--source", str(invalid), success=False)
print("Backend checks passed: preflight, Rust version, patching, reruns, dirty/untracked refusal and install ordering")
