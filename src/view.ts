import Phaser from 'phaser';
import { fitZoom, cameraCenter, zoomAnchor } from './camera.ts';
import { LAND, ITALY, MOUNTAINS, ROADS, TYPES, WORLD_FORESTS, RIVERS, project } from './data.ts';
import type { Point } from './data.ts';
import type { Campaign } from './campaign.ts';
import { distance, inPolygon } from './campaign.ts';
import type { Battle, BattleUnit } from './battle.ts';
import type { BattleMap } from './terrain.ts';
import { BIOME_NAMES, RELIEF_NAMES, heightAt, mapForest, contourLines } from './terrain.ts';
export interface ViewState { campaign:Campaign; battle:Battle|null; selectedUnit:string|null; selectedCity:string|null;inspectedUnit:string|null;showOrders:boolean;showNames:boolean }
const ROMAN=0xa94436,ENEMY=0x426d86;
export class MapScene extends Phaser.Scene {
  graphics!: Phaser.GameObjects.Graphics;
  labels:Phaser.GameObjects.Text[]=[];
  labelIndex=0;
  elapsedRender=0;
  cachedMap:BattleMap|null=null;
  contours:Point[][]=[];
  cameraWorld={width:1000,height:650};
  cameraPosition:Point={x:500,y:325};
  cameraZoom=1;
  cameraBattle:Battle|null=null;
  gesture:{kind:'pan'|'order';screen:Point;world:Point;center:Point;shift:boolean;end?:Point}|null=null;
  state:()=>ViewState;
  onPoint:(p:Point,shift:boolean,right:boolean,facing?:number)=>void;
  onTick:(delta:number)=>void;
  constructor(state:()=>ViewState,onPoint:(p:Point,shift:boolean,right:boolean,facing?:number)=>void,onTick:(delta:number)=>void){super('map');this.state=state;this.onPoint=onPoint;this.onTick=onTick;}
  create(){
    this.graphics=this.add.graphics();
    this.scale.on('resize',()=>this.overview());
    this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{
      const world=this.cameras.main.getWorldPoint(p.x,p.y);
      if(p.middleButtonDown()||p.event.altKey){this.gesture={kind:'pan',screen:{x:p.x,y:p.y},world,center:{...this.cameraPosition},shift:false};return;}
      if(p.rightButtonDown()){this.gesture={kind:'order',screen:{x:p.x,y:p.y},world,center:{...this.cameraPosition},shift:p.event.shiftKey};return;}
      this.onPoint(world,p.event.shiftKey,false);
    });
    this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{
      if(this.gesture?.kind==='order')this.gesture.end=this.cameras.main.getWorldPoint(p.x,p.y);
      if(this.gesture?.kind==='pan'){this.cameraPosition={x:this.gesture.center.x-(p.x-this.gesture.screen.x)/this.cameraZoom,y:this.gesture.center.y-(p.y-this.gesture.screen.y)/this.cameraZoom};this.applyCamera();}
    });
    this.input.on('pointerup',(p:Phaser.Input.Pointer)=>{
      const gesture=this.gesture;this.gesture=null;if(gesture?.kind!=='order')return;
      const end=this.cameras.main.getWorldPoint(p.x,p.y),drag=Math.hypot(p.x-gesture.screen.x,p.y-gesture.screen.y)>8;
      this.onPoint(gesture.world,gesture.shift,true,drag?Math.atan2(end.y-gesture.world.y,end.x-gesture.world.x):undefined);
    });
    this.input.on('pointerupoutside',()=>{this.gesture=null;});
    this.input.on('wheel',(p:Phaser.Input.Pointer,_objects:unknown,_dx:number,dy:number)=>this.zoomBy(dy>0?.85:1.18,this.cameras.main.getWorldPoint(p.x,p.y)));
    this.overview();this.draw();
  }
  applyCamera(){
    const cam=this.cameras.main;
    this.cameraPosition=cameraCenter(this.cameraPosition,this.cameraZoom,cam.width,cam.height,this.cameraWorld.width,this.cameraWorld.height);
    cam.setZoom(this.cameraZoom);cam.centerOn(this.cameraPosition.x,this.cameraPosition.y);
  }
  overview(){
    if(!this.cameras?.main)return;
    const b=this.state().battle;this.cameraWorld=b?{width:b.map.width,height:b.map.height}:{width:1000,height:650};
    const cam=this.cameras.main;this.cameraZoom=fitZoom(cam.width,cam.height,this.cameraWorld.width,this.cameraWorld.height);
    this.cameraPosition={x:this.cameraWorld.width/2,y:this.cameraWorld.height/2};this.applyCamera();
  }
  zoomBy(factor:number,anchor:Point=this.cameraPosition){
    const cam=this.cameras.main,fit=fitZoom(cam.width,cam.height,this.cameraWorld.width,this.cameraWorld.height),next=Math.max(fit,Math.min(fit*6,this.cameraZoom*factor));
    this.cameraPosition=zoomAnchor(this.cameraPosition,anchor,this.cameraZoom,next);this.cameraZoom=next;this.applyCamera();
  }
  focus(point?:Point){
    const s=this.state(),units=s.battle?.units.filter(u=>u.side==='rome'&&u.men>=1)??[];
    const target=point??(units.length?{x:units.reduce((n,u)=>n+u.x,0)/units.length,y:units.reduce((n,u)=>n+u.y,0)/units.length}:s.campaign.position);
    const cam=this.cameras.main,fit=fitZoom(cam.width,cam.height,this.cameraWorld.width,this.cameraWorld.height);
    this.cameraZoom=Math.max(this.cameraZoom,fit*2.3);this.cameraPosition=target;this.applyCamera();
  }
  update(_time:number,delta:number){this.onTick(Math.min(delta/1000,.25));this.elapsedRender+=delta;if(this.elapsedRender>70){this.elapsedRender=0;this.draw();}}
  label(x:number,y:number,text:string,size=13,color='#4a5446',align='center'){
    let label=this.labels[this.labelIndex];
    if(!label){label=this.add.text(x,y,text,{fontFamily:'Arial',fontSize:size,color,align});this.labels.push(label);}
    label.setPosition(x,y).setText(text).setStyle({fontSize:size,color,align}).setOrigin(align==='left'?0:align==='right'?1:.5,.5).setVisible(true);this.labelIndex++;
  }
  poly(points:Point[],fill:number,line?:number){const g=this.graphics;g.fillStyle(fill);g.fillPoints(points,true);if(line){g.lineStyle(2,line);g.strokePoints(points,true);}}
  line(points:Point[],color:number,width=2,alpha=1){if(!points.length)return;const g=this.graphics;g.lineStyle(width,color,alpha);g.beginPath();g.moveTo(points[0].x,points[0].y);points.slice(1).forEach(p=>g.lineTo(p.x,p.y));g.strokePath();}
  draw(){const s=this.state(),g=this.graphics;if(this.cameraBattle!==s.battle){this.cameraBattle=s.battle;this.overview();}g.clear();this.labelIndex=0;if(s.battle)this.battleMap(s.battle,s.selectedUnit,s.inspectedUnit,s.showOrders,s.showNames);else this.campaignMap(s.campaign,s.selectedCity);for(let i=this.labelIndex;i<this.labels.length;i++)this.labels[i].setVisible(false);}
  campaignMap(c:Campaign,selectedCity:string|null){
    const g=this.graphics;g.fillStyle(0x9cbec1);g.fillRect(0,0,1000,650);
    g.lineStyle(1,0xffffff,.12);for(let x=0;x<=1000;x+=50)g.lineBetween(x,0,x,650);for(let y=0;y<=650;y+=50)g.lineBetween(0,y,1000,y);
    LAND.forEach(p=>this.poly(p,0xd1d0b6,0xa7b29a));
    ITALY.forEach(p=>this.poly(p,0xece0be,0x8d9e80));
    WORLD_FORESTS.forEach(f=>{g.fillStyle(0x9cb18b,.45);g.fillEllipse(f.x,f.y,f.rx*2,f.ry*2);for(let x=f.x-f.rx;x<f.x+f.rx;x+=12)for(let y=f.y-f.ry;y<f.y+f.ry;y+=14)if(((x-f.x)/f.rx)**2+((y-f.y)/f.ry)**2<1){g.fillStyle(0x759564,.5);g.fillTriangle(x,y-4,x-3,y+3,x+3,y+3);}});
    MOUNTAINS.forEach(p=>{
      this.poly(p,0xbdb593);
      for(let x=170;x<740;x+=15)for(let y=35;y<620;y+=17)if(inPolygon({x,y},p)){this.poly([{x:x-6,y:y+5},{x,y:y-7},{x:x+6,y:y+5}],0x928d74);this.line([{x:x-3,y:y-1},{x,y:y-7},{x:x+3,y:y-1}],0xf5f0de,1);}
    });
    RIVERS.forEach(r=>this.line(r,0x6e9fa4,2));
    for(const road of ROADS){this.line(road,0xae966e,5);this.line(road,0xf5e8be,2);}
    this.label(230,66,'АЛЬПЫ',16,'#73765b');this.label(360,112,'ЦИЗАЛЬПИНСКАЯ ГАЛЛИЯ',11,'#858265');
    this.label(600,246,'АДРИАТИЧЕСКОЕ\nМОРЕ',18,'#436d78');this.label(358,440,'ТИРРЕНСКОЕ\nМОРЕ',18,'#436d78');
    this.label(252,319,'КОРСИКА',11,'#6b7760');this.label(238,450,'САРДИНИЯ',11,'#6b7760');
    this.label(490,590,'СИЦИЛИЯ',14,'#6b7760');this.label(790,508,'ИОНИЧЕСКОЕ МОРЕ',15,'#527e88');
    this.label(870,200,'БАЛКАНЫ',17,'#78765b');
    for(const city of c.cities){
      if(city.id===selectedCity){g.lineStyle(2,0xcaa85c);g.strokeCircle(city.x,city.y,20);}
      g.fillStyle(city.owner==='rome'?ROMAN:ENEMY);g.fillCircle(city.x,city.y,9);g.lineStyle(2,0xfff8df);g.strokeCircle(city.x,city.y,9);
      const offsets:Record<string,[number,number]>={rome:[-18,5],felsina:[-15,-3],arretium:[-15,-7],perusia:[-15,5],narnia:[15,5],capua:[-15,-7],neapolis:[-15,9],tarentum:[-15,12],brundisium:[16,-8]};
      const [dx,dy]=offsets[city.id]??[15,0];
      this.label(city.x+dx,city.y+dy,city.name,city.id===selectedCity?14:12,'#293d37',dx<0?'right':'left');
    }
    if(c.route.length){this.line([c.position,...c.route],ROMAN,2,.6);const last=c.route[c.route.length-1];g.lineStyle(2,ROMAN);g.strokeCircle(last.x,last.y,7);}
    if(c.enemy.length){const p=c.enemyPosition;g.fillStyle(ENEMY);g.fillTriangle(p.x-13,p.y-30,p.x+13,p.y-30,p.x,p.y-13);this.label(p.x,p.y-46,`БОЙИ · ${c.enemy.length} ОТР.`,12,'#345c75');}
    if(c.army.length){const p=c.position;g.fillStyle(0xfff5d4);g.fillCircle(p.x,p.y,16);g.fillStyle(ROMAN);g.fillTriangle(p.x,p.y-12,p.x-10,p.y+8,p.x+10,p.y+8);this.label(p.x,p.y+28,`АРМИЯ · ${c.army.length}`,10,'#933d31');}
    this.label(22,622,'СЕКТОР I · ИТАЛИЯ · БЕРЕГОВАЯ ЛИНИЯ NATURAL EARTH',10,'#456566','left');
    this.label(930,35,'СЕВЕР ↑',12,'#456566');
  }
  battleMap(b:Battle,selected:string|null,inspected:string|null,showOrders:boolean,showNames:boolean){
    const map=b.map,w=map.width,h=map.height,g=this.graphics;g.fillStyle(0xe2dbc1);g.fillRect(0,0,w,h);
    g.lineStyle(1,0xb5b195,.25);for(let x=0;x<=w;x+=40)g.lineBetween(x,0,x,h);for(let y=0;y<=h;y+=40)g.lineBetween(0,y,w,y);

    for(let x=0;x<w;x+=40)for(let y=0;y<h;y+=40){const height=heightAt({x:x+20,y:y+20},map);g.fillStyle(0x8f7957,Math.min(.36,height*.095));g.fillRect(x,y,40,40);}
    if(this.cachedMap!==map){this.cachedMap=map;this.contours=contourLines(map);}
    for(const line of this.contours)this.line(line,0x8b8061,1,.55);
    for(const f of map.forests){g.fillStyle(0x91aa80,.22);g.fillEllipse(f.x,f.y,f.rx*2,f.ry*2);}
    for(let x=32;x<w-20;x+=40)for(let y=50;y<h-30;y+=45)if(mapForest({x,y},map)){g.fillStyle(0x628658,.68);g.fillTriangle(x,y-8,x-6,y+5,x+6,y+5);g.lineStyle(1,0x556b44,.5);g.lineBetween(x,y+4,x,y+9);}
    for(const road of map.roads){this.line(road,0xbfa979,map.biome==='city'?42:30,.6);this.line(road,0xe3d2a2,map.biome==='city'?34:20,.8);}
    if(map.biome==='city'){g.fillStyle(0xe7d8b3);g.fillRect(1123,677,158,233);this.label(w/2,h/2,'ПЛОЩАДЬ',9,'#8a7e62');this.label(w/2,100,map.townName.toUpperCase(),15,'#8a7057');}
    for(const o of map.obstacles){
      if(o.kind==='building'){g.fillStyle(0x74634d,.2);g.fillRect(o.x+5,o.y+5,o.w,o.h);g.fillStyle(0xc8ad84);g.fillRect(o.x,o.y,o.w,o.h);g.lineStyle(1,0x8c7759);g.strokeRect(o.x,o.y,o.w,o.h);g.fillStyle(0xa87656);g.fillRect(o.x+4,o.y+4,o.w-8,o.h-8);this.line([{x:o.x+o.w/2,y:o.y+5},{x:o.x+o.w/2,y:o.y+o.h-5}],0xd8af7a,2);}
      else {g.fillStyle(0x827d69);g.fillRoundedRect(o.x,o.y,o.w,o.h,18);g.lineStyle(2,0x686859);g.strokeRoundedRect(o.x,o.y,o.w,o.h,18);for(let y=o.y+30;y<o.y+o.h-15;y+=45)this.line([{x:o.x+15,y:y+10},{x:o.x+o.w/2,y:y-12},{x:o.x+o.w-12,y:y+8}],0xb7b199,2);}
    }
    this.label(w/2,h-35,`${BIOME_NAMES[map.biome].toUpperCase()} · ${RELIEF_NAMES[map.relief.kind].toUpperCase()} · SEED ${map.seed}`,10,'#7d7964');
    this.label(40,40,'РИМ',15,'#9c4638','left');this.label(w-40,40,'БОЙИ',15,'#40677b');
    if(b.phase==='deployment'){g.fillStyle(0x5c955b,.12);g.fillRect(40,50,560,h-110);g.lineStyle(3,0x5c955b,.65);g.strokeRect(40,50,560,h-110);this.label(320,85,'ЗОНА РАССТАНОВКИ',18,'#496e46');}
    for(const shot of b.shots)this.line([shot.from,shot.to],shot.side==='rome'?ROMAN:ENEMY,1.5,.7);
    // Draw every friendly command underneath units; enemy intentions remain hidden.
    for(const u of b.units)if(u.men>=1&&!u.routed&&u.side==='rome'&&(showOrders||u.id===selected))this.order(b,u,u.id===selected);
    const active=b.units.find(u=>u.id===selected);
    if(active&&TYPES[active.type].range>50){g.lineStyle(1.5,ROMAN,.35);g.strokeCircle(active.x,active.y,TYPES[active.type].range);}
    if(this.gesture?.kind==='order'&&this.gesture.end){this.arrow([this.gesture.world,this.gesture.end],0x9b7b30,3,.9);g.lineStyle(2,0x9b7b30);g.strokeCircle(this.gesture.world.x,this.gesture.world.y,30);}
    for(const u of b.units)if(u.men>=1)this.unit(u,u.id===selected,u.id===inspected&&u.side==='boii',showNames);
  }
  arrow(points:Point[],color:number,width:number,alpha:number){
    this.line(points,color,width,alpha);if(points.length<2)return;
    const end=points[points.length-1],prev=points[points.length-2],angle=Math.atan2(end.y-prev.y,end.x-prev.x);
    this.line([{x:end.x-12*Math.cos(angle-.5),y:end.y-12*Math.sin(angle-.5)},end,{x:end.x-12*Math.cos(angle+.5),y:end.y-12*Math.sin(angle+.5)}],color,width,alpha);
  }
  order(b:Battle,u:BattleUnit,selected:boolean){
    const g=this.graphics,alpha=selected?.95:.45,width=selected?2.5:1.5;
    if(u.order.kind==='hold'){g.lineStyle(width,ROMAN,alpha);g.strokeCircle(u.x,u.y,29);return;}
    if(u.order.kind==='move'){
      const path=u.nav?.length?[u,...u.nav,u.order]:[u,u.order];this.arrow(path,0x5c7852,width,alpha);
      g.lineStyle(width,0x5c7852,alpha);g.strokeCircle(u.order.x,u.order.y,8);
      if(u.order.facing!==undefined)this.arrow([{x:u.order.x,y:u.order.y},{x:u.order.x+Math.cos(u.order.facing)*55,y:u.order.y+Math.sin(u.order.facing)*55}],0x5c7852,2,alpha);
    }else{const target=b.units.find(v=>v.id===(u.order as {target:string}).target);if(target){this.arrow([u,target],ROMAN,width,alpha);g.lineStyle(width,ROMAN,alpha);g.strokeCircle(target.x,target.y,32);}}

  }
  unit(u:BattleUnit,selected:boolean,inspected:boolean,showNames:boolean){
    const g=this.graphics,def=TYPES[u.type],color=u.side==='rome'?ROMAN:ENEMY;
    const rect=[{x:-13,y:-25},{x:13,y:-25},{x:13,y:25},{x:-13,y:25}].map(p=>({x:u.x+p.x*Math.cos(u.angle)-p.y*Math.sin(u.angle),y:u.y+p.x*Math.sin(u.angle)+p.y*Math.cos(u.angle)}));
    if(selected){g.lineStyle(2,0xfaf3cf);g.strokeCircle(u.x,u.y,38);g.lineStyle(2,0x9b7b30);g.strokeCircle(u.x,u.y,40);}
    if(inspected){g.lineStyle(2,ENEMY);g.strokeCircle(u.x,u.y,40);}
    g.fillStyle(u.routed?0x938a7a:color,u.routed?.45:1);g.fillPoints(rect,true);g.lineStyle(1,0x332f26,.5);g.strokePoints(rect,true);
    this.line([{x:u.x,y:u.y},{x:u.x+Math.cos(u.angle)*33,y:u.y+Math.sin(u.angle)*33}],0xf6edda,2);
    this.label(u.x,u.y,def.icon,10,'#fff8e3');this.label(u.x,u.y+25,`${Math.ceil(u.men)}${u.routed?' · БЕГУТ':''}`,11,u.routed?'#76634f':'#403e31');
    g.fillStyle(0x504d3d,.35);g.fillRect(u.x-24,u.y-25,48,4);g.fillStyle(u.morale>45?0x5f8359:u.morale>20?0xb39644:0xa94436);g.fillRect(u.x-24,u.y-25,48*u.morale/100,4);
    if(showNames)this.label(Math.max(65,Math.min(this.cameraWorld.width-65,u.x)),u.y+38,def.short,10,u.side==='rome'?'#87382d':'#345e75');
  }
}
