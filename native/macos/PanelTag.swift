import AppKit
import ServiceManagement

final class PanelTag: NSObject, NSApplicationDelegate {
    let defaults = UserDefaults.standard
    var status: NSStatusItem!
    var observers: [NSObjectProtocol] = []
    var name: String { defaults.string(forKey: "name") ?? "Work" }
    var icon: String { defaults.string(forKey: "icon") ?? "" }
    var style: String { defaults.string(forKey: "style") ?? "outline" }
    var size: CGFloat { CGFloat(defaults.integer(forKey: "size")) }
    var label: String { defaults.bool(forKey: "hostname") ? (Host.current().localizedName ?? ProcessInfo.processInfo.hostName) : name }
    var paint: NSColor {
        if defaults.bool(forKey: "systemColor") { return .controlAccentColor }
        let value = UInt32(defaults.string(forKey: "color") ?? "7046b8", radix: 16) ?? 0x7046b8
        return NSColor(srgbRed: CGFloat((value >> 16) & 255) / 255, green: CGFloat((value >> 8) & 255) / 255, blue: CGFloat(value & 255) / 255, alpha: 1)
    }
    func applicationDidFinishLaunching(_ notification: Notification) {
        defaults.register(defaults: ["systemColor": true, "size": 12])
        if NSRunningApplication.runningApplications(withBundleIdentifier: Bundle.main.bundleIdentifier ?? "io.github.afshinki.PanelTag").count > 1 {
            NSApp.terminate(nil); return
        }
        status = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        status.button?.target = self
        status.button?.action = #selector(openMenu)
        status.button?.sendAction(on: [.rightMouseUp])
        render()
        observers.append(NotificationCenter.default.addObserver(forName: NSColor.systemColorsDidChangeNotification, object: nil, queue: .main) { [weak self] _ in self?.render() })
        DistributedNotificationCenter.default().addObserver(self, selector: #selector(themeChanged), name: NSNotification.Name("AppleInterfaceThemeChangedNotification"), object: nil)
        if !defaults.bool(forKey: "launched") {
            defaults.set(true, forKey: "launched")
            setStartup(true)
        }
    }
    @objc func themeChanged() { render() }
    func badgeImage() -> NSImage {
        let text = String(label.prefix(40)) as NSString
        let font = NSFont.systemFont(ofSize: size, weight: .medium)
        let textSize = text.size(withAttributes: [.font: font])
        let iconWidth: CGFloat = icon.isEmpty ? 0 : 20
        let width = ceil(textSize.width) + 20 + iconWidth
        let color = paint.usingColorSpace(.sRGB) ?? .systemPurple
        let luminance = color.redComponent * 0.299 + color.greenComponent * 0.587 + color.blueComponent * 0.114
        let foreground: NSColor = style == "filled" ? (luminance > 0.6 ? .black : .white) : color
        let image = NSImage(size: NSSize(width: width, height: 22), flipped: false) { bounds in
            let path = NSBezierPath(roundedRect: bounds.insetBy(dx: 1, dy: 1), xRadius: 8, yRadius: 8)
            color.set()
            if self.style == "filled" { path.fill() }
            if self.style == "outline" { path.lineWidth = 1; path.stroke() }
            if !self.icon.isEmpty, let symbol = NSImage(systemSymbolName: self.icon, accessibilityDescription: nil) {
                let tinted = NSImage(size: NSSize(width: 14, height: 14))
                tinted.lockFocus()
                symbol.draw(in: NSRect(x: 0, y: 0, width: 14, height: 14))
                foreground.set(); NSRect(x: 0, y: 0, width: 14, height: 14).fill(using: .sourceAtop)
                tinted.unlockFocus()
                tinted.draw(in: NSRect(x: 10, y: 4, width: 14, height: 14))
            }
            text.draw(at: NSPoint(x: 10 + iconWidth, y: (22 - textSize.height) / 2), withAttributes: [.font: font, .foregroundColor: foreground])
            return true
        }
        image.isTemplate = false
        return image
    }
    func render() {
        status?.button?.image = badgeImage()
        status?.button?.toolTip = "\(label) — right-click for PanelTag settings"
        status?.button?.setAccessibilityLabel("PanelTag: \(label)")
    }
    func item(_ title: String, _ action: Selector, checked: Bool = false, value: String? = nil) -> NSMenuItem {
        let item = NSMenuItem(title: title, action: action, keyEquivalent: "")
        item.target = self; item.state = checked ? .on : .off; item.representedObject = value
        return item
    }
    @objc func openMenu() {
        guard let button = status.button else { return }
        let menu = NSMenu()
        menu.addItem(item("PanelTag ·", #selector(website)))
        menu.addItem(.separator())
        menu.addItem(item("Name…", #selector(editName)))
        menu.addItem(item("Use computer name", #selector(toggleHostname), checked: defaults.bool(forKey: "hostname")))
        let icons = NSMenuItem(title: "Icon", action: nil, keyEquivalent: ""); let iconsMenu = NSMenu()
        for (title, value) in [("None", ""), ("Computer", "desktopcomputer"), ("Laptop", "laptopcomputer"), ("Server", "server.rack")] {
            let option = item(title, #selector(chooseIcon(_:)), checked: icon == value, value: value)
            if !value.isEmpty { option.image = NSImage(systemSymbolName: value, accessibilityDescription: title) }
            iconsMenu.addItem(option)
        }
        icons.submenu = iconsMenu; menu.addItem(icons)
        let colors = NSMenuItem(title: "Color", action: nil, keyEquivalent: ""); let colorsMenu = NSMenu()
        colorsMenu.addItem(item("System accent", #selector(systemColor), checked: defaults.bool(forKey: "systemColor")))
        for (title, value) in [("Purple", "7046b8"), ("Blue", "3584e4"), ("Green", "278556"), ("Amber", "c88800"), ("Red", "c64646")] {
            colorsMenu.addItem(item(title, #selector(chooseColor(_:)), checked: !defaults.bool(forKey: "systemColor") && defaults.string(forKey: "color") == value, value: value))
        }
        colorsMenu.addItem(item("Custom…", #selector(customColor))); colors.submenu = colorsMenu; menu.addItem(colors)
        let sizes = NSMenuItem(title: "Text size", action: nil, keyEquivalent: ""); let sizesMenu = NSMenu()
        for (title, value) in [("Small", "11"), ("Medium", "12"), ("Large", "14")] { sizesMenu.addItem(item(title, #selector(chooseSize(_:)), checked: Int(size) == Int(value), value: value)) }
        sizes.submenu = sizesMenu; menu.addItem(sizes)
        let styles = NSMenuItem(title: "Badge style", action: nil, keyEquivalent: ""); let stylesMenu = NSMenu()
        for value in ["filled", "outline", "text"] { stylesMenu.addItem(item(value.capitalized, #selector(chooseStyle(_:)), checked: style == value, value: value)) }
        styles.submenu = stylesMenu; menu.addItem(styles)
        menu.addItem(.separator())
        menu.addItem(item("Start at login", #selector(toggleStartup), checked: SMAppService.mainApp.status == .enabled))
        if SMAppService.mainApp.status == .requiresApproval { menu.addItem(item("Approve login in System Settings…", #selector(loginSettings))) }
        let quit = item("Quit PanelTag", #selector(quitApp)); quit.image = NSImage(systemSymbolName: "power", accessibilityDescription: "Quit")
        menu.addItem(quit)
        menu.addItem(.separator())
        let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? ""
        let footer = NSMenuItem(title: "Designed by Afshin K.I. · v\(version)", action: nil, keyEquivalent: "")
        footer.isEnabled = false; menu.addItem(footer)
        menu.popUp(positioning: nil, at: NSPoint(x: 0, y: button.bounds.minY), in: button)
    }
    @objc func editName() {
        NSApp.activate(ignoringOtherApps: true)
        let alert = NSAlert(); alert.messageText = "Name your computer"
        alert.informativeText = "Choose a short label, like Work or Home."
        let field = NSTextField(string: name); field.frame = NSRect(x: 0, y: 0, width: 260, height: 26)
        alert.accessoryView = field; alert.addButton(withTitle: "Save"); alert.addButton(withTitle: "Cancel")
        alert.window.initialFirstResponder = field
        if alert.runModal() == .alertFirstButtonReturn {
            let value = field.stringValue.trimmingCharacters(in: .whitespacesAndNewlines)
            defaults.set(value.isEmpty ? "Work" : String(value.prefix(40)), forKey: "name")
            defaults.set(false, forKey: "hostname"); render()
        }
    }
    @objc func toggleHostname() { defaults.set(!defaults.bool(forKey: "hostname"), forKey: "hostname"); render() }
    @objc func chooseIcon(_ sender: NSMenuItem) { defaults.set(sender.representedObject as? String, forKey: "icon"); render() }
    @objc func chooseStyle(_ sender: NSMenuItem) { defaults.set(sender.representedObject as? String, forKey: "style"); render() }
    @objc func chooseSize(_ sender: NSMenuItem) { defaults.set(Int(sender.representedObject as? String ?? "12"), forKey: "size"); render() }
    @objc func systemColor() { defaults.set(true, forKey: "systemColor"); render() }
    @objc func chooseColor(_ sender: NSMenuItem) { defaults.set(sender.representedObject as? String, forKey: "color"); defaults.set(false, forKey: "systemColor"); render() }
    @objc func customColor() {
        let panel = NSColorPanel.shared; panel.color = paint; panel.showsAlpha = false
        panel.setTarget(self); panel.setAction(#selector(colorChanged(_:)))
        NSApp.activate(ignoringOtherApps: true); panel.makeKeyAndOrderFront(nil)
    }
    @objc func colorChanged(_ panel: NSColorPanel) {
        guard let c = panel.color.usingColorSpace(.sRGB) else { return }
        defaults.set(String(format: "%02x%02x%02x", Int(c.redComponent * 255), Int(c.greenComponent * 255), Int(c.blueComponent * 255)), forKey: "color")
        defaults.set(false, forKey: "systemColor"); render()
    }
    func setStartup(_ enabled: Bool) {
        do { if enabled { try SMAppService.mainApp.register() } else { try SMAppService.mainApp.unregister() } }
        catch {
            NSApp.activate(ignoringOtherApps: true)
            let alert = NSAlert(); alert.messageText = "Could not change Start at login"
            alert.informativeText = "Move PanelTag to Applications, then try again. You can also manage it in System Settings → General → Login Items.\n\(error.localizedDescription)"
            alert.runModal()
        }
    }
    @objc func toggleStartup() { setStartup(SMAppService.mainApp.status != .enabled && SMAppService.mainApp.status != .requiresApproval) }
    @objc func loginSettings() { SMAppService.openSystemSettingsLoginItems() }
    @objc func website() { NSWorkspace.shared.open(URL(string: "https://afshinki.github.io/PanelTag/")!) }
    @objc func quitApp() { NSApp.terminate(nil) }
}
let app = NSApplication.shared
app.setActivationPolicy(.accessory)
let delegate = PanelTag()
if CommandLine.arguments.contains("--smoke-test") {
    delegate.defaults.register(defaults: ["size": 12, "systemColor": true])
    let image = delegate.badgeImage()
    precondition(image.size.width > 20 && image.tiffRepresentation != nil)
    print("macOS badge rendering passed")
} else {
    app.delegate = delegate
    app.run()
}
