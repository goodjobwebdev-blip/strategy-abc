import { TYPES, TYPE_ORDER, BATTLE_FORESTS, BATTLE_HILL } from './data.ts';
import type { Point, UnitType, Side, ArmyUnit } from './data.ts';
import { distance } from './campaign.ts';
export type Order = { kind:'hold' } | {kind:'move';x:number;y:number} | {kind:'attack';target:string};
export interface BattleUnit extends Point { id:string;type:UnitType;side:Side;men:number;initialMen:number;morale:number;fatigue:number;cohesion:number;angle:number;order:Order;routed:boolean;charge:number;chargeCooldown:number;lastShot:number }
export interface Battle { units:BattleUnit[];elapsed:number;winner:Side|'draw'|null;logs:string[];shots:{from:Point;to:Point;ttl:number;side:Side}[];aiRome:boolean;training:boolean;reason:string }
export const BATTLE_STEP=.1;
export const BATTLE_LIMIT=600;
export function alive(u:BattleUnit){return u.men>=1&&!u.routed;}
export function forestAt(p:Point){return BATTLE_FORESTS.some(f=>p.x>f.x&&p.x<f.x+f.w&&p.y>f.y&&p.y<f.y+f.h);}
export function hillAt(p:Point){return ((p.x-BATTLE_HILL.x)/BATTLE_HILL.rx)**2+((p.y-BATTLE_HILL.y)/BATTLE_HILL.ry)**2<1;}
export function angleDifference(a:number,b:number){return Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));}
export function attackDirection(attacker:BattleUnit,defender:BattleUnit):'front'|'flank'|'rear'{const angle=Math.atan2(attacker.y-defender.y,attacker.x-defender.x);const diff=angleDifference(angle,defender.angle);return diff>2.25?'rear':diff>1.15?'flank':'front';}
export function battleLog(b:Battle,text:string){b.logs.unshift(text);b.logs=b.logs.slice(0,9);}
function spawn(army:ArmyUnit[],side:Side):BattleUnit[]{
  return army.map((u,i)=>{
    const row=i%8,column=Math.floor(i/8);
    const y=army.length<=4?220+i*90:95+row*64;
    return {...u,id:`${side}:${u.id}`,side,x:side==='rome'?145-column*65:850+column*65,y,initialMen:u.men,morale:TYPES[u.type].morale,fatigue:0,cohesion:1,angle:side==='rome'?0:Math.PI,order:{kind:'hold'},routed:false,charge:0,chargeCooldown:0,lastShot:0};
  });
}
export function createBattle(rome:ArmyUnit[],boii:ArmyUnit[],training=false,aiRome=false):Battle {
  return {units:[...spawn(rome,'rome'),...spawn(boii,'boii')],elapsed:0,winner:null,logs:['Разведка: холм на севере, лес в центре и на правом фланге.'],shots:[],aiRome,training,reason:''};
}
export function trainingBattle(){const army=TYPE_ORDER.map((type,i)=>({id:`training-${i}`,type,men:TYPES[type].men}));return createBattle(army,army,true);}
function chooseTarget(b:Battle,u:BattleUnit){
  const enemies=b.units.filter(v=>v.side!==u.side&&alive(v));
  return enemies.sort((a,z)=>{
    const score=(v:BattleUnit)=>distance(u,v)*(TYPES[u.type].cavalry&&TYPES[v.type].range>50?.65:1);
    return score(a)-score(z);
  })[0];
}
function moveUnit(u:BattleUnit,p:Point,dt:number){
  const d=distance(u,p);if(d<2)return false;
  const def=TYPES[u.type],forest=forestAt(u),hill=hillAt(p)&&!hillAt(u);
  const speed=def.speed*(forest?(def.cavalry?.42:.72):1)*(hill?.8:1)*(1-u.fatigue*.35)*(u.routed?1.15:1);
  const step=Math.min(d,speed*dt);
  u.angle=Math.atan2(p.y-u.y,p.x-u.x);u.x+=Math.cos(u.angle)*step;u.y+=Math.sin(u.angle)*step;
  u.x=Math.max(15,Math.min(985,u.x));u.y=Math.max(20,Math.min(620,u.y));
  u.fatigue=Math.min(1,u.fatigue+dt*(def.cavalry?.007:.004));
  u.cohesion=Math.max(.35,u.cohesion-dt*(forest?.04:.002));
  u.charge=def.cavalry&&!forest&&u.chargeCooldown<=0?Math.min(3,u.charge+dt):0;
  return true;
}
export function damageMultiplier(attacker:BattleUnit,defender:BattleUnit,ranged:boolean){
  const dir=attackDirection(attacker,defender),def=TYPES[attacker.type];
  let mult=ranged?1:dir==='rear'?1.8:dir==='flank'?1.35:1;
  if(!ranged&&def.cavalry&&defender.type==='spears'&&dir==='front'&&defender.cohesion>.55)mult*=.38;
  if(!ranged&&def.cavalry&&TYPES[defender.type].range>50)mult*=1.6;
  if(!ranged&&def.cavalry&&attacker.charge>1.4&&!forestAt(attacker)&&attacker.chargeCooldown<=0)mult*=attacker.type==='heavyCavalry'?2.6:1.8;
  if(ranged&&forestAt(defender))mult*=.48;
  if(hillAt(attacker)&&!hillAt(defender))mult*=1.18;
  if(hillAt(defender)&&!hillAt(attacker))mult*=.82;
  return mult;
}
export function stepBattle(b:Battle,dt=BATTLE_STEP){
  if(b.winner)return;
  b.elapsed+=dt;b.shots=b.shots.filter(s=>(s.ttl-=dt)>0);
  for(const u of b.units){
    if(u.men<1)continue;
    u.chargeCooldown=Math.max(0,u.chargeCooldown-dt);
    if(u.routed){moveUnit(u,{x:u.side==='rome'?15:985,y:u.y},dt);continue;}
    const isAI=u.side==='boii'||b.aiRome;
    let target:BattleUnit|undefined;
    if(isAI){target=chooseTarget(b,u);if(target)u.order={kind:'attack',target:target.id};}
    else if(u.order.kind==='attack')target=b.units.find(v=>v.id===(u.order as {target:string}).target&&alive(v));
    let moved=false;
    if(target){
      const d=distance(u,target),def=TYPES[u.type];
      if(isAI&&def.range>50&&d<68){moved=moveUnit(u,{x:u.x+(u.x-target.x)*2,y:u.y+(u.y-target.y)*2},dt);}
      else if(d>def.range*.83)moved=moveUnit(u,target,dt);
      // Defenders holding a line do not automatically turn to face flankers.
      else if(u.order.kind==='attack')u.angle=Math.atan2(target.y-u.y,target.x-u.x);
    } else if(u.order.kind==='move'){
      moved=moveUnit(u,u.order,dt);if(distance(u,u.order)<3)u.order={kind:'hold'};
    }
    if(!moved){u.fatigue=Math.max(0,u.fatigue-dt*.018);u.cohesion=Math.min(1,u.cohesion+dt*.035);u.charge=Math.max(0,u.charge-dt*.2);}
  }
  // Cohorts keep a small footprint instead of piling up on the same point.
  for(let i=0;i<b.units.length;i++)for(let j=i+1;j<b.units.length;j++){
    const a=b.units[i],z=b.units[j];if(!alive(a)||!alive(z))continue;
    const d=distance(a,z),minimum=a.side===z.side?34:25;
    if(d>=minimum)continue;
    const angle=d>.01?Math.atan2(z.y-a.y,z.x-a.x):i%2?Math.PI/2:0;
    const push=Math.min((minimum-d)/2,dt*14);
    a.x=Math.max(15,Math.min(985,a.x-Math.cos(angle)*push));a.y=Math.max(20,Math.min(620,a.y-Math.sin(angle)*push));
    z.x=Math.max(15,Math.min(985,z.x+Math.cos(angle)*push));z.y=Math.max(20,Math.min(620,z.y+Math.sin(angle)*push));
  }
  // Apply damage simultaneously, avoiding advantage from iteration order.
  const pending=new Map<string,{men:number;morale:number;cohesion:number}>();
  for(const u of b.units){
    if(!alive(u))continue;
    const def=TYPES[u.type];
    const close=b.units.filter(v=>v.side!==u.side&&alive(v)&&distance(u,v)<42).sort((a,z)=>distance(u,a)-distance(u,z))[0];
    let target=close;
    if(!target&&def.range>50){
      if(u.order.kind==='attack')target=b.units.find(v=>v.id===(u.order as {target:string}).target&&alive(v)&&distance(u,v)<def.range);
      if(!target)target=chooseTarget(b,u);
      if(target&&distance(u,target)>def.range)target=undefined;
    }
    if(!target)continue;
    const ranged=distance(u,target)>42;
    if(ranged&&angleDifference(Math.atan2(target.y-u.y,target.x-u.x),u.angle)>1.5)continue;
    if(!ranged&&distance(u,target)>def.range+8)continue;
    const targetDef=TYPES[target.type],strength=Math.max(.05,u.men/def.men);
    const power=(ranged?def.attack:def.range>50?2.1:def.attack)*strength*(.45+.55*u.cohesion)*(1-u.fatigue*.45);
    const mult=damageMultiplier(u,target,ranged);
    const damage=power*mult/(1+targetDef.defense*.13)*dt;
    const direction=attackDirection(u,target);
    const shock=!ranged?(direction==='rear'?4.8:direction==='flank'?2.6:.25):.1;
    const entry=pending.get(target.id)??{men:0,morale:0,cohesion:0};
    entry.men+=damage;entry.morale+=damage*(80/target.initialMen)*.65+shock*dt;entry.cohesion+=(direction==='front'?.006:.06)*dt;
    pending.set(target.id,entry);u.fatigue=Math.min(1,u.fatigue+dt*.016);
    if(ranged&&b.elapsed-u.lastShot>.8){b.shots.push({from:{x:u.x,y:u.y},to:{x:target.x,y:target.y},ttl:.3,side:u.side});u.lastShot=b.elapsed;}
    if(!ranged&&def.cavalry&&u.charge>1.4&&u.chargeCooldown<=0){battleLog(b,`${def.short}: натиск${direction==='rear'?' в тыл':direction==='flank'?' во фланг':''}.`);entry.men+=Math.min(5,power*mult*.2);entry.morale+=3;u.chargeCooldown=12;u.charge=0;}
  }
  for(const u of b.units){
    if(!alive(u))continue;const hit=pending.get(u.id);
    if(hit){u.men=Math.max(0,u.men-hit.men);u.morale=Math.max(0,u.morale-hit.morale);u.cohesion=Math.max(.2,u.cohesion-hit.cohesion);}
    else u.morale=Math.min(TYPES[u.type].morale,u.morale+dt*.12);
    if(u.morale<15||u.men<u.initialMen*.18){
      u.routed=true;battleLog(b,`${u.side==='rome'?'Рим':'Бойи'}: ${TYPES[u.type].short.toLowerCase()} бегут!`);
      for(const friend of b.units)if(friend.side===u.side&&alive(friend)&&distance(friend,u)<160)friend.morale=Math.max(0,friend.morale-9);
    }
  }
  const rome=b.units.some(u=>u.side==='rome'&&alive(u)),boii=b.units.some(u=>u.side==='boii'&&alive(u));
  if(!rome||!boii){b.winner=rome?'rome':boii?'boii':'draw';b.reason=b.winner==='draw'?'Обе армии потеряли боеспособность.':'Противник потерял боеспособные отряды.';}
  else if(b.elapsed>=BATTLE_LIMIT){b.winner='draw';b.reason='Лимит 10 минут: армии разошлись без победителя.';}
}
export function autoBattle(b:Battle){b.aiRome=true;for(let i=0;i<BATTLE_LIMIT/BATTLE_STEP+2&&!b.winner;i++)stepBattle(b);return b;}
export function survivors(b:Battle,side:Side):ArmyUnit[]{return b.units.filter(u=>u.side===side&&u.men>=1).map(u=>({id:u.id.split(':').slice(1).join(':'),type:u.type,men:Math.floor(u.men)}));}
export function losses(b:Battle,side:Side){return b.units.filter(u=>u.side===side).reduce((n,u)=>n+u.initialMen-Math.floor(u.men),0);}
