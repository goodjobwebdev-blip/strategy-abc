import { INITIAL_CITIES, PLAYABLE_LAND, MOUNTAINS, ROADS, TYPES, WORLD_SIZE, SEA_LINKS, CAMPAIGN_GOALS } from './data.a9a8bd7d09da.js';
                                                       
                                                                                                
                                                                                                                                                                                                                                                                                      
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
  if (!onLand(p)) return 'sea';
  if (onRoad(p)) return 'road';
  if (MOUNTAINS.some(poly=>inPolygon(p,poly))) return 'mountain';
  return 'plain';
}
export function traversable(p       ) { const t=terrainAt(p); return t==='plain'||t==='road'; }
export function moveCost(a       ,b       ) { return distance(a,b)*(b.sea ? .45 : terrainAt({x:(a.x+b.x)/2,y:(a.y+b.y)/2})==='road' ? .52 : 1); }
function clearSegment(a       ,b       ) {
  const n=Math.ceil(distance(a,b)/3);
  for(let i=0;i<=n;i++) if(!traversable({x:a.x+(b.x-a.x)*i/(n||1),y:a.y+(b.y-a.y)*i/(n||1)})) return false;
  return true;
}
// A cached world grid and a binary heap keep long continental routes responsive.
const CELL=10,COLS=Math.floor(WORLD_SIZE.width/CELL)+1,ROWS=Math.floor(WORLD_SIZE.height/CELL)+1;
const gridPoint=(i       )      =>({x:(i%COLS)*CELL,y:Math.floor(i/COLS)*CELL});
const walkCache=new Map                ();
function walk(i       ){if(i<0||i>=COLS*ROWS)return false;let v=walkCache.get(i);if(v===undefined){v=traversable(gridPoint(i));walkCache.set(i,v);}return v;}
function anchor(p      ){let best=-1,d=Infinity;const x=Math.round(p.x/CELL),y=Math.round(p.y/CELL);for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){const xx=x+dx,yy=y+dy;if(xx<0||xx>=COLS||yy<0||yy>=ROWS)continue;const i=yy*COLS+xx,q=gridPoint(i),n=distance(p,q);if(n<d&&walk(i)&&clearSegment(p,q)){best=i;d=n;}}return best;}
class Heap { entries                       =[];push(id       ,f       ){let i=this.entries.length;this.entries.push({id,f});while(i){const parent=(i-1)>>1;if(this.entries[parent].f<=f)break;this.entries[i]=this.entries[parent];i=parent;}this.entries[i]={id,f};}pop(){const root=this.entries[0],last=this.entries.pop() ;if(this.entries.length){let i=0;while(i*2+1<this.entries.length){let child=i*2+1;if(child+1<this.entries.length&&this.entries[child+1].f<this.entries[child].f)child++;if(this.entries[child].f>=last.f)break;this.entries[i]=this.entries[child];i=child;}this.entries[i]=last;}return root;} }
let portEdges                                                   =null;
function ports(){if(portEdges)return portEdges;portEdges=new Map();for(const [a,b] of SEA_LINKS){const from=INITIAL_CITIES.find(c=>c.id===a) ,to=INITIAL_CITIES.find(c=>c.id===b) ,ai=anchor(from),bi=anchor(to);if(ai<0||bi<0)continue;for(const [x,y,f,t] of [[ai,bi,from,to],[bi,ai,to,from]]                                 ){const edges=portEdges.get(x)??[];edges.push({id:y,from:f,to:t});portEdges.set(x,edges);}}return portEdges;}
const landBounds=PLAYABLE_LAND.map(poly=>({poly,minX:Math.min(...poly.map(p=>p.x)),maxX:Math.max(...poly.map(p=>p.x)),minY:Math.min(...poly.map(p=>p.y)),maxY:Math.max(...poly.map(p=>p.y))}));
export function onLand(p      ){return landBounds.some(b=>p.x>=b.minX&&p.x<=b.maxX&&p.y>=b.minY&&p.y<=b.maxY&&inPolygon(p,b.poly));}
export function findPath(start      ,goal      )             {
 if(start.sea||!traversable(start)||!traversable(goal))return null;
 const first=anchor(start),last=anchor(goal);if(first<0||last<0)return null;
 const open=new Heap(),scores=new Map               ([[first,0]]),came=new Map                                               (),closed=new Set        ();open.push(first,0);
 const shipping=ports();
 while(open.entries.length){const current=open.pop().id;if(closed.has(current))continue;if(current===last){const legs          =[];let id=current;while(id!==first){const edge=came.get(id) ;legs.push(edge.sea?[edge.sea.from,{...edge.sea.to,sea:true},gridPoint(id)]:[gridPoint(id)]);id=edge.id;}return [gridPoint(first),...legs.reverse().flat(),{x:goal.x,y:goal.y}];}
 closed.add(current);const p=gridPoint(current);
 const offer=(id       ,cost       ,sea                       )=>{if(closed.has(id))return;const g=scores.get(current) +cost;if(g<(scores.get(id)??Infinity)){scores.set(id,g);came.set(id,{id:current,sea});open.push(id,g+distance(gridPoint(id),gridPoint(last))*.45);}};
 const x=current%COLS,y=Math.floor(current/COLS);
 for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]){const xx=x+dx,yy=y+dy,id=yy*COLS+xx;if(xx<0||xx>=COLS||yy<0||yy>=ROWS||!walk(id)||closed.has(id))continue;const q=gridPoint(id);if(!clearSegment(p,q))continue;offer(id,moveCost(p,q));}
 for(const edge of shipping.get(current)??[])offer(edge.id,distance(p,edge.from)+distance(edge.from,edge.to)*.45+distance(edge.to,gridPoint(edge.id)),edge);
 }
 return null;
}
                                                                                                   
