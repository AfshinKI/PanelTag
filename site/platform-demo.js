/* Shared settings walkthrough, with platform-specific desktop shells. */
function setDemoPlatform(platform) {
  const next=platform==='macos'?'macos':platform.startsWith('windows')?'windows':'linux';
  if(document.querySelector('.desktop').dataset.ready==='true'&&next===demoPlatform)return;
  stopDemo();demoPlatform=next;demoIndex=0;
  const desktop=document.querySelector('.desktop');desktop.dataset.os=next;desktop.dataset.ready='true';
  $('settings').hidden=false;
  $('badge').hidden=false;$('name').value='Work';$('hostname').checked=false;$('followTheme').checked=true;
  $('position').value=next==='macos'?'right':'middle';$('style').value='outline';icon='none';
  $('shell-brand').textContent=next==='macos'?'◆  Finder   File   Edit':'● ●';
  $('shell-system').textContent=next==='macos'?'◖))   Tue 10:24':'Wi-Fi   ◖))   ⏻';
  $('preview-label').textContent={linux:'Linux · GNOME panel',macos:'macOS · Menu bar',windows:'Windows · Desktop badge'}[next];
  $('desktop-os-title').textContent={linux:'Linux',macos:'Hello, Mac.',windows:'Hello, Windows.'}[next];
  $('demo-caption').textContent={linux:'A little label, right in your Linux panel.',macos:'At home in your Mac menu bar.',windows:'A floating badge. A handy tray icon.'}[next];
  update();startDemo();

}
window.PanelTagDemo={setPlatform:setDemoPlatform};
