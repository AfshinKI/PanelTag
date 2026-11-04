/* Presentational desktop previews; every control inside the desktop stays inert. */
function buildNativeMenu() {
  const rows = [
    '<div class="native-row native-brand">PanelTag<b>·</b></div><div class="native-divider"></div>',
    '<div class="native-row" id="native-edit">Name…<span class="row-value" id="native-current-name">Work</span></div>',
    '<div class="native-row"><span class="native-check"></span>Use computer name</div>',
    ...['Icon','Color',...(demoPlatform==='windows'?['Position']:[]),'Text size','Badge style'].map(title=>`<div class="native-row" id="native-${title.toLowerCase().replace(' ','-')}">${title}<span class="row-arrow">›</span></div>`),
    '<div class="native-divider"></div><div class="native-row">✓ &nbsp; Start at login</div>',
    '<div class="native-row">⏻ &nbsp; Quit PanelTag</div><div class="native-divider"></div>',
    '<div class="native-credit">Designed by Afshin K.I. · v0.4.0</div>'
  ];
  $('native-menu').innerHTML=rows.join('');
}
function openNativeMenu() {
  $('native-menu').hidden=false;
  $('native-current-name').textContent=$('name').value;
  if(demoPlatform==='windows') {
    const stage=document.querySelector('.stage').getBoundingClientRect(),badge=$('badge').getBoundingClientRect(),menu=$('native-menu');
    menu.style.left=Math.max(8,Math.min(stage.width-menu.offsetWidth-8,badge.left-stage.left))+'px';
  } else $('native-menu').style.left='';
}
function nativeSubmenu(options, selected, row) {
  $('native-submenu').innerHTML=options.map(([label,value,decoration])=>`<div class="native-row" data-native-value="${value}"><span class="native-check">${value===selected?'✓':decoration||''}</span>${label}</div>`).join('');
  $('native-submenu').hidden=false;
  const stage=document.querySelector('.stage').getBoundingClientRect(),menu=$('native-menu').getBoundingClientRect(),sub=$('native-submenu'),anchor=$('native-'+row).getBoundingClientRect();
  const preferred=demoPlatform==='macos'?menu.left-stage.left-sub.offsetWidth-5:menu.right-stage.left+5;
  sub.style.left=Math.max(8,Math.min(stage.width-sub.offsetWidth-8,preferred))+'px';sub.style.right='auto';
  sub.style.top=Math.min(stage.height-sub.offsetHeight-60,anchor.top-stage.top)+'px';
}
async function tickNativeDemo(run) {
  if(run!==demoRun)return;
  const p=Object.values(presets)[demoIndex++%3];
  $('demo-status').textContent=demoPlatform==='macos'?'A familiar menu. A personal touch.':'Your name, always in view.';
  if(!await demoPoint($('badge'),run,openNativeMenu))return;
  if(!await demoPoint($('native-edit'),run,()=>{$('native-menu').hidden=true;$('native-dialog').hidden=false;$('native-name').textContent='';}))return;
  for(const letter of p.name){if(run!==demoRun)return;$('native-name').textContent+=letter;await demoWait(190);}
  if(run!==demoRun)return;
  if(!await demoPoint($('native-save'),run,()=>{$('name').value=p.name;$('hostname').checked=false;$('native-dialog').hidden=true;update();}))return;
  if(!await demoPoint($('badge'),run,openNativeMenu))return;
  const choices=[
    ['icon',[['None','none'],['Computer','monitor',deviceIcons.monitor],['Laptop','laptop',deviceIcons.laptop],['Server','server',deviceIcons.server]],icon,p.icon,()=>{icon=p.icon;}],
    ['color',[['System accent','system'],['Purple','#8156bb'],['Blue','#3584e4'],['Green','#278556']],$('followTheme').checked?'system':color,p.color,()=>{color=p.color;$('followTheme').checked=false;}],
    ['badge-style',[['Filled','filled'],['Outline','outline'],['Text','text']],$('style').value,p.style,()=>{$('style').value=p.style;}]
  ];
  if(demoPlatform==='windows')choices.push(['position',[['Left','left'],['Middle','middle'],['Right','right']],$('position').value,p.position,()=>{$('position').value=p.position;}]);
  for(const [row,options,current,selected,apply] of choices){
    if(!await demoPoint($('native-'+row),run,()=>nativeSubmenu(options,current,row)))return;
    const option=$('native-submenu').querySelector(`[data-native-value="${selected}"]`);
    if(!await demoPoint(option,run,()=>{apply();update();}))return;
    $('native-submenu').hidden=true;
  }
  await demoWait(1100);if(run!==demoRun)return;
  if(!await demoPoint($('badge'),run,()=>{$('native-menu').hidden=true;}))return;
  demoCursor.classList.remove('visible');await demoWait(2400);
  if(run===demoRun)tickNativeDemo(run);
}
function setDemoPlatform(platform) {
  const next=platform==='macos'?'macos':platform.startsWith('windows')?'windows':'linux';
  if(document.querySelector('.desktop').dataset.ready==='true'&&next===demoPlatform)return;
  stopDemo();demoPlatform=next;demoIndex=0;
  const desktop=document.querySelector('.desktop');desktop.dataset.os=next;desktop.dataset.ready='true';
  $('settings').hidden=next!=='linux';$('native-menu').hidden=true;$('native-submenu').hidden=true;$('native-dialog').hidden=true;
  $('badge').hidden=false;$('name').value='Work';$('hostname').checked=false;$('followTheme').checked=true;
  $('position').value=next==='macos'?'right':'middle';$('style').value='outline';icon='none';
  $('shell-brand').textContent=next==='macos'?'◆  Finder   File   Edit':'● ●';
  $('shell-system').textContent=next==='macos'?'◖))   Tue 10:24':'Wi-Fi   ◖))   ⏻';
  $('preview-label').textContent={linux:'Linux · GNOME panel',macos:'macOS · Menu bar',windows:'Windows · Desktop badge'}[next];
  $('desktop-os-title').textContent={linux:'Linux',macos:'Hello, Mac.',windows:'Hello, Windows.'}[next];
  $('demo-caption').textContent={linux:'A little label, right in your Linux panel.',macos:'At home in your Mac menu bar.',windows:'A floating badge. A handy tray icon.'}[next];
  buildNativeMenu();update();startDemo();
  if(reducedMotion.matches&&next!=='linux')$('native-menu').hidden=false;
}
window.PanelTagDemo={setPlatform:setDemoPlatform};