export function campaignEnemies(c         )            {return [{id:'boii',name:'Бойи',units:c.enemy,position:c.enemyPosition},...c.rivals.map(r=>({id:r.id,name:r.name,units:r.units,position:r.position}))].filter(e=>e.units.length);}
export function encounter(c         )                {if(c.position.sea)return null;const army=campaignEnemies(c).filter(e=>distance(c.position,e.position)<32).sort((a,b)=>distance(c.position,a.position)-distance(c.position,b.position))[0];if(army)return army;const city=c.cities.find(x=>x.owner==='boii'&&x.garrison.length&&distance(c.position,x)<22);return city?{id:`city:${city.id}`,name:city.faction??'Защитники',units:city.garrison,position:city,city}:null;}
export function newCampaign()           {
  const rome=INITIAL_CITIES.find(c=>c.id==='rome') ,enemy=INITIAL_CITIES.find(c=>c.id==='felsina') ;
  const rivals        =[['gauls','Галлы','lugdunum'],['iberians','Иберы','toletum'],['carthaginians','Карфаген','carthage'],['macedonians','Македония','thessalonica']].map(([id,name,home])=>({id,name,home,position:{...INITIAL_CITIES.find(x=>x.id===home) },units:[{id:`${id}-1`,type:'warband',men:75},{id:`${id}-2`,type:'lightCavalry',men:35}]}));
  return {rivals,enemyTarget:'felsina',version:1,day:1,gold:140,army:[{id:'r1',type:'infantry',men:80},{id:'r2',type:'spears',men:80},{id:'r3',type:'lightCavalry',men:40}],position:{x:rome.x,y:rome.y},route:[],movement:DAY_MOVEMENT,cities:structuredClone(INITIAL_CITIES),enemy:[{id:'b1',type:'warband',men:90},{id:'b2',type:'archers',men:60}],enemyPosition:{x:enemy.x,y:enemy.y},won:false,serial:3,notices:['Северная граница неспокойна. Бойи удерживают Фельсину.']};
}
export function notice(c         ,text       ){c.notices.unshift(text);c.notices=c.notices.slice(0,8);}
export function cityAtArmy(c         ) { return c.cities.find(city=>distance(c.position,city)<22); }
export function collectGarrison(c         ) {
  const city=cityAtArmy(c);if(c.position.sea||!city||city.owner!=='rome')return;
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
    else{const ratio=c.movement/cost;c.position={x:c.position.x+(target.x-c.position.x)*ratio,y:c.position.y+(target.y-c.position.y)*ratio,...(target.sea?{sea:true}:{})};c.movement=0;}
    if(canBattle(c)){c.route=[];notice(c,`${encounter(c) .name}: противник рядом. Выберите ручной бой или автобой.`);break;}
  }
  collectGarrison(c);liberate(c);
}
export function setDestination(c         ,target      )              {
  if(!c.army.length)return 'Армия потеряна. Наймите крестьян в Риме.';
  if(c.position.sea)return 'Армия на кораблях. Сначала завершите переход в порт.';
  if(canBattle(c))return 'Сначала завершите бой или отступите через тактический бой.';
  const route=findPath(c.position,target);if(!route)return 'Маршрут не найден. Выберите город или сушу; переправы доступны между портами.';
  c.route=route;march(c);return null;
}
export function nextDay(c         ){c.day++;c.movement=DAY_MOVEMENT;const income=c.cities.filter(x=>x.owner==='rome').length*15;const pay=upkeep(c);c.gold=Math.max(0,c.gold+income-pay);notice(c,`День ${c.day}: доход +${income}, содержание −${pay} денариев.`);enemyTurn(c);if(!canBattle(c))march(c);}
export function canBattle(c         ){return c.army.length>0&&!!encounter(c);}

