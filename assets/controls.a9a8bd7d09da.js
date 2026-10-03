                                                             
import { alive, visibleEnemies, contactGap } from './battle.a9a8bd7d09da.js';
import { TYPES } from './data.a9a8bd7d09da.js';
                                       
import { distance } from './campaign.a9a8bd7d09da.js';
import { blocked, battlePath } from './terrain.a9a8bd7d09da.js';

export function issueOrder(u           ,order      ,append=false){
  if(order.kind==='attack'&&TYPES[u.type].cavalry)u.pace='run';
  if(append&&u.order.kind!=='hold'){if(u.queue.length>=24)return false;u.queue.push(order);}
  else {u.order=order;u.queue=[];u.nav=[];u.navGoal=undefined;}
  return true;
}
export function battleClick(b       ,selectedId            ,p      ,shift=false,right=false,facing        ){
  const visible=visibleEnemies(b);
  const hit=b.units.filter(u=>u.men>=1&&!u.escaped&&(u.side==='rome'||visible.has(u.id))&&distance(u,p)<30).sort((a,z)=>distance(a,p)-distance(z,p))[0];
  const selected=b.units.find(u=>u.id===selectedId&&u.side==='rome');
  const result={selected:selectedId,inspected:null               ,error:'',changed:false};
  if(!right&&hit){result.inspected=hit.id;if(hit.side==='rome')result.selected=hit.id;return result;}
  if(!selected||!alive(selected)){result.error='Выбери боеспособный римский отряд.';return result;}
  if(b.phase==='deployment'){
    if(p.x<(b.mission==='retreat'?400:45)||p.x>600||p.y<50||p.y>b.map.height-60){result.error='Расставляй свои отряды в зелёной зоне слева.';return result;}
    if(blocked(p,b.map,30)||b.units.some(u=>u.id!==selected.id&&u.men>=1&&contactGap({...selected,...p,angle:facing??selected.angle},u)<2)){result.error='Недостаточно места: выбери свободный участок.';return result;}
    selected.x=p.x;selected.y=p.y;selected.angle=facing??selected.angle;issueOrder(selected,{kind:'hold'});result.changed=true;return result;
  }
  if(right&&hit?.side==='boii'&&alive(hit)){result.changed=issueOrder(selected,{kind:'attack',target:hit.id},shift);return result;}
  const goal={x:Math.max(30,Math.min(b.map.width-30,p.x)),y:Math.max(35,Math.min(b.map.height-40,p.y))};
  const last=shift?[selected.order,...selected.queue].filter(o=>o.kind==='move').at(-1):undefined;
  const start=last?.kind==='move'?last:selected;
  const path=blocked(goal,b.map,8)?null:battlePath(start,goal,b.map);
  if(!path){result.error='Нет прохода: выбери улицу, поляну или горный перевал.';return result;}
  result.changed=issueOrder(selected,{kind:'move',...goal,...(facing===undefined?{}:{facing})},shift);
  if(!result.changed)result.error='Очередь заполнена: максимум 24 приказа.';
  if(result.changed&&selected.queue.length===0){selected.nav=path;selected.navGoal=goal;}return result;
}
// Translate the player's formation; explicit facing rotates it as a whole.
export function groupSlots(b       ,ids         ,p      ,facing        ,append=false){
 const units=ids.map(id=>b.units.find(u=>u.id===id)).filter((u)                =>!!u&&u.side==='rome'&&alive(u));
 const refs=units.map(u=>{const last=append?[u.order,...u.queue].filter(o=>o.kind==='move').at(-1):undefined;return {u,point:last?.kind==='move'?last:u,angle:last?.kind==='move'?(last.facing??u.angle):u.angle};});
 const n=refs.length||1,center={x:refs.reduce((v,r)=>v+r.point.x,0)/n,y:refs.reduce((v,r)=>v+r.point.y,0)/n};
 const front=Math.atan2(refs.reduce((v,r)=>v+Math.sin(r.angle),0),refs.reduce((v,r)=>v+Math.cos(r.angle),0));
 const turn=facing===undefined?0:facing-front;
 return refs.map(({u,point,angle})=>{const dx=point.x-center.x,dy=point.y-center.y;return {u,p:{x:p.x+dx*Math.cos(turn)-dy*Math.sin(turn),y:p.y+dx*Math.sin(turn)+dy*Math.cos(turn)},facing:angle+turn};});
}
export function groupOrder(b       ,ids         ,p      ,append=false,facing        ){
  const visible=visibleEnemies(b),enemy=b.units.find(u=>u.side==='boii'&&alive(u)&&visible.has(u.id)&&distance(u,p)<30);
  const units=ids.map(id=>b.units.find(u=>u.id===id)).filter((u)                =>!!u&&alive(u)&&u.side==='rome');
  if(enemy&&b.phase==='combat'){units.forEach(u=>issueOrder(u,{kind:'attack',target:enemy.id},append));return '';}
  const slots=groupSlots(b,ids,p,facing,append);
  if(b.phase==='deployment')for(let i=0;i<slots.length;i++)for(let j=i+1;j<slots.length;j++)if(contactGap({...slots[i].u,...slots[i].p,angle:slots[i].facing},{...slots[j].u,...slots[j].p,angle:slots[j].facing})<2)return 'Отряды группы пересекаются.';
  // Validate the complete placement before mutating any unit.
  for(const slot of slots){
    if(blocked(slot.p,b.map,30)||slot.p.x<30||slot.p.x>b.map.width-30||slot.p.y<35||slot.p.y>b.map.height-60)return 'Для группы здесь недостаточно места.';
    if(b.phase==='deployment'&&(slot.p.x<(b.mission==='retreat'?400:45)||slot.p.x>600||b.units.some(v=>!ids.includes(v.id)&&v.men>=1&&contactGap({...slot.u,...slot.p,angle:slot.facing},v)<2)))return 'Группа должна поместиться в свободной части зелёной зоны.';
    const last=append?[slot.u.order,...slot.u.queue].filter(o=>o.kind==='move').at(-1):undefined;
    if(b.phase==='combat'&&!battlePath(last?.kind==='move'?last:slot.u,slot.p,b.map))return 'Не все отряды могут пройти к этой точке.';
    if(append&&slot.u.queue.length>=24)return 'Очередь заполнена.';
  }
  for(const {u,p:goal,facing:angle} of slots){if(b.phase==='deployment'){u.x=goal.x;u.y=goal.y;u.angle=angle;issueOrder(u,{kind:'hold'});}else issueOrder(u,{kind:'move',...goal,facing:angle},append);}
  return '';
}
export function orderText(b       ,u           ){
  if(u.men<1)return 'Отряд уничтожен';if(u.escaped)return 'Вышел из боя';if(u.routed)return 'Бегство';
  const text=u.order.kind==='hold'?'Удерживает позицию':u.order.kind==='move'?'Движение к точке':u.order.kind==='guard'?'Прикрывает союзный отряд':'Атака: '+(TYPES[b.units.find(v=>u.order.kind==='attack'&&v.id===u.order.target)?.type??u.type].short);
  return text+(u.queue.length?` · в очереди: ${u.queue.length}`:'');
}
