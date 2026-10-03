"""Build continuous land roads. Run from repository root with roads-input.json.
Requires Shapely; generated geometry is shipped, no GIS dependency in the game.
"""
import json, math, heapq
from pathlib import Path
from shapely.geometry import Polygon, LineString, Point
from shapely.ops import unary_union, nearest_points
from shapely.prepared import prep
raw=json.loads(Path('roads-input.json').read_text())
root=Path(__file__).resolve().parents[1]
land=unary_union([Polygon([(p['x'],p['y']) for p in r]).buffer(0) for r in raw['LAND']]); dry=prep(land)
interior=prep(land.buffer(-5)); mountains=prep(unary_union([Polygon([(p['x'],p['y']) for p in r]) for r in raw['MOUNTAINS']])); forests=prep(unary_union([Polygon([(p['x'],p['y']) for p in r]) for r in raw['FOREST_REGIONS']]))
cities={c['id']:(c['x'],c['y']) for c in raw['INITIAL_CITIES']}
def geo(lon,lat):return ((lon+18)*44,(69-lat)*60)
# Corridors follow coasts, river valleys and named passes. These shape the game network,
# not a claim that every road already existed in the campaign's historical period.
corridors={
 ('felsina','massalia'):[(10.32,44.8),(9.62,44.78),(8.9,44.55),(8.1,44.15),(7.25,43.9),(6.35,43.65)],
 ('massalia','lugdunum'):[(4.7,43.7),(4.7,44.25),(4.8,44.9),(4.85,45.4)],
 ('lugdunum','lutetia'):[(4.6,46.15),(4.0,46.8),(3.5,47.3),(3.2,48.1)],
 ('lutetia','gesoriacum'):[(2.25,49.3),(2.15,49.9),(1.9,50.3)],
 ('massalia','tarraco'):[(4.4,43.5),(3.4,43.45),(2.8,43.1),(2.8,42.5),(2.6,42.0),(2.0,41.5)],
 ('tarraco','saguntum'):[(.9,40.9),(.5,40.5),(.15,40.2)],
 ('saguntum','toletum'):[(-.9,39.7),(-1.6,39.6),(-2.4,39.9),(-3.2,39.9)],
 ('toletum','gades'):[(-4.4,39.1),(-4.6,38.5),(-4.8,37.9),(-5.5,37.4),(-6.0,37.1)],
 ('tingis','cirta'):[(-5.6,35.2),(-4.8,34.5),(-3.0,34.4),(-1.8,34.85),(-.4,35.4),(1.4,36.1),(3.1,36.5),(4.5,36.4)],
 ('cirta','carthage'):[(7.4,36.4),(8.2,36.6),(9.2,36.75)],
 ('carthage','leptis'):[(10.5,36.2),(10.7,35.5),(10.4,34.5),(10.2,33.8),(11.4,33.3),(12.5,32.7),(13.2,32.65)],
 ('leptis','cyrene'):[(15.1,32.25),(15.8,31.4),(16.65,31.0),(17.65,30.75),(18.7,30.8),(19.6,31.2),(20.4,32.0)],
 ('cyrene','alexandria'):[(22.6,32.65),(23.5,32.15),(24.5,31.8),(25.5,31.4),(26.8,31.25),(28.0,31.05),(29.0,30.95)],
 ('alexandria','memphis'):[(30.2,30.85),(30.7,30.45),(31.1,30.1)],
 ('apollonia','thessalonica'):[(20.05,40.8),(20.65,40.6),(21.25,40.7),(22.1,40.8)],
 ('thessalonica','athens'):[(22.5,40.0),(22.4,39.55),(22.9,39.1),(23.2,38.5)],
 ('athens','sparta'):[(23.3,38.05),(22.8,37.95),(22.4,37.7),(22.4,37.35)],
 ('thessalonica','byzantium'):[(23.7,40.8),(24.5,41.05),(25.4,41.15),(26.5,41.4),(27.5,41.2)],
 ('ephesus','ancyra'):[(28.25,38.3),(29.3,38.7),(30.4,39.3),(31.6,39.6)],
 ('ancyra','antioch'):[(33.25,39.0),(34.0,38.4),(34.8,37.6),(35.4,37.0)],
 ('antioch','tyre'):[(36.3,35.6),(36.05,35.0),(35.85,34.45),(35.55,33.85)],
 ('londinium','ratae'):[(-.45,51.8),(-.85,52.15)],
 ('ratae','eboracum'):[(-1.3,53.0),(-1.25,53.5)],
 ('lutetia','colonia'):[(3.2,49.3),(4.2,49.7),(5.2,50.2),(6.0,50.55)],
 ('colonia','vindobona'):[(7.4,50.5),(8.1,50.05),(9.5,49.5),(11.0,49.0),(12.1,48.65),(13.6,48.55),(15.1,48.4)],
 ('felsina','vindobona'):[(11.0,45.4),(11.2,46.3),(11.6,47.0),(12.8,47.35),(14.2,47.5),(15.25,47.85)],
 ('vindobona','thessalonica'):[(16.9,47.7),(17.6,47.05),(18.6,46.1),(19.5,45.1),(20.6,44.2),(21.7,43.4),(21.75,42.6),(21.65,41.8),(22.5,41.15)]}
