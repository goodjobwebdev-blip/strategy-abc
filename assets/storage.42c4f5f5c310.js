                                              
                                          
import { TYPES, INITIAL_CITIES } from './data.42c4f5f5c310.js';
                                              
                                                                         
const KEY='strategy-abc-mvp-v5';
const finite=(x        )=>typeof x==='number'&&Number.isFinite(x);
const point=(p    ,maxX=1000,maxY=650)=>p&&finite(p.x)&&finite(p.y)&&p.x>=0&&p.x<=maxX&&p.y>=0&&p.y<=maxY;
const troop=(u    )=>u&&typeof u.id==='string'&&Object.hasOwn(TYPES,u.type)&&finite(u.men)&&u.men>=0&&u.men<=100&&(u.experience===undefined||(finite(u.experience)&&u.experience>=0&&u.experience<=10));
function coreValid(s    )         {
  const c=s?.campaign;
  if(s?.schema!==5||!c||typeof c.enemyTarget!=='string'||c.version!==1||!finite(c.day)||c.day<1||!finite(c.gold)||c.gold<0||!finite(c.movement)||c.movement<0||!finite(c.serial)||typeof c.won!=='boolean'||!point(c.position)||!point(c.enemyPosition))return false;
  if(!Array.isArray(c.army)||c.army.length>16||!c.army.every(troop)||!Array.isArray(c.enemy)||!c.enemy.every(troop)||!Array.isArray(c.route)||!c.route.every((p    )=>point(p))||!Array.isArray(c.notices)||!c.notices.every((v        )=>typeof v==='string'))return false;
  if(!Array.isArray(c.cities)||c.cities.length!==INITIAL_CITIES.length||!c.cities.every((v    )=>INITIAL_CITIES.map(x=>x.id).includes(v.id)&&typeof v.name==='string'&&typeof v.latin==='string'&&point(v)&&['rome','boii'].includes(v.owner)&&Array.isArray(v.garrison)&&v.garrison.length<=8&&v.garrison.every(troop)))return false;
  if(new Set(c.cities.map((v    )=>v.id)).size!==c.cities.length)return false;
  if(s.battle!==null){
    const b=s.battle;
    if(!validMap(b?.map))return false;
    if(!b||!['annihilation','square','pass','escort','retreat'].includes(b.mission)||!point(b.objective,b.map.width,b.map.height)||!finite(b.objective.progress)||!finite(b.objective.enemyProgress)||!finite(b.objective.hp)||!finite(b.objective.escaped)||!finite(b.elapsed)||b.elapsed<0||!['rome','boii','draw',null].includes(b.winner)||typeof b.reason!=='string'||typeof b.training!=='boolean'||typeof b.aiRome!=='boolean'||!['deployment','combat'].includes(b.phase)||!Array.isArray(b.units)||b.units.length>32||!Array.isArray(b.logs)||!b.logs.every((v        )=>typeof v==='string')||!Array.isArray(b.shots))return false;
    if(!b.units.every((u    )=>troop(u)&&Array.isArray(u.queue)&&u.queue.length<=24&&u.queue.every((o    )=>o&&((o.kind==='hold')||(o.kind==='attack'&&typeof o.target==='string')||(o.kind==='move'&&point(o,b.map.width,b.map.height)&&(o.facing===undefined||finite(o.facing)))))&&['line','loose','deep'].includes(u.formation)&&['walk','run'].includes(u.pace)&&typeof u.fireAtWill==='boolean'&&typeof u.escaped==='boolean'&&finite(u.reform)&&point(u,b.map.width,b.map.height)&&['rome','boii'].includes(u.side)&&finite(u.initialMen)&&u.initialMen>0&&finite(u.morale)&&finite(u.fatigue)&&finite(u.cohesion)&&finite(u.angle)&&finite(u.charge)&&finite(u.chargeCooldown)&&finite(u.lastShot)&&typeof u.routed==='boolean'&&u.order&&(['hold'].includes(u.order.kind)||(u.order.kind==='move'&&point(u.order,b.map.width,b.map.height)&&(u.order.facing===undefined||finite(u.order.facing)))||(u.order.kind==='attack'&&typeof u.order.target==='string'))))return false;
    if(!b.shots.every((v    )=>point(v.from,b.map.width,b.map.height)&&point(v.to,b.map.width,b.map.height)&&finite(v.ttl)&&['rome','boii'].includes(v.side)))return false;
  }
  return true;
}
export function validMap(m    )               {
 if(!m||m.version!==3||m.width!==2400||m.height!==1600||!['plain','forest','mountain','city'].includes(m.biome)||!Number.isInteger(m.seed)||m.seed<0||m.seed>4294967295||typeof m.townName!=='string')return false;
 const r=m.relief;
 if(!r||!['slope','valley','ridge','rolling'].includes(r.kind)||!finite(r.angle)||Math.abs(r.angle)>Math.PI*2||!finite(r.amplitude)||r.amplitude<0||r.amplitude>4||!finite(r.offset)||Math.abs(r.offset)>100||!finite(r.phase)||Math.abs(r.phase)>Math.PI*2)return false;
 const ellipse=(e    )=>point(e,m.width,m.height)&&finite(e.rx)&&finite(e.ry)&&e.rx>0&&e.ry>0&&e.rx<1200&&e.ry<1200;
 return Array.isArray(m.forests)&&m.forests.length<=100&&m.forests.every(ellipse)&&Array.isArray(m.obstacles)&&m.obstacles.length<=80&&m.obstacles.every((o    )=>point(o,m.width,m.height)&&finite(o.w)&&finite(o.h)&&o.w>0&&o.h>0&&o.w<m.width&&o.h<m.height&&['building','rock'].includes(o.kind))&&Array.isArray(m.roads)&&m.roads.length<=10&&m.roads.every((r    )=>Array.isArray(r)&&r.length<=30&&r.every((p    )=>point(p,m.width,m.height)));
}
export function validSave(s    )          {return coreValid(s);}
export function readSave()           {try{const data=localStorage.getItem(KEY);const parsed=data?JSON.parse(data):null;return validSave(parsed)?parsed:null;}catch{return null;}}
export function writeSave(campaign         ,battle            )         {try{localStorage.setItem(KEY,JSON.stringify({schema:5,campaign,battle}));return true;}catch{return false;}}
