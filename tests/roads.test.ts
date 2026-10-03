import test from 'node:test';
import assert from 'node:assert/strict';
import { ROAD_NETWORK, LAND_ROADS } from '../src/road-network.ts';
import { ROADS, INITIAL_CITIES, project } from '../src/data.ts';
import { distance, onLand, onRoad } from '../src/campaign.ts';
const landWithTolerance=(p:{x:number;y:number})=>onLand(p)||onLand({x:p.x+.0001,y:p.y})||onLand({x:p.x-.0001,y:p.y})||onLand({x:p.x,y:p.y+.0001})||onLand({x:p.x,y:p.y-.0001});
test('roads are continuous dry-land routes between settlements, not clipped fragments',()=>{
 assert.equal(ROAD_NETWORK.length,33);
 for(const road of ROAD_NETWORK){const p=road.points;assert.ok(p.length>3,road.id);for(const end of [p[0],p[p.length-1]])assert.ok(INITIAL_CITIES.some(c=>distance(c,end)<.001),`${road.id}: endpoint is a city`);
  for(let i=1;i<p.length;i++){const a=p[i-1],b=p[i],length=distance(a,b);assert.ok(length<80,`${road.id}: excessively long chord`);const samples=Math.max(1,Math.ceil(length));for(let n=0;n<=samples;n++){const q={x:a.x+(b.x-a.x)*n/samples,y:a.y+(b.y-a.y)*n/samples};assert.ok(landWithTolerance(q),`${road.id}: water crossing at ${JSON.stringify(q)}`);assert.ok(onRoad(q),`${road.id}: visible road must give movement benefit`);}}
 }
});
test('the Gulf of Sirte is skirted by one unbroken coastal road',()=>{
 const road=ROAD_NETWORK.find(r=>r.id==='leptis-cyrene')!;
 assert.ok(road.points.some(p=>p.y>project(18,31).y));
 const length=road.points.slice(1).reduce((n,p,i)=>n+distance(p,road.points[i]),0);
 assert.ok(length>distance(road.points[0],road.points.at(-1)!)*1.2);
});
test('road geometry has one source for rendering and army movement',()=>{assert.equal(ROADS,LAND_ROADS);});
