import { INITIAL_CITIES, LAND, MOUNTAINS, ROADS, TYPES } from './data.ts';
import type { Point, ArmyUnit, City } from './data.ts';
export interface Campaign { version: 1; day: number; gold: number; army: ArmyUnit[]; position: Point; route: Point[]; movement: number; cities: City[]; enemy: ArmyUnit[]; enemyPosition: Point; won: boolean; serial: number; notices: string[] }
export const DAY_MOVEMENT = 70;
export const RECRUIT_COST = 35;
export const MAX_UNITS = 16;
export function distance(a: Point, b: Point) { return Math.hypot(a.x-b.x, a.y-b.y); }
export function inPolygon(p: Point, polygon: Point[]) {
  let inside = false;
  for (let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const a=polygon[i],b=polygon[j];
    if ((a.y>p.y)!==(b.y>p.y) && p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x) inside=!inside;
  }
  return inside;
}
export function segmentDistance(p: Point, a: Point, b: Point) {
  const dx=b.x-a.x,dy=b.y-a.y;
  const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy || 1)));
  return distance(p,{x:a.x+t*dx,y:a.y+t*dy});
}
export function onRoad(p: Point) { return ROADS.some(r=>r.slice(1).some((b,i)=>segmentDistance(p,r[i],b)<12)); }
export function terrainAt(p: Point): 'sea' | 'mountain' | 'road' | 'plain' {
  if (!LAND.some(poly=>inPolygon(p,poly))) return 'sea';
  if (onRoad(p)) return 'road';
  if (MOUNTAINS.some(poly=>inPolygon(p,poly))) return 'mountain';
  return 'plain';
}
export function traversable(p: Point) { const t=terrainAt(p); return t==='plain'||t==='road'; }
export function moveCost(a: Point,b: Point) { return distance(a,b)*(terrainAt({x:(a.x+b.x)/2,y:(a.y+b.y)/2})==='road' ? .52 : 1); }
function clearSegment(a: Point,b: Point) {
  const n=Math.ceil(distance(a,b)/3);
  for(let i=0;i<=n;i++) if(!traversable({x:a.x+(b.x-a.x)*i/(n||1),y:a.y+(b.y-a.y)*i/(n||1)})) return false;
  return true;
}
// A* on a 10 px grid, including diagonal corner checks. Roads affect route cost.
export function findPath(start: Point,goal: Point): Point[] | null {
  if(!traversable(start)||!traversable(goal)) return null;
  const size=10,cols=101,rows=66;
  const index=(p:Point)=>Math.round(p.y/size)*cols+Math.round(p.x/size);
  const point=(i:number)=>({x:(i%cols)*size,y:Math.floor(i/cols)*size});
  const first=index(start),last=index(goal);
  if(!clearSegment(start,point(first))||!clearSegment(point(last),goal)) return null;
  const open=new Set([first]),closed=new Set<number>();
  const g=new Map<number,number>([[first,0]]),came=new Map<number,number>();
  while(open.size) {
    let current=-1,best=Infinity;
    for(const id of open) { const f=g.get(id)!+distance(point(id),point(last))*.52;if(f<best){best=f;current=id;} }
    if(current===last) {
      const path=[goal];let id=current;
      while(id!==first){path.push(point(id));id=came.get(id)!;}
      path.push(start);path.reverse();return path.slice(1);
    }
    open.delete(current);closed.add(current);
    const p=point(current);
    for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]) {
      const x=p.x/size+dx,y=p.y/size+dy;if(x<0||x>=cols||y<0||y>=rows)continue;
      const id=y*cols+x,q=point(id);
      if(closed.has(id)||!clearSegment(p,q))continue;
      const candidate=g.get(current)!+moveCost(p,q);
      if(candidate<(g.get(id)??Infinity)){came.set(id,current);g.set(id,candidate);open.add(id);}
    }
  }
  return null;
}
export function newCampaign(): Campaign {
  return {version:1,day:1,gold:140,army:[{id:'r1',type:'infantry',men:80},{id:'r2',type:'spears',men:80},{id:'r3',type:'lightCavalry',men:40}],position:{x:512,y:360},route:[],movement:DAY_MOVEMENT,cities:structuredClone(INITIAL_CITIES),enemy:[{id:'b1',type:'warband',men:90},{id:'b2',type:'archers',men:60}],enemyPosition:{x:472,y:190},won:false,serial:3,notices:['Северная граница неспокойна. Бойи удерживают Фельсину.']};
}
export function notice(c:Campaign,text:string){c.notices.unshift(text);c.notices=c.notices.slice(0,8);}
export function cityAtArmy(c:Campaign) { return c.cities.find(city=>distance(c.position,city)<22); }
export function collectGarrison(c:Campaign) {
  const city=cityAtArmy(c);if(!city||city.owner!=='rome')return;
  const space=MAX_UNITS-c.army.length;
  if(space>0&&city.garrison.length){const joined=city.garrison.splice(0,space);c.army.push(...joined);notice(c,`${city.name}: ${joined.length} отр. присоединились к армии.`);}
}
export function recruit(c:Campaign,cityId:string): string|null {
  const city=c.cities.find(city=>city.id===cityId);
  if(!city||city.owner!=='rome')return 'Найм доступен только в ваших городах.';
  if(c.gold<RECRUIT_COST)return 'Недостаточно денег: требуется 35 денариев.';
  if(city.garrison.length>=8)return 'Гарнизон заполнен: максимум 8 отрядов.';
  if(cityAtArmy(c)?.id===city.id&&c.army.length>=MAX_UNITS)return 'Армия заполнена: максимум 16 отрядов.';
  c.gold-=RECRUIT_COST;c.serial++;
  city.garrison.push({id:`recruit-${c.serial}`,type:'peasants',men:TYPES.peasants.men});
  collectGarrison(c);notice(c,`${city.name}: нанято крестьянское ополчение.`);return null;
}
export function march(c:Campaign) {
  while(c.route.length&&c.movement>.001){
    const target=c.route[0],cost=moveCost(c.position,target);
    if(cost<=c.movement+.0001){c.position={...target};c.movement=Math.max(0,c.movement-cost);c.route.shift();}
    else{const ratio=c.movement/cost;c.position={x:c.position.x+(target.x-c.position.x)*ratio,y:c.position.y+(target.y-c.position.y)*ratio};c.movement=0;}
    if(c.enemy.length&&distance(c.position,c.enemyPosition)<28){c.route=[];notice(c,'Армия подошла к бойям. Выберите ручной бой или автобой.');break;}
  }
  collectGarrison(c);
}
export function setDestination(c:Campaign,target:Point): string|null {
  if(!c.army.length)return 'Армия потеряна. Наймите крестьян в Риме.';
  const route=findPath(c.position,target);if(!route)return 'Нет сухопутного пути. Море и горы непроходимы; используйте дорогу через перевал.';
  c.route=route;march(c);return null;
}
export function nextDay(c:Campaign){c.day++;c.movement=DAY_MOVEMENT;const income=c.cities.filter(x=>x.owner==='rome').length*15;c.gold+=income;notice(c,`День ${c.day}: доход +${income} денариев.`);march(c);}
export function canBattle(c:Campaign){return !c.won&&c.army.length>0&&c.enemy.length>0&&distance(c.position,c.enemyPosition)<32;}
