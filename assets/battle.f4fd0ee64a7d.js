import { TYPES, TYPE_ORDER, BATTLE_FORESTS, BATTLE_HILL } from './data.f4fd0ee64a7d.js';
                                                                 
import { distance } from './campaign.f4fd0ee64a7d.js';
import { generateMap, mapForest, heightAt, blocked, clearLine, battlePath } from './terrain.f4fd0ee64a7d.js';
                                                     
                                                                                                                     
                                                                                                                                                                                                                                                                                                  
                                                                                                                                                                                                                                              
export const BATTLE_STEP=.1;
export const BATTLE_LIMIT=600;
export function alive(u           ){return u.men>=1&&!u.routed;}
export function forestAt(p      ,map           ){return map?mapForest(p,map):BATTLE_FORESTS.some(f=>p.x>f.x&&p.x<f.x+f.w&&p.y>f.y&&p.y<f.y+f.h);}
export function hillAt(p      ,map           ){return map?heightAt(p,map)>.35:((p.x-BATTLE_HILL.x)/BATTLE_HILL.rx)**2+((p.y-BATTLE_HILL.y)/BATTLE_HILL.ry)**2<1;}
export function angleDifference(a       ,b       ){return Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));}
export function attackDirection(attacker           ,defender           )                       {const angle=Math.atan2(attacker.y-defender.y,attacker.x-defender.x);const diff=angleDifference(angle,defender.angle);return diff>2.25?'rear':diff>1.15?'flank':'front';}
export function battleLog(b       ,text       ){b.logs.unshift(text);b.logs=b.logs.slice(0,9);}
function spawn(army           ,side     ,map          )             {
  return army.map((u,i)=>{
    const row=i%8,column=Math.floor(i/8);
    const rows=Math.min(army.length,8),y=map.height/2+(row-(rows-1)/2)*110;
    return {...u,id:`${side}:${u.id}`,side,x:side==='rome'?260-column*85:map.width-260+column*85,y,initialMen:u.men,morale:TYPES[u.type].morale,fatigue:0,cohesion:1,angle:side==='rome'?0:Math.PI,order:{kind:'hold'},routed:false,charge:0,chargeCooldown:0,lastShot:0};
  });
}
export function createBattle(rome           ,boii           ,training=false,aiRome=false,map          =generateMap('plain',1337))        {
  return {phase:'deployment',units:[...spawn(rome,'rome',map),...spawn(boii,'boii',map)],elapsed:0,winner:null,logs:[`Разведка: ${map.biome==='city'?'улицы и кварталы '+map.townName:map.biome==='forest'?'лес с полянами':map.biome==='mountain'?'горные проходы':'открытая равнина'}.`],shots:[],aiRome,training,reason:'',map};
}
export function trainingBattle(biome      ='plain',seed=1337){const army=TYPE_ORDER.map((type,i)=>({id:`training-${i}`,type,men:TYPES[type].men}));return createBattle(army,army,true,false,generateMap(biome,seed));}
function chooseTarget(b       ,u           ){
  const enemies=b.units.filter(v=>v.side!==u.side&&alive(v));
  return enemies.sort((a,z)=>{
    const score=(v           )=>distance(u,v)*(TYPES[u.type].cavalry&&TYPES[v.type].range>50?.65:1);
    return score(a)-score(z);
  })[0];
}
function moveUnit(b       ,u           ,goal      ,dt       ){
  const p={x:Math.max(20,Math.min(b.map.width-20,goal.x)),y:Math.max(25,Math.min(b.map.height-35,goal.y))};
  if(blocked(p,b.map))return false;
  let target=p;
  if(!clearLine(u,p,b.map,8)){
    if(!u.navGoal||distance(u.navGoal,p)>25||!u.nav?.length||!clearLine(u,u.nav[0],b.map,8)){u.nav=battlePath(u,p,b.map)??[];u.navGoal=p;u.repathAt=b.elapsed+1;}
    while(u.nav?.length&&distance(u,u.nav[0])<.5)u.nav.shift();
    if(!u.nav?.length)return false;target=u.nav[0];
  }else u.nav=[];
  const d=distance(u,target);if(d<.25)return false;
  const def=TYPES[u.type],forest=forestAt(u,b.map),ascent=Math.max(0,heightAt(target,b.map)-heightAt(u,b.map));
  const speed=def.speed*(forest?(def.cavalry?.42:.72):1)/(1+Math.min(2,ascent)*.4)*(1-u.fatigue*.35)*(u.routed?1.15:1);
  const step=Math.min(d,speed*dt),angle=Math.atan2(target.y-u.y,target.x-u.x);
  const next={x:u.x+Math.cos(angle)*step,y:u.y+Math.sin(angle)*step};if(blocked(next,b.map))return false;
  u.angle=angle;u.x=next.x;u.y=next.y;
  u.fatigue=Math.min(1,u.fatigue+dt*((def.cavalry?.007:.004)+ascent*.008));
  u.cohesion=Math.max(.35,u.cohesion-dt*(forest?.04:.002));
  u.charge=def.cavalry&&!forest&&u.chargeCooldown<=0?Math.min(3,u.charge+dt):0;
  return true;
}
export function damageMultiplier(attacker           ,defender           ,ranged        ,map           ){
  const dir=attackDirection(attacker,defender),def=TYPES[attacker.type];
  let mult=ranged?1:dir==='rear'?1.8:dir==='flank'?1.35:1;
  if(!ranged&&def.cavalry&&defender.type==='spears'&&dir==='front'&&defender.cohesion>.55)mult*=.38;
  if(!ranged&&def.cavalry&&TYPES[defender.type].range>50)mult*=1.6;
  if(!ranged&&def.cavalry&&attacker.charge>1.4&&!forestAt(attacker,map)&&attacker.chargeCooldown<=0)mult*=attacker.type==='heavyCavalry'?2.6:1.8;
  if(ranged&&forestAt(defender,map))mult*=.48;
  if(map)mult*=Math.max(.7,Math.min(1.35,1+(heightAt(attacker,map)-heightAt(defender,map))*.12));
  else {if(hillAt(attacker)&&!hillAt(defender))mult*=1.18;if(hillAt(defender)&&!hillAt(attacker))mult*=.82;}
  return mult;
}
export function stepBattle(b       ,dt=BATTLE_STEP){
  if(b.winner||b.phase==='deployment')return;
  b.elapsed+=dt;b.shots=b.shots.filter(s=>(s.ttl-=dt)>0);
  for(const u of b.units){
    if(u.men<1)continue;
    u.chargeCooldown=Math.max(0,u.chargeCooldown-dt);
    if(u.routed){moveUnit(b,u,{x:u.side==='rome'?20:b.map.width-20,y:u.y},dt);continue;}
    const isAI=u.side==='boii'||b.aiRome;
    let target                     ;
    if(isAI){target=chooseTarget(b,u);if(target)u.order={kind:'attack',target:target.id};}
    else if(u.order.kind==='attack')target=b.units.find(v=>v.id===(u.order                   ).target&&alive(v));
    let moved=false;
    if(target){
      const d=distance(u,target),def=TYPES[u.type];
      if(isAI&&def.range>50&&d<68){moved=moveUnit(b,u,{x:u.x+(u.x-target.x)*2,y:u.y+(u.y-target.y)*2},dt);}
      else if(d>def.range*.83||!clearLine(u,target,b.map))moved=moveUnit(b,u,target,dt);
      // Defenders holding a line do not automatically turn to face flankers.
      else if(u.order.kind==='attack')u.angle=Math.atan2(target.y-u.y,target.x-u.x);
    } else if(u.order.kind==='move'){
      moved=moveUnit(b,u,u.order,dt);if(distance(u,u.order)<3){if(u.order.facing!==undefined)u.angle=u.order.facing;u.order={kind:'hold'};}
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
    const ap={x:a.x-Math.cos(angle)*push,y:a.y-Math.sin(angle)*push},zp={x:z.x+Math.cos(angle)*push,y:z.y+Math.sin(angle)*push};
    if(!blocked(ap,b.map)){a.x=ap.x;a.y=ap.y;}if(!blocked(zp,b.map)){z.x=zp.x;z.y=zp.y;}
  }
  // Apply damage simultaneously, avoiding advantage from iteration order.
  const pending=new Map                                                   ();
  for(const u of b.units){
    if(!alive(u))continue;
    const def=TYPES[u.type];
    const close=b.units.filter(v=>v.side!==u.side&&alive(v)&&distance(u,v)<42).sort((a,z)=>distance(u,a)-distance(u,z))[0];
    let target=close;
    if(!target&&def.range>50){
      if(u.order.kind==='attack')target=b.units.find(v=>v.id===(u.order                   ).target&&alive(v)&&distance(u,v)<def.range);
      if(!target)target=chooseTarget(b,u);
      if(target&&distance(u,target)>def.range)target=undefined;
    }
    if(!target)continue;
    const ranged=distance(u,target)>42;
    if(!clearLine(u,target,b.map))continue;
    if(ranged&&angleDifference(Math.atan2(target.y-u.y,target.x-u.x),u.angle)>1.5)continue;
    if(!ranged&&distance(u,target)>def.range+8)continue;
    const targetDef=TYPES[target.type],strength=Math.max(.05,u.men/def.men);
    const power=(ranged?def.attack:def.range>50?2.1:def.attack)*strength*(.45+.55*u.cohesion)*(1-u.fatigue*.45);
    const mult=damageMultiplier(u,target,ranged,b.map);
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
export function autoBattle(b       ){b.phase='combat';b.aiRome=true;for(let i=0;i<BATTLE_LIMIT/BATTLE_STEP+2&&!b.winner;i++)stepBattle(b);return b;}
export function survivors(b       ,side     )           {return b.units.filter(u=>u.side===side&&u.men>=1).map(u=>({id:u.id.split(':').slice(1).join(':'),type:u.type,men:Math.floor(u.men)}));}
export function losses(b       ,side     ){return b.units.filter(u=>u.side===side).reduce((n,u)=>n+u.initialMen-Math.floor(u.men),0);}
