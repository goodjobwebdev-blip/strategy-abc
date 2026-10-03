import test from 'node:test';
import assert from 'node:assert/strict';
import {generateMap,battlePath,blocked,clearLine,mapForest,heightAt,encounterMap,BIOME_NAMES} from '../src/terrain.ts';
import type {Biome} from '../src/terrain.ts';
import {INITIAL_CITIES,project} from '../src/data.ts';
import {newCampaign,findPath} from '../src/campaign.ts';
import {createBattle,autoBattle,stepBattle} from '../src/battle.ts';
import {validSave} from '../src/storage.ts';

test('all twelve cities have accessible routes from Rome',()=>{const c=newCampaign();assert.equal(INITIAL_CITIES.length,12);for(const city of INITIAL_CITIES)assert.ok(findPath(c.position,city),city.id);});
test('maps are reproducible and different seeds produce different terrain',()=>{
  for(const biome of Object.keys(BIOME_NAMES) as Biome[]){assert.deepEqual(generateMap(biome,42),generateMap(biome,42));assert.notDeepEqual(generateMap(biome,42),generateMap(biome,43));}
});
test('forest maps have much more tree cover than plains and include wooded hills',()=>{
  const forest=generateMap('forest',42),plain=generateMap('plain',42);
  const coverage=(map:typeof forest)=>{let cover=0,count=0;for(let x=60;x<map.width-50;x+=70)for(let y=50;y<map.height-50;y+=70){count++;if(mapForest({x,y},map))cover++;}return cover/count;};
  assert.ok(coverage(forest)>.4);assert.ok(coverage(plain)<.15);assert.ok(Array.from({length:400},(_,i)=>({x:60+(i%20)*110,y:50+Math.floor(i/20)*74})).some(p=>mapForest(p,forest)&&heightAt(p,forest)>.5));
});
test('city buildings and mountain rocks block movement and line of sight; passages remain connected',()=>{
  for(const biome of ['city','mountain'] as Biome[])for(const seed of [0,1,42,1337,4294967295]){
    const map=generateMap(biome,seed),o=map.obstacles[0],middle={x:o.x+o.w/2,y:o.y+o.h/2};
    assert.ok(blocked(middle,map));assert.equal(battlePath({x:260,y:800},middle,map),null);
    assert.equal(clearLine({x:o.x-20,y:middle.y},{x:o.x+o.w+20,y:middle.y},map),false);
    const path=battlePath({x:260,y:800},{x:2140,y:800},map);assert.ok(path,`${biome}/${seed}`);
    let start={x:260,y:800};for(const point of path){assert.ok(clearLine(start,point,map,6));start=point;}
  }
});
test('battle units navigate around town buildings rather than crossing them',()=>{
  const map=generateMap('city',42),b=createBattle([{id:'a',type:'infantry',men:80}],[{id:'b',type:'infantry',men:80}],false,false,map);
  b.phase='combat';b.units[0].order={kind:'move',x:2000,y:540};b.units[1].x=2340;b.units[1].y=1500;
  for(let i=0;i<900&&!b.winner;i++){b.units[1].x=2340;b.units[1].y=1500;stepBattle(b);for(const unit of b.units)assert.equal(blocked(unit,map,0),false);}
  assert.ok(b.units[0].x>1800);
});
test('geography supplies the correct encounter kind and seed',()=>{
  const c=INITIAL_CITIES.find(c=>c.id==='felsina')!;assert.equal(encounterMap(c,1).biome,'city');assert.equal(encounterMap(c,1).townName,'Фельсина');
  assert.equal(encounterMap(project(10,46.5),1).biome,'mountain');
  assert.equal(encounterMap(project(11.2,43.65),1).biome,'forest');
  assert.deepEqual(encounterMap(c,2),encounterMap(c,2));
});
test('autobattle terminates on all generated maps and keeps valid saves',()=>{
  const c=newCampaign();for(const biome of Object.keys(BIOME_NAMES) as Biome[]){const b=autoBattle(createBattle(c.army,c.enemy,false,true,generateMap(biome,42)));assert.ok(b.winner);assert.ok(b.elapsed<601);assert.ok(validSave({schema:4,campaign:c,battle:b}));}
});
test('invalid saved terrain is rejected',()=>{const c=newCampaign(),b=createBattle(c.army,c.enemy);b.map.obstacles.push({x:400,y:300,w:-1,h:30,kind:'building'});assert.equal(validSave({schema:4,campaign:c,battle:b}),false);});
