import { LAND_ROADS } from './road-network.0b00c202c5ea.js';
import { MOUNTAIN_REGIONS, CITY_ANCHORS } from './world-regions.0b00c202c5ea.js';
import { GEO_COUNTRIES } from './geography.0b00c202c5ea.js';
                                                            
                                                                                                                                    
                                   
                                                                                                                                                                                                                
export const TYPES                                   = {
  peasants: { name: 'Крестьяне', short: 'Ополчение', icon: 'ОП', men: 100, attack: 3.8, defense: 1, speed: 37, range: 34, morale: 46, cavalry: false, description: 'Дешёвое ополчение. Много людей, слабый строй и низкая мораль.' },
  infantry: { name: 'Римская пехота', short: 'Пехота', icon: 'ПХ', men: 80, attack: 8.6, defense: 5, speed: 33, range: 34, morale: 86, cavalry: false, description: 'Устойчивая тяжёлая пехота. Держит центр, но уязвима с тыла.' },
  spears: { name: 'Копейщики', short: 'Копья', icon: 'КП', men: 80, attack: 6.8, defense: 4, speed: 33, range: 38, morale: 74, cavalry: false, description: 'Подготовленный фронт сдерживает конницу. Береги фланги.' },
  skirmishers: { name: 'Застрельщики', short: 'Дротики', icon: 'ДР', men: 60, attack: 7.2, defense: 1.5, speed: 43, range: 130, morale: 59, cavalry: false, description: 'Подвижные метатели дротиков. Короткий обстрел, слабый ближний бой.' },
  archers: { name: 'Лучники', short: 'Луки', icon: 'ЛК', men: 60, attack: 5.8, defense: 1, speed: 36, range: 220, morale: 54, cavalry: false, description: 'Дальний обстрел. Нуждаются в прикрытии от конницы и пехоты.' },
  lightCavalry: { name: 'Лёгкая конница', short: 'Лёг. конница', icon: 'ЛКВ', men: 40, attack: 7.8, defense: 2.5, speed: 72, range: 36, morale: 69, cavalry: true, description: 'Быстрый обход и атака стрелков. В лесу теряет подвижность.' },
  heavyCavalry: { name: 'Тяжёлая конница', short: 'Тяж. конница', icon: 'ТКВ', men: 40, attack: 12, defense: 4.5, speed: 57, range: 36, morale: 79, cavalry: true, description: 'Сильный первый удар после разгона. Лес и копья гасят атаку.' },
  warband: { name: 'Галльские воины', short: 'Воины', icon: 'ГВ', men: 90, attack: 9.2, defense: 2.5, speed: 39, range: 34, morale: 72, cavalry: false, description: 'Сильный натиск. Менее устойчивый строй, чем у римской пехоты.' }
};
export const TYPE_ORDER = Object.keys(TYPES)              ;
                                                                                         
                                                                                                                                                                          
export const WORLD_SIZE={width:2904,height:2820};
export const project = (lon       ,lat       )       => ({x:(lon+18)*44,y:(69-lat)*60});
export const unproject = (p      ) => ({lon:p.x/44-18,lat:69-p.y/60});
export const WORLD_COUNTRIES = GEO_COUNTRIES.map(c=>({name:c.name,polygons:c.polygons.map(r=>r.map(([lon,lat])=>project(lon,lat)))}));
export const LAND           = WORLD_COUNTRIES.flatMap(c=>c.polygons);
export const ITALY = WORLD_COUNTRIES.find(c=>c.name==='Italy') .polygons;
export const PLAYABLE_LAND = LAND;
const city = (id       ,name       ,latin       ,lon       ,lat       ,owner     ='rome')     =>({id,name,latin,...project(lon,lat),owner,garrison:[]});
export const INITIAL_CITIES        = [
 city('rome','Рим','ROMA',12.496,41.903),city('capua','Капуя','CAPUA',14.212,41.106),
 city('ariminum','Аримин','ARIMINUM',12.568,44.059),city('felsina','Фельсина','FELSINA',11.342,44.494,'boii'),
 city('arretium','Арреций','ARRETIUM',11.882,43.464),city('perusia','Перузия','PERUSIA',12.389,43.111),
 city('narnia','Нарния','NARNIA',12.515,42.517),city('ancona','Анкона','ANCONA',13.47,43.59),
 city('neapolis','Неаполь','NEAPOLIS',14.245,40.863),city('venusia','Венузия','VENUSIA',15.817,40.962),
 city('tarentum','Тарент','TARENTUM',17.23,40.49),city('brundisium','Брундизий','BRUNDISIUM',17.94,40.65)
];
const geoLine=(points           )=>points.map(([lon,lat])=>project(lon,lat));
function ribbon(points        ,width       )        {
 const left        =[],right        =[];
 points.forEach((p,i)=>{const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],angle=Math.atan2(b.y-a.y,b.x-a.x)+Math.PI/2;left.push({x:p.x+Math.cos(angle)*width,y:p.y+Math.sin(angle)*width});right.push({x:p.x-Math.cos(angle)*width,y:p.y-Math.sin(angle)*width});});return [...left,...right.reverse()];
}
export const RIDGES = [geoLine([[7,44.3],[7.15,45.2],[8,46],[9.5,46.5],[11.2,46.7],[13,46.45]]),geoLine([[8.7,44.35],[10,44.4],[11,44],[12.15,43.25],[13.3,42.35],[14.35,41.65],[15.45,40.35],[16.1,39.2],[16.1,38.25]])];

