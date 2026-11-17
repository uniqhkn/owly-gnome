// Exercise stream/exit ordering without a running GNOME Shell.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('../extension/extension.js', import.meta.url), 'utf8')
    .replace(/^import .*;\n/gm, '').replace('export default class Owly', 'globalThis.Owly = class Owly');
let waitCallback;
const pipes = [{}, {}];
const proc = {
    get_stdout_pipe: () => pipes[0], get_stderr_pipe: () => pipes[1],
    wait_async: (_cancel, callback) => { waitCallback = callback; },
    wait_finish() {}, get_successful: () => false,
};
const context = vm.createContext({console, Extension: class {}, GObject: {registerClass: c => c}, PopupMenu: {PopupMenuItem: class {}}, GLib: {PRIORITY_DEFAULT: 0}, Gio: {
    Subprocess: {new: () => proc}, SubprocessFlags: {STDOUT_PIPE: 1, STDERR_PIPE: 2, STDIN_PIPE: 4},
    Cancellable: class { is_cancelled() { return false; } },
    DataInputStream: class {
        constructor({base_stream}) { this.pipe = base_stream; }
        read_line_async(_priority, _cancel, callback) { this.pipe.deliver = line => callback(this, line); }
        read_line_finish_utf8(line) { return [line]; }
    },
}});
vm.runInContext(source, context);
const app = new context.Owly();
app._alive = true;
app._processes = new Set();
let lines = [], completed = [];
app._spawn(['owly'], line => lines.push(line), (ok, error) => completed.push({ok, error}));
waitCallback(proc, null); // Exit can be observed before pipe callbacks.
assert.equal(completed.length, 0);
pipes[0].deliver('failed: upload rejected');
pipes[0].deliver(null);
assert.equal(completed.length, 0); // stderr must drain too.
pipes[1].deliver('diagnostic');
pipes[1].deliver(null);
assert.deepEqual(lines, ['failed: upload rejected']);
assert.deepEqual(completed, [{ok: false, error: 'diagnostic'}]);
assert.equal(app._processes.size, 0);
const record = app._spawn(['owly'], () => assert.fail('stopped callback ran'), () => assert.fail('stopped exit ran'));
record.stopped = true;
pipes[0].deliver('late output');
waitCallback(proc, null);
console.log('Process ordering and stopped callback checks passed');

// Refresh activation must not emit the menu-closing activate signal.
const Refresh = vm.runInContext('RefreshMenuItem', context);
const refresh = new Refresh();
let refreshes = 0;
refresh._callback = () => refreshes++;
refresh.emit = () => assert.fail('Refresh emitted a menu-closing signal');
refresh.activate(null);
assert.equal(refreshes, 1);
console.log('Refresh stays open check passed');
