import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import GLib from 'gi://GLib';
import St from 'gi://St';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as QuickSettings from 'resource:///org/gnome/shell/ui/quickSettings.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

// Normal menu items emit activate, which closes their parent menu.
// Refresh is an inline action: handle activation without emitting that signal.
const RefreshMenuItem = GObject.registerClass(
class RefreshMenuItem extends PopupMenu.PopupMenuItem {
    _init(callback) {
        super._init('Refresh nearby devices');
        this._callback = callback;
    }

    activate(_event) {
        this._callback();
    }
});

export default class Owly extends Extension {
    enable() {
        this._alive = true;
        this._processes = new Set();
        this._requests = new Map();
        this._indicator = new QuickSettings.SystemIndicator();
        this._button = new QuickSettings.QuickMenuToggle({
            title: 'Owly', subtitle: 'Off',
            iconName: 'folder-send-symbolic', toggleMode: true,
        });
        // Keep the tile available even while sharing is off.
        this._button.visible = true;
        this._indicator.quickSettingsItems.push(this._button);
        this._button.connect('clicked', () => this._button.checked ? this._start() : this._stop());
        const menu = this._button.menu;
        menu.setHeader('folder-send-symbolic', 'Owly', 'Share files with AirDrop');
        menu.actor.add_style_class_name('owly-menu');
        this._status = new PopupMenu.PopupMenuItem('Owly is off', {reactive: false});
        menu.addMenuItem(this._status);
        this._refresh = new RefreshMenuItem(() => this._browse());
        menu.addMenuItem(this._refresh);
        this._refresh.add_style_class_name('owly-refresh');
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem('Devices · select to send'));
        this._devices = new PopupMenu.PopupMenuSection();
        menu.addMenuItem(this._devices);
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem('Incoming requests'));
        this._incoming = new PopupMenu.PopupMenuSection();
        menu.addMenuItem(this._incoming);
        this._emptyIncoming = new PopupMenu.PopupMenuItem('No pending requests', {reactive: false});
        this._incoming.addMenuItem(this._emptyIncoming);
        this._emptyDevices();
        const downloads = menu.addAction('Open Downloads', () => {
            Gio.AppInfo.launch_default_for_uri(Gio.File.new_for_path(this._downloads()).get_uri(), null);
        });
        downloads.add_style_class_name('owly-action');
        this._status.add_style_class_name('owly-status');
        Main.panel.statusArea.quickSettings.addExternalIndicator(this._indicator);
        this._refresh.setSensitive(false);
    }

    _downloads() {
        return GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DOWNLOAD) ?? GLib.build_filenamev([GLib.get_home_dir(), 'Downloads']);
    }

    _say(text) {
        if (!this._alive) return;
        this._status.label.text = text;
        this._status.label.clutter_text.line_wrap = true;
        this._button.subtitle = this._requests.size ? 'Incoming request' :
            this._sending ? 'Sending…' : this._browsing ? 'Searching…' :
            this._ready ? 'Ready to share' : this._button.checked ? 'Starting…' : 'Off';
    }

    // Each process owns its cancellable; disable cancels all outstanding callbacks.
    _spawn(argv, onLine, onExit, input = false) {
        const proc = Gio.Subprocess.new(argv, Gio.SubprocessFlags.STDOUT_PIPE |
            Gio.SubprocessFlags.STDERR_PIPE | (input ? Gio.SubprocessFlags.STDIN_PIPE : 0));
        const record = {proc, cancel: new Gio.Cancellable(), error: '', exited: false, drained: false, errorsDrained: false};
        const finish = () => {
            if (!record.exited || !record.drained || !record.errorsDrained) return;
            this._processes.delete(record);
            if (this._alive && !record.stopped) onExit(proc.get_successful(), record.error);
        };
        this._processes.add(record);
        const read = (pipe, callback, stdout = false) => {
            const stream = new Gio.DataInputStream({base_stream: pipe});
            const next = () => stream.read_line_async(GLib.PRIORITY_DEFAULT, record.cancel, (source, result) => {
                try {
                    const [line] = source.read_line_finish_utf8(result);
                    if (line === null) {
                        if (stdout) record.drained = true;
                        else record.errorsDrained = true;
                        finish();
                        return;
                    }
                    if (this._alive && !record.stopped) callback(line);
                    if (!record.stopped) next();
                } catch (error) {
                    if (!record.cancel.is_cancelled()) console.error(error);
                }
            });
            next();
        };
        read(proc.get_stdout_pipe(), onLine, true);
        read(proc.get_stderr_pipe(), line => { record.error = line.slice(0, 300); });
        proc.wait_async(null, (source, result) => {
            try {
                source.wait_finish(result);
                record.exited = true;
                finish();
            } catch (error) { console.error(error); }
        });
        return record;
    }

    _json(line, callback) {
        try { callback(JSON.parse(line)); } catch (error) { console.error(error); }
    }

    _start() {
        this._say('Starting radio…');
        try {
            this._radio = this._spawn(['owly', 'radio', 'up', '--json'], line => this._json(line, event => {
                if (event.event !== 'ready') return;
                try {
                const dir = this._downloads();
                GLib.mkdir_with_parents(dir, 0o700);
                this._receiver = this._spawn(['owly', 'receive', '--json', '--dir', dir],
                    line => this._json(line, event => this._receive(event)),
                    (_ok, error) => { this._stop(); this._say(`Receiver stopped: ${error}`); }, true);
                } catch (error) { this._stop(); this._say(error.message); }
            }), (_ok, error) => { this._stop(); this._say(`Radio stopped: ${error}`); });
        } catch (error) {
            this._stop();
            this._say(`Could not start: ${error.message}`);
        }
    }

    _receive(event) {
        if (event.event === 'ready') {
            this._ready = true;
            this._refresh.setSensitive(true);
            this._say('Ready to receive files');
            this._browse();
        } else if (event.event === 'request') {
            this._emptyIncoming.visible = false;
            const section = new PopupMenu.PopupMenuSection();
            section.actor.add_style_class_name('owly-request');
            section.addMenuItem(new PopupMenu.PopupMenuItem(`${event.sender}: ${event.items.join(', ')}`.slice(0, 220), {reactive: false}));
            section.addAction('Accept', () => this._answer(event.id, true)).add_style_class_name('owly-accept');
            section.addAction('Decline', () => this._answer(event.id, false)).add_style_class_name('owly-decline');
            this._requests.set(event.id, section);
            this._incoming.addMenuItem(section);
            Main.notify('Owly · Incoming files', `${event.sender} wants to send files. Respond in the Owly menu within 15 seconds.`);
            this._say('Waiting for your approval');
            Main.panel.statusArea.quickSettings.menu.open();
            this._button.menu.open();
        } else if (event.event === 'withdrawn') {
            this._removeRequest(event.id);
            this._say('Incoming request expired or was withdrawn');
        } else if (event.event === 'received') {
            this._removeRequest(event.id);
            this._say(`${event.paths.length} file(s) saved to Downloads`);
            Main.notify('Owly', 'Files received and saved to Downloads.');
        } else if (event.event === 'failed') {
            this._removeRequest(event.id);
            this._say(`Transfer failed: ${event.reason}`);
        } else if (event.event === 'urls') {
            this._removeRequest(event.id);
            this._say(`Link received: ${event.urls.join(', ')}`.slice(0, 220));
        }
    }

    _removeRequest(id) {
        this._requests.get(id)?.destroy();
        this._requests.delete(id);
        this._emptyIncoming.visible = this._requests.size === 0;
    }

    _answer(id, accept) {
        if (!this._receiver || !this._requests.has(id)) return;
        try {
            const bytes = new TextEncoder().encode(`${JSON.stringify({id, accept})}\n`);
            this._receiver.proc.get_stdin_pipe().write_all(bytes, null);
            this._removeRequest(id);
            this._say(accept ? 'Receiving files…' : 'Request declined');
        } catch (error) { this._say(error.message); }
    }

    _browse() {
        if (!this._ready || this._browsing) return;
        this._browsing = true;
        this._devices.removeAll();
        this._refresh.setSensitive(false);
        this._say('Searching for devices…');
        const empty = new PopupMenu.PopupMenuItem('Searching for nearby Apple devices…', {reactive: false});
        this._devices.addMenuItem(empty);
        let count = 0;
        try {
            this._spawn(['owly', 'browse', '--json', '--seconds', '15'], line => this._json(line, device => {
                if (device.event !== 'receiver') return;
                if (count === 0) empty.destroy();
                count++;
                const item = this._devices.addAction(device.name, () => this._send(device));
                item.add_style_class_name('owly-device');
                item.add_child(new St.Icon({icon_name: 'go-next-symbolic', style_class: 'popup-menu-icon'}));
                item.insert_child_at_index(new St.Icon({icon_name: 'phone-symbolic', style_class: 'popup-menu-icon'}), 0);
            }), (ok, error) => {
                if (count === 0) empty.label.text = 'No devices found. Turn on AirDrop and try again.';
                this._browsing = false;
                this._refresh.setSensitive(this._ready);
                this._say(ok ? (count ? `${count} device(s) found` : 'No devices found · check AirDrop on your iPhone') : error);
            });
        } catch (error) {
            this._browsing = false;
            this._refresh.setSensitive(true);
            this._say(error.message);
        }
    }

    _send(device) {
        if (!this._ready || this._sending) return;
        this._sending = true;
        this._button.menu.close();
        Main.panel.statusArea.quickSettings.menu.close();
        try {
            let files = [];
            this._spawn(['gjs', '-m', `${this.path}/chooser.js`], line => this._json(line, result => { files = result; }), ok => {
                if (!ok || !files.length) { this._sending = false; this._say('File selection cancelled'); return; }
                this._say(`Sending to ${device.name}…`);
                try {
                    let outcome = '';
                    this._spawn(['owly', 'send', '--to', device.id, '--', ...files], line => {
                        // CLI outcomes (including protocol failures) are on stdout.
                        if (line.trim()) outcome = line.trim();
                    }, (sent, error) => {
                        const reason = outcome && outcome !== 'delivered' ? outcome : error || 'The sender exited without details';
                        if (!sent) console.warn(`Owly send failed: ${reason}`);
                        this._sending = false;
                        this._say(sent ? 'Files sent' : `Could not send: ${reason}`);
                        Main.notify('Owly', sent ? 'Files sent.' : `Could not send: ${reason}`);
                    });
                } catch (error) { this._sending = false; this._say(error.message); }
            });
        } catch (error) { this._sending = false; this._say(error.message); }
    }

    _stop() {
        this._ready = false;
        this._browsing = false;
        this._sending = false;
        for (const record of this._processes) {
            record.stopped = true;
            record.cancel.cancel();
            // SIGTERM lets `owly radio up` release its lease and restore Wi-Fi.
            record.proc.send_signal(15);
        }
        this._processes.clear();
        this._radio = null;
        this._receiver = null;
        for (const id of this._requests.keys()) this._removeRequest(id);
        this._devices.removeAll();
        this._refresh.setSensitive(false);
        this._button.checked = false;
        this._button.visible = true;
        this._emptyDevices();
        this._say('Owly is off');
    }

    _emptyDevices() {
        this._devices.addMenuItem(new PopupMenu.PopupMenuItem(
            'Turn on sharing, then refresh nearby devices.', {reactive: false}));
    }

    disable() {
        this._alive = false;
        this._stop();
        this._button.destroy();
        this._indicator.destroy();
        this._indicator = null;
        this._button = null;
    }
}
