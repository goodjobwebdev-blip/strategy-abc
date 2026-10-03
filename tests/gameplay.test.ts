import test from 'node:test';
import assert from 'node:assert/strict';
import {createBattle,trainingBattle,stepBattle,canSee,visibleEnemies,setFormation,damageMultiplier,survivors} from '../src/battle.ts';
import {battleClick,groupOrder,issueOrder} from '../src/controls.ts';
import {newCampaign,nextDay,recruit,replenish,upkeep,applyBattleResult} from '../src/campaign.ts';
import {validSave} from '../src/storage.ts';
function simple(){const c=newCampaign(),b=createBattle(c.army,c.enemy);b.map.relief.amplitude=0;b.map.forests=[];b.map.obstacles=[];b.phase='combat';return b;}
test('queued moves execute in order with final facing, and replacement clears queue',()=>{
 const b=simple(),u=b.units[0];const y=u.y;
 battleClick(b,u.id,{x:350,y},false,true);battleClick(b,u.id,{x:450,y:y+80},true,true,Math.PI/2);
 assert.equal(u.queue.length,1);for(let i=0;i<120;i++)stepBattle(b);
 assert.ok(Math.hypot(u.x-450,u.y-y-80)<3);assert.equal(u.angle,Math.PI/2);assert.equal(u.order.kind,'hold');assert.equal(u.queue.length,0);
 issueOrder(u,{kind:'move',x:500,y});issueOrder(u,{kind:'move',x:600,y},true);issueOrder(u,{kind:'hold'});assert.equal(u.queue.length,0);
});
test('group destination creates separated formation slots and validates atomically',()=>{
 const b=simple(),ids=b.units.filter(u=>u.side==='rome').map(u=>u.id);
 assert.equal(groupOrder(b,ids,{x:500,y:800},false,Math.PI/2),'');
 const goals=b.units.slice(0,3).map(u=>u.order);assert.ok(goals.every(o=>o.kind==='move'&&o.facing===Math.PI/2));
 assert.equal(new Set(goals.map(o=>o.kind==='move'?o.x:0)).size,3);
 const before=structuredClone(b.units);assert.ok(groupOrder(b,ids,{x:10,y:10}));assert.deepEqual(b.units,before);
});
test('running moves faster, tires more, and reforming carries a cohesion cost',()=>{
 const a=simple(),z=structuredClone(a);const u=a.units[0],v=z.units[0];u.pace='run';
 issueOrder(u,{kind:'move',x:1100,y:u.y});issueOrder(v,{kind:'move',x:1100,y:v.y});for(let i=0;i<50;i++){stepBattle(a);stepBattle(z);}
 assert.ok(u.x>v.x+60);assert.ok(u.fatigue>v.fatigue+.03);
 const cohesion=u.cohesion;setFormation(u,'deep');assert.ok(u.cohesion<cohesion);assert.equal(u.reform,7);
});
test('formations change missile protection and front versus flank resistance',()=>{
 const b=simple(),a=b.units[0],d=b.units[3];a.x=d.x+25;a.y=d.y;d.angle=0;
 const front=damageMultiplier(a,d,false,b.map),arrows=damageMultiplier(a,d,true,b.map);
 d.formation='deep';assert.ok(damageMultiplier(a,d,false,b.map)<front);
 d.formation='loose';assert.ok(damageMultiplier(a,d,true,b.map)<arrows*.6);
});
test('buildings, crests, distance and shared scouts govern enemy visibility',()=>{
 const b=simple(),u=b.units[0],e=b.units[3];u.x=500;u.y=800;e.x=900;e.y=800;
 b.units[1].x=400;b.units[2].x=400;
 assert.ok(canSee(b,u,e));assert.ok(visibleEnemies(b).has(e.id));
 b.map.obstacles=[{x:680,y:700,w:60,h:200,kind:'building'}];assert.equal(canSee(b,u,e),false);assert.equal(visibleEnemies(b).has(e.id),false);
 b.units[1].x=850;b.units[1].y=950;assert.ok(visibleEnemies(b).has(e.id));
 b.map.obstacles=[];b.map.relief={kind:'ridge',angle:0,amplitude:3,offset:0,phase:0};
 u.x=1200;u.y=700;e.x=1200;e.y=750;assert.ok(canSee(b,u,e));
 assert.equal(canSee(b,{x:1200,y:490},{x:1200,y:1110}),false);
 e.x=2300;assert.equal(canSee(b,u,e),false);
});
test('hidden enemies cannot be inspected or receive attack orders',()=>{
 const b=simple(),u=b.units[0],e=b.units[3];assert.equal(battleClick(b,u.id,e).inspected,null);
 battleClick(b,u.id,e,false,true);assert.equal(u.order.kind,'move');
});
test('hold fire prevents automatic ranged shots, explicit attack permits them',()=>{
 const b=createBattle([{id:'a',type:'archers',men:60}],[{id:'b',type:'warband',men:90}]);b.phase='combat';b.map.relief.amplitude=0;b.map.forests=[];
 const [u,e]=b.units;u.x=500;e.x=650;u.fireAtWill=false;stepBattle(b);assert.equal(e.men,90);
 issueOrder(u,{kind:'attack',target:e.id});stepBattle(b);assert.ok(e.men<90);
});
test('square/pass objectives count uncontested occupation; enemies contest progress',()=>{
 for(const mission of ['square','pass'] as const){const b=simple();b.mission=mission;const o=b.objective;
 b.units[0].x=o.x;b.units[0].y=o.y;stepBattle(b);assert.ok(o.progress>0);
 b.units[3].x=o.x+90;b.units[3].y=o.y;const before=o.progress;stepBattle(b);assert.equal(o.progress,before);
 b.units[3].x=2300;b.units[4].x=2300;o.progress=mission==='square'?59.99:89.99;stepBattle(b);assert.equal(b.winner,'rome');}
});
test('convoy advances only under escort, can be attacked, and wins at exit',()=>{
 const b=simple();b.mission='escort';b.objective.x=450;const o=b.objective;
 const before=o.x;stepBattle(b);assert.equal(o.x,before);
 b.units[0].x=o.x;b.units[0].y=o.y;stepBattle(b);assert.ok(o.x>before);
 b.units[3].x=o.x+50;b.units[3].y=o.y;stepBattle(b);assert.ok(o.hp<100);
 b.units[3].x=2100;b.units[3].y=200;o.x=2260;b.units[0].x=2260;b.units[0].y=o.y;stepBattle(b);assert.equal(b.winner,'rome');
});
test('covering retreat succeeds after half the army escapes, survivors keep experience',()=>{
 const b=simple();b.mission='retreat';b.units[0].x=55;b.units[1].x=55;b.units[1].y=100;stepBattle(b);
 assert.equal(b.winner,'rome');assert.equal(b.objective.escaped,2);assert.ok(survivors(b,'rome').every(u=>u.experience===1));
});
test('enemy moves, reinforces, threatens cities, while recruitment and replenishment cost money',()=>{
 const c=newCampaign(),start={...c.enemyPosition};nextDay(c);assert.notDeepEqual(c.enemyPosition,start);
 for(let i=0;i<3;i++)nextDay(c);assert.ok(c.enemy.length>=3);assert.ok(c.cities.some(x=>x.owner==='boii'&&x.id!=='felsina'));
 c.position={...c.cities.find(x=>x.id==='rome')!};c.gold=500;const gold=c.gold;assert.equal(recruit(c,'rome','archers'),null);assert.equal(c.gold,gold-75);assert.ok(upkeep(c)>0);
 c.army[0].men=50;c.army[0].experience=3;const prior=c.gold;assert.equal(replenish(c),null);assert.equal(c.army[0].men,65);assert.equal(c.army[0].experience,3);assert.equal(c.gold,prior-30);
});
test('field victory does not capture distant Felsina and new state saves queue and objectives',()=>{
 const c=newCampaign(),b=simple();c.enemyPosition={...c.cities.find(x=>x.id==='arretium')!};b.winner='rome';
 applyBattleResult(c,b,survivors(b,'rome'),[]);assert.equal(c.cities.find(x=>x.id==='felsina')!.owner,'boii');assert.equal(c.won,false);
 issueOrder(b.units[0],{kind:'move',x:600,y:800});issueOrder(b.units[0],{kind:'move',x:700,y:900,facing:1},true);
 assert.ok(validSave({schema:5,campaign:c,battle:b}));b.units[0].queue.push({kind:'move',x:Infinity,y:80});assert.equal(validSave({schema:5,campaign:c,battle:b}),false);
});
