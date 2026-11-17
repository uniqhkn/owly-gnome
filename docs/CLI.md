# CLI contract

The extension invokes `owly` using argument arrays, not a shell.

- `owly radio up --json` holds a radio lease and emits `{"event":"ready"}` on stdout when acquired. SIGTERM releases the lease through the existing CLI cleanup path.
- `owly browse --json --seconds 15` emits one receiver object per discovered endpoint, with `event: "receiver"`, `id`, `name` and `address`. The selected ID is passed to `owly send --to ID -- FILES...`.
- `owly receive --json --dir PATH` emits JSON Lines events: `ready`, `request`, `withdrawn`, `received`, `urls`, `failed`.
- A request includes `id`, `sender`, `items` and `timeout` (15 seconds). Reply on stdin with a newline-terminated `{"id":1,"accept":true}` or `{"id":1,"accept":false}`. Only pending IDs can be answered. Invalid decisions are rejected; stdin EOF stops the JSON receiver.
- Send completion remains the CLI's existing textual stdout result. Diagnostics remain on stderr. The frontend drains both streams before reporting completion.

The JSON additions are frontend integration code, not additions to the AirDrop protocol specification.
