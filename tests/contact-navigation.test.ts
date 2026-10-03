import test from 'node:test';
import assert from 'node:assert/strict';
import {createBattle,trainingBattle,stepBattle,contactGap,alive,attackDirection} from '../src/battle.ts';
import {battleClick,groupOrder,issueOrder} from '../src/controls.ts';
import {generateMap} from '../src/terrain.ts';
const flat=()=>{const m=generateMap('plain',1);m.obstacles=[];m.forests=[];m.relief.amplitude=0;return m;};
function march(){const b=createBattle([{id:'a',type:'infantry',men:80},{id:'z',type:'infantry',men:80}],[{id:'e',type:'warband',men:90}],false,false,flat());b.phase='combat';return b;}
function advance(b:ReturnType<typeof march>,steps:number){for(let i=0;i<steps;i++){b.units[2].x=2300;b.units[2].y=100;stepBattle(b);}}
test('diagonal empty space is not a collision, parallel rows use formation depth',()=>{
 const b=march(),[a,z]=b.units;a.x=500;a.y=800;z.x=540;z.y=850;a.angle=z.angle=0;
 assert.equal(contactGap(a,z),16);z.y=800;z.x=534;assert.equal(contactGap(a,z),10);
});
test('two close rows can be deployed, selected and translated without being pushed apart',()=>{
 const b=march(),[a,z]=b.units;b.phase='deployment';a.x=450;a.y=800;z.x=260;z.y=910;
 assert.equal(battleClick(b,z.id,{x:415,y:800},false,true,0).error,'');
 assert.equal(groupOrder(b,[a.id,z.id],{x:440,y:900}),'');assert.equal(Math.abs(a.x-z.x),35);
 b.phase='combat';advance(b,50);assert.equal(Math.abs(a.x-z.x),35);
});
test('approach from rear, flank and oblique rear causes casualties while the defender holds its front',()=>{
 for(const angle of [Math.PI,Math.PI/2,Math.PI*.75,Math.PI*1.25]){
  const b=createBattle([{id:'d',type:'infantry',men:80}],[{id:'a',type:'heavyCavalry',men:40}],false,false,flat());b.phase='combat';
  const[d,a]=b.units;d.x=1100;d.y=800;d.angle=0;a.x=d.x+Math.cos(angle)*300;a.y=d.y+Math.sin(angle)*300;a.angle=angle+Math.PI;
  for(let i=0;i<180&&!b.winner;i++)stepBattle(b);
  assert.ok(d.men<75,`no melee damage from ${angle}: ${d.men}`);assert.equal(d.angle,0);assert.notEqual(attackDirection(a,d),'front');
 }
});
test('a moving cohort gets around a stationary ally and finishes beyond it',()=>{
 const b=march(),[a,z]=b.units;a.x=400;a.y=800;z.x=600;z.y=800;issueOrder(a,{kind:'move',x:900,y:800,facing:0});
 advance(b,300);assert.ok(Math.hypot(a.x-900,a.y-800)<3,`${a.x},${a.y}`);assert.equal(a.order.kind,'hold');assert.ok(contactGap(a,z)>=0);
});
test('allies meeting head-on can pass each other instead of turning in place',()=>{
 const b=march(),[a,z]=b.units;a.x=400;a.y=800;z.x=850;z.y=800;z.angle=Math.PI;
 issueOrder(a,{kind:'move',x:950,y:800,facing:0});issueOrder(z,{kind:'move',x:300,y:800,facing:Math.PI});
 advance(b,400);assert.ok(a.x>940&&z.x<310,`${a.x},${z.x}`);assert.ok(contactGap(a,z)>=0);
});
test('eight-unit AI armies deployed in tight rows reach combat and produce losses',()=>{
 const b=trainingBattle('plain',1);b.map=flat();b.phase='combat';b.aiRome=true;
 for(const side of ['rome','boii'])b.units.filter(u=>u.side===side).forEach((u,i)=>{u.x=side==='rome'?600-(i%2)*45:1800+(i%2)*45;u.y=550+Math.floor(i/2)*120;});
 for(let i=0;i<1800&&!b.winner;i++)stepBattle(b);
 assert.ok(b.units.some(u=>u.men<u.initialMen-5));assert.ok(b.winner||b.units.filter(alive).length<12,'AI never reaches meaningful combat');
});
