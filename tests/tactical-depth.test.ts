import test from 'node:test';
import assert from 'node:assert/strict';
import {createBattle,stepBattle,turnUnit,damageMultiplier,unitEffects,contactGap} from '../src/battle.ts';
import {issueOrder} from '../src/controls.ts';
import {generateMap,blocked,terrainDescription} from '../src/terrain.ts';
import {project,unproject,LAND,WORLD_SIZE,WORLD_COUNTRIES} from '../src/data.ts';
import {newCampaign,findPath} from '../src/campaign.ts';
import {validSave} from '../src/storage.ts';
function duel(own:any='heavyCavalry',enemy:any='infantry'){
 const b=createBattle([{id:'a',type:own,men:own==='heavyCavalry'?40:60}],[{id:'b',type:enemy,men:80}]);
 b.phase='combat';b.map.forests=[];b.map.obstacles=[];b.map.relief.amplitude=0;b.units[1].x=2250;b.units[1].y=1400;return b;
}
test('front cannot instantly reverse; deep formations turn more slowly',()=>{
 const b=duel('infantry'),u=b.units[0],v=structuredClone(u);v.formation='deep';turnUnit(u,Math.PI,.1);turnUnit(v,Math.PI,.1);
 assert.ok(u.angle>0&&u.angle<.1);assert.ok(v.angle<u.angle);
 for(let i=0;i<60;i++)turnUnit(u,Math.PI,.1);assert.ok(Math.abs(u.angle-Math.PI)<.001);
});
test('charge needs a straight open run; forest and a sharp turn cancel it',()=>{
 const b=duel(),u=b.units[0];u.x=400;u.y=600;u.pace='run';issueOrder(u,{kind:'move',x:1200,y:600});
 for(let i=0;i<10;i++)stepBattle(b);assert.ok(u.charge>1.4);assert.ok(unitEffects(b,u).some(t=>t.includes('натиск готов')));
 issueOrder(u,{kind:'move',x:100,y:600});stepBattle(b);assert.equal(u.charge,0);
 u.angle=0;b.map.forests=[{x:u.x,y:u.y,rx:400,ry:400}];issueOrder(u,{kind:'move',x:1200,y:600});for(let i=0;i<10;i++)stepBattle(b);assert.equal(u.charge,0);
});
test('standing spears resist charge better than moving or flanked spears',()=>{
 const b=duel('heavyCavalry','spears'),[a,d]=b.units;d.x=600;d.y=600;d.angle=Math.PI;a.x=540;a.y=600;a.charge=3;
 const moving=damageMultiplier(a,d,false,b.map);d.stationary=3;const prepared=damageMultiplier(a,d,false,b.map);assert.ok(prepared<moving*.5);
 a.x=660;assert.ok(damageMultiplier(a,d,false,b.map)>prepared*3);
});
test('flank and rear attacks explain morale and cohesion losses',()=>{
 const b=duel('infantry','archers'),[a,d]=b.units;a.x=500;a.y=800;d.x=524;d.y=800;d.angle=0;d.morale=100;
 stepBattle(b);assert.ok(d.morale<100);assert.ok(unitEffects(b,d).some(t=>t.includes('тыл')));assert.ok(d.cohesion<1);
});
test('guard follows an ally, stays out of its footprint and saves its order',()=>{
 const b=createBattle([{id:'a',type:'infantry',men:80},{id:'z',type:'archers',men:60}],[{id:'e',type:'warband',men:90}]);b.phase='combat';b.map.relief.amplitude=0;b.map.forests=[];
 const [a,z,e]=b.units;a.x=400;a.y=700;z.x=700;z.y=700;e.x=2300;e.y=1300;issueOrder(a,{kind:'guard',target:z.id});
 for(let i=0;i<240;i++)stepBattle(b);assert.ok(a.x>700);assert.ok(contactGap(a,z)>=0);assert.equal(a.order.kind,'guard');
 assert.ok(validSave({schema:7,campaign:newCampaign(),battle:b}));z.routed=true;stepBattle(b);assert.equal(a.order.kind,'hold');
});
test('skirmish mode withdraws from a visible approaching threat',()=>{
 const b=duel('archers'),[a,e]=b.units;a.x=650;a.y=800;a.angle=Math.PI;a.skirmish=true;e.x=750;e.y=800;
 for(let i=0;i<10;i++)stepBattle(b);assert.ok(a.x<650);assert.ok(unitEffects(b,a).some(t=>t.includes('Отход')));
});
test('generated pass objectives are accessible; terrain hover identifies cover and obstacles',()=>{
 for(const seed of [1,42,1337,765]){const map=generateMap('mountain',seed),b=createBattle([{id:'a',type:'infantry',men:80}],[{id:'b',type:'warband',men:90}],false,false,map);assert.equal(blocked(b.objective,map,30),false);}
 const map=generateMap('city',42),o=map.obstacles[0];assert.ok(terrainDescription({x:o.x+10,y:o.y+10},map).includes('закрывает обзор'));
});
test('Mediterranean atlas covers Britain, Scandinavia, Africa, Egypt and Anatolia; Italy routing still works',()=>{
 for(const name of ['United Kingdom','Norway','Egypt','Turkey','Syria','Spain','Morocco'])assert.ok(WORLD_COUNTRIES.some(c=>c.name===name),name);
 for(const [lon,lat] of [[-3,55],[15,65],[31,30],[36,35],[-5,35]]){const p=project(lon,lat),geo=unproject(p);assert.ok(p.x>0&&p.x<WORLD_SIZE.width&&p.y>0&&p.y<WORLD_SIZE.height);assert.ok(Math.abs(lon-geo.lon)<1e-9&&Math.abs(lat-geo.lat)<1e-9);}
 assert.ok(LAND.flat().length>15000);const c=newCampaign();assert.ok(findPath(c.position,c.cities.find(c=>c.id==='ariminum')!));
});
