using System.Diagnostics;
using System.Drawing.Drawing2D;
using System.Runtime.InteropServices;
using System.Text.Json;
using Microsoft.Win32;

namespace PanelTag;

internal sealed class Preferences
{
    public string Name { get; set; } = "Work";
    public bool Hostname { get; set; }
    public bool SystemColor { get; set; } = true;
    public string Color { get; set; } = "#7046b8";
    public string Icon { get; set; } = "None";
    public string Style { get; set; } = "Outline";
    public string Position { get; set; } = "Middle";
    public int Size { get; set; } = 12;
    public bool Initialized { get; set; }
    public static string FilePath => Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "PanelTag", "settings.json");
    public static Preferences Load()
    {
        try
        {
            var p = JsonSerializer.Deserialize<Preferences>(File.ReadAllText(FilePath)) ?? new();
            p.Name = string.IsNullOrWhiteSpace(p.Name) ? "Work" : p.Name[..Math.Min(40, p.Name.Length)];
            p.Size = Math.Clamp(p.Size, 11, 14);
            return p;
        }
        catch (Exception e) when (e is IOException or JsonException or UnauthorizedAccessException) { return new(); }
    }
    public void Save()
    {
        Directory.CreateDirectory(Path.GetDirectoryName(FilePath)!);
        var temp = FilePath + ".tmp";
        File.WriteAllText(temp, JsonSerializer.Serialize(this));
        File.Move(temp, FilePath, true);
    }
}

internal static class Startup
{
    const string Key = @"Software\Microsoft\Windows\CurrentVersion\Run";
    public static bool Enabled()
    {
        using var key = Registry.CurrentUser.OpenSubKey(Key);
        return string.Equals(key?.GetValue("PanelTag") as string, Command, StringComparison.OrdinalIgnoreCase);
    }
    static string Command => $"\"{Environment.ProcessPath}\"";
    public static void Set(bool enabled)
    {
        using var key = Registry.CurrentUser.CreateSubKey(Key);
        if (enabled) key.SetValue("PanelTag", Command); else key.DeleteValue("PanelTag", false);
    }
}

