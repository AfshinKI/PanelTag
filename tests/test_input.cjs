const fs=require('fs'),vm=require('vm'),assert=require('assert');
for(const file of ['extension/extension.js','legacy/extension.js']){
 const source=fs.readFileSync(file,'utf8'),start=source.indexOf('const PanelTagButton');
 const code=source.slice(start,source.indexOf('\n});',start)+4);
 let toggles=0;
 const context={GObject:{registerClass:c=>c},PanelMenu:{Button:class{constructor(){this.menu={toggle:()=>toggles++}}}},Clutter:{EventType:{BUTTON_PRESS:1},EVENT_STOP:1,EVENT_PROPAGATE:0}};
 vm.createContext(context);vm.runInContext(code+'\nthis.button=new PanelTagButton();',context);
 for(const button of [1,2])context.button.vfunc_event({type:()=>1,get_button:()=>button});
 assert.equal(toggles,0,'left/middle click');
 context.button.vfunc_event({type:()=>1,get_button:()=>3});assert.equal(toggles,1,'right-click once');
 assert.equal(context.button.vfunc_event({type:()=>2}),0,'keyboard propagation');assert.equal(toggles,1);
}
console.log('Modern and legacy right-click routing passed.');
