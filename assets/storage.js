                                              
                                          
import { TYPES } from './data.js';
                                                                         
const KEY='strategy-abc-mvp-v1';
const finite=(x        )=>typeof x==='number'&&Number.isFinite(x);
const point=(p    )=>p&&finite(p.x)&&finite(p.y)&&p.x>=0&&p.x<=1000&&p.y>=0&&p.y<=650;
const troop=(u    )=>u&&typeof u.id==='string'&&Object.hasOwn(TYPES,u.type)&&finite(u.men)&&u.men>=0&&u.men<=100;
export function validSave(s    )           {
  const c=s?.campaign;
  if(s?.schema!==1||!c||c.version!==1||!finite(c.day)||c.day<1||!finite(c.gold)||c.gold<0||!finite(c.movement)||c.movement<0||!finite(c.serial)||typeof c.won!=='boolean'||!point(c.position)||!point(c.enemyPosition))return false;
  if(!Array.isArray(c.army)||c.army.length>16||!c.army.every(troop)||!Array.isArray(c.enemy)||!c.enemy.every(troop)||!Array.isArray(c.route)||!c.route.every(point)||!Array.isArray(c.notices)||!c.notices.every((v        )=>typeof v==='string'))return false;
  if(!Array.isArray(c.cities)||c.cities.length!==4||!c.cities.every((v    )=>['rome','capua','ariminum','felsina'].includes(v.id)&&typeof v.name==='string'&&typeof v.latin==='string'&&point(v)&&['rome','boii'].includes(v.owner)&&Array.isArray(v.garrison)&&v.garrison.length<=8&&v.garrison.every(troop)))return false;
  if(s.battle!==null){
    const b=s.battle;
    if(!b||!finite(b.elapsed)||b.elapsed<0||!['rome','boii','draw',null].includes(b.winner)||typeof b.reason!=='string'||typeof b.training!=='boolean'||typeof b.aiRome!=='boolean'||!Array.isArray(b.units)||b.units.length>32||!Array.isArray(b.logs)||!b.logs.every((v        )=>typeof v==='string')||!Array.isArray(b.shots))return false;
    if(!b.units.every((u    )=>troop(u)&&point(u)&&['rome','boii'].includes(u.side)&&finite(u.initialMen)&&u.initialMen>0&&finite(u.morale)&&finite(u.fatigue)&&finite(u.cohesion)&&finite(u.angle)&&finite(u.charge)&&finite(u.chargeCooldown)&&finite(u.lastShot)&&typeof u.routed==='boolean'&&u.order&&(['hold'].includes(u.order.kind)||(u.order.kind==='move'&&point(u.order))||(u.order.kind==='attack'&&typeof u.order.target==='string'))))return false;
    if(!b.shots.every((v    )=>point(v.from)&&point(v.to)&&finite(v.ttl)&&['rome','boii'].includes(v.side)))return false;
  }
  return true;
}
export function readSave()           {try{const data=localStorage.getItem(KEY);if(!data)return null;const save=JSON.parse(data);return validSave(save)?save:null;}catch{return null;}}
export function writeSave(campaign         ,battle            )         {try{localStorage.setItem(KEY,JSON.stringify({schema:1,campaign,battle}));return true;}catch{return false;}}
