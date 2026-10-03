import { INITIAL_CITIES, PLAYABLE_LAND, MOUNTAINS, ROADS, TYPES } from './data.72729a9dae44.js';
                                                       
                                                                                                                                                                                                                                                                      
export const DAY_MOVEMENT = 70;
export const RECRUIT_COST = 35;
export const MAX_UNITS = 16;
export function distance(a       , b       ) { return Math.hypot(a.x-b.x, a.y-b.y); }
export function inPolygon(p       , polygon         ) {
  let inside = false;
  for (let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const a=polygon[i],b=polygon[j];
    if ((a.y>p.y)!==(b.y>p.y) && p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x) inside=!inside;
  }
  return inside;
}
export function segmentDistance(p       , a       , b       ) {
  const dx=b.x-a.x,dy=b.y-a.y;
  const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy || 1)));
  return distance(p,{x:a.x+t*dx,y:a.y+t*dy});
}
export function onRoad(p       ) { return ROADS.some(r=>r.slice(1).some((b,i)=>segmentDistance(p,r[i],b)<12)); }
export function terrainAt(p       )                                        {
  if (!PLAYABLE_LAND.some(poly=>inPolygon(p,poly))) return 'sea';
  if (onRoad(p)) return 'road';
  if (MOUNTAINS.some(poly=>inPolygon(p,poly))) return 'mountain';
  return 'plain';
}
export function traversable(p       ) { const t=terrainAt(p); return t==='plain'||t==='road'; }
export function moveCost(a       ,b       ) { return distance(a,b)*(terrainAt({x:(a.x+b.x)/2,y:(a.y+b.y)/2})==='road' ? .52 : 1); }
function clearSegment(a       ,b       ) {
  const n=Math.ceil(distance(a,b)/3);
  for(let i=0;i<=n;i++) if(!traversable({x:a.x+(b.x-a.x)*i/(n||1),y:a.y+(b.y-a.y)*i/(n||1)})) return false;
  return true;
}
// A* on a 10 px grid, including diagonal corner checks. Roads affect route cost.
export function findPath(start       ,goal       )                 {
  if(!traversable(start)||!traversable(goal)) return null;
  const size=5,cols=201,rows=131;
  const index=(p      )=>Math.round(p.y/size)*cols+Math.round(p.x/size);
  const point=(i       )=>({x:(i%cols)*size,y:Math.floor(i/cols)*size});
  const nearest=(p      )=>{let best=-1,min=Infinity;for(let dx=-3;dx<=3;dx++)for(let dy=-3;dy<=3;dy++){const x=Math.round(p.x/size)+dx,y=Math.round(p.y/size)+dy;if(x<0||x>=cols||y<0||y>=rows)continue;const id=y*cols+x,q=point(id),d=distance(p,q);if(d<min&&clearSegment(p,q)){min=d;best=id;}}return best;};
  const first=nearest(start),last=nearest(goal);if(first<0||last<0)return null;
  const open=new Set([first]),closed=new Set        ();
  const g=new Map               ([[first,0]]),came=new Map               ();
  while(open.size) {
    let current=-1,best=Infinity;
    for(const id of open) { const f=g.get(id) +distance(point(id),point(last))*.52;if(f<best){best=f;current=id;} }
    if(current===last) {
      const path=[goal];let id=current;
      while(id!==first){path.push(point(id));id=came.get(id) ;}
      path.push(start);path.reverse();return path.slice(1);
    }
    open.delete(current);closed.add(current);
    const p=point(current);
    for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]) {
      const x=p.x/size+dx,y=p.y/size+dy;if(x<0||x>=cols||y<0||y>=rows)continue;
      const id=y*cols+x,q=point(id);
      if(closed.has(id)||!clearSegment(p,q))continue;
      const candidate=g.get(current) +moveCost(p,q);
      if(candidate<(g.get(id)??Infinity)){came.set(id,current);g.set(id,candidate);open.add(id);}
    }
  }
  return null;
}
export function newCampaign()           {
  const rome=INITIAL_CITIES.find(c=>c.id==='rome') ,enemy=INITIAL_CITIES.find(c=>c.id==='felsina') ;
  return {enemyTarget:'felsina',version:1,day:1,gold:140,army:[{id:'r1',type:'infantry',men:80},{id:'r2',type:'spears',men:80},{id:'r3',type:'lightCavalry',men:40}],position:{x:rome.x,y:rome.y},route:[],movement:DAY_MOVEMENT,cities:structuredClone(INITIAL_CITIES),enemy:[{id:'b1',type:'warband',men:90},{id:'b2',type:'archers',men:60}],enemyPosition:{x:enemy.x,y:enemy.y},won:false,serial:3,notices:['Северная граница неспокойна. Бойи удерживают Фельсину.']};
}
export function notice(c         ,text       ){c.notices.unshift(text);c.notices=c.notices.slice(0,8);}
export function cityAtArmy(c         ) { return c.cities.find(city=>distance(c.position,city)<22); }
export function collectGarrison(c         ) {
  const city=cityAtArmy(c);if(!city||city.owner!=='rome')return;
  const space=MAX_UNITS-c.army.length;
  if(space>0&&city.garrison.length){const joined=city.garrison.splice(0,space);c.army.push(...joined);notice(c,`${city.name}: ${joined.length} отр. присоединились к армии.`);}
}
export function recruit(c         ,cityId       ,type                             ='peasants')              {
  const city=c.cities.find(city=>city.id===cityId);
  if(!city||city.owner!=='rome')return 'Найм доступен только в ваших городах.';
  const cost=RECRUIT_PRICES[type];if(cost===undefined)return 'Этот тип недоступен для найма.';if(c.gold<cost)return `Недостаточно денег: требуется ${cost} денариев.`;
  if(city.garrison.length>=8)return 'Гарнизон заполнен: максимум 8 отрядов.';
  if(cityAtArmy(c)?.id===city.id&&c.army.length>=MAX_UNITS)return 'Армия заполнена: максимум 16 отрядов.';
  c.gold-=cost;c.serial++;
  city.garrison.push({id:`recruit-${c.serial}`,type,men:TYPES[type].men,experience:0});
  collectGarrison(c);notice(c,`${city.name}: нанят отряд: ${TYPES[type].name}.`);return null;
}
export function march(c         ) {
  while(c.route.length&&c.movement>.001){
    const target=c.route[0],cost=moveCost(c.position,target);
    if(cost<=c.movement+.0001){c.position={...target};c.movement=Math.max(0,c.movement-cost);c.route.shift();}
    else{const ratio=c.movement/cost;c.position={x:c.position.x+(target.x-c.position.x)*ratio,y:c.position.y+(target.y-c.position.y)*ratio};c.movement=0;}
    if(c.enemy.length&&distance(c.position,c.enemyPosition)<28){c.route=[];notice(c,'Армия подошла к бойям. Выберите ручной бой или автобой.');break;}
  }
  collectGarrison(c);liberate(c);
}
export function setDestination(c         ,target      )              {
  if(!c.army.length)return 'Армия потеряна. Наймите крестьян в Риме.';
  const route=findPath(c.position,target);if(!route)return 'Нет сухопутного пути. Море и горы непроходимы; используйте дорогу через перевал.';
  c.route=route;march(c);return null;
}
export function nextDay(c         ){c.day++;c.movement=DAY_MOVEMENT;const income=c.cities.filter(x=>x.owner==='rome').length*15;const pay=upkeep(c);c.gold=Math.max(0,c.gold+income-pay);notice(c,`День ${c.day}: доход +${income}, содержание −${pay} денариев.`);enemyTurn(c);if(!canBattle(c))march(c);}
export function canBattle(c         ){return !c.won&&c.army.length>0&&c.enemy.length>0&&distance(c.position,c.enemyPosition)<32;}

