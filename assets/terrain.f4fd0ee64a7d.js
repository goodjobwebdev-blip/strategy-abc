import { INITIAL_CITIES, WORLD_FORESTS, MOUNTAINS, unproject } from './data.f4fd0ee64a7d.js';
                                       
import { distance, inPolygon, segmentDistance } from './campaign.f4fd0ee64a7d.js';
                                                       
export const BIOME_NAMES                     ={plain:'Равнина',forest:'Лес',mountain:'Горы',city:'Город'};
                                                              
                                                                                    
                                                          
export const RELIEF_NAMES                          ={slope:'Склон',valley:'Долина',ridge:'Гряда',rolling:'Волнистая равнина'};
                                                                                                    
                                                                                                                                                                                
export function randomFromSeed(seed       ){let n=seed>>>0;return()=>{n+=0x6d2b79f5;let t=n;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
export function inEllipse(p      ,e        ){return ((p.x-e.x)/e.rx)**2+((p.y-e.y)/e.ry)**2<1;}
export function mapForest(p      ,map          ){
  if(map.roads.some(r=>r.slice(1).some((q,i)=>segmentDistance(p,r[i],q)<22)))return false;
  return map.forests.some(e=>inEllipse(p,e));
}
export function heightAt(p      ,map          ){
  p={x:p.x*1000/map.width,y:p.y*650/map.height};
  const r=map.relief,c=Math.cos(r.angle),s=Math.sin(r.angle);
  const along=(p.x-500)*c+(p.y-325)*s;
  const span=Math.abs(c)*500+Math.abs(s)*325;
  if(r.kind==='slope')return .1+r.amplitude*(along/span+1)/2;
  const across=-(p.x-500)*s+(p.y-325)*c;
  const width=Math.abs(s)*500+Math.abs(c)*325;
  const bend=45*Math.sin(along/240+r.phase)+r.offset;
  const t=Math.min(1,Math.abs(across-bend)/width);
  if(r.kind==='valley')return .1+r.amplitude*t*t;
  if(r.kind==='ridge')return .1+r.amplitude*Math.exp(-3.2*t*t);
  return .1+r.amplitude*(.5+.25*Math.sin(along/210+r.phase)+.25*Math.sin(across/170+r.phase*.7));
}
// Isolines come from one continuous height field, rather than independent hill rings.
export function contourLines(map          ,spacing=.35,step=40)          {
  const lines          =[];
  for(let x=0;x<map.width;x+=step)for(let y=0;y<map.height;y+=step){
    const corners=[{x,y},{x:x+step,y},{x:x+step,y:Math.min(map.height,y+step)},{x,y:Math.min(map.height,y+step)}];
    const heights=corners.map(p=>heightAt(p,map)),low=Math.min(...heights),high=Math.max(...heights);
    for(let level=Math.ceil(low/spacing)*spacing;level<high;level+=spacing){
      const hits        =[];
      for(let i=0;i<4;i++){const j=(i+1)%4,a=heights[i],b=heights[j];if((a<level)===(b<level))continue;
        const t=(level-a)/(b-a);hits.push({x:corners[i].x+(corners[j].x-corners[i].x)*t,y:corners[i].y+(corners[j].y-corners[i].y)*t});}
      if(hits.length===2)lines.push(hits);
      // Resolve rare saddle cells using their center, without crossed contour segments.
      if(hits.length===4){if(heightAt({x:x+step/2,y:y+step/2},map)>=level)lines.push([hits[0],hits[1]],[hits[2],hits[3]]);else lines.push([hits[0],hits[3]],[hits[1],hits[2]]);}
    }
  }return lines;
}
export function blocked(p      ,map          ,margin=8){return p.x<15||p.x>map.width-15||p.y<20||p.y>map.height-30||map.obstacles.some(o=>p.x>o.x-margin&&p.x<o.x+o.w+margin&&p.y>o.y-margin&&p.y<o.y+o.h+margin);}
export function clearLine(a      ,b      ,map          ,margin=0){
  if(blocked(a,map,margin)||blocked(b,map,margin))return false;
  // Exact segment/rectangle intersection: sampled rays could miss thin corners.
  return !map.obstacles.some(o=>{
    let lo=0,hi=1;
    for(const [origin,delta,min,max] of [[a.x,b.x-a.x,o.x-margin,o.x+o.w+margin],[a.y,b.y-a.y,o.y-margin,o.y+o.h+margin]]){
      if(Math.abs(delta)<1e-9){if(origin<min||origin>max)return false;}
      else {const t1=(min-origin)/delta,t2=(max-origin)/delta;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));if(lo>hi)return false;}
    }return lo<=hi;
  });
}
export function generateMap(biome      ,seed       ,townName='Поселение')          {
  const rand=randomFromSeed(seed),range=(min       ,max       )=>min+rand()*(max-min);
  const kind           =biome==='mountain'?(rand()<.5?'valley':'ridge'):biome==='city'?'slope':biome==='forest'?(['slope','valley','ridge']                )[Math.floor(rand()*3)]:rand()<.5?'slope':'rolling';
  const relief       ={kind,angle:biome==='mountain'?range(-.12,.12):range(0,Math.PI*2),amplitude:biome==='mountain'?range(2.6,3.5):biome==='forest'?range(1,1.8):biome==='city'?.35:range(.35,.7),offset:range(-40,40),phase:range(0,Math.PI*2)};
  const map          ={version:3,width:2400,height:1600,relief,biome,seed:seed>>>0,townName,forests:[],obstacles:[],roads:[]};
  const road=[{x:15,y:325},{x:290,y:325},{x:500,y:325},{x:710,y:325},{x:985,y:325}];
  if(biome==='forest'){
    map.roads=[road.map((p,i)=>({...p,y:i===0||i===4?325:325+range(-28,28)}))];
    for(let i=0;i<32;i++)map.forests.push({x:range(70,940),y:range(55,600),rx:range(65,125),ry:range(55,115)});
  }else if(biome==='mountain'){
    map.roads=[[{x:15,y:325}]];
    for(const x of [270,470,670]){
      const gap=range(95,140),center=range(280,370),w=range(65,100);
      map.obstacles.push({x,y:20,w,h:center-gap/2-20,kind:'rock'},{x,y:center+gap/2,w,h:620-center-gap/2,kind:'rock'});
      map.roads[0].push({x:x+w/2,y:center});
    }
    map.roads[0].push({x:985,y:325});
    for(let i=0;i<5;i++)map.forests.push({x:range(200,800),y:range(60,600),rx:range(35,65),ry:range(30,60)});
  }else if(biome==='city'){
    map.roads=[road,[{x:500,y:30},{x:500,y:620}]];
    for(const x of [315,405,555,645])for(const y of [105,205,385,485]){
      map.obstacles.push({x:x+range(-5,5),y:y+range(-5,5),w:range(48,64),h:range(52,70),kind:'building'});
    }
    map.forests=[{x:250,y:115,rx:50,ry:45},{x:750,y:530,rx:55,ry:48}];
  }else{
    for(let i=0;i<3;i++)map.forests.push({x:range(300,740),y:i%2?range(500,580):range(60,115),rx:range(35,65),ry:range(25,45)});
  }
  const sx=map.width/1000,sy=map.height/650;
  map.forests=map.forests.map(f=>({...f,x:f.x*sx,y:f.y*sy,rx:f.rx*sx,ry:f.ry*sy}));
  map.obstacles=map.obstacles.map(o=>({...o,x:o.x*sx,y:o.y*sy,w:o.w*sx,h:o.h*sy}));
  map.roads=map.roads.map(r=>r.map(p=>({x:p.x*sx,y:p.y*sy})));
  return map;
}
export function encounterMap(location      ,day       )          {
  const city=INITIAL_CITIES.find(c=>distance(location,c)<28);
  const biome      =city?'city':WORLD_FORESTS.some(e=>inEllipse(location,e))?'forest':MOUNTAINS.some(p=>inPolygon(location,p))?'mountain':'plain';
  const geo=unproject(location),seed=(Math.round(geo.lon*100)*73856093^Math.round(geo.lat*100)*19349663^day*83492791)>>>0;
  return generateMap(biome,seed,city?.name??'');
}
export function battlePath(start      ,goal      ,map          )             {
  if(blocked(goal,map))return null;if(clearLine(start,goal,map,8))return [goal];
  const cell=40,cols=Math.floor((map.width-40)/cell)+1,rows=Math.floor((map.height-60)/cell)+1,point=(i       )=>({x:20+(i%cols)*cell,y:30+Math.floor(i/cols)*cell});
  const index=(p      )=>Math.max(0,Math.min(rows-1,Math.round((p.y-30)/cell)))*cols+Math.max(0,Math.min(cols-1,Math.round((p.x-20)/cell)));
  const nearest=(p      )=>{let best=-1,min=Infinity;for(let i=0;i<cols*rows;i++){const q=point(i),d=distance(p,q);if(d<min&&!blocked(q,map)&&clearLine(p,q,map,8)){min=d;best=i;}}return best;};
  let first=index(start),last=index(goal);
  if(blocked(point(first),map)||!clearLine(start,point(first),map,8))first=nearest(start);
  if(blocked(point(last),map)||!clearLine(point(last),goal,map,8))last=nearest(goal);
  if(first<0||last<0)return null;
  const open=new Set([first]),closed=new Set        (),came=new Map               (),cost=new Map([[first,0]]);
  while(open.size){let id=-1,min=Infinity;for(const n of open){const f=cost.get(n) +distance(point(n),point(last));if(f<min){min=f;id=n;}}
    if(id===last){const result=[goal];while(id!==first){result.push(point(id));id=came.get(id) ;}result.push(point(first));return result.reverse();}
    open.delete(id);closed.add(id);const p=point(id);
    for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]){
      const x=id%cols+dx,y=Math.floor(id/cols)+dy;if(x<0||x>=cols||y<0||y>=rows)continue;const n=y*cols+x,q=point(n);
      if(closed.has(n)||!clearLine(p,q,map,8))continue;const value=cost.get(id) +distance(p,q);
      if(value<(cost.get(n)??Infinity)){cost.set(n,value);came.set(n,id);open.add(n);}
    }
  }return null;
}
