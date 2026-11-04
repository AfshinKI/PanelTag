const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {detect,packages,base} = require('../site/downloads.js');
for (const [hints,expected] of [
  [{platform:'Win32',userAgent:'Windows NT 10.0; Win64; x64'},'windows-x64'],
  [{platform:'Windows',architecture:'arm',bitness:'64'},'windows-arm64'],
  [{platform:'Windows',architecture:'x86',bitness:'64'},'windows-x64'],
  [{platform:'Windows',bitness:'32'},''],
  [{platform:'MacIntel'},'macos'],
  [{platform:'macOS',architecture:'arm'},'macos'],
  [{platform:'Linux x86_64'},'linux'],
  [{platform:'Linux armv8',userAgent:'Android 15'},''],
  [{platform:'MacIntel',maxTouchPoints:5},''],
  [{platform:'iPhone',userAgent:'iPhone'},''],
  [{platform:'Linux',userAgent:'CrOS x86_64'},''],
  [{},'']
]) assert.equal(detect(hints),expected,JSON.stringify(hints));
const metadata = JSON.parse(fs.readFileSync('extension/metadata.json','utf8'));
for (const p of Object.values(packages)) { assert.ok(p.file.includes(metadata['version-name'])); assert.ok(base.endsWith(`/v${metadata['version-name']}/`)); }
// Exercise DOM wiring and a manual override before async architecture hints arrive.
const elements = new Map();
function element(id) { if(!elements.has(id)) elements.set(id,{addEventListener(name,fn){this[name]=fn;},hidden:false,value:'',textContent:''});return elements.get(id); }
function makeButton(dataset){return {dataset,attrs:{},setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,fn){this[k]=fn;}};}
const platformButtons=['linux','macos','windows','linux','macos','windows'].map(platform=>makeButton({platform}));
const archButtons=['x64','arm64'].map(architecture=>makeButton({architecture}));
let finishHints, demoPlatform;
const document={getElementById:element,querySelectorAll(selector){return selector==='[data-platform]'?platformButtons:archButtons;}};
const context = {document,PanelTagDemo:{setPlatform(value){demoPlatform=value;}},navigator:{platform:'Win32',userAgent:'Windows NT 10.0',maxTouchPoints:0,userAgentData:{platform:'Windows',getHighEntropyValues(){return new Promise(resolve=>{finishHints=resolve;});}}}};
vm.runInNewContext(fs.readFileSync('site/downloads.js','utf8'),context);
assert.match(element('package-link').href,/windows-x64/);
assert.equal(demoPlatform,'windows');
platformButtons[1].click();
assert.equal(demoPlatform,'macos');
assert.equal(platformButtons[4].attrs['aria-pressed'],'true');
finishHints({architecture:'arm',bitness:'64'});
setImmediate(()=>{
 assert.match(element('package-link').href,/macos-universal/);
 assert.equal(element('command-box').hidden,false);
 assert.match(element('install-command').textContent,/--allow-unsigned/);
 platformButtons[2].click();archButtons[1].click();
 assert.match(element('package-link').href,/windows-arm64/);
 assert.equal(demoPlatform,'windows');
 platformButtons[0].click();
 assert.match(element('package-link').href,/all.deb/);
 assert.equal(demoPlatform,'linux');
 assert.equal(element('command-box').hidden,false);
 vm.runInNewContext(fs.readFileSync('site/downloads.js','utf8'),{document,PanelTagDemo:{setPlatform(value){demoPlatform=value;}},navigator:{platform:'',userAgent:''}});
 assert.equal(demoPlatform,'linux');
 assert.match(element('package-link').href,/all.deb/);
 console.log('OS detection, platform buttons, ARM selection, manual override, and Linux fallback passed');
});
const html=fs.readFileSync('site/index.html','utf8');
for(const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