export const ROADS          =LAND_ROADS;
export const RIVERS = [geoLine([[7.4,44.75],[8.2,45.05],[9.3,45.1],[10.4,45.05],[11.4,44.95],[12.3,44.85]]),geoLine([[12.1,43.65],[12.4,43],[12.45,42.5],[12.5,41.9],[12.3,41.73]])];
export const BATTLE_FORESTS = [{x:365,y:345,w:155,h:170},{x:700,y:65,w:155,h:145}];
export const BATTLE_HILL = {x:480,y:170,rx:130,ry:90};

export const WORLD_LABELS=[
 ['БРИТАНИЯ',-3,55],['ГАЛЛИЯ',2,47],['ИБЕРИЯ',-4,40],['ГЕРМАНИЯ',12,52],['СКАНДИНАВИЯ',18,63],['ИТАЛИЯ',15,39],['БАЛКАНЫ',21,44],['АНАТОЛИЯ',34,39],['СИРИЯ',39,34],['ЕГИПЕТ',29,27],['ЛИВИЯ',18,28],['СЕВЕРНАЯ АФРИКА',2,31],['СРЕДИЗЕМНОЕ МОРЕ',18,35],['ЧЁРНОЕ МОРЕ',35,43],['АТЛАНТИКА',-13,43]
].map(([name,lon,lat])=>({name:String(name),...project(Number(lon),Number(lat))}));
export const CONTEXT_RIDGES=[
 geoLine([[-7,31],[-4,32.5],[-1,34],[3,35]]),geoLine([[-2,43],[0,42.8],[2.5,42.5]]),geoLine([[12,47],[15,47.5],[18,48.5],[23,48]]),geoLine([[19,42],[22,40],[23,38]]),geoLine([[28,37],[32,37.5],[36,37]]),geoLine([[7,59],[10,62],[15,66]])
];
export const CONTEXT_RIVERS=[
 geoLine([[33.9,22],[32.9,25],[32.5,27],[31.3,30],[30.3,31.4]]),geoLine([[8.2,47.5],[7.6,49],[7,50.5],[5,51.8]]),geoLine([[8,48],[13,48.5],[19,47],[25,44.5],[29.6,45.2]]),geoLine([[39,39],[38,36],[40,34],[43,32]]),geoLine([[1,47],[-.2,47.3],[-2,47.3]])
];


