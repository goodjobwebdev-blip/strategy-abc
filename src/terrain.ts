import { INITIAL_CITIES, WORLD_FORESTS, MOUNTAINS, unproject } from './data.ts';
import type { Point } from './data.ts';
import { distance, inPolygon, segmentDistance } from './campaign.ts';
export type Biome = 'plain'|'forest'|'mountain'|'city';
export const BIOME_NAMES:Record<Biome,string>={plain:'Равнина',forest:'Лес',mountain:'Горы',city:'Город'};
export interface Ellipse extends Point { rx:number;ry:number }
export interface Obstacle extends Point { w:number;h:number;kind:'building'|'rock' }
export interface BattleMap { version:1;biome:Biome;seed:number;townName:string;forests:Ellipse[];hills:(Ellipse&{height:number})[];obstacles:Obstacle[];roads:Point[][] }
export function randomFromSeed(seed:number){let n=seed>>>0;return()=>{n+=0x6d2b79f5;let t=n;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
export function inEllipse(p:Point,e:Ellipse){return ((p.x-e.x)/e.rx)**2+((p.y-e.y)/e.ry)**2<1;}
export function mapForest(p:Point,map:BattleMap){
  if(map.roads.some(r=>r.slice(1).some((q,i)=>segmentDistance(p,r[i],q)<22)))return false;
  return map.forests.some(e=>inEllipse(p,e));
}
export function heightAt(p:Point,map:BattleMap){return map.hills.reduce((h,e)=>h+e.height*Math.max(0,1-((p.x-e.x)/e.rx)**2-((p.y-e.y)/e.ry)**2),0);}
export function blocked(p:Point,map:BattleMap,margin=8){return p.x<15||p.x>985||p.y<20||p.y>620||map.obstacles.some(o=>p.x>o.x-margin&&p.x<o.x+o.w+margin&&p.y>o.y-margin&&p.y<o.y+o.h+margin);}
export function clearLine(a:Point,b:Point,map:BattleMap,margin=0){
  const count=Math.ceil(distance(a,b)/6);for(let i=0;i<=count;i++)if(blocked({x:a.x+(b.x-a.x)*i/(count||1),y:a.y+(b.y-a.y)*i/(count||1)},map,margin))return false;return true;
}
export function generateMap(biome:Biome,seed:number,townName='Поселение'):BattleMap{
  const rand=randomFromSeed(seed),range=(min:number,max:number)=>min+rand()*(max-min);
  const map:BattleMap={version:1,biome,seed:seed>>>0,townName,forests:[],hills:[],obstacles:[],roads:[]};
  const road=[{x:15,y:325},{x:290,y:325},{x:500,y:325},{x:710,y:325},{x:985,y:325}];
  if(biome==='forest'){
    map.roads=[road.map((p,i)=>({...p,y:i===0||i===4?325:325+range(-28,28)}))];
    for(let i=0;i<32;i++)map.forests.push({x:range(70,940),y:range(55,600),rx:range(65,125),ry:range(55,115)});
    for(let i=0;i<6;i++)map.hills.push({x:range(220,800),y:range(80,550),rx:range(80,160),ry:range(60,110),height:range(.5,1.4)});
  }else if(biome==='mountain'){
    map.roads=[[{x:15,y:325}]];
    for(let i=0;i<12;i++)map.hills.push({x:range(220,800),y:range(50,600),rx:range(90,150),ry:range(80,140),height:range(1.3,2.8)});
    for(const x of [270,470,670]){
      const gap=range(95,140),center=range(280,370),w=range(65,100);
      map.obstacles.push({x,y:20,w,h:center-gap/2-20,kind:'rock'},{x,y:center+gap/2,w,h:620-center-gap/2,kind:'rock'});
      map.roads[0].push({x:x+w/2,y:center});
    }
    map.roads[0].push({x:985,y:325});
    for(let i=0;i<5;i++)map.forests.push({x:range(200,800),y:range(60,600),rx:range(35,65),ry:range(30,60)});
  }else if(biome==='city'){
    map.roads=[road,[{x:500,y:30},{x:500,y:620}]];
    for(const x of [315,405,555,645])for(const y of [105,205,385,485]){
      map.obstacles.push({x:x+range(-5,5),y:y+range(-5,5),w:range(48,64),h:range(52,70),kind:'building'});
    }
    map.forests=[{x:250,y:115,rx:50,ry:45},{x:750,y:530,rx:55,ry:48}];
    map.hills=[{x:780,y:130,rx:150,ry:95,height:.6}];
  }else{
    for(let i=0;i<3;i++)map.forests.push({x:range(300,740),y:i%2?range(500,580):range(60,115),rx:range(35,65),ry:range(25,45)});
    for(let i=0;i<3;i++)map.hills.push({x:range(330,720),y:range(150,500),rx:range(80,140),ry:range(60,95),height:range(.3,.8)});
  }
  return map;
}
export function encounterMap(location:Point,day:number):BattleMap{
  const city=INITIAL_CITIES.find(c=>distance(location,c)<28);
  const biome:Biome=city?'city':WORLD_FORESTS.some(e=>inEllipse(location,e))?'forest':MOUNTAINS.some(p=>inPolygon(location,p))?'mountain':'plain';
  const geo=unproject(location),seed=(Math.round(geo.lon*100)*73856093^Math.round(geo.lat*100)*19349663^day*83492791)>>>0;
  return generateMap(biome,seed,city?.name??'');
}
export function battlePath(start:Point,goal:Point,map:BattleMap):Point[]|null{
  if(blocked(goal,map))return null;if(clearLine(start,goal,map,8))return [goal];
  const cols=49,rows=30,point=(i:number)=>({x:20+(i%cols)*20,y:30+Math.floor(i/cols)*20});
  const index=(p:Point)=>Math.max(0,Math.min(rows-1,Math.round((p.y-30)/20)))*cols+Math.max(0,Math.min(cols-1,Math.round((p.x-20)/20)));
  const nearest=(p:Point)=>{let best=-1,min=Infinity;for(let i=0;i<cols*rows;i++){const q=point(i),d=distance(p,q);if(d<min&&!blocked(q,map)&&clearLine(p,q,map,6)){min=d;best=i;}}return best;};
  let first=index(start),last=index(goal);
  if(blocked(point(first),map)||!clearLine(start,point(first),map,6))first=nearest(start);
  if(blocked(point(last),map)||!clearLine(point(last),goal,map,6))last=nearest(goal);
  if(first<0||last<0)return null;
  const open=new Set([first]),closed=new Set<number>(),came=new Map<number,number>(),cost=new Map([[first,0]]);
  while(open.size){let id=-1,min=Infinity;for(const n of open){const f=cost.get(n)!+distance(point(n),point(last));if(f<min){min=f;id=n;}}
    if(id===last){const result=[goal];while(id!==first){result.push(point(id));id=came.get(id)!;}return result.reverse();}
    open.delete(id);closed.add(id);const p=point(id);
    for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]){
      const x=id%cols+dx,y=Math.floor(id/cols)+dy;if(x<0||x>=cols||y<0||y>=rows)continue;const n=y*cols+x,q=point(n);
      if(closed.has(n)||!clearLine(p,q,map,8))continue;const value=cost.get(id)!+distance(p,q);
      if(value<(cost.get(n)??Infinity)){cost.set(n,value);came.set(n,id);open.add(n);}
    }
  }return null;
}
