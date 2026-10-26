// Standalone GTK picker: never import GTK into GNOME Shell itself.
imports.gi.versions.Gtk = ARGV[0];
imports.gi.versions.Gdk = ARGV[0];
const {Gtk, Gio, GLib, Gdk} = imports.gi;
if (ARGV[0] === '3.0') Gtk.init(null); else Gtk.init();
const source = Gio.SettingsSchemaSource.new_from_directory(ARGV[1], Gio.SettingsSchemaSource.get_default(), false);
const settings = new Gio.Settings({settings_schema: source.lookup('org.gnome.shell.extensions.paneltag', false)});
const dialog = new Gtk.ColorChooserDialog({title: 'PanelTag — Custom color', use_alpha: false});
const rgba = new Gdk.RGBA();
rgba.parse(settings.get_string('color'));
dialog.set_rgba(rgba);
const loop = new GLib.MainLoop(null, false);
dialog.connect('response', (_dialog, response) => {
    if (response === Gtk.ResponseType.OK) {
        const c = dialog.get_rgba();
        const hex = '#' + [c.red, c.green, c.blue].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
        settings.set_boolean('follow-theme', false);
        settings.set_string('color', hex);
        Gio.Settings.sync();
    }
    dialog.destroy();
    loop.quit();
});
if (ARGV[0] === '3.0') dialog.show_all(); else dialog.present();
loop.run();
