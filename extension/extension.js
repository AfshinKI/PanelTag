import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import St from 'gi://St';
import Pango from 'gi://Pango';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

export default class PanelTag extends Extension {
    enable() {
        this.settings = this.getSettings();
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
        this.changed = this.settings.connect('changed', () => this.refresh());
        this.refresh();
    }
    choices(title, key, options, integer = false) {
        const menu = new PopupMenu.PopupSubMenuMenuItem(title);
        this.button.menu.addMenuItem(menu);
        const items = options.map(([label, value]) => {
            const item = new PopupMenu.PopupMenuItem(label);
            item.connect('activate', () => integer ? this.settings.set_int(key, value) : this.settings.set_string(key, value));
            menu.menu.addMenuItem(item);
            return {item, value, label};
        });
        this.choiceGroups.push({menu, key, items, integer, title});
    }
    buildMenu() {
        this.choiceGroups = [];
        const row = new PopupMenu.PopupBaseMenuItem({activate: false, can_focus: false});
        row.add_child(new St.Label({text: 'Name', y_align: Clutter.ActorAlign.CENTER}));
        this.entry = new St.Entry({text: this.settings.get_string('label'), can_focus: true, x_expand: true, style: 'width: 150px;'});
        this.entry.clutter_text.set_max_length(24);
        this.entry.clutter_text.connect('text-changed', () => {
            if (!this.syncing) this.settings.set_string('label', this.entry.get_text());
        });
        row.add_child(this.entry);
        this.button.menu.addMenuItem(row);
        this.hostToggle = new PopupMenu.PopupSwitchMenuItem('Use computer name', false);
        this.hostToggle.connect('toggled', (_item, value) => this.settings.set_boolean('hostname', value));
        this.button.menu.addMenuItem(this.hostToggle);
        this.choices('Icon', 'icon', [['None','none'],['Computer','computer'],['Laptop','laptop'],['Server','server']]);
        this.choices('Color', 'color', [['Blue','#3584e4'],['Green','#278556'],['Amber','#a65b00'],['Red','#c64640'],['Purple','#8156bb'],['Graphite','#5e5c64']]);
        const colorRow = new PopupMenu.PopupBaseMenuItem({activate: false, can_focus: false});
        colorRow.add_child(new St.Label({text: 'Custom color', y_align: Clutter.ActorAlign.CENTER}));
        this.colorEntry = new St.Entry({can_focus: true, hint_text: '#RRGGBB', x_expand: true, style:'width: 110px;'});
        this.colorEntry.clutter_text.set_max_length(7);
        this.colorEntry.clutter_text.connect('text-changed', () => {
            const value = this.colorEntry.get_text();
            if (!this.syncing && /^#[0-9a-f]{6}$/i.test(value)) this.settings.set_string('color', value.toLowerCase());
        });
        colorRow.add_child(this.colorEntry);
        this.button.menu.addMenuItem(colorRow);
        this.choices('Position', 'position', [['Left','left'],['Middle','center'],['Right','right']]);
        this.choices('Text size', 'size', [['Small',11],['Medium',12],['Large',14]], true);
        this.choices('Style', 'style', [['Filled','filled'],['Outline','outline'],['Text only','text']]);
        this.button.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this.button.menu.addAction('Reset defaults', () => {
            for (const key of ['label','hostname','icon','color','position','size','style']) this.settings.reset(key);
        });
        this.button.menu.addMenuItem(new PopupMenu.PopupMenuItem('Starts automatically at login', {reactive: false}));
    }
    refresh() {
        this.syncing = true;
        const s = this.settings;
        const name = (s.get_boolean('hostname') ? GLib.get_host_name() : s.get_string('label').trim()) || 'Work';
        this.label.text = name;
        this.button.accessible_name = `${name} — ${GLib.get_host_name()} — PanelTag settings`;
        this.entry.set_text(s.get_string('label'));
        this.entry.reactive = !s.get_boolean('hostname');
        this.entry.clutter_text.editable = !s.get_boolean('hostname');
        this.hostToggle.setToggleState(s.get_boolean('hostname'));
        let color = s.get_string('color');
        if (!/^#[0-9a-f]{6}$/i.test(color)) color = '#3584e4';
        this.colorEntry.set_text(color);
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
            actor.get_parent()?.remove_child(actor);
            target.insert_child_at_index(actor, 0);
            this.position = position;
        }
        for (const group of this.choiceGroups) {
            const value = group.integer ? s.get_int(group.key) : s.get_string(group.key);
            group.menu.label.text = `${group.title}: ${group.items.find(x => x.value === value)?.label ?? value}`;
            for (const entry of group.items) entry.item.setOrnament(entry.value === value ? PopupMenu.Ornament.DOT : PopupMenu.Ornament.NONE);
        }
        this.syncing = false;
    }
    disable() {
        if (this.changed) this.settings.disconnect(this.changed);
        if (this.hoverTimer) GLib.source_remove(this.hoverTimer);
        this.hoverTimer = 0;
        this.tooltip?.destroy();
        this.tooltip = null;
        this.button?.destroy();
        this.button = null;
        this.settings = null;
        this.choiceGroups = null;
        this.entry = this.colorEntry = this.hostToggle = this.icon = this.label = this.box = null;
        this.position = null;
        this.changed = null;
    }
}
