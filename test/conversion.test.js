// JavaScript / test/conversion.test.js / Node.js 24+ / sensitivity and FOV conversion
import test from 'node:test';
import assert from 'node:assert/strict';
import {convertSensitivity,DEFAULT_FOV_Y,verticalFov,horizontalFov,APP_YAW} from '../public/conversion.js';
import {DEFAULT_AIM,sanitizeAim,cmPer360,moveAim} from '../public/aim.js';
const input={game:'cs2',sensitivity:1,sourceDpi:800,targetDpi:800,multiplier:.02,applyFov:true,fov:90,fovType:'h43'};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('CS defaults preserve sensitivity, physical distance and legacy projection',()=>{
 const r=convertSensitivity(input);close(r.sensitivity,1);close(r.cmX,51.95454545454545);close(r.fovY,DEFAULT_FOV_Y);close(verticalFov(horizontalFov(r.fovY),'hArena'),r.fovY);
 close(cmPer360({...DEFAULT_AIM,...r}),r.cmX);
});
test('Valorant and Overwatch profiles map equal angular gains to the same AimRush value',()=>{
 const val=convertSensitivity({...input,game:'valorant',sensitivity:.022/.07});const ow=convertSensitivity({...input,game:'overwatch',sensitivity:.022/.0066});close(val.sensitivity,1);close(ow.sensitivity,1);
 const cod=convertSensitivity({...input,game:'cod_legacy',sensitivity:10});close(cod.sensitivity,3);close(convertSensitivity({...input,game:'apex'}).sensitivity,1);
});
test('changing hardware DPI preserves cm/360 without changing cross-game eDPI blindly',()=>{
 const r=convertSensitivity({...input,sensitivity:2,sourceDpi:400,targetDpi:800});close(r.sensitivity,1);close(r.cmX,51.95454545454545);
 const half=convertSensitivity({...input,targetDpi:1600});close(half.sensitivity,.5);close(half.cmX,cmPer360({...DEFAULT_AIM,...half}));
});
test('R6 uses the configured multiplier and preserves independent vertical sensitivity',()=>{
 const standard=convertSensitivity({...input,game:'r6',sensitivity:6,verticalSensitivity:8});
 close(standard.sensitivity,(.0001*180/Math.PI)*6/.022);close(standard.verticalRatio,8/6);
 const custom=convertSensitivity({...input,game:'r6',sensitivity:6,multiplier:.002});close(custom.sensitivity,standard.sensitivity/10);
 assert.throws(()=>convertSensitivity({...input,game:'r6',sensitivity:101}));assert.throws(()=>convertSensitivity({...input,game:'r6',multiplier:0}));
});
test('measured distance supports current Warzone and unknown games without a guessed scale',()=>{
 for(const game of ['warzone_measured','measured']){
  const r=convertSensitivity({...input,game,measuredCm:40,measuredCmY:80});close(r.cmX,40);close(r.cmY,80);close(r.verticalRatio,.5);close(r.sensitivity,360*2.54/(40*.022*800));
 }
 assert.throws(()=>convertSensitivity({...input,game:'warzone_measured',measuredCm:0}));
});
test('FOV is separate from cm/360 and influences projected pointer movement',()=>{
 close(verticalFov(60,'vertical'),60);
 const a=convertSensitivity({...input,applyFov:false},60),b=convertSensitivity({...input,fov:90,fovType:'vertical'});close(a.cmX,b.cmX);close(a.fovY,60);
 const pa=moveAim([500,300],100,0,{...DEFAULT_AIM,...a}),pb=moveAim([500,300],100,0,{...DEFAULT_AIM,...b});assert.ok(pa[0]>pb[0]);
 assert.throws(()=>verticalFov(90,'unknown'));assert.throws(()=>convertSensitivity({...input,fov:NaN}));
});
test('applied settings preserve full conversion precision and imported ranges',()=>{
 const r=convertSensitivity({...input,game:'valorant',sensitivity:.123456789,targetDpi:1600});const settings=sanitizeAim({...DEFAULT_AIM,...r,sourceGame:r.game});close(settings.sensitivity,r.sensitivity);close(settings.fovY,r.fovY);
 assert.equal(settings.sourceGame,'valorant');assert.equal(sanitizeAim({...DEFAULT_AIM,sensitivity:30}).sensitivity,30);
 const moved=moveAim([500,300],100,0,settings);const focal=600/(2*Math.tan(settings.fovY*Math.PI/360));close(Math.atan((moved[0]-500)/focal)*180/Math.PI,100*APP_YAW*r.sensitivity);
});
test('invalid inputs are rejected rather than silently clamped or applied',()=>{
 for(const patch of [{game:'nope'},{sourceDpi:0},{targetDpi:Infinity},{sensitivity:NaN},{sensitivity:-1},{targetDpi:16001},{sensitivity:100000}])assert.throws(()=>convertSensitivity({...input,...patch}));
});
