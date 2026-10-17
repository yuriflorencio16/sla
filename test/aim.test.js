// JavaScript / test/aim.test.js / Node.js 24+ / settings and relative sensitivity
import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_AIM,sanitizeAim,loadAim,saveAim,moveAim,cmPer360} from '../public/aim.js';
test('invalid persisted settings cannot corrupt crosshair or movement',()=>{
 const s=sanitizeAim({size:100,gap:-99,opacity:0,sensitivity:Infinity,color:'red',shape:'other',dot:'yes',inputMode:'invalid'});
 assert.equal(s.size,24);assert.equal(s.gap,-4);assert.equal(s.opacity,20);assert.equal(s.sensitivity,1);assert.equal(s.color,DEFAULT_AIM.color);assert.equal(s.shape,'classic');assert.equal(s.dot,false);assert.equal(s.inputMode,'captured');
 assert.deepEqual(loadAim({getItem:()=>'{bad JSON'}),{...DEFAULT_AIM});assert.deepEqual(loadAim(undefined),{...DEFAULT_AIM});
});
test('crosshair and sensitivity round-trip through local storage',()=>{
 let saved;const storage={setItem:(key,value)=>saved=value,getItem:()=>saved};
 const s=sanitizeAim({shape:'circle',sensitivity:2.17,dpi:1600,color:'#ff00ff',dot:true});
 assert.equal(saveAim(storage,s),true);assert.deepEqual(loadAim(storage),s);assert.equal(saveAim({setItem:()=>{throw Error('disabled');}},s),false);
});
test('relative aim responds to sensitivity, inversion and bounds; DPI is reference only',()=>{
 const center=[500,300],a=moveAim(center,100,50,DEFAULT_AIM),b=moveAim(center,100,50,{...DEFAULT_AIM,sensitivity:2});
 assert.ok(b[0]-500>(a[0]-500)*1.99);assert.ok(b[0]-500<(a[0]-500)*2.02);
 assert.ok(moveAim(center,0,50,{...DEFAULT_AIM,invertY:true})[1]<300);
 assert.deepEqual(moveAim(center,100,50,{...DEFAULT_AIM,dpi:1600}),a);
 const end=moveAim(center,1e9,-1e9,DEFAULT_AIM);assert.ok(end[0]<=1000&&end[1]>=0);assert.ok(end.every(Number.isFinite));
 assert.ok(Math.abs(cmPer360(DEFAULT_AIM)-51.9545)<.001);
});
