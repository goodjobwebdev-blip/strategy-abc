                                             
                                                                                                                                    
                                   
                                                                                                                                                                                                                
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
                                                                     
                                                                                                                          
export const INITIAL_CITIES         = [
  { id: 'rome', name: 'Рим', latin: 'ROMA', x: 512, y: 360, owner: 'rome', garrison: [] },
  { id: 'capua', name: 'Капуя', latin: 'CAPUA', x: 576, y: 448, owner: 'rome', garrison: [] },
  { id: 'ariminum', name: 'Аримин', latin: 'ARIMINUM', x: 541, y: 244, owner: 'rome', garrison: [] },
  { id: 'felsina', name: 'Фельсина', latin: 'FELSINA', x: 472, y: 190, owner: 'boii', garrison: [] }
];
// Schematic coastline: scenario geography, not a geographical projection.
export const LAND            = [
  [{x:0,y:0},{x:1000,y:0},{x:1000,y:135},{x:893,y:146},{x:850,y:220},{x:801,y:251},{x:780,y:329},{x:820,y:351},{x:824,y:390},{x:775,y:401},{x:728,y:321},{x:687,y:252},{x:590,y:210},{x:550,y:193},{x:568,y:260},{x:596,y:316},{x:624,y:391},{x:698,y:443},{x:693,y:470},{x:644,y:467},{x:625,y:502},{x:648,y:528},{x:624,y:547},{x:595,y:520},{x:570,y:471},{x:523,y:422},{x:483,y:380},{x:452,y:314},{x:426,y:257},{x:405,y:207},{x:360,y:205},{x:280,y:245},{x:255,y:314},{x:211,y:335},{x:134,y:318},{x:104,y:364},{x:32,y:365},{x:0,y:338}],
  [{x:0,y:487},{x:147,y:472},{x:284,y:499},{x:372,y:527},{x:463,y:564},{x:567,y:555},{x:708,y:579},{x:833,y:563},{x:920,y:523},{x:1000,y:508},{x:1000,y:650},{x:0,y:650}],
  [{x:374,y:308},{x:394,y:314},{x:401,y:357},{x:385,y:368},{x:371,y:344}],
  [{x:363,y:385},{x:399,y:380},{x:411,y:440},{x:390,y:460},{x:366,y:438}],
  [{x:505,y:524},{x:557,y:515},{x:599,y:552},{x:571,y:564},{x:523,y:552}]
];
export const MOUNTAINS            = [
  [{x:321,y:140},{x:358,y:99},{x:451,y:86},{x:543,y:108},{x:590,y:148},{x:563,y:173},{x:462,y:132},{x:393,y:154}],
  [{x:443,y:258},{x:470,y:239},{x:500,y:280},{x:523,y:329},{x:535,y:351},{x:523,y:370},{x:501,y:348},{x:479,y:303}],
  [{x:538,y:384},{x:555,y:380},{x:582,y:418},{x:604,y:459},{x:589,y:473},{x:565,y:429}]
];
export const ROADS            = [
  [{x:512,y:360},{x:500,y:334},{x:505,y:301},{x:528,y:278},{x:541,y:244}],
  [{x:541,y:244},{x:516,y:224},{x:489,y:205},{x:472,y:190}],
  [{x:512,y:360},{x:541,y:396},{x:556,y:421},{x:576,y:448}]
];
export const BATTLE_FORESTS = [{x:365,y:345,w:155,h:170},{x:700,y:65,w:155,h:145}];
export const BATTLE_HILL = {x:480,y:170,rx:130,ry:90};