size=5
point=lambda i:(i[0]*size,i[1]*size)
cell_cache={};edge_cache={}
def cell(i):
 if i not in cell_cache:
  p=Point(point(i))
  cell_cache[i]=None if not dry.covers(p) else (1+(12 if mountains.covers(p) else 0)+(.2 if forests.covers(p) else 0)+(2 if not interior.covers(p) else 0))
 return cell_cache[i]
def segment(a,b):return dry.covers(LineString([a,b]))
def edge(a,b):
 k=tuple(sorted((a,b)))
 if k not in edge_cache:edge_cache[k]=segment(point(a),point(b))
 return edge_cache[k]
def snap(p):
 if dry.covers(Point(p)):return p
 q=nearest_points(land.buffer(-1.2),Point(p))[0];return(q.x,q.y)
def anchor(p):
 x,y=round(p[0]/size),round(p[1]/size);options=[]
 for dx in range(-4,5):
  for dy in range(-4,5):
   i=x+dx,y+dy
   if cell(i) is not None and segment(p,point(i)):options.append((math.dist(p,point(i)),i))
 if not options:raise RuntimeError(f'No land anchor for {p}')
 return min(options)[1]
def route(a,b):
 first,last=anchor(a),anchor(b);queue=[(math.dist(point(first),point(last)),0,first)];scores={first:0};came={};closed=set()
 while queue:
  _,cost,current=heapq.heappop(queue)
  if current in closed:continue
  if current==last:
   path=[b,point(last)];i=last
   while i!=first:i=came[i];path.append(point(i))
   return [a]+list(reversed(path))
  closed.add(current)
  for dx,dy in [(-1,0),(1,0),(0,-1),(0,1),(-1,-1),(1,-1),(-1,1),(1,1)]:
   nxt=current[0]+dx,current[1]+dy;v=cell(nxt)
   if nxt in closed or v is None or not edge(current,nxt):continue
   proposed=cost+math.hypot(dx,dy)*size*(cell(current)+v)/2
   if proposed<scores.get(nxt,math.inf):scores[nxt]=proposed;came[nxt]=current;heapq.heappush(queue,(proposed+math.dist(point(nxt),point(last)),proposed,nxt))
 raise RuntimeError(f'No land route: {a} -> {b}')
def simplify(path):
 # Preserve geographic bends; never replace a coastal arc by a chord over water.
 candidate=list(LineString(path).simplify(2.2).coords)
 if all(segment(a,b) for a,b in zip(candidate,candidate[1:])):path=candidate
 # Round grid corners only when the complete replacement remains on land.
 result=[path[0]]
 for a,b,c in zip(path,path[1:],path[2:]):
  q=(b[0]*.8+a[0]*.2,b[1]*.8+a[1]*.2);r=(b[0]*.8+c[0]*.2,b[1]*.8+c[1]*.2)
  if segment(result[-1],q) and segment(q,r) and segment(r,c):result.extend([q,r])
  else:result.append(b)
 result.append(path[-1]);return result
roads=[]
# Italy already has intermediate settlements/waypoints. Retain those as exact anchors.
italian_waypoints=[["rome","narnia",[12.55,43.05],[12.72,43.5],"ariminum"],["ariminum",[12.1,44.2],[11.7,44.37],"felsina"],["rome",[13.0,41.7],[13.7,41.42],"capua","neapolis"],["narnia","perusia","arretium",[11.25,43.9],[11.32,44.15],"felsina"],["ariminum",[12.9,43.83],"ancona"],["capua",[14.75,41.2],"venusia",[16.5,40.7],"tarentum","brundisium"]]
for number,r in enumerate(italian_waypoints):
 waypoints=[cities[p] if isinstance(p,str) else geo(*p) for p in r];path=[]
 for a,b in zip(waypoints,waypoints[1:]):part=simplify(route(a,b));path.extend(part if not path else part[1:])
 roads.append({'id':f'italy-{number}','points':path})
for (a,b),via in corridors.items():
 waypoints=[cities[a]]+[snap(geo(*p)) for p in via]+[cities[b]];path=[]
 for start,end in zip(waypoints,waypoints[1:]):part=simplify(route(start,end));path.extend(part if not path else part[1:])
 roads.append({'id':a+'-'+b,'points':path})
 print(a,b,len(path),flush=True)
# Store six decimals so coastline validation is retained when serialised.
for road in roads:
 road['points']=[{'x':round(x,6),'y':round(y,6)} for x,y in road['points']]
 for a,b in zip(road['points'],road['points'][1:]):
  if not land.buffer(.00001).covers(LineString([(a['x'],a['y']),(b['x'],b['y'])])):raise RuntimeError('Road crosses water after serialization')
content="import type { Point } from './data.ts';\nexport const ROAD_NETWORK:{id:string;points:Point[]}[]="+json.dumps(roads,separators=(',',':'))+";\nexport const LAND_ROADS:Point[][]=ROAD_NETWORK.map(r=>r.points);\n"
(root/'src/road-network.ts').write_text(content)
print('Generated',len(roads),'continuous roads,',sum(len(r['points']) for r in roads),'vertices')