internal sealed class Badge : Form
{
    readonly Preferences settings;
    readonly bool smokeTest;
    readonly NotifyIcon tray;
    Icon? trayIcon;
    SettingsPopup? settingsPopup;
    bool saveErrorShown;
    [DllImport("dwmapi.dll")] static extern int DwmGetColorizationColor(out uint color, out bool opaque);
    [DllImport("user32.dll")] static extern bool DestroyIcon(IntPtr icon);
    public string BadgeText => settings.Hostname ? Environment.MachineName : (string.IsNullOrWhiteSpace(settings.Name) ? "Work" : settings.Name);
    internal Color Accent
    {
        get
        {
            if (settings.SystemColor)
            {
                try { if (DwmGetColorizationColor(out var argb, out _) == 0) return Color.FromArgb(255, Color.FromArgb(unchecked((int)argb))); }
                catch (DllNotFoundException) { }
                return SystemColors.Highlight;
            }
            try { return ColorTranslator.FromHtml(settings.Color); } catch { return Color.FromArgb(112, 70, 184); }
        }
    }
    internal bool Dark
    {
        get
        {
            using var key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize");
            return key?.GetValue("AppsUseLightTheme") is int value && value == 0;
        }
    }
    public Badge(Preferences preferences, bool test = false)
    {
        settings = preferences; smokeTest = test;
        Text = "PanelTag"; AccessibleName = "PanelTag computer badge";
        FormBorderStyle = FormBorderStyle.None; ShowInTaskbar = false; TopMost = true;
        StartPosition = FormStartPosition.Manual; AutoScaleMode = AutoScaleMode.Dpi;
        DoubleBuffered = true;
        tray = new NotifyIcon { Text = "PanelTag" };
        tray.MouseUp += (_, e) => { if (e.Button == MouseButtons.Right) ShowSettings(Cursor.Position); };
        MouseUp += (_, e) => { if (e.Button == MouseButtons.Right) ShowSettings(PointToScreen(e.Location)); };
        SystemEvents.UserPreferenceChanged += ThemeChanged;
        SystemEvents.DisplaySettingsChanged += DisplayChanged;
        RefreshBadge();
        tray.Visible = !test;
        if (!test && !settings.Initialized)
        {
            settings.Initialized = true;
            try { Startup.Set(true); } catch (Exception e) { MessageBox.Show("Could not enable Start at login: " + e.Message, "PanelTag"); }
            Persist();
        }
    }
    protected override bool ShowWithoutActivation => true;
    protected override CreateParams CreateParams { get { var p = base.CreateParams; p.ExStyle |= 0x08000000 | 0x80; return p; } }
    void ThemeChanged(object? sender, UserPreferenceChangedEventArgs e) { if (IsHandleCreated && !IsDisposed) BeginInvoke(new Action(RefreshBadge)); }
    void DisplayChanged(object? sender, EventArgs e) { if (IsHandleCreated && !IsDisposed) BeginInvoke(new Action(RefreshBadge)); }
    void Persist()
    {
        if (smokeTest) return;
        try { settings.Save(); }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException)
        { if (!saveErrorShown) { saveErrorShown = true; MessageBox.Show("Could not save your settings: " + e.Message, "PanelTag"); } }
    }
    internal void Change(Action action) { action(); Persist(); RefreshBadge(); }
    void RefreshBadge()
    {
        using var font = new Font("Segoe UI", settings.Size, FontStyle.Regular, GraphicsUnit.Point);
        int scale = Math.Max(1, DeviceDpi) ;
        int pad = (int)(12 * scale / 96f);
        var textSize = TextRenderer.MeasureText(BadgeText, font);
        Size = new Size(Math.Min(600, textSize.Width + pad * 2 + (settings.Icon == "None" ? 0 : pad * 2)), textSize.Height + pad);
        var area = Screen.PrimaryScreen!.WorkingArea;
        int x = settings.Position == "Left" ? area.Left + 12 : settings.Position == "Right" ? area.Right - Width - 12 : area.Left + (area.Width - Width) / 2;
        Location = new Point(Math.Max(area.Left, x), area.Top + 8);
        using var path = Rounded(new RectangleF(0, 0, Width, Height), 10 * scale / 96f);
        var oldRegion = Region; Region = new Region(path); oldRegion?.Dispose();
        BackColor = Dark ? Color.FromArgb(35, 35, 40) : Color.FromArgb(250, 249, 253);
        settingsPopup?.Sync();
        var label = "PanelTag: " + BadgeText; tray.Text = label[..Math.Min(63, label.Length)];
        using var bitmap = new Bitmap(32, 32);
        using (var g = Graphics.FromImage(bitmap)) { g.SmoothingMode = SmoothingMode.AntiAlias; g.Clear(Color.Transparent); using var brush = new SolidBrush(Accent); g.FillEllipse(brush, 4, 4, 24, 24); }
        var handle = bitmap.GetHicon();
        using (var borrowed = System.Drawing.Icon.FromHandle(handle)) { var next = (Icon)borrowed.Clone(); tray.Icon = next; trayIcon?.Dispose(); trayIcon = next; }
        DestroyIcon(handle); Invalidate();
    }
    internal static GraphicsPath Rounded(RectangleF rect, float radius)
    {
        var p = new GraphicsPath(); float d = Math.Min(radius * 2, Math.Min(rect.Width, rect.Height));
        p.AddArc(rect.Left, rect.Top, d, d, 180, 90); p.AddArc(rect.Right - d, rect.Top, d, d, 270, 90);
        p.AddArc(rect.Right - d, rect.Bottom - d, d, d, 0, 90); p.AddArc(rect.Left, rect.Bottom - d, d, d, 90, 90); p.CloseFigure(); return p;
    }
    protected override void OnPaint(PaintEventArgs e)
    {
        base.OnPaint(e); var g = e.Graphics; g.SmoothingMode = SmoothingMode.AntiAlias;
        var color = Accent; using var shape = Rounded(new RectangleF(1, 1, Width - 3, Height - 3), 9 * DeviceDpi / 96f);
        using var brush = new SolidBrush(color); using var pen = new Pen(color, 1.5f);
        if (settings.Style == "Filled") g.FillPath(brush, shape); else if (settings.Style == "Outline") g.DrawPath(pen, shape);
        var ink = settings.Style == "Filled" ? (color.GetBrightness() > .6 ? Color.Black : Color.White) : color;
        int iconWidth = settings.Icon == "None" ? 0 : (int)(24 * DeviceDpi / 96f);
        if (iconWidth > 0) DrawDevice(g, new RectangleF(10, (Height - 16) / 2f, 16, 16), settings.Icon, ink);
        using var font = new Font("Segoe UI", settings.Size);
        TextRenderer.DrawText(g, BadgeText, font, new Rectangle(iconWidth, 0, Width - iconWidth, Height), ink, TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.EndEllipsis | TextFormatFlags.SingleLine);
    }
    internal static void DrawDevice(Graphics g, RectangleF r, string kind, Color color)
    {
        using var p = new Pen(color, 1.3f);
        if (kind == "Server") { for (int i = 0; i < 3; i++) { g.DrawRectangle(p, r.X, r.Y + i * 5, 15, 4); g.DrawLine(p, r.X + 2, r.Y + 2 + i * 5, r.X + 4, r.Y + 2 + i * 5); } }
        else { g.DrawRectangle(p, r.X + 2, r.Y, 12, 10); if (kind == "Laptop") g.DrawLines(p, new PointF[] {new(r.X + 2, r.Y + 10), new(r.X, r.Y + 14), new(r.X + 16, r.Y + 14), new(r.X + 14, r.Y + 10)}); else { g.DrawLine(p, r.X + 8, r.Y + 10, r.X + 8, r.Y + 14); g.DrawLine(p, r.X + 4, r.Y + 14, r.X + 12, r.Y + 14); } }
    }
    void ShowSettings(Point anchor)
    {
        if (settingsPopup == null || settingsPopup.IsDisposed) settingsPopup = new SettingsPopup(this, settings);
        settingsPopup.Sync();
        var area = Screen.FromPoint(anchor).WorkingArea;
        settingsPopup.Location = new Point(Math.Clamp(anchor.X, area.Left, Math.Max(area.Left, area.Right - settingsPopup.Width)), Math.Clamp(anchor.Y + 8, area.Top, Math.Max(area.Top, area.Bottom - settingsPopup.Height)));
        settingsPopup.Show(); settingsPopup.Activate();
    }
    public void SmokeTest()
    {
        CreateControl();
        foreach (var style in new[] { "Outline", "Filled", "Text" })
        foreach (var icon in new[] { "None", "Computer", "Laptop", "Server" })
        { settings.Style = style; settings.Icon = icon; RefreshBadge(); using var bitmap = new Bitmap(Width, Height); DrawToBitmap(bitmap, ClientRectangle); }
        using var popup = new SettingsPopup(this, settings);
        popup.CreateControl(); popup.Sync();
        using var menuBitmap = new Bitmap(popup.Width, popup.Height); popup.DrawToBitmap(menuBitmap, popup.ClientRectangle);
        popup.Show(); Application.DoEvents(); popup.VerifyControls(); popup.Hide();
        if (Width < 30) throw new InvalidOperationException("Badge smoke test failed");
    }
    protected override void Dispose(bool disposing)
    {
        if (disposing) { SystemEvents.UserPreferenceChanged -= ThemeChanged; SystemEvents.DisplaySettingsChanged -= DisplayChanged; tray.Visible = false; tray.Dispose(); trayIcon?.Dispose(); settingsPopup?.Dispose(); }
        base.Dispose(disposing);
    }
}
internal static class Program
{
    [STAThread] static int Main(string[] args)
    {
        ApplicationConfiguration.Initialize();
        if (args.Contains("--smoke-test")) { using var test = new Badge(new Preferences(), true); test.SmokeTest(); return 0; }
        using var mutex = new Mutex(true, @"Local\PanelTag.App", out bool created);
        if (!created) return 0;
        Application.Run(new Badge(Preferences.Load()));
        return 0;
    }
}
