import test from 'node:test';
import assert from 'node:assert/strict';
import { newCampaign, findPath, setDestination, nextDay, canBattle, encounter, applyBattleResult, liberate, recruit, onLand } from '../src/campaign.ts';
import { INITIAL_CITIES, CAMPAIGN_GOALS } from '../src/data.ts';
import { FOREST_REGIONS } from '../src/world-regions.ts';
import { createBattle } from '../src/battle.ts';
import { validSave } from '../src/storage.ts';

test('sea crossings reach Britain and Egypt and remain saveable during transit',()=>{
 for(const id of ['londinium','alexandria']){const c=newCampaign(),city=c.cities.find(x=>x.id===id)!;assert.equal(setDestination(c,city),null);assert.ok(c.route.some(p=>p.sea));let sailed=false,arrived=false;
 for(let day=0;day<70&&!arrived;day++){nextDay(c);if(c.position.sea){sailed=true;assert.ok(validSave({schema:7,campaign:c,battle:null}));assert.ok(setDestination(c,c.cities[0]));assert.ok(c.route.length);}
  while(canBattle(c)){const foe=encounter(c)!;if(foe.position.x===city.x&&foe.position.y===city.y){arrived=true;break;}const b=createBattle(c.army,foe.units);b.winner='rome';applyBattleResult(c,b,c.army,[]);}
  if(!arrived&&!c.position.sea&&!c.route.length)assert.equal(setDestination(c,city),null);
 }
 assert.ok(sailed);assert.ok(arrived,id);assert.equal(city.owner,'boii');assert.ok(city.garrison.length);
 }

});
test('overseas garrisons must be defeated before occupation and recruitment',()=>{
 const c=newCampaign(),city=c.cities.find(x=>x.id==='alexandria')!;c.position={x:city.x,y:city.y};liberate(c);assert.equal(city.owner,'boii');const e=encounter(c)!;assert.equal(e.name,'Птолемеи');const b=createBattle(c.army,e.units);b.winner='rome';applyBattleResult(c,b,c.army,[]);assert.equal(city.owner,'rome');assert.equal(city.garrison.length,0);assert.equal(recruit(c,city.id),null);assert.equal(c.army.length,3);assert.equal(city.garrison.length,1);assert.equal(c.enemy.length,2);
});
test('rival field armies are separate from Boii and city defenders',()=>{
 const c=newCampaign(),r=c.rivals[0];c.position={...r.position};const b=createBattle(c.army,encounter(c)!.units);b.winner='rome';applyBattleResult(c,b,c.army,[]);assert.equal(r.units.length,0);assert.equal(c.enemy.length,2);assert.equal(c.cities.find(x=>x.id===r.home)!.owner,'boii');assert.ok(canBattle(c));
});
test('campaign victory requires all strategic destinations rather than only Italy',()=>{
 const c=newCampaign();c.enemy=[];c.cities.find(x=>x.id==='felsina')!.owner='rome';liberate(c);assert.equal(c.won,false);for(const id of CAMPAIGN_GOALS)c.cities.find(x=>x.id===id)!.owner='rome';liberate(c);assert.equal(c.won,true);
});
test('forest areas are irregular polygons and remain inland',()=>{
 assert.ok(FOREST_REGIONS.length>10);for(const ring of FOREST_REGIONS){assert.ok(ring.length>=4);for(let i=1;i<ring.length;i++){const a=ring[i-1],b=ring[i];const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};assert.ok(onLand(mid)||onLand({x:mid.x+.1,y:mid.y})||onLand({x:mid.x-.1,y:mid.y})||onLand({x:mid.x,y:mid.y+.1})||onLand({x:mid.x,y:mid.y-.1}));}}
});
test('all destination anchors are on accessible land and world routes exist',()=>{const c=newCampaign();for(const city of INITIAL_CITIES){assert.ok(onLand(city),city.id);assert.ok(findPath(c.position,city),city.id);}});