export const RECRUIT_PRICES                                                     ={peasants:35,infantry:100,spears:80,skirmishers:65,archers:75,lightCavalry:130,heavyCavalry:180};
export function upkeep(c         ){return [...c.army,...c.cities.filter(x=>x.owner==='rome').flatMap(x=>x.garrison)].reduce((n,u)=>n+Math.ceil((RECRUIT_PRICES[u.type]??80)/18),0);}
export function replenish(c         ){const city=cityAtArmy(c);if(!city||city.owner!=='rome')return 'Пополнение доступно в своём городе.';let added=0,cost=0;
 for(const u of c.army){const missing=TYPES[u.type].men-u.men,n=Math.min(15,missing,Math.floor(c.gold/2));if(n>0){u.men+=n;c.gold-=n*2;added+=n;cost+=n*2;}}
 if(!added)return 'Нет потерь или денег на пополнение.';notice(c,`Пополнение: ${added} воинов за ${cost} денариев. Опыт сохранён.`);return null;
}
function enemyTurn(c         ){
 if(c.won)return;const home=c.cities.find(x=>x.id==='felsina') ;
 if(c.day%4===0&&c.enemy.length<6&&home.owner==='boii'){c.serial++;c.enemy.push({id:`b-recruit-${c.serial}`,type:c.day%8===0?'lightCavalry':'warband',men:c.day%8===0?40:90});notice(c,'Разведчики: бойи получили подкрепление.');}
 if(!c.enemy.length)return;
 if(distance(c.position,c.enemyPosition)<32&&c.army.length)return;
 const targets=c.cities.filter(x=>x.owner==='rome'&&x.id!=='rome').sort((a,b)=>distance(c.enemyPosition,a)-distance(c.enemyPosition,b));
 const target=c.day%6>=4?home:targets[0]??home;
 c.enemyTarget=target.id;
 const path=findPath(c.enemyPosition,target);let budget=27;
 for(const p of path??[]){const cost=moveCost(c.enemyPosition,p);if(cost>budget){const t=budget/cost;c.enemyPosition={x:c.enemyPosition.x+(p.x-c.enemyPosition.x)*t,y:c.enemyPosition.y+(p.y-c.enemyPosition.y)*t};break;}c.enemyPosition={x:p.x,y:p.y};budget-=cost;if(distance(c.position,c.enemyPosition)<32&&c.army.length)break;}
 if(target.owner==='rome'&&distance(c.enemyPosition,target)<15&&distance(c.position,target)>32){
   const defense=target.garrison.reduce((n,u)=>n+u.men*(1+(u.experience??0)*.05),0),attack=c.enemy.reduce((n,u)=>n+u.men,0);
   if(defense>=attack){c.enemy.forEach(u=>u.men=Math.max(1,Math.floor(u.men*.65)));c.enemyPosition={x:home.x,y:home.y};notice(c,`${target.name}: гарнизон отбил налёт бойев.`);}
   else{target.owner='boii';target.garrison=[];c.enemy.forEach(u=>u.men=Math.max(1,Math.floor(u.men*(1-defense/(attack*2)))));notice(c,`${target.name} захвачен бойями. Освободи город, подведя армию.`);}
 }
}
export function liberate(c         ){if(canBattle(c))return;const city=cityAtArmy(c);if(city?.owner==='boii'&&c.army.length){city.owner='rome';c.gold+=50;notice(c,`${city.name} занят Римом. +50 денариев.`);}c.won=c.cities.find(x=>x.id==='felsina')?.owner==='rome'&&!c.enemy.length;}
export function applyBattleResult(c         ,b                             ,own           ,enemy           ){
 c.army=own;c.enemy=enemy;c.route=[];c.movement=0;
 if(b.winner==='rome'){
  if(b.mission!=='retreat'){c.enemy=[];const city=c.cities.find(x=>distance(c.enemyPosition,x)<22);if(city){city.owner='rome';c.position={x:city.x,y:city.y};}c.gold+=100;notice(c,'Победа! Опыт отрядов вырос. +100 денариев.');}
  else notice(c,'Отступление прикрыто: выжившие сохранены.');
 }else{const home=c.cities.find(x=>x.owner==='rome'&&x.id==='rome') ;c.position={x:home.x,y:home.y};notice(c,'Армия отступила в Рим. Потери и опыт сохранены.');}
 if(b.mission==='retreat'){const home=c.cities.find(x=>x.id==='rome') ;c.position={x:home.x,y:home.y};}
 liberate(c);collectGarrison(c);liberate(c);
}
