import { TYPES, TYPE_ORDER, BATTLE_FORESTS, BATTLE_HILL } from './data.ae275d2ee010.js';
                                                                 
import { distance, segmentDistance } from './campaign.ae275d2ee010.js';
import { generateMap, mapForest, heightAt, blocked, clearLine, battlePath } from './terrain.ae275d2ee010.js';
                                                     
                                                                                                                                                    
                                              
                                                                        
export const MISSION_NAMES                       ={annihilation:'Разбить армию',square:'Захватить площадь',pass:'Удержать перевал',escort:'Провести обоз',retreat:'Прикрыть отступление'};
export const FORMATIONS={line:{name:'Линия',width:64,depth:24},loose:{name:'Рассыпной',width:86,depth:36},deep:{name:'Глубокий',width:38,depth:54}};
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  
                                                                                                                                                                                                                                                                                                                                                           
export const BATTLE_STEP=.1;
export const BATTLE_LIMIT=600;
export function alive(u           ){return u.men>=1&&!u.routed&&!u.escaped;}
export function forestAt(p      ,map           ){return map?mapForest(p,map):BATTLE_FORESTS.some(f=>p.x>f.x&&p.x<f.x+f.w&&p.y>f.y&&p.y<f.y+f.h);}
export function hillAt(p      ,map           ){return map?heightAt(p,map)>.35:((p.x-BATTLE_HILL.x)/BATTLE_HILL.rx)**2+((p.y-BATTLE_HILL.y)/BATTLE_HILL.ry)**2<1;}
export function angleDifference(a       ,b       ){return Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));}
export function attackDirection(attacker           ,defender           )                       {const angle=Math.atan2(attacker.y-defender.y,attacker.x-defender.x);const diff=angleDifference(angle,defender.angle);return diff>2.25?'rear':diff>1.15?'flank':'front';}
export function battleLog(b       ,text       ){b.logs.unshift(text);b.logs=b.logs.slice(0,9);}
function spawn(army           ,side     ,map          )             {
  return army.map((u,i)=>{
    const row=i%8,column=Math.floor(i/8);
    const rows=Math.min(army.length,8),y=map.height/2+(row-(rows-1)/2)*110;
    return {...u,experience:u.experience??0,skirmish:false,stationary:0,effects:[],queue:[],formation:'line',pace:'walk',fireAtWill:true,reform:0,escaped:false,id:`${side}:${u.id}`,side,x:side==='rome'?260-column*85:map.width-260+column*85,y,initialMen:u.men,morale:TYPES[u.type].morale,fatigue:0,cohesion:1,angle:side==='rome'?0:Math.PI,order:{kind:'hold'},routed:false,charge:0,chargeCooldown:0,lastShot:0};
  });
}
export function createBattle(rome           ,boii           ,training=false,aiRome=false,map          =generateMap('plain',1337),mission        =map.biome==='city'?'square':map.biome==='mountain'?'pass':'annihilation')        {
  const units=[...spawn(rome,'rome',map),...spawn(boii,'boii',map)];
  if(mission==='retreat')for(const u of units)u.x=u.side==='rome'?500:940;
  const center={x:map.width/2,y:map.height/2};
  const pass=map.roads.flat().filter(p=>!blocked(p,map,35)).sort((a,z)=>distance(a,center)-distance(z,center))[0]??center;
  return {mission,objective:{x:mission==='escort'?450:mission==='retreat'?80:mission==='pass'?pass.x:center.x,y:mission==='pass'?pass.y:center.y,progress:0,enemyProgress:0,hp:100,escaped:0},phase:'deployment',units,elapsed:0,winner:null,logs:[`Разведка: ${map.biome==='city'?'улицы и кварталы '+map.townName:map.biome==='forest'?'лес с полянами':map.biome==='mountain'?'горные проходы':'открытая равнина'}.`],shots:[],aiRome,training,reason:'',map};
}
export function trainingBattle(biome      ='plain',seed=1337,mission         ){const army=TYPE_ORDER.map((type,i)=>({id:`training-${i}`,type,men:TYPES[type].men}));return createBattle(army,army,true,false,generateMap(biome,seed),mission);}
function chooseTarget(b       ,u           ){
  const enemies=b.units.filter(v=>v.side!==u.side&&alive(v)&&canSee(b,u,v));
  return enemies.sort((a,z)=>{
    const score=(v           )=>distance(u,v)*(TYPES[u.type].cavalry&&TYPES[v.type].range>50?.65:1);
    return score(a)-score(z);
  })[0];
}
export function turnUnit(u           ,angle       ,dt       ){
 const diff=Math.atan2(Math.sin(angle-u.angle),Math.cos(angle-u.angle)),rate=(TYPES[u.type].cavalry?1.05:.65)*(u.formation==='deep'?.7:1)*(.6+.4*u.cohesion);
 u.angle+=Math.max(-rate*dt,Math.min(rate*dt,diff));return Math.abs(diff)<.035;
}
export function effect(u           ,text       ,now       ){const old=u.effects.find(e=>e.text===text);if(old)old.until=now+3;else u.effects.push({text,until:now+3});u.effects=u.effects.slice(-6);}
export function unitEffects(b       ,u           ){
 const list=u.effects.filter(e=>e.until>b.elapsed).map(e=>e.text);
 if(forestAt(u,b.map))list.push('Лес: медленнее, строй нарушается, защита от стрел');
 if(u.reform>0)list.push('Перестроение: снижены скорость и боеспособность');
 if(u.fatigue>.55)list.push('Усталость: снижены скорость и урон');
 if(u.type==='spears'&&u.stationary>2&&u.cohesion>.55)list.push('Копья подготовлены: защита от фронтального натиска');
 if(TYPES[u.type].cavalry)list.push(u.chargeCooldown>0?'Натиск восстанавливается: '+Math.ceil(u.chargeCooldown)+' с':u.charge>1.4?'Конница разогналась: натиск готов':'Для натиска нужен прямой разбег ≈ 60 м');
 if(TYPES[u.type].range>50){
   const known=visibleEnemies(b,u.side),target=b.units.filter(v=>v.side!==u.side&&alive(v)&&known.has(v.id)&&distance(u,v)<TYPES[u.type].range).sort((a,z)=>distance(u,a)-distance(u,z))[0];
   if(target&&!clearLine(u,target,b.map))list.push('Обстрел закрыт: здание или скала на линии выстрела');
   else if(target&&!canSee(b,u,target))list.push('Обстрел закрыт: гребень перекрывает обзор');
   else if(target&&angleDifference(Math.atan2(target.y-u.y,target.x-u.x),u.angle)>1.5)list.push('Цель вне сектора обстрела: нужен разворот');
 }
 if(u.skirmish)list.push('Стрелки отходят при приближении врага');
 return [...new Set(list)];
}
const slideSides=new WeakMap                                                    ();
const detours=new WeakMap                                                                 ();
function moveUnit(b       ,u           ,goal      ,dt       ){
  const p={x:Math.max(20,Math.min(b.map.width-20,goal.x)),y:Math.max(25,Math.min(b.map.height-35,goal.y))};
  if(blocked(p,b.map))return false;
  let target=p;
  if(!clearLine(u,p,b.map,8)){
    if(!u.navGoal||distance(u.navGoal,p)>25||!u.nav?.length||!clearLine(u,u.nav[0],b.map,8)){u.nav=battlePath(u,p,b.map)??[];u.navGoal=p;u.repathAt=b.elapsed+1;}
    while(u.nav?.length&&distance(u,u.nav[0])<.5)u.nav.shift();
    if(!u.nav?.length)return false;target=u.nav[0];
  }else u.nav=[];
  // Commit to a side of a blocking friendly cohort, instead of changing it
  // every simulation step. Contact with an enemy is a fighting destination.
  const old=detours.get(u);
  if(old&&(distance(old.goal,p)>100||distance(u,old.point)<12||b.elapsed>old.until||!b.units.some(v=>v.id===old.blocker&&alive(v))))detours.delete(u);
  if(!detours.has(u)&&alive(u)){
    const d=distance(u,target),dx=(target.x-u.x)/(d||1),dy=(target.y-u.y)/(d||1);
    const friend=b.units.filter(v=>v.id!==u.id&&v.side===u.side&&alive(v)&&distance(u,v)<180&&
      (v.x-u.x)*dx+(v.y-u.y)*dy>12&&distance(v,target)>35&&segmentDistance(v,u,target)<Math.hypot(FORMATIONS[v.formation].width,FORMATIONS[v.formation].depth)/2+22)
      .sort((a,z)=>distance(u,a)-distance(u,z))[0];
    if(friend){
      const clearance=Math.hypot(FORMATIONS[friend.formation].width,FORMATIONS[friend.formation].depth)/2+Math.hypot(FORMATIONS[u.formation].width,FORMATIONS[u.formation].depth)/2+18;
      const side=(u.x-friend.x)*-dy+(u.y-friend.y)*dx>=0?1:-1;
      const candidates=[side,-side].map(sign=>({x:friend.x-dy*sign*clearance+dx*25,y:friend.y+dx*sign*clearance+dy*25}));
      const point=candidates.find(q=>!blocked(q,b.map,10)&&clearLine(u,q,b.map,8));
      if(point)detours.set(u,{point,goal:p,blocker:friend.id,until:b.elapsed+7});
    }
  }
  if(detours.has(u))target=detours.get(u) .point;
  const d=distance(u,target);if(d<.25)return false;
  const def=TYPES[u.type],forest=forestAt(u,b.map),ascent=Math.max(0,heightAt({x:u.x+(target.x-u.x)/Math.max(1,d)*40,y:u.y+(target.y-u.y)/Math.max(1,d)*40},b.map)-heightAt(u,b.map));
  const angle=Math.atan2(target.y-u.y,target.x-u.x),previous=u.angle;
  turnUnit(u,angle,dt);
  // Facing and travel are independent while turning: a cohort can sidestep.
  const alignment=angleDifference(u.angle,angle),turnSpeed=alignment>.4?.55:1;
  const speed=def.speed*turnSpeed*(u.pace==='run'?1.65:1)*(u.formation==='deep'?.85:1)*(u.reform>0?.55:1)*(forest?(def.cavalry?.65:.72):1)/(1+Math.min(2,ascent)*4)*(1-u.fatigue*.35)*(u.routed?1.15:1);
  const step=Math.min(d,speed*dt),destination={x:u.x+Math.cos(angle)*step,y:u.y+Math.sin(angle)*step};
  // Evaluate rotation and translation against the pose at the start of the step.
  // A failed turn must not create penetration and trap a cohort at an ally's corner.
  const original={...u,angle:previous},turned=u.angle;
  const neighbors=b.units.filter(v=>v.id!==u.id&&alive(v)&&alive(u));
  const free=(q      ,facing       )=>!blocked(q,b.map)&&clearLine(original,q,b.map,8)&&neighbors.every(v=>{
    const before=contactGap(original,v),after=contactGap({...u,...q,angle:facing},v);
    return after>=-1e-7||(before<0&&after>=before-1e-7);
  });
  let chosen                ,chosenAngle=turned,steered=false;
  if(free(destination,turned))chosen=destination;
  else if(free(destination,previous)){chosen=destination;chosenAngle=previous;}
  else {
    const blockers=neighbors.filter(v=>v.side===u.side&&(contactGap({...u,...destination},v)<0||contactGap({...original,...destination},v)<0));
    const friend=blockers.sort((a,z)=>distance(original,a)-distance(original,z))[0];
    if(friend){
      let preference=slideSides.get(u);
      if(!preference||preference.blocker!==friend.id||distance(preference.goal,p)>100){
        preference={goal:p,blocker:friend.id,side:(u.x-friend.x)*-Math.sin(angle)+(u.y-friend.y)*Math.cos(angle)>=0?1:-1};slideSides.set(u,preference);
      }
      const {normal}=contactGeometry(original,friend),away=Math.atan2(-normal.y,-normal.x);
      const directions=[Math.PI/6,Math.PI/3,Math.PI/2,Math.PI*2/3,Math.PI*5/6,Math.PI].flatMap(offset=>[angle+offset*preference .side,angle-offset*preference .side]);
      directions.push(away,away+Math.PI/2,away-Math.PI/2);
      let best=-Infinity;
      for(const heading of directions){
        const q={x:u.x+Math.cos(heading)*step,y:u.y+Math.sin(heading)*step};
        const facing=free(q,turned)?turned:free(q,previous)?previous:undefined;if(facing===undefined)continue;
        const progress=(d-distance(q,target))/Math.max(.001,step),sideBias=Math.sin(heading-angle)*preference.side*.035;
        const score=progress+sideBias;
        if(score>best){best=score;chosen=q;chosenAngle=facing;steered=true;}
      }
    }
  }
  if(!chosen){u.angle=previous;u.charge=0;return false;}
  u.x=chosen.x;u.y=chosen.y;u.angle=chosenAngle;
  if(steered){u.charge=0;effect(u,'Обход соседнего отряда',b.elapsed);}
  u.fatigue=Math.min(1,u.fatigue+dt*((u.pace==='run'?(def.cavalry?.013:.011):.001)+ascent*.08));
  u.cohesion=Math.max(.35,u.cohesion-dt*(forest?.04:.002));
  u.charge=def.cavalry&&u.pace==='run'&&!forest&&u.chargeCooldown<=0?alignment<.25&&!detours.has(u)&&!steered?Math.min(3,u.charge+step/40):0:0;
  if(ascent>.025)effect(u,'Подъём: скорость ниже, усталость растёт',b.elapsed);
  return true;
}
export function damageMultiplier(attacker           ,defender           ,ranged        ,map           ){
  const dir=attackDirection(attacker,defender),def=TYPES[attacker.type];
  let mult=ranged?1:dir==='rear'?1.8:dir==='flank'?1.35:1;
  if(!ranged&&def.cavalry&&defender.type==='spears'&&dir==='front'&&defender.cohesion>.55)mult*=defender.stationary>2?.28:.65;
  if(!ranged&&def.cavalry&&TYPES[defender.type].range>50)mult*=1.6;
  if(!ranged&&def.cavalry&&attacker.charge>1.4&&!forestAt(attacker,map)&&attacker.chargeCooldown<=0)mult*=attacker.type==='heavyCavalry'?2.6:1.8;
  if(ranged&&forestAt(defender,map))mult*=.48;
  if(ranged&&defender.formation==='loose')mult*=.55;
  if(!ranged&&defender.formation==='deep'&&dir==='front')mult*=.75;
  if(!ranged&&defender.formation==='deep'&&dir!=='front')mult*=1.25;
  if(!ranged&&attacker.formation==='loose')mult*=.75;
  if(map)mult*=Math.max(.7,Math.min(1.35,1+(heightAt(attacker,map)-heightAt(defender,map))*.12));
  else {if(hillAt(attacker)&&!hillAt(defender))mult*=1.18;if(hillAt(defender)&&!hillAt(attacker))mult*=.82;}
  return mult;
}
export function stepBattle(b       ,dt=BATTLE_STEP){
  if(b.winner||b.phase==='deployment')return;
  b.elapsed+=dt;b.shots=b.shots.filter(s=>(s.ttl-=dt)>0);
  for(const u of b.units){
    if(u.men<1)continue;
    if(u.escaped)continue;const initialAngle=u.angle;u.effects=u.effects.filter(e=>e.until>b.elapsed);u.reform=Math.max(0,u.reform-dt);
    if(u.order.kind==='hold'&&u.queue.length){u.order=u.queue.shift() ;u.nav=[];}
    u.chargeCooldown=Math.max(0,u.chargeCooldown-dt);
    if(u.routed){moveUnit(b,u,{x:u.side==='rome'?20:b.map.width-20,y:u.y},dt);continue;}
    const isAI=u.side==='boii'||b.aiRome;
    let target                     ;
    if(isAI){u.order=stableAI(b,u);if(u.order.kind==='attack')target=b.units.find(v=>u.order.kind==='attack'&&v.id===u.order.target&&alive(v));u.pace=TYPES[u.type].cavalry&&(target||u.order.kind==='move')?'run':target&&distance(u,target)<300?'run':'walk';}
    else if(u.order.kind==='attack')target=b.units.find(v=>v.id===(u.order                   ).target&&alive(v)&&visibleEnemies(b,u.side).has(v.id));
    let moved=false;
    const danger=b.units.filter(v=>v.side!==u.side&&alive(v)&&canSee(b,u,v)).sort((a,z)=>distance(u,a)-distance(u,z))[0];
    if(!isAI&&u.skirmish&&TYPES[u.type].range>50&&danger&&distance(u,danger)<TYPES[u.type].range*.65){
      const a=Math.atan2(u.y-danger.y,u.x-danger.x),p={x:u.x+Math.cos(a)*100,y:u.y+Math.sin(a)*100};u.pace='run';moved=moveUnit(b,u,p,dt);effect(u,'Отход от угрозы: обстрел продолжается после разворота',b.elapsed);
    }else if(u.order.kind==='guard'){
      const friend=b.units.find(v=>v.id===(u.order                   ).target&&v.side===u.side&&alive(v));
      if(!friend){u.order={kind:'hold'};}else{
        const back=TYPES[u.type].range>50?120:-85,p={x:friend.x-Math.cos(friend.angle)*back,y:friend.y-Math.sin(friend.angle)*back};
        if(TYPES[u.type].range<50&&danger&&distance(friend,danger)<190)moved=moveUnit(b,u,danger,dt);else if(distance(u,p)>20){
          let goal=p;
          if(segmentDistance(friend,u,p)<70&&distance(u,p)>70){const side=(u.x-friend.x)*-Math.sin(friend.angle)+(u.y-friend.y)*Math.cos(friend.angle)>=0?1:-1;goal={x:friend.x-Math.sin(friend.angle)*side*125,y:friend.y+Math.cos(friend.angle)*side*125};}
          moved=moveUnit(b,u,goal,dt);
        }else turnUnit(u,friend.angle,dt);
      }
    }else if(target){
      const d=distance(u,target),def=TYPES[u.type];
      if(isAI&&def.range>50&&d<def.range*.45){moved=moveUnit(b,u,{x:u.x+(u.x-target.x)*2,y:u.y+(u.y-target.y)*2},dt);}
      else if((def.range>50?d>def.range*.83:contactGap(u,target)>5)||!clearLine(u,target,b.map))moved=moveUnit(b,u,target,dt);
      // Defenders holding a line do not automatically turn to face flankers.
      else if(u.order.kind==='attack')turnUnit(u,Math.atan2(target.y-u.y,target.x-u.x),dt);
    } else if(u.order.kind==='move'){
      moved=moveUnit(b,u,u.order,dt);if(distance(u,u.order)<3){if(u.order.facing===undefined||turnUnit(u,u.order.facing,dt)){u.order=u.queue.shift()??{kind:'hold'};u.nav=[];}}
    }
    if(u.order.kind==='attack'&&!target&&!isAI){u.order=u.queue.shift()??{kind:'hold'};u.nav=[];}
    u.stationary=moved||angleDifference(initialAngle,u.angle)>.001?0:u.stationary+dt;
    if(!moved){u.fatigue=Math.max(0,u.fatigue-dt*.018);u.cohesion=Math.min(1,u.cohesion+dt*.035);u.charge=Math.max(0,u.charge-dt*.2);}
  }
  // Resolve only actual rectangle penetration, along the separating axis.
  // Never push opponents away from an already valid melee contact.
  for(let pass=0;pass<3;pass++)for(let i=0;i<b.units.length;i++)for(let j=i+1;j<b.units.length;j++){
    const a=b.units[i],z=b.units[j];if(!alive(a)||!alive(z))continue;
    const {gap,normal}=contactGeometry(a,z);if(gap>=-1e-7)continue;
    const push=Math.min(-gap/2+.05,dt*35);
    const ap={x:a.x-normal.x*push,y:a.y-normal.y*push},zp={x:z.x+normal.x*push,y:z.y+normal.y*push};
    if(!blocked(ap,b.map)&&clearLine(a,ap,b.map,8)){a.x=ap.x;a.y=ap.y;}
    if(!blocked(zp,b.map)&&clearLine(z,zp,b.map,8)){z.x=zp.x;z.y=zp.y;}
  }
  // Apply damage simultaneously, avoiding advantage from iteration order.
  const pending=new Map                                                   ();
  for(const u of b.units){
    if(!alive(u))continue;
    const def=TYPES[u.type];
    const close=b.units.filter(v=>v.side!==u.side&&alive(v)&&contactGap(u,v)<=8&&canSee(b,u,v)).sort((a,z)=>distance(u,a)-distance(u,z))[0];
    let target                     =close;
    if(!target&&def.range>50&&(u.fireAtWill||u.order.kind==='attack')){
      if(u.order.kind==='attack')target=b.units.find(v=>v.id===(u.order                   ).target&&alive(v)&&distance(u,v)<def.range);
      if(!target)target=chooseTarget(b,u);
      if(target&&distance(u,target)>def.range)target=undefined;
    }
    if(!target||!canSee(b,u,target))continue;
    const ranged=contactGap(u,target)>8;
    if(!clearLine(u,target,b.map))continue;
    if(ranged&&angleDifference(Math.atan2(target.y-u.y,target.x-u.x),u.angle)>1.5)continue;
    if(!ranged&&contactGap(u,target)>8)continue;
    const targetDef=TYPES[target.type],strength=Math.max(.05,u.men/def.men);
    const power=(1+(u.experience??0)*.025)*(u.reform>0?.7:1)*(ranged?def.attack:def.range>50?2.1:def.attack)*strength*(.45+.55*u.cohesion)*(1-u.fatigue*.45);
    const mult=damageMultiplier(u,target,ranged,b.map);
    const damage=power*mult/(1+targetDef.defense*.13)*dt;
    const direction=attackDirection(u,target);
    const shock=!ranged?(direction==='rear'?4.8:direction==='flank'?2.6:.25):.1;
    if(!ranged&&direction!=='front')effect(target,direction==='rear'?'Атака с тыла: мораль и строй падают':'Атака во фланг: мораль и строй падают',b.elapsed);
    if(mapForest(target,b.map)&&ranged)effect(target,'Деревья снижают потери от обстрела',b.elapsed);
    if(heightAt(u,b.map)>heightAt(target,b.map)+.25)effect(u,'Выше противника: преимущество в уроне',b.elapsed);
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
      for(const friend of b.units)if(friend.side===u.side&&alive(friend)&&distance(friend,u)<160){friend.morale=Math.max(0,friend.morale-9);effect(friend,'Бегство соседей: −9 морали',b.elapsed);}
    }
  }
  updateObjective(b,dt);if(b.winner)return;
  const rome=b.units.some(u=>u.side==='rome'&&alive(u)),boii=b.units.some(u=>u.side==='boii'&&alive(u));
  if(!rome||!boii){b.winner=rome?'rome':boii?'boii':'draw';b.reason=b.winner==='draw'?'Обе армии потеряли боеспособность.':'Противник потерял боеспособные отряды.';}
  else if(b.elapsed>=BATTLE_LIMIT){b.winner='draw';b.reason='Лимит 10 минут: армии разошлись без победителя.';}
}
export function autoBattle(b       ){b.phase='combat';b.aiRome=true;for(let i=0;i<BATTLE_LIMIT/BATTLE_STEP+2&&!b.winner;i++)stepBattle(b);return b;}
export function survivors(b       ,side     )           {return b.units.filter(u=>u.side===side&&u.men>=1).map(u=>({id:u.id.split(':').slice(1).join(':'),type:u.type,men:Math.floor(u.men),experience:Math.min(10,(u.experience??0)+(b.winner===side?1:0))}));}
export function losses(b       ,side     ){return b.units.filter(u=>u.side===side).reduce((n,u)=>n+u.initialMen-Math.floor(u.men),0);}

