import json
from pathlib import Path
from shapely.geometry import Polygon,LineString,Point
from shapely.ops import unary_union,nearest_points,triangulate
raw=json.loads(Path('world-input.json').read_text());land=unary_union([Polygon([(p['x'],p['y']) for p in ring]).buffer(0) for ring in raw['LAND']]);mountain=unary_union([Polygon([(p['x'],p['y']) for p in ring]).buffer(0) for ring in raw['MOUNTAINS']]).intersection(land)
def project(p):return ((p[0]+18)*44,(69-p[1])*60)
regions=[[[7,49],[9,48.7],[11.5,49.8],[13,51.2],[11,53.5],[8,53],[6.7,51.1]],[[16,50],[20,49.8],[24,51.7],[25,54.5],[21,55.5],[17,53.8]],[[7,58],[9,59],[11,61],[14,61.2],[17,64.8],[20,65],[22,62],[20,59],[16,57],[12,57.4]],[[20,44],[22.5,43.7],[26,45],[25.6,47.5],[23,48.3],[21,46.7]],[[-5.3,54],[-4,53.8],[-2.2,55.2],[-3,57.6],[-4.8,57],[-5.5,55.8]],[[.5,46],[2,45.5],[4,46.7],[3.8,48.5],[1.4,49.2],[-.1,47.5]],[[10.5,43.5],[11,44],[11.8,43.8],[11.9,43.2],[11.2,43]],[[11.7,42.6],[12,43.7],[12.7,43.7],[13,43.1],[12.7,42.4]],[[13.1,41.8],[13.2,42.7],[14,42.8],[14.2,42.2]],[[15,39.8],[15.1,40.6],[15.8,41],[16.1,40.5],[15.8,39.8]],[[8.8,44.1],[9.1,44.9],[10.3,44.9],[10.5,44.4],[9.7,44.1]],[[28,39.5],[30,40],[32,40.8],[34,40.5],[33.5,41.7],[29,41.6]]]
forest=unary_union([Polygon([project(p) for p in r]) for r in regions]).intersection(land).difference(mountain.buffer(3))
def polys(g):
 if g.is_empty:return []
 if g.geom_type=='Polygon' and g.interiors:return sum((polys(t.intersection(g)) for t in triangulate(g)),[])
 if g.geom_type=='Polygon':return [[{'x':round(x,2),'y':round(y,2)} for x,y in g.exterior.coords]]
 return sum((polys(p) for p in g.geoms),[])
# Coastal destinations are moved a few pixels inland when a coarse coast places the anchor in water.
snaps={}
for c in raw['INITIAL_CITIES']:
 p=Point(c['x'],c['y'])
 if not land.contains(p):
  q=nearest_points(land.buffer(-1),p)[0];snaps[c['id']]={'x':round(q.x,3),'y':round(q.y,3)}
content="import type { Point } from './data.ts';\n"
for name,value in [('FOREST_REGIONS',polys(forest)),('MOUNTAIN_REGIONS',polys(mountain))]:content+='export const '+name+':Point[][]='+json.dumps(value,separators=(',',':'))+';\n'
content+='export const CITY_ANCHORS:Record<string,Point>='+json.dumps(snaps,separators=(',',':'))+';\n'
(Path(__file__).resolve().parents[1]/'src/world-regions.ts').write_text(content)
print('Forest regions',len(polys(forest)),'mountain regions',len(polys(mountain)),'coastal anchors',snaps)
