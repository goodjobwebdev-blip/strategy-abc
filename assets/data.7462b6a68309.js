import { GEO_COUNTRIES } from './geography.7462b6a68309.js';
                                             
                                                                                                                                    
                                   
                                                                                                                                                                                                                
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
                                                                                         
                                                                                                                          
export const project = (lon       ,lat       )       => ({x:150+(lon-6)*44,y:25+(47.1-lat)*60});
export const unproject = (p      ) => ({lon:6+(p.x-150)/44,lat:47.1-(p.y-25)/60});
export const WORLD_COUNTRIES = GEO_COUNTRIES.map(c=>({name:c.name,polygons:c.polygons.filter(r=>r.some(([lon,lat])=>lon>5&&lon<24&&lat>36&&lat<48)).map(r=>r.map(([lon,lat])=>project(lon,lat)))}));
export const LAND           = WORLD_COUNTRIES.flatMap(c=>c.polygons);
export const ITALY = WORLD_COUNTRIES.find(c=>c.name==='Italy') .polygons;
export const PLAYABLE_LAND = [ITALY.reduce((a,b)=>a.length>b.length?a:b)];
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
export const MOUNTAINS           = RIDGES.map((r,i)=>ribbon(r,i===0?16:12));
const town=(id       )=>INITIAL_CITIES.find(c=>c.id===id) ;
export const ROADS           = [
 [town('rome'),town('narnia'),...geoLine([[12.55,43.05],[12.72,43.5]]),town('ariminum')],
 [town('ariminum'),...geoLine([[12.1,44.2],[11.7,44.37]]),town('felsina')],
 [town('rome'),...geoLine([[13,41.7],[13.7,41.42]]),town('capua'),town('neapolis')],
 [town('narnia'),town('perusia'),town('arretium'),...geoLine([[11.25,43.9],[11.32,44.15]]),town('felsina')],
 [town('ariminum'),...geoLine([[12.9,43.83]]),town('ancona')],
 [town('capua'),...geoLine([[14.75,41.2]]),town('venusia'),...geoLine([[16.5,40.7]]),town('tarentum'),town('brundisium')]
];
export const WORLD_FORESTS = [
 {...project(11.2,43.65),rx:28,ry:35},{...project(12.2,43.1),rx:25,ry:43},
 {...project(13.55,42.2),rx:27,ry:35},{...project(15.5,40.4),rx:22,ry:38},
 {...project(9.6,44.5),rx:30,ry:15}
];
export const RIVERS = [geoLine([[7.4,44.75],[8.2,45.05],[9.3,45.1],[10.4,45.05],[11.4,44.95],[12.3,44.85]]),geoLine([[12.1,43.65],[12.4,43],[12.45,42.5],[12.5,41.9],[12.3,41.73]])];
export const BATTLE_FORESTS = [{x:365,y:345,w:155,h:170},{x:700,y:65,w:155,h:145}];
export const BATTLE_HILL = {x:480,y:170,rx:130,ry:90};
