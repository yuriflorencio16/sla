// JavaScript / test/practice.test.js / Node.js 24+ / free training sessions
import test from 'node:test';
import assert from 'node:assert/strict';
import {PracticeSession} from '../public/practice.js';
test('precision and flick replenish hit targets, while errors reset the combo',()=>{
 for(const mode of ['precision','flick']){
  const g=new PracticeSession({mode},0,()=>.5);assert.equal(g.targets.length,mode==='precision'?3:1);
  const t={...g.targets[0]};assert.equal(g.shoot(t.x,t.y,100),true);assert.equal(g.hits,1);assert.equal(g.targets[0].born,100);
  assert.equal(g.shoot(0,0,200),false);assert.equal(g.streak,0);assert.equal(g.bestStreak,1);assert.equal(g.stats(200).accuracy,50);assert.equal(g.stats(200).reaction,100);
 }
});
test('timed sessions end at their deadline; free sessions have no countdown',()=>{
 const timed=new PracticeSession({duration:30000},1000);timed.tick(31000);assert.equal(timed.active,false);assert.equal(timed.stats(99999).elapsed,30000);assert.equal(timed.shoot(500,300,31001),null);
 const free=new PracticeSession({duration:0},0);free.tick(1000000);assert.equal(free.active,true);assert.equal(free.stats(1000000).remaining,null);
});
test('tracking moves the target and measures actual time inside its radius',()=>{
 const g=new PracticeSession({mode:'tracking',radius:48},0,()=>.5);g.tick(0);const start={...g.targets[0]};g.tick(50,[start.x,start.y]);g.tick(100,[0,0]);
 assert.notEqual(g.targets[0].x,start.x);assert.equal(g.stats(100).tracking,50);
 assert.equal(g.shoot(g.targets[0].x,g.targets[0].y,100),true);assert.equal(g.targets.length,1);
});
