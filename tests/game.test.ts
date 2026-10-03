import test from 'node:test';
import assert from 'node:assert/strict';
import { newCampaign, findPath, terrainAt, traversable, moveCost, recruit, setDestination, nextDay, canBattle, cityAtArmy } from '../src/campaign.ts';
import { TYPES, INITIAL_CITIES, project } from '../src/data.ts';
import { createBattle, trainingBattle, autoBattle, attackDirection, damageMultiplier, stepBattle, alive, survivors } from '../src/battle.ts';
import { validSave } from '../src/storage.ts';

test('campaign starts with 3 Roman units and 2 Boii units',()=>{const c=newCampaign();assert.equal(c.army.length,3);assert.equal(c.enemy.length,2);assert.equal(cityAtArmy(c)?.id,'rome');assert.ok(validSave({schema:4,campaign:c,battle:null}));});
test('mountains and water block travel; roads cost less',()=>{
  assert.equal(terrainAt(project(7.6,45.8)),'mountain');assert.equal(traversable(project(7.6,45.8)),false);
  assert.equal(terrainAt(project(10,41)),'sea');assert.equal(findPath(newCampaign().position,project(10,41)),null);
  const rome=INITIAL_CITIES.find(c=>c.id==='rome')!,narnia=INITIAL_CITIES.find(c=>c.id==='narnia')!;assert.ok(moveCost(rome,narnia)<Math.hypot(rome.x-narnia.x,rome.y-narnia.y));
});
test('Rome can reach Ariminum then enemy using legal terrain',()=>{
  const c=newCampaign();const ariminum=c.cities.find(x=>x.id==='ariminum')!;
  const path=findPath(c.position,ariminum);assert.ok(path);assert.ok(path.every(traversable));
  assert.equal(setDestination(c,ariminum),null);
  for(let i=0;i<10&&c.route.length;i++)nextDay(c);
  assert.equal(cityAtArmy(c)?.id,'ariminum');
  assert.equal(setDestination(c,c.enemyPosition),null);for(let i=0;i<10&&c.route.length;i++)nextDay(c);
  assert.ok(canBattle(c));
});
test('recruiting deducts cost and remote garrison joins at arrival',()=>{
  const c=newCampaign(),gold=c.gold;
  assert.equal(recruit(c,'capua'),null);assert.equal(c.gold,gold-35);assert.equal(c.army.length,3);
  assert.equal(c.cities.find(x=>x.id==='capua')!.garrison.length,1);
  setDestination(c,c.cities.find(x=>x.id==='capua')!);for(let i=0;i<5&&c.route.length;i++)nextDay(c);
  assert.equal(c.army.length,4);assert.equal(c.cities.find(x=>x.id==='capua')!.garrison.length,0);
  const before=c.gold;c.gold=0;assert.ok(recruit(c,'rome'));assert.equal(c.gold,0);c.gold=before;
  assert.ok(recruit(c,'felsina'));
});
test('training exposes eight distinct types per side',()=>{const b=trainingBattle();assert.equal(new Set(b.units.filter(u=>u.side==='rome').map(u=>u.type)).size,8);});
test('flank/rear attacks and prepared spears affect cavalry',()=>{
  const b=createBattle([{id:'a',type:'lightCavalry',men:40}],[{id:'b',type:'spears',men:80}]);
  const [a,d]=b.units;d.x=500;d.y=300;d.angle=0;a.x=530;a.y=300;
  assert.equal(attackDirection(a,d),'front');const front=damageMultiplier(a,d,false);
  a.x=470;assert.equal(attackDirection(a,d),'rear');assert.ok(damageMultiplier(a,d,false)>front*3);
  d.type='archers';assert.ok(damageMultiplier(a,d,false)>front*4);
});
test('woodland protects against missiles',()=>{
  const b=createBattle([{id:'a',type:'archers',men:60}],[{id:'b',type:'infantry',men:80}]);
  const [a,d]=b.units;a.x=200;a.y=560;d.x=300;d.y=560;const plain=damageMultiplier(a,d,true);
  d.x=420;d.y=420;assert.ok(damageMultiplier(a,d,true)<plain);
});
test('autobattle is deterministic, terminates, and preserves valid survivor counts',()=>{
  const c=newCampaign();const b=autoBattle(createBattle(c.army,c.enemy));const again=autoBattle(createBattle(c.army,c.enemy));
  assert.ok(b.winner);assert.equal(b.winner,again.winner);assert.deepEqual(b.units,again.units);
  assert.ok(b.elapsed<=601);for(const unit of b.units){assert.ok(Number.isFinite(unit.men));assert.ok(unit.men>=0&&unit.men<=unit.initialMen);assert.ok(unit.morale>=0);}
  for(const unit of survivors(b,'rome'))assert.ok(unit.men>=1&&unit.men<=TYPES[unit.type].men);
  assert.ok(validSave({schema:4,campaign:c,battle:b}));
});
test('morale breaks and fleeing neighbor causes a morale shock',()=>{
  const b=createBattle([{id:'a',type:'infantry',men:80},{id:'friend',type:'infantry',men:80}],[{id:'b',type:'warband',men:90}]);
  b.phase='combat';const a=b.units[0],friend=b.units[1];a.morale=1;friend.x=a.x+50;friend.y=a.y;const morale=friend.morale;
  stepBattle(b);assert.equal(alive(a),false);assert.ok(friend.morale<morale-8);
});
test('malformed or incompatible saves are rejected',()=>{
  assert.equal(validSave(null),false);const s:any={schema:4,campaign:newCampaign(),battle:null};s.campaign.army[0].type='invalid';assert.equal(validSave(s),false);
  const s2:any={schema:4,campaign:newCampaign(),battle:null};s2.campaign.position.x=Infinity;assert.equal(validSave(s2),false);
});
