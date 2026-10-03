import test from 'node:test';
import assert from 'node:assert/strict';
import {createBattle,stepBattle,contactGap} from '../src/battle.ts';
import {generateMap} from '../src/terrain.ts';
import {issueOrder} from '../src/controls.ts';
function scene(){const map=generateMap('plain',1);map.obstacles=[];map.forests=[];map.relief.amplitude=0;const b=createBattle([{id:'a',type:'infantry',men:80},{id:'z',type:'infantry',men:80}],[{id:'e',type:'warband',men:90}],false,false,map);b.phase='combat';return b;}
function run(b:ReturnType<typeof scene>,ticks=450){for(let i=0;i<ticks;i++){b.units[2].x=2350;b.units[2].y=60;stepBattle(b);}}
test('touching an oblique ally with a formation corner does not freeze a move',()=>{
 for(const [dx,dy,heading] of [[0,60,0],[25,35,Math.PI/4],[-40,60,Math.PI/2],[55,0,0],[25,-70,Math.PI*1.5],[-55,0,Math.PI]]){
  const b=scene(),[a,z]=b.units;a.x=700;a.y=800;a.angle=0;z.x=a.x+dx;z.y=a.y+dy;z.angle=Math.PI/4;
  const goal={x:a.x+Math.cos(heading)*250,y:a.y+Math.sin(heading)*250};issueOrder(a,{kind:'move',...goal});run(b);
  assert.ok(Math.hypot(a.x-goal.x,a.y-goal.y)<3,`${dx},${dy},${heading}: ${a.x},${a.y}`);assert.equal(a.order.kind,'hold');assert.ok(contactGap(a,z)>=0);
 }
});
test('failed rotation does not force a stationary ally aside while a cohort passes',()=>{
 const b=scene(),[a,z]=b.units;a.x=700;a.y=800;a.angle=0;z.x=700;z.y=862;z.angle=Math.PI/4;assert.ok(contactGap(a,z)>0);
 const start={x:z.x,y:z.y};issueOrder(a,{kind:'move',x:950,y:800,facing:Math.PI/2});run(b);
 assert.ok(Math.hypot(a.x-950,a.y-800)<3);assert.ok(Math.hypot(z.x-start.x,z.y-start.y)<.01);assert.ok(Math.abs(a.angle-Math.PI/2)<.04);
});
test('an appended order continues after sliding around a corner contact',()=>{
 const b=scene(),[a,z]=b.units;a.x=700;a.y=800;z.x=755;z.y=800;z.angle=Math.PI/4;
 issueOrder(a,{kind:'move',x:950,y:800});issueOrder(a,{kind:'move',x:950,y:1000},true);run(b,650);
 assert.ok(Math.hypot(a.x-950,a.y-1000)<3);assert.equal(a.queue.length,0);assert.equal(a.order.kind,'hold');
});

test('two moving formations meeting at oblique corners complete both orders',()=>{
 const b=scene(),[a,z]=b.units;a.x=700;a.y=800;a.angle=0;z.x=750;z.y=830;z.angle=Math.PI/4;
 issueOrder(a,{kind:'move',x:1000,y:800});issueOrder(z,{kind:'move',x:450,y:950});run(b,650);
 assert.ok(Math.hypot(a.x-1000,a.y-800)<3);assert.ok(Math.hypot(z.x-450,z.y-950)<3);assert.ok(contactGap(a,z)>=0);
});
test('one-pixel overlap of formation widths triggers a lateral pass, even with the blocker center off the path',()=>{
 const b=scene(),[a,z]=b.units;a.x=400;a.y=700;a.angle=0;z.x=460;z.y=774;z.angle=0;z.formation='loose';
 const start={x:z.x,y:z.y};issueOrder(a,{kind:'move',x:950,y:700});run(b);
 assert.ok(Math.hypot(a.x-950,a.y-700)<3);assert.equal(z.x,start.x);assert.equal(z.y,start.y);assert.ok(contactGap(a,z)>=0);
});
