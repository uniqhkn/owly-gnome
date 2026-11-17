"""Check installer flow without modifying GNOME settings or user files."""
import os
import subprocess
import tempfile
from pathlib import Path

script = Path(__file__).resolve().parents[1] / "scripts/install.sh"
with tempfile.TemporaryDirectory(prefix="owly-installer-test-") as temp:
    directory = Path(temp)
    log = directory / "calls"
    commands = {
        "gnome-shell": 'echo "GNOME Shell 51.1"',
        "gjs": "exit 0",
        "owly": 'if [ "${TEST_NO_JSON:-}" = 1 ]; then echo usage; else echo --json; fi',
        "gnome-extensions": '''echo "$*" >> "$TEST_LOG"
case "$1" in
    pack) for arg in "$@"; do case "$arg" in --out-dir=*) dest=${arg#--out-dir=} ;; esac; done
          touch "$dest/owly-quick-settings@owly.local.shell-extension.zip" ;;
    list) echo owly@owly.local ;;
    install) test -f "$3" ;;
esac''',
    }
    for name, body in commands.items():
        executable = directory / name
        executable.write_text("#!/bin/bash\n" + body + "\n")
        executable.chmod(0o755)
    env = {**os.environ, "PATH": str(directory) + ":" + os.environ["PATH"],
           "DBUS_SESSION_BUS_ADDRESS": "mock", "TEST_LOG": str(log)}
    subprocess.run([str(script), "--check"], env=env, check=True, capture_output=True)
    assert not log.exists(), "check mode changed extensions"
    failed = subprocess.run([str(script), "--check"], env={**env, "TEST_NO_JSON": "1"}, capture_output=True)
    assert failed.returncode != 0 and b"lacks --json" in failed.stderr
    subprocess.run([str(script)], env=env, check=True, capture_output=True)
    calls = log.read_text().splitlines()
    assert "disable owly@owly.local" in calls
    assert any(x.startswith("install --force ") for x in calls)
    assert calls[-1] == "enable owly-quick-settings@owly.local"
print("Installer checks passed")
