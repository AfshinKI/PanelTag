/* Local browser hints only: no analytics, requests, or automatic downloads. */
(function (root) {
  const version = '0.5.0';
  const base = `https://github.com/AfshinKI/PanelTag/releases/download/v${version}/`;
  const packages = {
    linux: {label: 'Linux · Ubuntu / GNOME', file: `paneltag_${version}_all.deb`, button: 'Download for Linux ↓', detail: 'Ubuntu with GNOME 3.36–51 · architecture-independent package', install: 'Open a terminal in your Downloads folder and run:', command: `sudo apt install ./paneltag_${version}_all.deb`, launch: 'Search for PanelTag in your apps. Log out and back in once if the badge does not appear, or after upgrading.', note: 'For GNOME desktops. KDE, other Linux desktops, and ChromeOS are not supported.'},
    macos: {label: 'macOS', file: `PanelTag-${version}-macos-universal.dmg`, button: 'Download for Mac ↓', detail: 'macOS 13 or later · Apple silicon and Intel in one download', install: 'Drag PanelTag to Applications, or use this terminal installer for your user account:', command: 'curl -fsSL https://afshinki.github.io/PanelTag/install-macos.sh | bash -s -- --allow-unsigned', launch: 'Open PanelTag from Applications. Right-click its menu-bar badge for settings. Hold Command and drag to move it within the menu bar.', note: 'Not Apple-notarized. The optional terminal command verifies the download and explicitly removes quarantine from PanelTag only; use it only if you trust this release. macOS may block opening it. If you trust the download, use System Settings → Privacy & Security → Open Anyway. Login startup may need system approval.'},
    'windows-x64': {label: 'Windows · Intel / AMD', file: `PanelTag-${version}-windows-x64-setup.exe`, button: 'Download for Windows ↓', detail: 'Windows 10 (1809+) / 11 · Intel or AMD 64-bit PC', install: 'Open the installer and follow the setup steps. No separate runtime needed.', launch: 'Leave Launch PanelTag selected. Right-click the floating badge or tray icon for settings. The badge sits at the top of your primary screen.', note: 'First Windows release: unsigned publisher. Windows may show a SmartScreen warning. Windows uses a floating badge and tray icon; it does not add a text label inside the taskbar.'},
    'windows-arm64': {label: 'Windows · ARM', file: `PanelTag-${version}-windows-arm64-setup.exe`, button: 'Download for Windows ARM ↓', detail: 'Windows 11 · ARM64 / Snapdragon PC', install: 'Open the ARM installer and follow the setup steps. No separate runtime needed.', launch: 'Leave Launch PanelTag selected. Right-click the floating badge or tray icon for settings. The badge sits at the top of your primary screen.', note: 'First Windows release: unsigned publisher. Windows may show a SmartScreen warning. ARM64 is cross-compiled; live ARM testing is still pending.'}
  };
  function detect({platform = '', userAgent = '', maxTouchPoints = 0, architecture = '', bitness = ''} = {}) {
    if (/Android|iPhone|iPad|iPod|CrOS/i.test(userAgent) || (/Mac/i.test(platform) && maxTouchPoints > 1)) return '';
    if (/Win/i.test(platform) || /Windows/i.test(userAgent)) {
      if (bitness === '32' || /Windows.*(?:WOW32|Win32|i686)/i.test(userAgent)) return '';
      return /arm/i.test(architecture) || /arm64|aarch64/i.test(userAgent) ? 'windows-arm64' : 'windows-x64';
    }
    if (/Mac/i.test(platform) || /Macintosh/i.test(userAgent)) return 'macos';
    if (/Linux/i.test(platform) || /Linux/i.test(userAgent)) return 'linux';
    return '';
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = {detect, packages, base};
  if (typeof document === 'undefined') return;
  const $ = id => document.getElementById(id);
  let manual = false;
  let windowsArch = 'x64';
  function render(key, automatic = false) {
    const detected = !!packages[key];
    key = detected ? key : 'linux';
    const p = packages[key];
    const platform = key.startsWith('windows') ? 'windows' : key;
    if (platform === 'windows') windowsArch = key.endsWith('arm64') ? 'arm64' : 'x64';
    document.querySelectorAll('[data-platform]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.platform === platform)));
    document.querySelectorAll('[data-architecture]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.architecture === windowsArch)));
    $('architecture-switch').hidden = platform !== 'windows';
    $('os-detected').textContent = automatic && detected ? `Suggested for your computer · ${p.label}` : automatic ? 'Linux preview selected. Choose the platform you want.' : `${p.label} selected`;
    $('package-link').hidden = false;
    $('install-details').hidden = false;
    $('platform-note').hidden = false;
    root.PanelTagDemo?.setPlatform(platform);
    $('package-link').href = base + p.file; $('package-link').textContent = p.button;
    $('package-detail').textContent = p.detail;
    $('install-instruction').textContent = p.install;
    $('launch-instruction').textContent = p.launch;
    $('command-box').hidden = !p.command;
    $('install-command').textContent = p.command || '';
    $('platform-note').textContent = p.note;
    $('copy-status').textContent = '';
  }
  document.querySelectorAll('[data-platform]').forEach(button => button.addEventListener('click', () => { manual = true; render(button.dataset.platform === 'windows' ? 'windows-' + windowsArch : button.dataset.platform); }));
  document.querySelectorAll('[data-architecture]').forEach(button => button.addEventListener('click', () => { manual = true; render('windows-' + button.dataset.architecture); }));
  const hints = {platform: navigator.userAgentData?.platform || navigator.platform, userAgent: navigator.userAgent, maxTouchPoints: navigator.maxTouchPoints};
  render(detect(hints), true);
  if (navigator.userAgentData?.getHighEntropyValues) {
    navigator.userAgentData.getHighEntropyValues(['architecture','bitness']).then(extra => { if (!manual) render(detect({...hints, ...extra}), true); }).catch(() => {});
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
