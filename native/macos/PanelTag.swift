import AppKit
import ServiceManagement
import SwiftUI
import Combine

final class PanelTag: NSObject, NSApplicationDelegate, ObservableObject {
    let objectWillChange = ObservableObjectPublisher()
    let popover = NSPopover()
    let defaults = UserDefaults.standard
    var status: NSStatusItem!
    var observers: [NSObjectProtocol] = []
    var name: String { defaults.string(forKey: "name") ?? "Work" }
    var icon: String { defaults.string(forKey: "icon") ?? "" }
    var style: String { defaults.string(forKey: "style") ?? "outline" }
    var size: CGFloat { CGFloat(defaults.integer(forKey: "size")) }
    var label: String { defaults.bool(forKey: "hostname") ? (Host.current().localizedName ?? ProcessInfo.processInfo.hostName) : (name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "Work" : name) }
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
        objectWillChange.send()
        status?.button?.image = badgeImage()
        status?.button?.toolTip = "\(label) — right-click for PanelTag settings"
        status?.button?.setAccessibilityLabel("PanelTag: \(label)")
    }
    @objc func openMenu() {
        guard let button = status.button else { return }
        if popover.isShown { popover.performClose(nil); return }
        popover.behavior = .transient
        popover.contentViewController = NSHostingController(rootView: UnifiedMenu(app: self))
        popover.contentSize = NSSize(width: 280, height: max(350, popover.contentViewController!.view.fittingSize.height))
        NSApp.activate(ignoringOtherApps: true)
        popover.show(relativeTo: button.bounds, of: button, preferredEdge: .minY)
        popover.contentViewController?.view.window?.makeKey()
    }
    func change(_ key: String, _ value: Any) { defaults.set(value, forKey: key); render() }
    func setName(_ value: String) { change("name", String(value.prefix(24))) }
    @objc func customColor() {
        popover.performClose(nil)
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
        defer { render() }
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
    @objc func website() { popover.performClose(nil); NSWorkspace.shared.open(URL(string: "https://afshinki.github.io/PanelTag/")!) }
    @objc func quitApp() { NSApp.terminate(nil) }
}
struct UnifiedMenu: View {
    @ObservedObject var app: PanelTag
    private let palette = [("Blue","3584e4"),("Green","278556"),("Amber","a65b00"),("Red","c64640"),("Purple","8156bb"),("Graphite","5e5c64")]
    private let tint = Color(red: 0.44, green: 0.27, blue: 0.72)
    private func tile(_ selected: Bool) -> Color { selected ? tint.opacity(0.18) : Color.primary.opacity(0.065) }
    private func choiceRow(_ title: String, _ key: String, _ options: [(String,String)]) -> some View {
        HStack(spacing: 5) {
            ForEach(options.indices, id: \.self) { i in
                let option = options[i]
                let selected = key == "size" ? String(Int(app.size)) == option.1 : (app.defaults.string(forKey: key) ?? "outline") == option.1
                Button { app.change(key, key == "size" ? Int(option.1)! as Any : option.1 as Any) } label: {
                    Text(option.0).font(.system(size: 11)).frame(maxWidth: .infinity).frame(height: 30)
                        .background(tile(selected)).clipShape(RoundedRectangle(cornerRadius: 7))
                }.accessibilityLabel("\(title): \(option.0)").help(option.0)
            }
        }
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Button(action: app.website) {
                HStack(spacing: 0) { Text("PanelTag").fontWeight(.bold); Text(".").foregroundColor(.blue).fontWeight(.bold) }.font(.system(size: 15))
            }.help("Open PanelTag website").accessibilityLabel("PanelTag — open website")
            HStack(spacing: 7) {
                Text("Name").font(.system(size: 11)).frame(width: 33, alignment: .leading)
                TextField("Work", text: Binding(get: { app.defaults.bool(forKey: "hostname") ? app.label : app.name }, set: { app.setName($0) }))
                    .textFieldStyle(.plain).font(.system(size: 12)).padding(7)
                    .background(Color.primary.opacity(0.055)).clipShape(RoundedRectangle(cornerRadius: 7))
                    .disabled(app.defaults.bool(forKey: "hostname")).accessibilityLabel("Badge name")
                Button { app.change("hostname", !app.defaults.bool(forKey: "hostname")) } label: {
                    Image(systemName: "desktopcomputer").frame(width: 27, height: 28).background(tile(app.defaults.bool(forKey: "hostname"))).clipShape(RoundedRectangle(cornerRadius: 7))
                }.help("Use computer name").accessibilityLabel("Use computer name")
            }
            HStack(spacing: 5) {
                Text("Icon").font(.system(size: 11)).frame(width: 35, alignment: .leading)
                ForEach(["", "desktopcomputer", "laptopcomputer", "server.rack"], id: \.self) { value in
                    Button { app.change("icon", value) } label: {
                        Group { if value.isEmpty { Text("−") } else { Image(systemName: value) } }
                            .frame(maxWidth: .infinity).frame(height: 28).background(tile(app.icon == value)).clipShape(RoundedRectangle(cornerRadius: 7))
                    }.help(value.isEmpty ? "No icon" : value).accessibilityLabel(value.isEmpty ? "No icon" : value)
                }
            }
            HStack(spacing: 7) {
                Button { app.change("systemColor", true) } label: {
                    Text("◐").font(.system(size: 21)).frame(width: 24, height: 24).background(Color.primary.opacity(0.08)).clipShape(Circle())
                        .overlay(Circle().stroke(app.defaults.bool(forKey: "systemColor") ? tint : .clear, lineWidth: 2))
                }.help("System color").accessibilityLabel("System color")
                ForEach(palette.indices, id: \.self) { i in
                    let value = UInt32(palette[i].1, radix: 16)!
                    Button { app.defaults.set(false, forKey: "systemColor"); app.change("color", palette[i].1) } label: {
                        Circle().fill(Color(red: Double((value >> 16) & 255)/255, green: Double((value >> 8) & 255)/255, blue: Double(value & 255)/255)).frame(width: 24, height: 24)
                            .overlay(Circle().stroke(Color.white.opacity(0.85), lineWidth: 2))
                            .overlay(Circle().stroke(!app.defaults.bool(forKey: "systemColor") && app.defaults.string(forKey: "color") == palette[i].1 ? tint : .clear, lineWidth: 2).padding(-2))
                    }.help(palette[i].0).accessibilityLabel(palette[i].0)
                }
                Button(action: app.customColor) {
                    Circle().fill(AngularGradient(colors: [.red,.yellow,.green,.blue,.purple,.red], center: .center)).frame(width: 24, height: 24).overlay(Circle().stroke(.white, lineWidth: 2))
                }.help("Custom color").accessibilityLabel("Custom color")
            }.padding(.vertical, 3)
            Text("⌘  Drag badge in menu bar to position").font(.system(size: 10)).foregroundColor(.secondary).frame(maxWidth: .infinity).frame(height: 30)
                .background(Color.primary.opacity(0.045)).clipShape(RoundedRectangle(cornerRadius: 7))
            choiceRow("Text size", "size", [("a Small","11"),("A Medium","12"),("A Large","14")])
            choiceRow("Style", "style", [("● Filled","filled"),("○ Outline","outline"),("T Text only","text")])
            Divider().padding(.top, 2)
            HStack {
                Text("⏻").foregroundColor(.secondary)
                Toggle("Start at login", isOn: Binding(get: { SMAppService.mainApp.status == .enabled || SMAppService.mainApp.status == .requiresApproval }, set: { app.setStartup($0) }))
                    .toggleStyle(.switch).controlSize(.small).font(.system(size: 11))
                Button(action: app.quitApp) { Image(systemName: "power").frame(width: 28, height: 28).background(tile(false)).clipShape(RoundedRectangle(cornerRadius: 7)) }
                    .help("Quit PanelTag").accessibilityLabel("Quit PanelTag")
            }
            if SMAppService.mainApp.status == .requiresApproval {
                Button("Approve login in System Settings…", action: app.loginSettings).font(.system(size: 10)).foregroundColor(tint)
            }
            HStack {
                Text("Designed by Afshin K.I.")
                Spacer()
                Text("v" + (Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? ""))
            }.font(.system(size: 9)).foregroundColor(.secondary)
        }.buttonStyle(.plain).padding(12).frame(width: 280).background(Color(NSColor.windowBackgroundColor))
            .onExitCommand { app.popover.performClose(nil) }
    }
}
let app = NSApplication.shared
app.setActivationPolicy(.accessory)
let delegate = PanelTag()
if CommandLine.arguments.contains("--smoke-test") {
    delegate.defaults.register(defaults: ["size": 12, "systemColor": true])
    let image = delegate.badgeImage()
    precondition(image.size.width > 20 && image.tiffRepresentation != nil)
    let host = NSHostingView(rootView: UnifiedMenu(app: delegate))
    host.frame = NSRect(x: 0, y: 0, width: 280, height: 380)
    host.layoutSubtreeIfNeeded()
    guard let bitmap = host.bitmapImageRepForCachingDisplay(in: host.bounds) else { fatalError("Menu rendering failed") }
    host.cacheDisplay(in: host.bounds, to: bitmap)
    precondition(bitmap.pixelsWide >= 280)
    print("macOS badge and unified menu rendering passed")
} else {
    app.delegate = delegate
    app.run()
}
