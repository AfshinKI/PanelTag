const {Gio, Clutter, GLib, St, Pango} = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const ExtensionUtils = imports.misc.extensionUtils;
class PanelTag {
    constructor() { const ext = ExtensionUtils.getCurrentExtension(); this.uuid = ext.metadata.uuid; this.metadata = ext.metadata; this.path = ext.path; }
    getSettings() { return ExtensionUtils.getSettings('org.gnome.shell.extensions.paneltag'); }

    enable() {
        this.settings = this.getSettings();
        this.interfaceSettings = new Gio.Settings({schema_id: 'org.gnome.desktop.interface'});
        this.interfaceChanged = this.interfaceSettings.connect('changed', () => this.refresh());
        this.button = new PanelMenu.Button(0.5, 'PanelTag');
        this.box = new St.BoxLayout({y_align: Clutter.ActorAlign.CENTER, style_class: 'paneltag-badge'});
        this.icon = new St.Icon({icon_size: 12, y_align: Clutter.ActorAlign.CENTER});
        this.label = new St.Label({y_align: Clutter.ActorAlign.CENTER});
        this.label.clutter_text.ellipsize = Pango.EllipsizeMode.END;
        this.box.add_child(this.icon);
        this.box.add_child(this.label);
        this.button.add_child(this.box);
        Main.panel.addToStatusArea(this.uuid, this.button, 0, this.settings.get_string('position'));
        this.button.connect('key-press-event', (_actor, event) => {
            const key = event.get_key_symbol();
            if ([Clutter.KEY_Return, Clutter.KEY_space, Clutter.KEY_Menu].includes(key)) {
                this.button.menu.toggle();
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });
        this.tooltip = new St.Label({text: GLib.get_host_name(), style_class: 'dash-label', visible: false});
        Main.layoutManager.addChrome(this.tooltip);
        this.button.connect('notify::hover', () => {
            if (this.hoverTimer) GLib.source_remove(this.hoverTimer);
            this.hoverTimer = 0;
            this.tooltip.hide();
            if (this.button.hover && !this.button.menu.isOpen) this.hoverTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 600, () => {
                this.hoverTimer = 0;
                const [x,y] = this.button.get_transformed_position();
                this.tooltip.text = GLib.get_host_name();
                this.tooltip.show();
                this.tooltip.set_position(Math.max(0, x + (this.button.width - this.tooltip.width)/2), y + this.button.height + 8);
                return GLib.SOURCE_REMOVE;
            });
        });
        this.button.menu.connect('open-state-changed', () => {
            if (this.hoverTimer) GLib.source_remove(this.hoverTimer);
            this.hoverTimer = 0;
            this.tooltip.hide();
        });
        this.buildMenu();
        this.themeContext = St.ThemeContext.get_for_stage(global.stage);
        this.themeChanged = this.themeContext.connect('changed', () => this.refresh());
        this.changed = this.settings.connect('changed', () => this.refresh());
        this.refresh();
    }
    choices(title, key, options, integer = false) {
        const row = new PopupMenu.PopupBaseMenuItem({activate: false, can_focus: false});
        if (key === 'icon') row.add_child(new St.Label({text: title, y_align: Clutter.ActorAlign.CENTER, x_expand: true}));
        const buttons = new St.BoxLayout({x_expand: true, style: 'spacing: 4px;'});
        row.add_child(buttons);
        this.button.menu.addMenuItem(row);
        const symbols = {none:'−',computer:'▣',laptop:'▱',server:'▤',left:'⇤',center:'↔',right:'⇥',filled:'●',outline:'○',text:'T',11:'a',12:'A',14:'A'};
        const items = options.map(([label, value]) => {
            const item = new St.Button({label: key === 'icon' ? (symbols[value] || label) : `${symbols[value]} ${label}`, x_expand: true, accessible_name: `${title}: ${label}`, can_focus: true});
            if (key === 'icon' && value !== 'none') item.set_child(new St.Icon({icon_name: {computer:'computer-symbolic',laptop:'computer-laptop-symbolic',server:'network-server-symbolic'}[value], icon_size: 14}));
            item.connect('clicked', () => integer ? this.settings.set_int(key, value) : this.settings.set_string(key, value));
            buttons.add_child(item);
            return {item, value, label};
        });
        this.choiceGroups.push({key, items, integer});
    }
    buildMenu() {
        this.choiceGroups = [];
        this.button.menu.box.set_style("padding: 8px; spacing: 2px; border-radius: 16px; font-size: 12px;");
        const heading = new PopupMenu.PopupBaseMenuItem({reactive: false, can_focus: false});
        const wordmark = new St.BoxLayout();
        wordmark.add_child(new St.Label({text: 'PanelTag', style: 'font-weight: bold;'}));
        wordmark.add_child(new St.Label({text: '.', style: 'font-weight: bold; color: #3584e4;'}));
        heading.add_child(wordmark);
        this.button.menu.addMenuItem(heading);
        const row = new PopupMenu.PopupBaseMenuItem({activate: false, can_focus: false});
        row.add_child(new St.Label({text: 'Name', y_align: Clutter.ActorAlign.CENTER}));
        this.entry = new St.Entry({text: this.settings.get_string('label'), can_focus: true, x_expand: true, style: 'width: 150px;'});
        this.entry.clutter_text.set_max_length(24);
        this.entry.clutter_text.connect('text-changed', () => {
            if (!this.syncing) this.settings.set_string('label', this.entry.get_text());
        });
        row.add_child(this.entry);
        this.button.menu.addMenuItem(row);
        this.hostToggle = new St.Button({accessible_name: 'Use computer name', can_focus: true});
        this.hostToggle.set_child(new St.Icon({icon_name: 'computer-symbolic', icon_size: 14}));
        this.hostToggle.connect('clicked', () => this.settings.set_boolean('hostname', !this.settings.get_boolean('hostname')));
        row.add_child(this.hostToggle);
        this.choices('Icon', 'icon', [['None','none'],['Computer','computer'],['Laptop','laptop'],['Server','server']]);
        const colors = new PopupMenu.PopupBaseMenuItem({activate: false, can_focus: false});
        const palette = new St.BoxLayout({style: 'spacing: 6px;'});
        colors.add_child(palette);
        this.swatches = [];
        for (const [label, value] of [['System appearance','system'],['Blue','#3584e4'],['Green','#278556'],['Amber','#a65b00'],['Red','#c64640'],['Purple','#8156bb'],['Graphite','#5e5c64'],['Custom color','custom']]) {
            const button = new St.Button({label: value === 'system' ? '◐' : '', accessible_name: label, can_focus: true});
            button.connect('clicked', () => {
                if (value === 'custom') {
                    const gtk = this.metadata['shell-version'].includes('3.36') ? '3.0' : '4.0';
                    Gio.Subprocess.new(['gjs', `${this.path}/color-picker.js`, gtk, `${this.path}/schemas`], Gio.SubprocessFlags.NONE);
                    this.button.menu.close();
                } else if (value === 'system') this.settings.set_boolean('follow-theme', true);
                else { this.settings.set_boolean('follow-theme', false); this.settings.set_string('color', value); }
            });
            palette.add_child(button);
            this.swatches.push({button, value});
        }
        this.button.menu.addMenuItem(colors);
        this.choices('Position', 'position', [['Left','left'],['Middle','center'],['Right','right']]);
        this.choices('Text size', 'size', [['Small',11],['Medium',12],['Large',14]], true);
        this.choices('Style', 'style', [['Filled','filled'],['Outline','outline'],['Text only','text']]);
        this.button.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this.startToggle = new PopupMenu.PopupSwitchMenuItem('Start at login', true);
        this.startToggle.connect('toggled', (_item, value) => this.settings.set_boolean('start-at-login', value));
        this.startToggle.insert_child_at_index(new St.Icon({icon_name: 'system-shutdown-symbolic', icon_size: 14, y_align: Clutter.ActorAlign.CENTER}), 0);
        this.button.menu.addMenuItem(this.startToggle);
        const reset = new St.Button({accessible_name: 'Reset defaults', can_focus: true, style: 'border-radius: 10px; padding: 8px; background-color: rgba(128,128,128,0.15);'});
        reset.set_child(new St.Icon({icon_name: 'edit-undo-symbolic', icon_size: 16}));
        reset.connect('clicked', () => {
            for (const key of ['label','hostname','icon','color','position','size','style','follow-theme','start-at-login']) this.settings.reset(key);
        });
        this.startToggle.add_child(reset);
        const footer = new PopupMenu.PopupBaseMenuItem({reactive: false, can_focus: false});
        footer.add_child(new St.Label({text: 'Designed by Afshin K.I.', x_expand: true, x_align: Clutter.ActorAlign.CENTER, style: 'font-size: 10px; color: #92909b;'}));
        this.button.menu.addMenuItem(footer);
    }
    refresh() {
        this.syncing = true;
        const s = this.settings;
        const name = (s.get_boolean('hostname') ? GLib.get_host_name() : s.get_string('label').trim()) || 'Work';
        this.label.text = name;
        this.button.accessible_name = `${name} — ${GLib.get_host_name()} — PanelTag settings`;
        this.entry.set_text(s.get_boolean('hostname') ? GLib.get_host_name() : s.get_string('label'));
        this.entry.reactive = !s.get_boolean('hostname');
        this.entry.clutter_text.editable = !s.get_boolean('hostname');
        this.hostToggle.set_style(`border-radius: 8px; padding: 7px; background-color: ${s.get_boolean('hostname') ? 'rgba(100,140,235,0.35)' : 'rgba(128,128,128,0.15)'};`);
        let color = s.get_string('color');
        if (!/^#[0-9a-f]{6}$/i.test(color)) color = '#3584e4';
        this.startToggle.setToggleState(s.get_boolean('start-at-login'));
        if (s.get_boolean('follow-theme')) {
            const schema = this.interfaceSettings.settings_schema;
            const preference = schema.has_key('color-scheme') ? this.interfaceSettings.get_string('color-scheme') : '';
            const dark = preference === 'prefer-dark' || (preference !== 'prefer-light' && this.interfaceSettings.get_string('gtk-theme').toLowerCase().includes('dark'));
            color = dark ? '#b4c5ff' : '#628ce8';
            // Use the theme's own selection accent, including Ubuntu's Yaru variants.
            const [found, accent] = this.entry.get_theme_node().lookup_color('selection-background-color', true);
            if (found && accent.alpha > 0)
                color = '#' + [accent.red, accent.green, accent.blue].map(c => Math.round(c).toString(16).padStart(2, '0')).join('');
        }
        const icon = s.get_string('icon');
        this.icon.visible = icon !== 'none';
        this.icon.icon_name = {computer:'computer-symbolic', laptop:'computer-laptop-symbolic', server:'network-server-symbolic'}[icon] || 'computer-symbolic';
        const rgb = color.slice(1).match(/../g).map(x => parseInt(x,16)/255).map(x => x <= 0.04045 ? x/12.92 : ((x+0.055)/1.055)**2.4);
        const ink = rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722 > 0.179 ? '#000000' : '#ffffff';
        const style = s.get_string('style');
        this.box.set_style(`height: 24px; padding: 0 10px; border-radius: 10px; spacing: 6px; border: 1px solid ${style === 'outline' ? color : 'transparent'}; background-color: ${style === 'filled' ? color : 'transparent'}; color: ${style === 'filled' ? ink : color};`);
        this.label.set_style(`font-size: ${s.get_int('size')}px; font-weight: 600; max-width: 180px;`);
        const position = s.get_string('position');
        if (this.position !== position) {
            const target = {left:Main.panel._leftBox, center:Main.panel._centerBox, right:Main.panel._rightBox}[position];
            const actor = this.button.container;
            if (actor.get_parent()) actor.get_parent().remove_child(actor);
            target.insert_child_at_index(actor, 0);
            this.position = position;
        }
        for (const group of this.choiceGroups) {
            const value = group.integer ? s.get_int(group.key) : s.get_string(group.key);
            for (const entry of group.items) {
                entry.item.set_style(`border-radius: 7px; padding: 4px 10px; font-size: ${group.integer ? entry.value : (group.key === 'icon' ? 14 : 11)}px; background-color: ${entry.value === value ? 'rgba(100,140,235,0.35)' : 'rgba(128,128,128,0.15)'}; border: 1px solid ${entry.value === value ? '#7399e8' : 'transparent'};`);
            }
        }
        for (const swatch of this.swatches) {
            const system = swatch.value === 'system', custom = swatch.value === 'custom';
            const preset = ['#3584e4','#278556','#a65b00','#c64640','#8156bb','#5e5c64'].includes(s.get_string('color'));
            const active = system ? s.get_boolean('follow-theme') : !s.get_boolean('follow-theme') && (custom ? !preset : s.get_string('color') === swatch.value);
            swatch.button.set_style(`width: 22px; height: 22px; padding: 0; border-radius: 12px; font-size: 18px; border: 2px solid ${active ? '#ffffff' : 'rgba(128,128,128,0.5)'}; background-color: ${system || custom ? 'transparent' : swatch.value}; ${custom ? `background-image: url("${this.path}/color-wheel.svg"); background-size: contain;` : ''}`);
        }
        this.syncing = false;
    }
    disable() {
        if (this.themeChanged) this.themeContext.disconnect(this.themeChanged);
        this.themeChanged = 0;
        this.themeContext = null;
        if (this.interfaceChanged) this.interfaceSettings.disconnect(this.interfaceChanged);
        this.interfaceChanged = null;
        this.interfaceSettings = null;
        this.startToggle = null;
        this.swatches = null;
        if (this.changed) this.settings.disconnect(this.changed);
        if (this.hoverTimer) GLib.source_remove(this.hoverTimer);
        this.hoverTimer = 0;
        if (this.tooltip) this.tooltip.destroy();
        this.tooltip = null;
        if (this.button) this.button.destroy();
        this.button = null;
        this.settings = null;
        this.choiceGroups = null;
        this.entry = this.hostToggle = this.icon = this.label = this.box = null;
        this.position = null;
        this.changed = null;
    }
}

function init() { return new PanelTag(); }