// Geographic campaign destinations. Factions share the hostile battle side, but keep their campaign identity.
const destinations                                                      =[
 ['massalia','Массалия',5.37,43.30,'Галлы','Галлия',true],['lugdunum','Лугдун',4.83,45.76,'Галлы','Галлия',false],['lutetia','Лютеция',2.35,48.86,'Галлы','Галлия',false],['gesoriacum','Гезориак',1.61,50.72,'Галлы','Галлия',true],
 ['saguntum','Сагунт',-.27,39.68,'Иберы','Иберия',true],['tarraco','Тарракон',1.24,41.12,'Иберы','Иберия',true],['gades','Гадес',-6.28,36.53,'Карфаген','Иберия',true],['toletum','Толет',-4.02,39.86,'Иберы','Иберия',false],
 ['syracuse','Сиракузы',15.29,37.08,'Сиракузяне','Сицилия',true],['caralis','Каралис',9.12,39.22,'Карфаген','Сардиния',true],
 ['carthage','Карфаген',10.32,36.85,'Карфаген','Африка',true],['tingis','Тингис',-5.81,35.78,'Мавретания','Африка',true],['cirta','Цирта',6.61,36.36,'Нумидия','Африка',false],['leptis','Лептис',14.29,32.64,'Карфаген','Африка',true],['cyrene','Кирена',21.85,32.82,'Киренаика','Африка',true],
 ['alexandria','Александрия',29.92,31.20,'Птолемеи','Египет',true],['memphis','Мемфис',31.25,29.85,'Птолемеи','Египет',false],
 ['apollonia','Аполлония',19.47,40.72,'Иллирийцы','Балканы',true],['athens','Афины',23.73,37.98,'Эллины','Балканы',true],['sparta','Спарта',22.43,37.08,'Эллины','Балканы',false],['thessalonica','Фессалоника',22.94,40.64,'Македония','Балканы',true],['byzantium','Византий',28.98,41.01,'Фракийцы','Балканы',true],
 ['ephesus','Эфес',27.34,37.94,'Селевкиды','Анатолия',true],['ancyra','Анкира',32.86,39.93,'Галаты','Анатолия',false],['antioch','Антиохия',36.16,36.20,'Селевкиды','Сирия',true],['tyre','Тир',35.20,33.27,'Селевкиды','Сирия',true],
 ['londinium','Лондиний',-.13,51.51,'Бритты','Британия',true],['eboracum','Эборак',-1.08,53.96,'Бритты','Британия',false],['ratae','Раты',-1.13,52.64,'Бритты','Британия',false],
 ['colonia','Поселение на Рейне',6.96,50.94,'Германцы','Германия',false],['vindobona','Поселение на Дунае',16.37,48.21,'Кельты','Германия',false],['scandia','Южная Скандия',13.05,55.65,'Северные племена','Скандинавия',true]
];
for(const [id,name,lon,lat,faction,region,port] of destinations){const c=city(id,name,name.toUpperCase(),lon,lat,'boii');c.faction=faction;c.region=region;c.port=port;c.garrison=[{id:`${id}-guard-1`,type:'spears',men:60},{id:`${id}-guard-2`,type:'archers',men:45}];INITIAL_CITIES.push(c);}
for(const c of INITIAL_CITIES){c.region??='Италия';c.faction??=c.id==='felsina'?'Бойи':'Рим';if(['rome','neapolis','ariminum','ancona','brundisium','tarentum'].includes(c.id))c.port=true;}
export const MOUNTAINS          =MOUNTAIN_REGIONS;
for(const c of INITIAL_CITIES)if(CITY_ANCHORS[c.id])Object.assign(c,CITY_ANCHORS[c.id]);
export const SEA_LINKS                  =[['rome','massalia'],['massalia','tarraco'],['gades','tingis'],['tingis','carthage'],['rome','caralis'],['caralis','carthage'],['neapolis','syracuse'],['syracuse','carthage'],['syracuse','brundisium'],['brundisium','apollonia'],['apollonia','athens'],['athens','ephesus'],['byzantium','ephesus'],['carthage','leptis'],['leptis','cyrene'],['cyrene','alexandria'],['alexandria','tyre'],['tyre','antioch'],['gesoriacum','londinium'],['gesoriacum','scandia']];
export const CAMPAIGN_GOALS=['felsina','massalia','carthage','alexandria','byzantium'];
