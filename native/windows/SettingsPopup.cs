using System.Diagnostics;
using System.Drawing.Drawing2D;

namespace PanelTag;

internal sealed class MenuTile : Button
{
    internal bool Selected;
    internal bool Dark;
    internal Color? Swatch;
    internal bool Rainbow;
    internal string Device = "";
    internal bool Toggle;
    internal MenuTile(string label)
    {
        Text = label; AccessibleName = label; FlatStyle = FlatStyle.Flat;
        FlatAppearance.BorderSize = 0; UseVisualStyleBackColor = false;
        DoubleBuffered = true; TabStop = true; Cursor = Cursors.Hand;
        Font = new Font("Segoe UI", 8.5f);
    }
    protected override void OnPaint(PaintEventArgs e)
    {
        var g = e.Graphics; g.SmoothingMode = SmoothingMode.AntiAlias;
        float scale = DeviceDpi / 96f;
        var ink = Dark ? Color.FromArgb(237, 232, 244) : Color.FromArgb(65, 53, 79);
        var neutral = Dark ? Color.FromArgb(65, 59, 72) : Color.FromArgb(238, 234, 243);
        var purple = Color.FromArgb(112, 70, 184);
        if (Swatch.HasValue || Rainbow)
        {
            var circle = new RectangleF(3 * scale, 3 * scale, Width - 6 * scale, Height - 6 * scale);
            if (Rainbow)
            {
                Color[] colors = [Color.Coral, Color.Gold, Color.MediumSeaGreen, Color.CornflowerBlue, Color.MediumPurple, Color.Coral];
                for (int i = 0; i < colors.Length; i++) { using var part = new SolidBrush(colors[i]); g.FillPie(part, circle.X, circle.Y, circle.Width, circle.Height, i * 60, 61); }
            }
            else { using var fill = new SolidBrush(Swatch!.Value); g.FillEllipse(fill, circle); }
            using var ring = new Pen(Selected ? purple : (Dark ? Color.FromArgb(100, 91, 111) : Color.White), 2 * scale);
            g.DrawEllipse(ring, circle);
        }
        else if (Toggle)
        {
            var rect = new RectangleF(2 * scale, 7 * scale, Width - 4 * scale, Height - 14 * scale);
            using var path = Badge.Rounded(rect, rect.Height / 2); using var fill = new SolidBrush(Selected ? purple : neutral); g.FillPath(fill, path);
            float d = rect.Height - 4 * scale, x = Selected ? rect.Right - d - 2 * scale : rect.Left + 2 * scale;
            using var thumb = new SolidBrush(Color.White); g.FillEllipse(thumb, x, rect.Y + 2 * scale, d, d);
        }
        else
        {
            using var path = Badge.Rounded(new RectangleF(0, 0, Width - 1, Height - 1), 7 * scale);
            using var fill = new SolidBrush(Selected ? (Dark ? Color.FromArgb(91, 65, 120) : Color.FromArgb(227, 215, 244)) : neutral);
            g.FillPath(fill, path);
            if (Device.Length > 0)
            {
                var saved = g.Save(); g.TranslateTransform((Width - 16 * scale) / 2, (Height - 16 * scale) / 2); g.ScaleTransform(scale, scale);
                Badge.DrawDevice(g, new RectangleF(0, 0, 16, 16), Device, ink); g.Restore(saved);
            }
            else TextRenderer.DrawText(g, Text, Font, ClientRectangle, ink, TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.SingleLine);
        }
        if (Focused) { using var focus = new Pen(purple, scale); g.DrawRectangle(focus, 1, 1, Width - 3, Height - 3); }
    }
}
internal sealed class SettingsPopup : Form
{
    readonly Badge ownerBadge;
    readonly Preferences settings;
    readonly TextBox name = new();
    readonly MenuTile host = new("") { Device = "Computer", AccessibleName = "Use computer name" };
    readonly MenuTile startup = new("") { Toggle = true, AccessibleName = "Start at login" };
    readonly List<(MenuTile tile, Func<bool> selected)> tiles = [];
    readonly ToolTip tips = new();
    bool syncing;
    internal SettingsPopup(Badge badge, Preferences preferences)
    {
        ownerBadge = badge; settings = preferences;
        Text = "PanelTag settings"; AccessibleName = Text;
        FormBorderStyle = FormBorderStyle.None; ShowInTaskbar = false; TopMost = true;
        StartPosition = FormStartPosition.Manual; AutoScaleMode = AutoScaleMode.Dpi; AutoScaleDimensions = new SizeF(96,96);
        ClientSize = new Size(280,350); KeyPreview = true; DoubleBuffered = true;
        Font = new Font("Segoe UI", 9f);
        var title = new LinkLabel { Text = "PanelTag", Location = new Point(12,10), Size = new Size(70,24), Font = new Font("Segoe UI", 11f, FontStyle.Bold), LinkBehavior = LinkBehavior.NeverUnderline, AccessibleName = "PanelTag — open website" };
        title.LinkClicked += (_,_) => { Hide(); Process.Start(new ProcessStartInfo("https://afshinki.github.io/PanelTag/") { UseShellExecute = true }); };
        Controls.Add(title);
        var dot = Label(".",82,8,12,24); dot.ForeColor = Color.FromArgb(53,132,228); dot.Font = new Font("Segoe UI",12f,FontStyle.Bold); dot.Tag = "brand-dot";
        Label("Name",12,44,35,28);
        name.SetBounds(52,49,177,23); name.BorderStyle = BorderStyle.None; name.MaxLength=24; name.AccessibleName="Badge name";
        name.TextChanged += (_,_) => { if (!syncing) ownerBadge.Change(()=>settings.Name=name.Text); };
        Controls.Add(name);
        Add(host,236,44,32,28,()=>ownerBadge.Change(()=>settings.Hostname=!settings.Hostname),()=>settings.Hostname);
        Label("Icon",12,83,35,28);
        string[] icons=["None","Computer","Laptop","Server"];
        for(int i=0;i<icons.Length;i++)
        {
            string value=icons[i]; var tile=new MenuTile(value=="None"?"−":"") { Device=value=="None"?"":value, AccessibleName="Icon: "+value };
            Add(tile,52+i*55,83,50,28,()=>ownerBadge.Change(()=>settings.Icon=value),()=>settings.Icon==value);
        }
        var system=new MenuTile("◐") { AccessibleName="System color" };
        Add(system,12,122,26,26,()=>ownerBadge.Change(()=>settings.SystemColor=true),()=>settings.SystemColor);
        string[] colors=["#3584e4","#278556","#a65b00","#c64640","#8156bb","#5e5c64"];
        string[] names=["Blue","Green","Amber","Red","Purple","Graphite"];
        for(int i=0;i<colors.Length;i++)
        {
            string value=colors[i]; var tile=new MenuTile("") { Swatch=ColorTranslator.FromHtml(value), AccessibleName=names[i] };
            Add(tile,43+i*31,122,26,26,()=>ownerBadge.Change(()=>{settings.SystemColor=false;settings.Color=value;}),()=>!settings.SystemColor&&settings.Color==value);
        }
        Add(new MenuTile(""){Rainbow=true,AccessibleName="Custom color"},229,122,26,26,()=>{
            Hide(); using var picker=new ColorDialog { Color=ownerBadge.Accent, FullOpen=true };
            if(picker.ShowDialog()==DialogResult.OK)ownerBadge.Change(()=>{settings.SystemColor=false;settings.Color=ColorTranslator.ToHtml(picker.Color);});
        },()=>false);
        Row(162,["⇤ Left","↔ Middle","⇥ Right"],["Left","Middle","Right"],()=>settings.Position,v=>settings.Position=v,"Position");
        Row(200,["a Small","A Medium","A Large"],["11","12","14"],()=>settings.Size.ToString(),v=>settings.Size=int.Parse(v),"Text size");
        Row(238,["● Filled","○ Outline","T Text only"],["Filled","Outline","Text"],()=>settings.Style,v=>settings.Style=v,"Style");
        var separator=new Panel { Location=new Point(12,279),Size=new Size(256,1),Tag="separator" }; Controls.Add(separator);
        Label("⏻  Start at login",12,286,170,28);
        Add(startup,190,286,39,28,()=>{try{Startup.Set(!Startup.Enabled());Sync();}catch(Exception e){MessageBox.Show(e.Message,"Could not change Start at login");}},Startup.Enabled);
        Add(new MenuTile("⏻") { AccessibleName="Quit PanelTag" },238,286,30,28,()=>{Hide();ownerBadge.Close();},()=>false);
        var credit=Label("Designed by Afshin K.I.",12,326,190,14);credit.Font=new Font("Segoe UI",7f);credit.Tag="muted";
        var version=Label("v"+Application.ProductVersion.Split('+')[0],223,326,48,14);version.Font=new Font("Segoe UI",7f);version.Tag="muted";
        Deactivate += (_,_)=>Hide();
        KeyDown += (_,e)=>{if(e.KeyCode==Keys.Escape){Hide();e.Handled=true;}};
        Sync();
    }
    Label Label(string text,int x,int y,int width,int height)
    {
        var label=new Label { Text=text,Location=new Point(x,y),Size=new Size(width,height),TextAlign=ContentAlignment.MiddleLeft,Font=new Font("Segoe UI",8.5f) };Controls.Add(label);return label;
    }
    void Add(MenuTile tile,int x,int y,int width,int height,Action action,Func<bool> selected)
    {
        tile.SetBounds(x,y,width,height);tile.Click+=(_,_)=>{action();Sync();};tiles.Add((tile,selected));Controls.Add(tile);tips.SetToolTip(tile,tile.AccessibleName);
    }
    void Row(int y,string[] labels,string[] values,Func<string> current,Action<string> set,string title)
    {
        for(int i=0;i<3;i++){string value=values[i];Add(new MenuTile(labels[i]){AccessibleName=title+": "+labels[i]},12+i*87,y,82,30,()=>ownerBadge.Change(()=>set(value)),()=>current()==value);}
    }
    internal void Sync()
    {
        if(IsDisposed)return;syncing=true;
        bool dark=ownerBadge.Dark;BackColor=dark?Color.FromArgb(45,42,51):Color.FromArgb(250,248,253);
        ForeColor=dark?Color.WhiteSmoke:Color.FromArgb(65,53,79);
        string value=settings.Hostname?Environment.MachineName:settings.Name;
        if(name.Text!=value)name.Text=value;
        name.Enabled=!settings.Hostname;name.BackColor=BackColor;name.ForeColor=ForeColor;
        foreach(Control c in Controls)
        {
            if(c is LinkLabel link){link.LinkColor=ForeColor;link.ActiveLinkColor=Color.MediumPurple;}
            else if(c.Tag as string=="separator")c.BackColor=dark?Color.FromArgb(75,67,86):Color.FromArgb(224,217,234);
            else if(c.Tag as string=="muted")c.ForeColor=dark?Color.FromArgb(167,154,182):Color.FromArgb(146,132,160);
            else if(c.Tag as string!="brand-dot")c.ForeColor=ForeColor;
        }
        foreach(var (tile,selected) in tiles){tile.Selected=selected();tile.Dark=dark;tile.BackColor=BackColor;tile.Invalidate();}
        syncing=false;
    }
    protected override void OnShown(EventArgs e)
    {
        base.OnShown(e);using var path=Badge.Rounded(new RectangleF(0,0,Width,Height),12*DeviceDpi/96f);var old=Region;Region=new Region(path);old?.Dispose();
    }
    internal void VerifyControls()
    {
        if(tiles.Count!=24)throw new InvalidOperationException("Unified menu is missing controls");
        var medium=tiles.Single(x=>x.tile.AccessibleName=="Text size: A Medium").tile;
        medium.PerformClick();if(settings.Size!=12)throw new InvalidOperationException("Size selection failed");
        name.Text="Lab";if(settings.Name!="Lab")throw new InvalidOperationException("Inline name editing failed");
        host.PerformClick();if(!settings.Hostname||name.Enabled)throw new InvalidOperationException("Hostname toggle failed");
        host.PerformClick();
    }
    protected override void Dispose(bool disposing){if(disposing)tips.Dispose();base.Dispose(disposing);}
}