// Terrain visibility is shared by an army, but AI targeting uses its own scouts.
export function canSee(b       ,observer      ,target      ){
  const range=mapForest(target,b.map)?260:620,d=distance(observer,target);
  if(d>range||!clearLine(observer,target,b.map))return false;
  if(d<90)return true;
  const a=heightAt(observer,b.map)+.24,z=heightAt(target,b.map)+.24,n=Math.ceil(d/24);
  for(let i=1;i<n;i++){const t=i/n,p={x:observer.x+(target.x-observer.x)*t,y:observer.y+(target.y-observer.y)*t};if(heightAt(p,b.map)>a+(z-a)*t+.035)return false;}
  return true;
}
export function visibleEnemies(b       ,side     ='rome'){
  const scouts=b.units.filter(u=>u.side===side&&alive(u));
  return new Set(b.units.filter(u=>u.side!==side&&u.men>=1&&scouts.some(v=>canSee(b,v,u))).map(u=>u.id));
}
export function setFormation(u           ,formation          ){if(u.formation===formation)return;u.formation=formation;u.reform=7;u.cohesion=Math.max(.35,u.cohesion-.25);}
export function objectiveText(b       ){const o=b.objective;
 const contested=b.units.some(u=>u.side==='rome'&&alive(u)&&distance(u,o)<145)&&b.units.some(u=>u.side==='boii'&&alive(u)&&distance(u,o)<145);
 const status=contested?' · Оспаривается: захват приостановлен':'';
  if(b.mission==='square')return `Площадь: Рим ${Math.floor(o.progress)} / 60 с · Бойи ${Math.floor(o.enemyProgress)} / 60 с${status}`;
  if(b.mission==='pass')return `Перевал: Рим ${Math.floor(o.progress)} / 90 с · Бойи ${Math.floor(o.enemyProgress)} / 90 с${status}`;
  if(b.mission==='escort')return `Обоз: целостность ${Math.ceil(o.hp)}% · путь ${Math.floor((o.x-450)/(b.map.width-600)*100)}%`;
  if(b.mission==='retreat')return `Выведено ${o.escaped} / ${Math.ceil(b.units.filter(u=>u.side==='rome').length/2)} отрядов через левый край`;
  return 'Побеждает армия, которая сохранит боеспособность.';
}
const convoyPaths=new WeakMap                ();
function updateObjective(b       ,dt       ){const o=b.objective;
  const win=(side     ,text       )=>{b.winner=side;b.reason=text;};
  if(b.mission==='square'||b.mission==='pass'){
    const own=b.units.some(u=>u.side==='rome'&&alive(u)&&distance(u,o)<145),enemy=b.units.some(u=>u.side==='boii'&&alive(u)&&distance(u,o)<145);
    if(own&&!enemy)o.progress+=dt;if(enemy&&!own)o.enemyProgress+=dt;
    const limit=b.mission==='square'?60:90;
    if(o.progress>=limit)win('rome','Цель удержана римской армией.');if(o.enemyProgress>=limit)win('boii','Противник удержал цель.');
  }
  if(b.mission==='escort'){
    const enemy=b.units.some(u=>u.side==='boii'&&alive(u)&&distance(u,o)<110),guard=b.units.some(u=>u.side==='rome'&&alive(u)&&distance(u,o)<190);
    if(enemy)o.hp=Math.max(0,o.hp-dt*4);
    if(guard&&!enemy){const goal={x:b.map.width-120,y:b.map.height/2};let target                =goal;if(!clearLine(o,goal,b.map)){let path=convoyPaths.get(b);if(!path?.length||!clearLine(o,path[0],b.map,8)){path=battlePath(o,goal,b.map)??[];convoyPaths.set(b,path);}while(path.length&&distance(o,path[0])<3)path.shift();target=path[0];}if(target){const d=distance(o,target),step=Math.min(d,22*dt);o.x+=(target.x-o.x)*step/d;o.y+=(target.y-o.y)*step/d;}}
    if(o.hp<=0)win('boii','Обоз уничтожен.');else if(o.x>=b.map.width-150)win('rome','Обоз проведён в безопасную зону.');
  }
  if(b.mission==='retreat'){
    for(const u of b.units)if(u.side==='rome'&&alive(u)&&u.x<85){u.escaped=true;u.order={kind:'hold'};u.queue=[];o.escaped++;}
    if(o.escaped>=Math.ceil(b.units.filter(u=>u.side==='rome').length/2))win('rome','Не менее половины отрядов выведены из боя.');
  }
}


