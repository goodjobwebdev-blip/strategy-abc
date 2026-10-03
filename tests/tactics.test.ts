import test from 'node:test';
import assert from 'node:assert/strict';
import { trainingBattle } from '../src/battle.ts';
import { battleClick } from '../src/controls.ts';
import { generateMap, heightAt, contourLines, clearLine } from '../src/terrain.ts';
import { validMap } from '../src/storage.ts';

test('enemy inspection preserves friendly selection and existing orders',()=>{
  const b=trainingBattle(),own=b.units[0],enemy=b.units[8];
  own.order={kind:'move',x:450,y:325};
  const before=structuredClone(b.units.map(u=>u.order));
  const result=battleClick(b,own.id,enemy);
  assert.equal(result.selected,own.id);assert.equal(result.inspected,enemy.id);
  assert.deepEqual(b.units.map(u=>u.order),before);
  assert.equal(battleClick(b,null,enemy).selected,null);
});
test('right click attacks enemies; enemy troops cannot receive player commands',()=>{
  const b=trainingBattle(),own=b.units[0],enemy=b.units[8];
  assert.equal(battleClick(b,own.id,enemy,false,true).changed,true);
  assert.deepEqual(own.order,{kind:'attack',target:enemy.id});
  const before=structuredClone(enemy.order);
  assert.ok(battleClick(b,enemy.id,{x:500,y:325},false,true).error);
  assert.deepEqual(enemy.order,before);
});
test('move orders show the obstacle-aware path immediately and reject buildings',()=>{
  const b=trainingBattle('city',42),own=b.units[2];
  const result=battleClick(b,own.id,{x:800,y:own.y},false,true);
  assert.equal(result.changed,true);assert.ok(own.nav?.length);
  let prev=own;for(const p of own.nav!){assert.ok(clearLine(prev,p,b.map,8));prev=p as typeof own;}
  const obstacle=b.map.obstacles[0],before=structuredClone(own.order);
  assert.ok(battleClick(b,own.id,{x:obstacle.x+20,y:obstacle.y+20},false,true).error);
  assert.deepEqual(own.order,before);
});
test('shift right click changes facing and holds the selected friendly unit',()=>{
  const b=trainingBattle(),own=b.units[0];
  battleClick(b,own.id,{x:own.x,y:own.y+80},true,true);
  assert.equal(own.angle,Math.PI/2);assert.equal(own.order.kind,'hold');
});
test('slopes have a higher end; valleys have high sides and a low center',()=>{
  const m=generateMap('mountain',42);
  m.relief={kind:'slope',angle:0,amplitude:3,offset:0,phase:0};
  assert.ok(heightAt({x:950,y:325},m)-heightAt({x:50,y:325},m)>2.5);
  m.relief.kind='valley';
  const center=heightAt({x:500,y:325},m);
  assert.ok(heightAt({x:500,y:30},m)>center+2);assert.ok(heightAt({x:500,y:620},m)>center+2);
  m.relief.kind='ridge';assert.ok(heightAt({x:500,y:325},m)>heightAt({x:500,y:30},m)+2);
});
test('height fields and isolines are finite, continuous, and reject malformed relief',()=>{
  for(const biome of ['plain','forest','mountain','city'] as const){
    const map=generateMap(biome,1337);assert.ok(validMap(map));
    for(let x=0;x<=1000;x+=40)for(let y=0;y<=650;y+=40){const h=heightAt({x,y},map);assert.ok(Number.isFinite(h)&&h>=0&&h<=4.1);assert.ok(Math.abs(h-heightAt({x:x+.1,y},map))<.005);}
    const lines=contourLines(map);assert.ok(lines.length);for(const line of lines)for(const p of line)assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1000&&p.y>=0&&p.y<=650);
    map.relief.amplitude=Infinity;assert.equal(validMap(map),false);
  }
});
test('exact visibility catches a short diagonal crossing an expanded building corner',()=>{
  const m=generateMap('city',42);m.obstacles=[{x:316.25,y:208.65,w:55,h:56,kind:'building'}];
  assert.equal(clearLine({x:300,y:210},{x:320,y:190},m,8),false);
  assert.equal(clearLine({x:300,y:190},{x:320,y:190},m,8),true);
});