export const RECRUIT_PRICES                                                     ={peasants:35,infantry:100,spears:80,skirmishers:65,archers:75,lightCavalry:130,heavyCavalry:180};
export function upkeep(c         ){return [...c.army,...c.cities.filter(x=>x.owner==='rome').flatMap(x=>x.garrison)].reduce((n,u)=>n+Math.ceil((RECRUIT_PRICES[u.type]??80)/18),0);}
export function replenish(c         ){const city=cityAtArmy(c);if(!city||city.owner!=='rome')return 'Пополнение доступно в своём городе.';let added=0,cost=0;
 for(const u of c.army){const missing=TYPES[u.type].men-u.men,n=Math.min(15,missing,Math.floor(c.gold/2));if(n>0){u.men+=n;c.gold-=n*2;added+=n;cost+=n*2;}}
 if(!added)return 'Нет потерь или денег на пополнение.';notice(c,`Пополнение: ${added} воинов за ${cost} денариев. Опыт сохранён.`);return null;
}
function enemyTurn(c         ){
 for(const r of c.rivals){const home=c.cities.find(x=>x.id===r.home) ;if(!r.units.length||home.owner==='rome')continue;if(c.day%6===0&&r.units.length<4){c.serial++;r.units.push({id:`rival-${c.serial}`,type:'spears',men:60});}if(!c.position.sea&&c.army.length&&distance(c.position,r.position)<180&&distance(c.position,r.position)>32){const path=findPath(r.position,c.position);let budget=22;for(const q of path??[]){if(q.sea)break;const cost=moveCost(r.position,q);if(cost>budget)break;r.position={...q};budget-=cost;if(distance(c.position,r.position)<32)break;}}}

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
export function liberate(c         ){if(c.position.sea||canBattle(c))return;const city=cityAtArmy(c);if(city?.owner==='boii'&&c.army.length){city.owner='rome';c.gold+=50;notice(c,`${city.name} занят Римом. +50 денариев.`);}c.won=CAMPAIGN_GOALS.every(id=>c.cities.find(x=>x.id===id)?.owner==='rome');}
export function applyBattleResult(c         ,b                             ,own           ,enemy           ){
 const foe=encounter(c)??{id:'boii',name:'Бойи',units:c.enemy,position:c.enemyPosition};
 const remaining=b.winner==='rome'&&b.mission!=='retreat'?[]:enemy;
 if(foe.city)foe.city.garrison=remaining;else if(foe.id==='boii')c.enemy=remaining;else {const rival=c.rivals.find(r=>r.id===foe.id);if(rival)rival.units=remaining;}
 c.army=own;c.route=[];c.movement=0;
 if(b.winner==='rome'){
  if(b.mission!=='retreat'){const city=c.cities.find(x=>distance(foe.position,x)<22);if(city&&city.garrison.length&&!foe.city){notice(c,`${city.name}: полевая армия разбита, но гарнизон ещё защищает город.`);}else if(city){city.owner='rome';c.position={x:city.x,y:city.y};}c.gold+=100;notice(c,'Победа! Опыт отрядов вырос. +100 денариев.');}
  else notice(c,'Отступление прикрыто: выжившие сохранены.');
 }else{const home=c.cities.find(x=>x.owner==='rome'&&x.id==='rome') ;c.position={x:home.x,y:home.y};notice(c,'Армия отступила в Рим. Потери и опыт сохранены.');}
 if(b.mission==='retreat'){const home=c.cities.find(x=>x.id==='rome') ;c.position={x:home.x,y:home.y};}
 liberate(c);collectGarrison(c);
}
