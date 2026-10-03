                                          
import { alive } from './battle.js';
import { TYPES } from './data.js';
                                       
import { distance } from './campaign.js';
import { blocked, battlePath } from './terrain.js';

// Inspection never changes the current command or gives control of enemy troops.
export function battleClick(b       ,selectedId            ,p      ,shift=false,right=false,facing        ){
  const hit=b.units.filter(u=>u.men>=1&&distance(u,p)<30).sort((a,z)=>distance(a,p)-distance(z,p))[0];
  const selected=b.units.find(u=>u.id===selectedId&&u.side==='rome');
  const result={selected:selectedId,inspected:null               ,error:'',changed:false};
  if(!right&&hit){result.inspected=hit.id;if(hit.side==='rome')result.selected=hit.id;return result;}
  if(!selected||!alive(selected)){result.error='Выбери боеспособный римский отряд.';return result;}
  if(shift){selected.angle=facing??Math.atan2(p.y-selected.y,p.x-selected.x);selected.order={kind:'hold'};result.changed=true;return result;}
  if(b.phase==='deployment'){
    if(p.x<45||p.x>600||p.y<50||p.y>b.map.height-60){result.error='Расставляй свои отряды в зелёной зоне слева.';return result;}
    if(blocked(p,b.map,30)||b.units.some(u=>u.id!==selected.id&&u.men>=1&&distance(u,p)<60)){result.error='Недостаточно места: выбери свободный участок.';return result;}
    selected.x=p.x;selected.y=p.y;selected.angle=facing??selected.angle;selected.order={kind:'hold'};selected.nav=[];result.changed=true;return result;
  }
  if(right&&hit?.side==='boii'&&alive(hit)){selected.order={kind:'attack',target:hit.id};result.changed=true;return result;}
  const goal={x:Math.max(30,Math.min(b.map.width-30,p.x)),y:Math.max(35,Math.min(b.map.height-40,p.y))};
  const path=blocked(goal,b.map)?null:battlePath(selected,goal,b.map);
  if(!path){result.error='Нет прохода: выбери улицу, поляну или горный перевал.';return result;}
  selected.order={kind:'move',...goal,...(facing===undefined?{}:{facing})};selected.nav=path;selected.navGoal=goal;result.changed=true;return result;
}
export function orderText(b       ,u                        ){
  if(u.men<1)return 'Отряд уничтожен';
  if(u.routed)return 'Бегство';
  if(u.order.kind==='hold')return 'Удерживает позицию';
  if(u.order.kind==='move')return 'Движение к точке';
  const target=b.units.find(v=>v.id===(u.order                   ).target);
  return target?'Атака: '+TYPES[target.type].short:'Атака';
}
