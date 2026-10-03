import Phaser from 'phaser';
import { LAND, MOUNTAINS, ROADS, TYPES, BATTLE_FORESTS, BATTLE_HILL } from './data.ts';
import type { Point } from './data.ts';
import type { Campaign } from './campaign.ts';
import { distance, inPolygon } from './campaign.ts';
import type { Battle, BattleUnit } from './battle.ts';
export interface ViewState { campaign:Campaign; battle:Battle|null; selectedUnit:string|null; selectedCity:string|null }
const ROMAN=0xa94436,ENEMY=0x426d86;
export class MapScene extends Phaser.Scene {
  graphics!: Phaser.GameObjects.Graphics;
  labels:Phaser.GameObjects.Text[]=[];
  labelIndex=0;
  elapsedRender=0;
  state:()=>ViewState;
  onPoint:(p:Point,shift:boolean)=>void;
  onTick:(delta:number)=>void;
  constructor(state:()=>ViewState,onPoint:(p:Point,shift:boolean)=>void,onTick:(delta:number)=>void){super('map');this.state=state;this.onPoint=onPoint;this.onTick=onTick;}
  create(){this.graphics=this.add.graphics();this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>this.onPoint({x:p.x,y:p.y},p.event.shiftKey));this.draw();}
  update(_time:number,delta:number){this.onTick(Math.min(delta/1000,.25));this.elapsedRender+=delta;if(this.elapsedRender>70){this.elapsedRender=0;this.draw();}}
  label(x:number,y:number,text:string,size=13,color='#4a5446',align='center'){
    let label=this.labels[this.labelIndex];
    if(!label){label=this.add.text(x,y,text,{fontFamily:'Arial',fontSize:size,color,align});this.labels.push(label);}
    label.setPosition(x,y).setText(text).setStyle({fontSize:size,color,align}).setOrigin(align==='left'?0:.5,.5).setVisible(true);this.labelIndex++;
  }
  poly(points:Point[],fill:number,line?:number){const g=this.graphics;g.fillStyle(fill);g.fillPoints(points,true);if(line){g.lineStyle(2,line);g.strokePoints(points,true);}}
  line(points:Point[],color:number,width=2,alpha=1){if(!points.length)return;const g=this.graphics;g.lineStyle(width,color,alpha);g.beginPath();g.moveTo(points[0].x,points[0].y);points.slice(1).forEach(p=>g.lineTo(p.x,p.y));g.strokePath();}
  draw(){const s=this.state(),g=this.graphics;g.clear();this.labelIndex=0;if(s.battle)this.battleMap(s.battle,s.selectedUnit);else this.campaignMap(s.campaign,s.selectedCity);for(let i=this.labelIndex;i<this.labels.length;i++)this.labels[i].setVisible(false);}
  campaignMap(c:Campaign,selectedCity:string|null){
    const g=this.graphics;g.fillStyle(0x9cbec1);g.fillRect(0,0,1000,650);
    g.lineStyle(1,0xffffff,.12);for(let x=0;x<=1000;x+=50)g.lineBetween(x,0,x,650);for(let y=0;y<=650;y+=50)g.lineBetween(0,y,1000,y);
    LAND.forEach(p=>this.poly(p,0xe3dac0,0xabb89b));
    MOUNTAINS.forEach(p=>{
      this.poly(p,0xc1b795);
      for(let x=330;x<620;x+=24)for(let y=100;y<480;y+=24)if(inPolygon({x,y},p)){this.poly([{x:x-9,y:y+7},{x,y:y-9},{x:x+9,y:y+7}],0x9e977b);this.line([{x:x-4,y:y-1},{x,y:y-9},{x:x+4,y:y-1}],0xf5f0de,2);}
    });
    for(const road of ROADS){this.line(road,0xaa8d61,8);this.line(road,0xf3e5c4,4);}
    this.label(190,200,'ГАЛЛИЯ',20,'#78765b');this.label(476,60,'АЛЬПЫ',14,'#78765b');
    this.label(698,243,'АДРИАТИЧЕСКОЕ\nМОРЕ',19,'#436d78');this.label(456,467,'ТИРРЕНСКОЕ\nМОРЕ',18,'#436d78');
    this.label(263,418,'СРЕДИЗЕМНОЕ МОРЕ',24,'#527e88');this.label(392,596,'КАРФАГЕН · АФРИКА',17,'#78765b');this.label(930,301,'ГРЕЦИЯ',18,'#78765b');
    for(const city of c.cities){
      if(city.id===selectedCity){g.lineStyle(2,0xcaa85c);g.strokeCircle(city.x,city.y,20);}
      g.fillStyle(city.owner==='rome'?ROMAN:ENEMY);g.fillCircle(city.x,city.y,9);g.lineStyle(2,0xfff8df);g.strokeCircle(city.x,city.y,9);
      this.label(city.x+16,city.y-5,city.name,16,'#293d37','left');
      this.label(city.x+16,city.y+13,city.latin+(city.garrison.length?` · ${city.garrison.length} отр.`:''),10,'#786e58','left');
    }
    if(c.route.length){this.line([c.position,...c.route],ROMAN,2,.6);const last=c.route[c.route.length-1];g.lineStyle(2,ROMAN);g.strokeCircle(last.x,last.y,7);}
    if(c.enemy.length){const p=c.enemyPosition;g.fillStyle(ENEMY);g.fillTriangle(p.x-13,p.y-30,p.x+13,p.y-30,p.x,p.y-13);this.label(p.x,p.y-46,`БОЙИ · ${c.enemy.length} ОТР.`,12,'#345c75');}
    if(c.army.length){const p=c.position;g.fillStyle(0xfff5d4);g.fillCircle(p.x,p.y,16);g.fillStyle(ROMAN);g.fillTriangle(p.x,p.y-12,p.x-10,p.y+8,p.x+10,p.y+8);this.label(p.x,p.y+30,`ВАША АРМИЯ · ${c.army.length}`,12,'#933d31');}
    this.label(22,622,'СХЕМАТИЧНАЯ КАРТА · III ВЕК ДО Н. Э.',11,'#456566','left');
    this.label(930,35,'СЕВЕР ↑',12,'#456566');
  }
  battleMap(b:Battle,selected:string|null){
    const g=this.graphics;g.fillStyle(0xe2dbc1);g.fillRect(0,0,1000,650);
    g.lineStyle(1,0xb5b195,.25);for(let x=0;x<=1000;x+=40)g.lineBetween(x,0,x,650);for(let y=0;y<=650;y+=40)g.lineBetween(0,y,1000,y);
    const hill=BATTLE_HILL;g.fillStyle(0xc7c9a1,.35);g.fillEllipse(hill.x,hill.y,hill.rx*2,hill.ry*2);g.lineStyle(2,0xa7ae86,.8);for(const scale of [1,.75,.5])g.strokeEllipse(hill.x,hill.y,hill.rx*2*scale,hill.ry*2*scale);
    this.label(hill.x,hill.y,'ХОЛМ',12,'#7e855d');
    for(const f of BATTLE_FORESTS){g.fillStyle(0xa5b396,.65);g.fillRoundedRect(f.x,f.y,f.w,f.h,20);for(let x=f.x+20;x<f.x+f.w;x+=28)for(let y=f.y+24;y<f.y+f.h;y+=34){g.fillStyle(0x718d68,.5);g.fillTriangle(x,y-9,x-7,y+5,x+7,y+5);}this.label(f.x+f.w/2,f.y+f.h/2,'ЛЕС',12,'#425d41');}
    this.label(26,24,'РИМ',15,'#9c4638','left');this.label(974,24,'БОЙИ',15,'#40677b');
    for(const shot of b.shots)this.line([shot.from,shot.to],shot.side==='rome'?ROMAN:ENEMY,1.5,.7);
    for(const u of b.units)if(u.men>=1)this.unit(u,u.id===selected);
  }
  unit(u:BattleUnit,selected:boolean){
    const g=this.graphics,def=TYPES[u.type],color=u.side==='rome'?ROMAN:ENEMY;
    const rect=[{x:-13,y:-25},{x:13,y:-25},{x:13,y:25},{x:-13,y:25}].map(p=>({x:u.x+p.x*Math.cos(u.angle)-p.y*Math.sin(u.angle),y:u.y+p.x*Math.sin(u.angle)+p.y*Math.cos(u.angle)}));
    if(selected){g.lineStyle(2,0xfaf3cf);g.strokeCircle(u.x,u.y,38);g.lineStyle(2,0x9b7b30);g.strokeCircle(u.x,u.y,40);}
    g.fillStyle(u.routed?0x938a7a:color,u.routed?.45:1);g.fillPoints(rect,true);g.lineStyle(1,0x332f26,.5);g.strokePoints(rect,true);
    this.line([{x:u.x,y:u.y},{x:u.x+Math.cos(u.angle)*33,y:u.y+Math.sin(u.angle)*33}],0xf6edda,2);
    this.label(u.x,u.y,def.icon,10,'#fff8e3');this.label(u.x,u.y+25,`${Math.ceil(u.men)}${u.routed?' · БЕГУТ':''}`,11,u.routed?'#76634f':'#403e31');
    g.fillStyle(0x504d3d,.35);g.fillRect(u.x-24,u.y-25,48,4);g.fillStyle(u.morale>45?0x5f8359:u.morale>20?0xb39644:0xa94436);g.fillRect(u.x-24,u.y-25,48*u.morale/100,4);
    if(selected&&u.order.kind==='move'){this.line([u,u.order],color,1,.8);g.lineStyle(2,color);g.strokeCircle(u.order.x,u.order.y,7);}
    if(selected&&u.order.kind==='attack'){const target=this.state().battle?.units.find(v=>v.id===(u.order as {target:string}).target);if(target){this.line([u,target],color,1,.7);g.lineStyle(2,color);g.strokeCircle(target.x,target.y,32);}}
  }
}
