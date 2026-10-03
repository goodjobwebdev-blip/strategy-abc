                                                             
import { alive, visibleEnemies, FORMATIONS } from './battle.7462b6a68309.js';
import { TYPES } from './data.7462b6a68309.js';
                                       
import { distance } from './campaign.7462b6a68309.js';
import { blocked, battlePath } from './terrain.7462b6a68309.js';

export function issueOrder(u           ,order      ,append=false){
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
    if(p.x<45||p.x>600||p.y<50||p.y>b.map.height-60){result.error='Расставляй свои отряды в зелёной зоне слева.';return result;}
    if(blocked(p,b.map,30)||b.units.some(u=>u.id!==selected.id&&u.men>=1&&distance(u,p)<60)){result.error='Недостаточно места: выбери свободный участок.';return result;}
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
// Slots form a line perpendicular to the requested front; the group keeps spacing.
export function groupSlots(b       ,ids         ,p      ,facing=0){
  const units=ids.map(id=>b.units.find(u=>u.id===id)).filter((u)                =>!!u&&u.side==='rome'&&alive(u));
  const gap=Math.max(80,...units.map(u=>FORMATIONS[u.formation].width+16));
  return units.map((u,i)=>({u,p:{x:p.x-Math.sin(facing)*(i-(units.length-1)/2)*gap,y:p.y+Math.cos(facing)*(i-(units.length-1)/2)*gap}}));
}
export function groupOrder(b       ,ids         ,p      ,append=false,facing        ){
  const visible=visibleEnemies(b),enemy=b.units.find(u=>u.side==='boii'&&alive(u)&&visible.has(u.id)&&distance(u,p)<30);
  const units=ids.map(id=>b.units.find(u=>u.id===id)).filter((u)                =>!!u&&alive(u)&&u.side==='rome');
  if(enemy&&b.phase==='combat'){units.forEach(u=>issueOrder(u,{kind:'attack',target:enemy.id},append));return '';}
  const center=units.length?{x:units.reduce((n,u)=>n+u.x,0)/units.length,y:units.reduce((n,u)=>n+u.y,0)/units.length}:p;
  const angle=facing??Math.atan2(p.y-center.y,p.x-center.x),slots=groupSlots(b,ids,p,angle);
  // Validate the complete placement before mutating any unit.
  for(const slot of slots){
    if(blocked(slot.p,b.map,30)||slot.p.x<30||slot.p.x>b.map.width-30||slot.p.y<35||slot.p.y>b.map.height-60)return 'Для группы здесь недостаточно места.';
    if(b.phase==='deployment'&&(slot.p.x<45||slot.p.x>600||b.units.some(v=>!ids.includes(v.id)&&v.men>=1&&distance(v,slot.p)<60)))return 'Группа должна поместиться в свободной части зелёной зоны.';
    const last=append?[slot.u.order,...slot.u.queue].filter(o=>o.kind==='move').at(-1):undefined;
    if(b.phase==='combat'&&!battlePath(last?.kind==='move'?last:slot.u,slot.p,b.map))return 'Не все отряды могут пройти к этой точке.';
    if(append&&slot.u.queue.length>=24)return 'Очередь заполнена.';
  }
  for(const {u,p:goal} of slots){if(b.phase==='deployment'){u.x=goal.x;u.y=goal.y;u.angle=angle;issueOrder(u,{kind:'hold'});}else issueOrder(u,{kind:'move',...goal,facing:angle},append);}
  return '';
}
export function orderText(b       ,u           ){
  if(u.men<1)return 'Отряд уничтожен';if(u.escaped)return 'Вышел из боя';if(u.routed)return 'Бегство';
  const text=u.order.kind==='hold'?'Удерживает позицию':u.order.kind==='move'?'Движение к точке':'Атака: '+(TYPES[b.units.find(v=>u.order.kind==='attack'&&v.id===u.order.target)?.type??u.type].short);
  return text+(u.queue.length?` · в очереди: ${u.queue.length}`:'');
}
