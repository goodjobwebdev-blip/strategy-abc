import test from 'node:test';
import assert from 'node:assert/strict';
import {createBattle,stepBattle,contactGap,planAI,alive} from '../src/battle.ts';
import {groupOrder,groupSlots,issueOrder} from '../src/controls.ts';
import {generateMap} from '../src/terrain.ts';
function flat(forest=false){const m=generateMap('plain',1);m.obstacles=[];m.relief.amplitude=0;m.forests=forest?[{x:1200,y:800,rx:1190,ry:780}]:[];return m;}
test('attack orders make fresh heavy cavalry catch fleeing archers on plain and in forest',()=>{
 for(const forest of [false,true]){
  const b=createBattle([{id:'horse',type:'heavyCavalry',men:40}],[{id:'bow',type:'archers',men:60}],false,false,flat(forest));b.phase='combat';
  const [horse,bow]=b.units;horse.x=500;bow.x=forest?720:950;horse.y=bow.y=800;
  issueOrder(horse,{kind:'attack',target:bow.id});assert.equal(horse.pace,'run');
  let caught=false;
  for(let i=0;i<350&&!b.winner;i++){stepBattle(b);if(contactGap(horse,bow)<=8&&bow.men<60){caught=true;break;}}
  assert.ok(caught,`cavalry never caught archers in ${forest?'forest':'plain'}`);
 }
});
test('group movement preserves a custom front, rear archers and cavalry wing regardless of selection order',()=>{
 const own=[{id:'front',type:'infantry' as const,men:80},{id:'spear',type:'spears' as const,men:80},{id:'rear',type:'archers' as const,men:60},{id:'wing',type:'heavyCavalry' as const,men:40}];
 const b=createBattle(own,[{id:'e',type:'warband',men:90}],false,false,flat());b.phase='combat';
 const places=[{x:500,y:700},{x:500,y:850},{x:350,y:775},{x:350,y:600}];b.units.slice(0,4).forEach((u,i)=>Object.assign(u,places[i],{angle:0}));
 const ids=[b.units[2].id,b.units[0].id,b.units[3].id,b.units[1].id],before=structuredClone(b.units.slice(0,4));
 const center={x:425,y:731.25},goal={x:725,y:931.25};assert.equal(groupOrder(b,ids,goal),'');
 for(let i=0;i<4;i++){const o=b.units[i].order;assert.equal(o.kind,'move');if(o.kind==='move'){assert.equal(o.x-before[i].x,goal.x-center.x);assert.equal(o.y-before[i].y,goal.y-center.y);assert.equal(o.facing,0);}}
 assert.equal(groupOrder(b,ids,{x:900,y:1100},true),'');
 for(let i=0;i<4;i++){const q=b.units[i].queue[0];assert.equal(q.kind,'move');if(q.kind==='move'){assert.equal(q.x-before[i].x,475);assert.equal(q.y-before[i].y,368.75);}}
 const turned=groupSlots(b,ids,goal,Math.PI/2);
 for(let i=0;i<turned.length;i++)for(let j=i+1;j<turned.length;j++)assert.ok(Math.abs(Math.hypot(turned[i].p.x-turned[j].p.x,turned[i].p.y-turned[j].p.y)-Math.hypot(turned[i].u.x-turned[j].u.x,turned[i].u.y-turned[j].u.y))<.001);
});
test('cohorts moving toward the same point cannot occupy a single blob',()=>{
 const b=createBattle([{id:'a',type:'infantry',men:80},{id:'b',type:'infantry',men:80},{id:'c',type:'spears',men:80}],[{id:'e',type:'warband',men:90}],false,false,flat());b.phase='combat';
 for(const u of b.units.slice(0,3))issueOrder(u,{kind:'move',x:600,y:800});
 for(let i=0;i<220;i++){b.units[3].x=2300;b.units[3].y=100;stepBattle(b);}
 const own=b.units.slice(0,3);for(let i=0;i<own.length;i++)for(let j=i+1;j<own.length;j++)assert.ok(contactGap(own[i],own[j])>=-.1,`overlap ${contactGap(own[i],own[j])}`);
});
test('AI archers choose cover behind infantry instead of charging into the same melee',()=>{
 const b=createBattle([{id:'r',type:'infantry',men:80}],[{id:'front',type:'warband',men:90},{id:'rear',type:'archers',men:60}],false,false,flat());
 const [r,front,bow]=b.units;r.x=500;r.y=800;front.x=560;front.y=800;bow.x=590;bow.y=800;
 const order=planAI(b,bow);assert.equal(order.kind,'move');if(order.kind==='move')assert.ok(order.x>front.x+100);
});
test('AI cavalry approaches a spear front via a flank waypoint',()=>{
 const b=createBattle([{id:'r',type:'spears',men:80}],[{id:'c',type:'heavyCavalry',men:40}],false,false,flat());
 const [spear,horse]=b.units;spear.x=500;spear.y=800;spear.angle=0;horse.x=850;horse.y=800;
 const order=planAI(b,horse);assert.equal(order.kind,'move');if(order.kind==='move')assert.ok(Math.abs(order.y-spear.y)>=150);
});
