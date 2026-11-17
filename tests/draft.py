"""Check draft-only release updates without GitHub writes."""
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

root = Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix="owly-draft-test-") as temp:
    project = Path(temp)
    (project / "scripts").mkdir()
    (project / "bin").mkdir()
    shutil.copy(root / "scripts/update-draft.sh", project / "scripts/update-draft.sh")
    log = project / "calls"
    commands = {
        "git": '''case "$1" in
status) printf '%s' "${TEST_DIRTY:-}" ;;
rev-parse) echo local-head ;;
esac''',
        "gh": '''case "$1 $2" in
"auth status") exit 0 ;;
"release view") echo "${TEST_DRAFT:-true}" ;;
"api "*) echo "${TEST_REMOTE_HEAD:-local-head}" ;;
*) echo "$*" >> "$TEST_LOG" ;;
esac''',
    }
    for name, body in commands.items():
        path = project / "bin" / name
        path.write_text("#!/bin/bash\n" + body + "\n")
        path.chmod(0o755)
    for name in ["check.sh", "pack.sh"]:
        path = project / "scripts" / name
        path.write_text('#!/bin/bash\necho "' + name + '" >> "$TEST_LOG"\n')
        path.chmod(0o755)
    env = {**os.environ, "PATH": str(project / "bin") + ":" + os.environ["PATH"], "TEST_LOG": str(log)}
    def run(extra, success):
        if log.exists(): log.unlink()
        result = subprocess.run([str(project / "scripts/update-draft.sh")], env={**env, **extra}, capture_output=True)
        assert (result.returncode == 0) == success, result.stderr
        return log.read_text() if log.exists() else ""
    for case in [{"TEST_DIRTY": " M file"}, {"TEST_DRAFT": "false"}, {"TEST_REMOTE_HEAD": "other"}]:
        assert not run(case, False), "Invalid state reached release writes"
    calls = run({}, True)
    assert calls.startswith("check.sh\npack.sh\nrelease edit")
    assert "release upload v0.1.0" in calls
    assert "publish" not in calls and "--draft=false" not in calls
print("Draft update guards passed")