export function unitRadius(u           ,direction       ){const f=FORMATIONS[u.formation],a=direction-u.angle;return Math.abs(Math.cos(a))*f.depth/2+Math.abs(Math.sin(a))*f.width/2;}
// Separating-axis test for the actual oriented rectangles. The previous radial
// projection was not a rectangle distance and treated diagonal empty space as occupied.
export function contactGeometry(a           ,z           ){
 let gap=-Infinity,normal={x:1,y:0};
 for(const axis of [a.angle,a.angle+Math.PI/2,z.angle,z.angle+Math.PI/2]){
  const nx=Math.cos(axis),ny=Math.sin(axis),projection=(z.x-a.x)*nx+(z.y-a.y)*ny;
  const value=Math.abs(projection)-unitRadius(a,axis)-unitRadius(z,axis);
  if(value>gap){gap=value;const sign=projection<0?-1:1;normal={x:nx*sign,y:ny*sign};}
 }
 return {gap,normal};
}
export function contactGap(a           ,z           ){return contactGeometry(a,z).gap;}
const aiPlans=new WeakMap                                                      ();
function stableAI(b       ,u           )      {
 const cached=aiPlans.get(u),known=visibleEnemies(b,u.side);
 if(cached&&cached.until>b.elapsed){
  const enemy=cached.target?b.units.find(v=>v.id===cached.target&&alive(v)&&known.has(v.id)):undefined;
  if(cached.order.kind==='attack'&&enemy)return cached.order;
  if(cached.order.kind==='move'&&(!cached.target||enemy)){
   if(distance(u,cached.order)>20)return cached.order;
   if(enemy){const order      ={kind:'attack',target:enemy.id};aiPlans.set(u,{order,until:b.elapsed+4,target:enemy.id});return order;}
  }
 }
 const engaged=b.units.filter(v=>v.side!==u.side&&alive(v)&&contactGap(u,v)<=10&&clearLine(u,v,b.map)).sort((a,z)=>distance(u,a)-distance(u,z))[0];
 const order      =engaged?{kind:'attack',target:engaged.id}:planAI(b,u);
 const foes=b.units.filter(v=>v.side!==u.side&&alive(v)&&known.has(v.id));
 const flank=TYPES[u.type].cavalry&&order.kind==='move'&&foes.length>0;
 const target=order.kind==='attack'?order.target:flank?foes.sort((a,z)=>distance(u,a)-distance(u,z))[0]?.id:undefined;
 aiPlans.set(u,{order,until:b.elapsed+(flank?8:1.5),target});return order;
}
// Each role chooses a distinct position; targets must be visible to its army.
export function planAI(b       ,u           )      {
 const known=visibleEnemies(b,u.side),foes=b.units.filter(v=>v.side!==u.side&&alive(v)&&known.has(v.id)),def=TYPES[u.type];
 const friends=b.units.filter(v=>v.side===u.side&&alive(v)&&v.id!==u.id);
 const enemies=foes.sort((a,z)=>{
  const score=(v           )=>distance(u,v)*(def.cavalry?(TYPES[v.type].range>50?.55:v.type==='spears'&&v.cohesion>.55?2.8:1):1);
  return score(a)-score(z);
 });
 const target=enemies[0],toward=u.side==='rome'?1:-1;
 const melee=friends.filter(v=>!TYPES[v.type].cavalry&&TYPES[v.type].range<50);
 const front=melee.sort((a,z)=>target?distance(a,target)-distance(z,target):toward*(z.x-a.x))[0];
 const move=(p      ,facing       )      =>({kind:'move',x:Math.max(35,Math.min(b.map.width-35,p.x)),y:Math.max(45,Math.min(b.map.height-45,p.y)),facing});
 if(target){
  if(def.range>50&&front&&contactGap(u,target)>8){
   const angle=Math.atan2(target.y-front.y,target.x-front.x),back=Math.min(150,def.range*.68),anchor={x:front.x-Math.cos(angle)*back,y:front.y-Math.sin(angle)*back};
   if(!blocked(anchor,b.map,20)&&distance(u,target)<def.range*.48)return move(anchor,angle);
   if(!blocked(anchor,b.map,20)&&distance(u,target)>def.range*.9&&distance(u,anchor)>40)return move(anchor,angle);
  }
  if(def.cavalry&&distance(u,target)>80&&attackDirection(u,target)==='front'){
   const options=[-1,1].map(sign=>({x:target.x-Math.cos(target.angle)*85-Math.sin(target.angle)*sign*180,y:target.y-Math.sin(target.angle)*85+Math.cos(target.angle)*sign*180})).filter(p=>!blocked(p,b.map,20)&&p.x>35&&p.x<b.map.width-35&&p.y>45&&p.y<b.map.height-45).sort((a,z)=>distance(u,a)-distance(u,z));
   if(options[0]){u.pace='run';return move(options[0],Math.atan2(target.y-options[0].y,target.x-options[0].x));}
  }
  return {kind:'attack',target:target.id};
 }
 if(def.range>50&&front){const anchor={x:front.x-toward*120,y:front.y};if(!blocked(anchor,b.map,20))return move(anchor,u.side==='rome'?0:Math.PI);}
 const own=b.units.filter(v=>v.side===u.side&&alive(v)),index=own.findIndex(v=>v.id===u.id),offset=(index-(own.length-1)/2)*80;
 const anchor={x:b.objective.x,y:b.objective.y+offset};
 if(blocked(anchor,b.map,20))return move(b.objective,u.side==='rome'?0:Math.PI);
 return move(anchor,u.side==='rome'?0:Math.PI);
}
