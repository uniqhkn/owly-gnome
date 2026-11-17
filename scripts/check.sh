#!/usr/bin/env bash
set -euo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$root"
for script in scripts/*.sh; do bash -n "$script"; done
node --input-type=module --check < extension/extension.js
node --input-type=module --check < extension/chooser.js
node tests/process.mjs
python3 tests/installer.py
python3 tests/backend.py
python3 tests/draft.py
python3 - <<'CHECK'
import json
from pathlib import Path
metadata = json.loads(Path('extension/metadata.json').read_text())
assert metadata['uuid'] == 'owly-quick-settings@owly.local'
assert metadata['version'] == 4
assert Path('patches/0001-cli-json-interface.patch').stat().st_size > 0
print('Metadata and backend patch checks passed')
CHECK
