// GTK runs out of process: GTK must never be imported into GNOME Shell.
import Gtk from 'gi://Gtk?version=4.0';
import Gio from 'gi://Gio';

const app = new Gtk.Application({application_id: 'io.github.owly.FileChooser', flags: Gio.ApplicationFlags.NON_UNIQUE});
app.connect('activate', () => {
    const dialog = new Gtk.FileChooserNative({title: 'Choose files to send', action: Gtk.FileChooserAction.OPEN,
        accept_label: 'Send', cancel_label: 'Cancel', select_multiple: true});
    app.hold();
    dialog.connect('response', (_dialog, response) => {
        const paths = [];
        if (response === Gtk.ResponseType.ACCEPT) {
            const files = dialog.get_files();
            for (let i = 0; i < files.get_n_items(); i++) {
                const path = files.get_item(i).get_path();
                if (path) paths.push(path);
            }
        }
        print(JSON.stringify(paths));
        dialog.destroy();
        app.release();
    });
    dialog.show();
});
app.run([]);
