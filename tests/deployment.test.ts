import test from 'node:test';
import assert from 'node:assert/strict';
import { newCampaign } from '../src/campaign.ts';
import { createBattle, trainingBattle, stepBattle } from '../src/battle.ts';
import { battleClick } from '../src/controls.ts';
import { fitZoom, cameraCenter, zoomAnchor } from '../src/camera.ts';
import { validSave } from '../src/storage.ts';

test('large battlefield starts in deployment and simulation waits for the start',()=>{
  const b=trainingBattle();assert.equal(b.map.width,2400);assert.equal(b.map.height,1600);
  assert.equal(b.phase,'deployment');const before=structuredClone(b);
  for(let i=0;i<100;i++)stepBattle(b);assert.deepEqual(b,before);
  assert.ok(Math.abs(b.units[8].x-b.units[0].x)>1800);
});
test('deployment places and faces troops, rejecting outside zones and overlapping troops',()=>{
  const b=trainingBattle(),u=b.units[0];
  assert.equal(battleClick(b,u.id,{x:450,y:600},false,true,Math.PI/2).changed,true);
  assert.deepEqual({x:u.x,y:u.y},{x:450,y:600});assert.equal(u.angle,Math.PI/2);assert.equal(u.order.kind,'hold');
  const before=structuredClone(u);
  assert.ok(battleClick(b,u.id,{x:1100,y:800},false,true).error);assert.deepEqual(u,before);
  assert.ok(battleClick(b,u.id,b.units[1],false,true).error);assert.deepEqual(u,before);
  assert.equal(battleClick(b,u.id,b.units[8]).inspected,null);
});
test('deployment and combat survive current-format saves with world-sized coordinates',()=>{
  const c=newCampaign(),b=createBattle(c.army,c.enemy);
  assert.ok(validSave({schema:5,campaign:c,battle:b}));
  b.phase='combat';b.units[0].order={kind:'move',x:2200,y:1400,facing:1.2};
  assert.ok(validSave({schema:5,campaign:c,battle:b}));
  b.units[0].order.facing=Infinity;assert.equal(validSave({schema:5,campaign:c,battle:b}),false);
});
test('after a move the unit faces the requested direction and holds position',()=>{
  const c=newCampaign(),b=createBattle(c.army,c.enemy);b.phase='combat';const u=b.units[0];
  assert.equal(battleClick(b,u.id,{x:500,y:u.y},false,true,Math.PI/2).changed,true);
  for(let i=0;i<120;i++)stepBattle(b);
  assert.ok(Math.abs(u.x-500)<3);assert.equal(u.order.kind,'hold');assert.equal(u.angle,Math.PI/2);
});
test('camera fits the world, zoom keeps its anchor, and pan stays within bounds',()=>{
  assert.equal(fitZoom(1200,800,2400,1600),.5);
  const center=zoomAnchor({x:1200,y:800},{x:300,y:500},.5,1);
  assert.equal((300-center.x)*1,(300-1200)*.5);assert.equal((500-center.y)*1,(500-800)*.5);
  assert.deepEqual(cameraCenter({x:-900,y:9000},1,1000,600,2400,1600),{x:500,y:1300});
  assert.deepEqual(cameraCenter({x:-900,y:9000},.5,1400,800,2400,1600),{x:1200,y:800});
});
