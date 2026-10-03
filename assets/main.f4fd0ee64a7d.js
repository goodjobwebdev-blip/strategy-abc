import Phaser from 'phaser';

import { TYPES, TYPE_ORDER } from './data.f4fd0ee64a7d.js';
                                       
import { newCampaign, nextDay, recruit, setDestination, canBattle, distance, cityAtArmy, collectGarrison, notice, RECRUIT_COST, DAY_MOVEMENT } from './campaign.f4fd0ee64a7d.js';
import { createBattle, trainingBattle, stepBattle, autoBattle, alive, survivors, losses, forestAt, hillAt, BATTLE_STEP } from './battle.f4fd0ee64a7d.js';
                                          
import { MapScene } from './view.f4fd0ee64a7d.js';
import { BIOME_NAMES, encounterMap, blocked, battlePath } from './terrain.f4fd0ee64a7d.js';
import { battleClick, orderText } from './controls.f4fd0ee64a7d.js';
                                          
import { readSave, writeSave } from './storage.f4fd0ee64a7d.js';

const save=readSave();
let campaign=save?.campaign??newCampaign();
let battle            =save?.battle??null;
let selectedUnit            =battle?.units.find(u=>u.side==='rome'&&alive(u))?.id??null;
let selectedCity            ='rome';
let inspectedUnit            =selectedUnit;
let showOrders=true,showNames=true,enemyRosterOpen=false;
let trainingBiome      =battle?.map.biome??'plain',trainingSeed=battle?.map.seed??1337;
let paused=true,speed=1,accumulator=0,uiTime=0,saveTime=0;
let dialog                                        =null;
let toast='',toastTimer                                        ;
let saveOK=true;
const root=document.querySelector                ('#app') ;
root.innerHTML=`
  <header class="masthead"><div class="brand"><span class="seal">SPQR</span><div><strong>STRATEGY ABC</strong><span>РИМ · СЕВЕРНАЯ ГРАНИЦА</span></div></div><div id="resources" class="resources"></div><button data-action="help" class="icon-button" aria-label="Открыть помощь">?</button></header>
  <nav class="navigation"><div class="tabs"><button id="campaign-tab" data-action="campaign-tab">Кампания</button><button id="training-tab" data-action="training">Тактический полигон</button></div><div class="nav-right"><span class="version">MVP 0.4</span><button class="quiet" data-action="catalog">8 типов войск</button><button class="quiet" data-action="reset">Новая кампания</button></div></nav>
  <main class="layout"><section class="map-column"><div class="map-heading"><div><span id="map-eyebrow" class="eyebrow"></span><h1 id="map-title"></h1></div><div id="map-tools"></div></div><div id="game" aria-label="Карта игры"></div><div id="map-caption" class="map-caption"></div></section><aside id="side-panel" aria-label="Управление игрой"><div id="terrain-tools"></div><div id="sidebar"></div><div id="bottom-panel"></div></aside></main>
  <footer class="footer"><span id="save-status"></span><span>Условная кампания · III век до н. э.</span><a href="https://github.com/goodjobwebdev-blip/strategy-abc/blob/main/docs/premise.md" target="_blank" rel="noopener">Концепция ↗</a></footer>
  <div id="toast" role="status" aria-live="polite"></div><div id="modal"></div>`;
const el=(id       )=>document.getElementById(id) ;
const esc=(s        )=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] ));
function showToast(message       ){toast=message;el('toast').textContent=message;el('toast').className='visible';clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toast='';el('toast').className='';},4500);}
function persist(){saveOK=writeSave(campaign,battle);el('save-status').textContent=saveOK?'● Автосохранение в этом браузере':'Сохранение недоступно — оставь вкладку открытой';}
function stat(label       ,value              ){return `<div class="resource"><span>${label}</span><strong>${value}</strong></div>`;}
function roster(){
  const units=battle?battle.units.filter(u=>u.side==='rome'):campaign.army;
  return `<div class="roster">${units.map(u=>{const bu=battle?battle.units.find(v=>v.id===u.id):null;return `<button class="unit-card ${selectedUnit===u.id?'selected':''} ${bu?.routed?'routed':''}" data-action="unit" data-id="${esc(u.id)}" ${u.men<1?'disabled':''}><span class="unit-icon">${TYPES[u.type].icon}</span><span><strong>${TYPES[u.type].short}</strong><small>${Math.ceil(u.men)} воинов${bu?` · ${bu.routed?'бегство':'мораль '+Math.round(bu.morale)}`:''}</small>${bu?`<small class="order-status">${esc(orderText(battle ,bu))}</small>`:''}</span></button>`;}).join('')||'<p class="muted">Армия потеряна. Найми крестьян в Риме.</p>'}</div>`;
}
function cameraTools(){return `<div class="camera-tools"><button data-action="zoom-out" aria-label="Отдалить карту">−</button><button data-action="zoom-in" aria-label="Приблизить карту">+</button><button data-action="overview">Обзор</button><button data-action="focus-army">К войскам</button><span>Колесо: масштаб · СКМ / Alt + ЛКМ: камера</span></div>`;}
function toggleTime(){if(!battle)return;if(battle.phase==='deployment'){battle.phase='combat';paused=false;}else paused=!paused;accumulator=0;}
function render(){
  const soldiers=campaign.army.reduce((n,u)=>n+u.men,0);
  el('resources').innerHTML=stat('ДЕНЬ',campaign.day)+stat('ДЕНАРИИ',campaign.gold)+stat('АРМИЯ',`${campaign.army.length} / ${soldiers}`);
  el('campaign-tab').classList.toggle('active',!battle);el('training-tab').classList.toggle('active',!!battle?.training);
  (el('campaign-tab')                     ).disabled=!!battle;
  (el('training-tab')                     ).disabled=!!battle;
  el('map-eyebrow').textContent=battle?(battle.training?'ПОЛИГОН · ВСЕ ВОСЕМЬ ТИПОВ':'СРАЖЕНИЕ У ФЕЛЬСИНЫ'):'СЕКТОР I · АПЕННИНСКИЙ ПОЛУОСТРОВ';
  el('map-title').textContent=battle?'Строй. Манёвр. Мораль.':'Северная граница';
  el('terrain-tools').innerHTML=battle?.training?`<div class="terrain-toolbar"><label>Местность <select id="training-biome" ${paused?'':'disabled'}>${Object.entries(BIOME_NAMES).map(([key,name])=>`<option value="${key}" ${trainingBiome===key?'selected':''}>${name}</option>`).join('')}</select></label><label>Seed <input id="training-seed" type="number" min="0" max="4294967295" value="${trainingSeed}" ${paused?'':'disabled'}></label><button class="secondary" data-action="regenerate">Создать карту</button><span class="small muted">Новый бой на полигоне</span></div>`:'';
  if(battle)renderBattle();else renderCampaign();
  renderModal();
}
function renderCampaign(){
  el('map-tools').innerHTML=`<span class="map-badge">${campaign.won?'Победа в кампании':'Рим против бойев'}</span>${cameraTools()}`;
  el('map-caption').innerHTML='<span><i class="dot roman"></i> Рим</span><span><i class="dot enemy"></i> Бойи</span><span>━ Дороги: движение ×1,92</span><span>▲ Горы · ♣ Леса · ≈ Реки</span>';
  el('bottom-panel').innerHTML=`<section class="panel army-panel"><div class="section-top"><h2>Полевая армия</h2><span class="muted">${campaign.army.length} / 16 отрядов</span></div>${roster()}</section>`;
  const city=campaign.cities.find(c=>c.id===selectedCity);
  const here=cityAtArmy(campaign);
  el('sidebar').innerHTML=`
    <section class="mission"><p class="eyebrow">${campaign.won?'КАМПАНИЯ ЗАВЕРШЕНА':'ВАША ЦЕЛЬ'}</p><h2>${campaign.won?'Северная граница под контролем':'Занять Фельсину'}</h2><p>${campaign.won?'Бойи отступили. Можно продолжить найм и движение или проверить все типы войск на полигоне.':'Проведи армию на север через Аримин и разбей два отряда бойев.'}</p></section>
    <section class="panel"><div class="section-top"><h2>Приказы армии</h2><span class="chip">${Math.round(campaign.movement)} / ${DAY_MOVEMENT}</span></div><p class="muted">${here?`У города ${esc(here.name)}`:'В походе'}${campaign.route.length?' · маршрут продолжается завтра':''}</p><div class="meter"><span style="width:${campaign.movement/DAY_MOVEMENT*100}%"></span></div><p class="small">Выбери город на карте и нажми «Марш». Для свободного движения нажми на сушу. Дорога через перевал ускоряет путь.</p><button class="primary full" data-action="next-day">Следующий день <span>→</span></button>${campaign.route.length?'<button class="quiet full" data-action="stop-march">Отменить маршрут</button>':''}</section>
    ${canBattle(campaign)?`<section class="panel encounter"><p class="eyebrow">ПРОТИВНИК РЯДОМ</p><h2>Бойи · ${campaign.enemy.length} отряда</h2><p class="small">Поле боя: ${BIOME_NAMES[encounterMap(campaign.enemyPosition,campaign.day).biome]}</p><p class="small">${campaign.enemy.map(u=>TYPES[u.type].name).join(' · ')}</p><button class="primary full" data-action="battle">Вести бой лично</button><button class="secondary full" data-action="autobattle">Автобой</button></section>`:''}
    <section class="panel"><p class="eyebrow">ГОРОД</p><div class="city-picker">${campaign.cities.map(c=>`<button class="${c.id===selectedCity?'active':''}" data-action="city" data-id="${c.id}">${c.name}</button>`).join('')}</div>${city?`<h2>${city.name} <small class="owner ${city.owner}">${city.owner==='rome'?'РИМ':'БОЙИ'}</small></h2><p class="small">${city.garrison.length?`Гарнизон: ${city.garrison.length} отр. крестьян`:'Гарнизон: нет отрядов'}${here?.id===city.id?' · армия здесь':''}</p>${city.owner==='rome'?`<button class="secondary full" data-action="recruit" data-id="${city.id}" ${campaign.gold<RECRUIT_COST?'disabled':''}>Нанять крестьян <span>35 ◈</span></button><p class="small muted">100 воинов. Присоединяются к армии в городе; иначе ждут в гарнизоне.</p>`:'<p class="small muted">Вражеский город. Победи армию бойев, чтобы занять его.</p>'}<button class="quiet full" data-action="march-city" data-id="${city.id}" ${here?.id===city.id?'disabled':''}>Марш к городу →</button>`:''}</section>
    <section class="panel journal"><h2>Хроника</h2>${campaign.notices.slice(0,4).map(n=>`<p>${esc(n)}</p>`).join('')}</section>`;
}
function focusInspector(){const pane=el('side-panel'),card=document.getElementById('unit-inspector');if(card)pane.scrollTop+=card.getBoundingClientRect().top-pane.getBoundingClientRect().top-8;}
function renderBattle(){
  const b=battle ,u=b.units.find(v=>v.id===(inspectedUnit??selectedUnit));
  const own=u?.side==='rome';
  const live=(side       )=>b.units.filter(v=>v.side===side&&alive(v)).length;
  const seconds=Math.floor(b.elapsed),clock=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
  el('map-tools').innerHTML=`<span class="battle-clock">${b.phase==='deployment'?'Расстановка':clock}</span><button class="secondary" data-action="pause" ${b.winner?'disabled':''}>${b.phase==='deployment'?'Начать сражение':paused?'▶ Продолжить':'Ⅱ Пауза'}</button>${cameraTools()}`;
  el('map-caption').innerHTML=`<span><i class="dot roman"></i> Твои отряды</span><span><i class="dot enemy"></i> Противник</span><span>${BIOME_NAMES[b.map.biome]} · seed ${b.map.seed}</span><span>Здания и скалы блокируют движение и обстрел</span><span>Высоты: темнее — выше</span><div class="battle-overlays"><button class="secondary" data-action="toggle-orders" aria-pressed="${showOrders}">Приказы: ${showOrders?'все':'выбранный'}</button><button class="secondary" data-action="toggle-names" aria-pressed="${showNames}">Названия: ${showNames?'вкл':'выкл'}</button></div>`;
  el('bottom-panel').innerHTML=`<section class="panel army-panel"><div class="section-top"><h2>Твои отряды</h2><span class="muted">Боеспособны: ${live('rome')} · враг: ${live('boii')}</span></div>${roster()}<details id="enemy-roster" ${enemyRosterOpen?'open':''}><summary>Войска противника</summary><div class="roster enemy-roster">${b.units.filter(v=>v.side==='boii'&&v.men>=1).map(v=>`<button class="unit-card ${inspectedUnit===v.id?'selected':''}" data-action="inspect" data-id="${esc(v.id)}"><span class="unit-icon">${TYPES[v.type].icon}</span><span><strong>${TYPES[v.type].name}</strong><small>${Math.ceil(v.men)} воинов</small></span></button>`).join('')}</div></details></section>`;
  el('sidebar').innerHTML=`<section class="mission"><p class="eyebrow">${b.phase==='deployment'?'РАССТАНОВКА ВОЙСК':paused?'ТАКТИЧЕСКАЯ ПАУЗА':'СРАЖЕНИЕ ИДЁТ'}</p><h2>${b.training?'Тактический полигон':'Сражение у Фельсины'}</h2><p>${b.phase==='deployment'?'Выбери отряд и поставь его ПКМ в зелёной зоне. До старта время не идёт.':'ЛКМ — выбор/осмотр. ПКМ — движение или атака.'} Перетяни ПКМ от места назначения в сторону фронта. Shift + ПКМ — поворот на месте.</p></section>
    <section class="panel" id="unit-inspector"><p class="eyebrow">${own?'ВАШ ОТРЯД':'РАЗВЕДКА · ПРОТИВНИК'}</p>${u?`<h2>${TYPES[u.type].name}</h2><p class="small muted">${TYPES[u.type].description}</p><div class="unit-stats"><span>Воинов <b>${Math.ceil(u.men)} / ${u.initialMen}</b></span><span>Мораль <b>${Math.round(u.morale)} / 100</b></span><span>Усталость <b>${Math.round(u.fatigue*100)}%</b></span><span>Строй <b>${Math.round(u.cohesion*100)}%</b></span><span>Фронт <b>${['→','↘','↓','↙','←','↖','↑','↗'][(Math.round(u.angle/(Math.PI/4))+8)%8]}</b></span></div><p class="small">${own?esc(orderText(b,u)):'Вражеский отряд · только осмотр'} · ${forestAt(u,b.map)?'лес':hillAt(u,b.map)?'возвышенность':'равнина'}</p>${own?`<button class="secondary full" data-action="hold" ${!alive(u)||b.winner?'disabled':''}>Удерживать позицию</button><button class="quiet full" data-action="withdraw-unit" ${b.phase==='deployment'||!alive(u)||b.winner?'disabled':''}>Отвести отряд</button>`:`<p class="small muted">Твой выбранный отряд сохранён. ПКМ по врагу отдаст ему приказ атаки.</p>`}`:'<p class="muted">Выбери отряд на карте или в списке.</p>'}</section>
    <section class="panel"><div class="section-top"><h2>Время</h2><span class="chip">${clock}</span></div><div class="speed-controls">${[1,2,4].map(s=>`<button class="${speed===s?'active':''}" data-action="speed" data-speed="${s}">${s}×</button>`).join('')}</div><p class="small muted">Пробел — пауза. Приказы можно отдавать на паузе.</p><button class="primary full" data-action="advance-all" ${b.winner||b.phase==='deployment'?'disabled':''}>Всем наступать</button><button class="quiet full" data-action="hold-all" ${b.winner?'disabled':''}>Всем удерживать позицию</button></section>
    <section class="panel journal"><h2>События боя</h2>${b.logs.slice(0,5).map(l=>`<p>${esc(l)}</p>`).join('')}</section>
    <button class="quiet full retreat" data-action="retreat">${b.training?'Выйти из полигона':'Отступить всей армией'}</button>`;
}
function renderModal(){
  const container=el('modal');
  if(battle?.winner&&!dialog){
    const b=battle,w=b.winner,title=w==='rome'?'Победа Рима':w==='boii'?'Армия отступает':'Ничья';
    container.innerHTML=`<div class="backdrop"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="result-title"><p class="eyebrow">${b.training?'ПОЛИГОН · РЕЗУЛЬТАТ':'ИТОГ СРАЖЕНИЯ'}</p><h2 id="result-title">${title}</h2><p>${esc(b.reason)}</p><div class="result-stats">${stat('ПОТЕРИ РИМА',losses(b,'rome'))}${stat('ПОТЕРИ БОЙЕВ',losses(b,'boii'))}</div><p class="small">${b.training?'Полигон не меняет кампанию.':w==='rome'?'Фельсина переходит под контроль Рима. Награда: 100 денариев.':'Выжившие вернутся в Рим. Потери сохранятся; можно нанять пополнение.'}</p><div class="result-log">${b.logs.slice(0,4).map(l=>`<p>${esc(l)}</p>`).join('')}</div><button class="primary full" data-action="finish">Вернуться на глобальную карту →</button></section></div>`;return;
  }
  if(!dialog){container.innerHTML='';return;}
  let title='',body='';
  if(dialog==='help'){title='Как играть';body=`<ol><li>В Риме уже есть три отряда. Можно нанять крестьян за 35 денариев.</li><li>Выбери Аримин и нажми «Марш к городу». Армия идёт по дороге; «Следующий день» продолжает маршрут и приносит доход.</li><li>От Аримина двигайся к Фельсине. Рядом с врагом появится выбор ручного боя или автобоя.</li><li>В бою ЛКМ выбирает свой отряд и показывает описание врага. ПКМ отдаёт приказ движения или атаки. Shift + ПКМ поворачивает фронт. Пробел ставит бой на паузу.</li><li>Обходи кавалерией, прикрывай стрелков, удерживай строй. Бегство соседей снижает мораль. Лес мешает коннице, холм даёт преимущество.</li></ol><p>На тактическом полигоне доступны все восемь типов войск. Он не влияет на кампанию.</p><p class="small muted">Сохранение автоматическое и локальное. После перезагрузки незаконченный бой продолжится на паузе; расстановка останется расстановкой. Береговая линия реальная; дороги и ландшафт — игровая модель. Колёсико меняет масштаб, СКМ или Alt + ЛКМ двигают камеру. Перед стартом расставь отряды в зелёной зоне; ПКМ с перетаскиванием задаёт место и фронт. Полигон позволяет выбрать лес, равнину, горы или город и seed карты.</p>`;}
  if(dialog==='catalog'){title='Восемь типов войск';body=`<div class="catalog">${TYPE_ORDER.map(t=>`<article><span class="unit-icon">${TYPES[t].icon}</span><div><h3>${TYPES[t].name}</h3><p>${TYPES[t].description}</p><small>${TYPES[t].men} воинов · мораль ${TYPES[t].morale} · ${TYPES[t].range>50?'дальний':'ближний'} бой</small></div></article>`).join('')}</div>`;}
  if(dialog==='reset'){title='Начать новую кампанию?';body='<p>Текущая кампания и незавершённый бой будут заменены. Рим снова начнёт с трёх отрядов.</p><button class="primary full" data-action="confirm-reset">Начать заново</button>';}
  if(dialog==='retreat'){title='Приказать отступление?';body='<p>Бой завершится поражением. Выжившие вернутся в Рим с текущими потерями.</p><button class="primary full" data-action="confirm-retreat">Отступить</button>';}
  container.innerHTML=`<div class="backdrop"><section class="dialog ${dialog==='catalog'?'wide':''}" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div class="section-top"><h2 id="dialog-title">${title}</h2><button class="icon-button" data-action="close" aria-label="Закрыть">×</button></div>${body}<button class="secondary full" data-action="close">${dialog==='reset'||dialog==='retreat'?'Отмена':'Понятно'}</button></section></div>`;
}
function nearestEnemy(u                                ){return battle?.units.filter(v=>v.side!==u.side&&alive(v)).sort((a,b)=>distance(u,a)-distance(u,b))[0];}
function startBattle(training=false,automatic=false){
  if(battle)return;if(!training&&!canBattle(campaign)){showToast('Сначала подойди к армии бойев у Фельсины.');return;}
  battle=training?trainingBattle(trainingBiome,trainingSeed):createBattle(campaign.army,campaign.enemy,false,automatic,encounterMap(campaign.enemyPosition,campaign.day));
  selectedUnit=battle.units.find(u=>u.side==='rome') .id;inspectedUnit=selectedUnit;paused=true;speed=1;accumulator=0;
  if(automatic){autoBattle(battle);}
  persist();render();
}
function finishBattle(){
  if(!battle)return;const b=battle;
  if(!b.training){
    campaign.army=survivors(b,'rome');campaign.enemy=survivors(b,'boii');campaign.route=[];campaign.movement=0;
    if(b.winner==='rome'){
      campaign.enemy=[];campaign.won=true;campaign.gold+=100;
      const city=campaign.cities.find(c=>c.id==='felsina') ;city.owner='rome';campaign.position={x:city.x,y:city.y};
      notice(campaign,`Победа у Фельсины! Потери: ${losses(b,'rome')} римлян. Северная граница под контролем. +100 денариев.`);
    }else{
      const city=campaign.cities.find(c=>c.id==='rome') ;campaign.position={x:city.x,y:city.y};
      notice(campaign,`${b.winner==='draw'?'Ничья':'Поражение'} у Фельсины. Потери: ${losses(b,'rome')}. Выжившие вернулись в Рим.`);
    }
    collectGarrison(campaign);
  }
  battle=null;selectedUnit=null;selectedCity=campaign.won?'felsina':'rome';paused=true;dialog=null;persist();render();
}
function onMap(p      ,shift        ,right=false,facing        ){
  if(dialog||battle?.winner)return;
  if(!battle){
    const city=campaign.cities.find(c=>distance(c,p)<26);
    if(city){selectedCity=city.id;render();return;}
    if(distance(campaign.position,p)<20){showToast('Армия выбрана. Нажми на сушу или выбери город для марша.');return;}
    const error=setDestination(campaign,p);if(error)showToast(error);else if(campaign.movement===0&&campaign.route.length)showToast('Запас движения исчерпан. Следующий день продолжит марш.');
    persist();render();return;
  }
  const result=battleClick(battle,selectedUnit,p,shift,right,facing);
  selectedUnit=result.selected;if(result.inspected)inspectedUnit=result.inspected;else if(result.changed)inspectedUnit=selectedUnit;
  if(result.error)showToast(result.error);
  persist();render();if(result.inspected||result.changed)focusInspector();
}
root.addEventListener('toggle',event=>{if((event.target               ).id==='enemy-roster')enemyRosterOpen=(event.target                      ).open;},true);
root.addEventListener('click',event=>{
  const button=(event.target               ).closest                   ('button[data-action]');if(!button||button.disabled)return;
  const action=button.dataset.action ,id=button.dataset.id ;
  if(action==='zoom-in'||action==='zoom-out'){scene.zoomBy(action==='zoom-in'?1.3:1/1.3);return;}
  if(action==='overview'){scene.overview();return;}
  if(action==='focus-army'){scene.focus();return;}
  if(action==='help'||action==='catalog'||action==='reset'){dialog=action;if(battle)paused=true;render();return;}
  if(action==='close'){dialog=null;render();return;}
  if(action==='confirm-reset'){campaign=newCampaign();battle=null;selectedCity='rome';selectedUnit=null;inspectedUnit=null;dialog=null;paused=true;speed=1;accumulator=0;trainingBiome='plain';trainingSeed=1337;showOrders=true;showNames=true;enemyRosterOpen=false;persist();render();scene.overview();return;}
  if(action==='training'){startBattle(true);return;}
  if(action==='regenerate'&&battle?.training){const biome=(el('training-biome')                     ).value         ;const seed=Number((el('training-seed')                    ).value);if(!Number.isInteger(seed)||seed<0||seed>4294967295){showToast('Seed должен быть целым числом от 0 до 4294967295.');return;}trainingBiome=biome;trainingSeed=seed;battle=trainingBattle(biome,seed);selectedUnit=battle.units[0].id;inspectedUnit=selectedUnit;paused=true;accumulator=0;persist();render();return;}
  if(action==='finish'){finishBattle();return;}
  if(action==='retreat'){if(battle?.training){finishBattle();return;}paused=true;dialog='retreat';render();return;}
  if(action==='confirm-retreat'&&battle){battle.winner='boii';battle.reason='Римский командующий приказал отступить.';dialog=null;persist();render();return;}
  if(!battle){
    if(action==='city'){selectedCity=id;}
    if(action==='unit'){selectedUnit=id;showToast(TYPES[campaign.army.find(u=>u.id===id) .type].description);}
    if(action==='recruit'){const error=recruit(campaign,id);showToast(error??'Ополчение нанято.');}
    if(action==='next-day')nextDay(campaign);
    if(action==='stop-march')campaign.route=[];
    if(action==='march-city'){const city=campaign.cities.find(c=>c.id===id) ;const error=setDestination(campaign,city);if(error)showToast(error);}
    if(action==='battle'||action==='autobattle'){startBattle(false,action==='autobattle');return;}
  }else if(!battle.winner){
    const unit=battle.units.find(u=>u.id===selectedUnit);
    if(action==='unit'){selectedUnit=id;inspectedUnit=id;const focus=battle.units.find(u=>u.id===id);if(focus)scene.focus(focus);}
    if(action==='inspect')inspectedUnit=id;
    if(action==='toggle-orders')showOrders=!showOrders;
    if(action==='toggle-names')showNames=!showNames;
    if(action==='pause')toggleTime();
    if(action==='speed')speed=Number(button.dataset.speed);
    if(action==='hold'&&unit?.side==='rome')unit.order={kind:'hold'};
    if(action==='withdraw-unit'&&unit?.side==='rome')unit.order={kind:'move',x:55,y:unit.y};
    if(action==='hold-all')battle.units.filter(u=>u.side==='rome'&&alive(u)).forEach(u=>u.order={kind:'hold'});
    if(action==='advance-all'&&battle.phase==='combat')battle.units.filter(u=>u.side==='rome'&&alive(u)).forEach(u=>{const enemy=nearestEnemy(u);if(enemy)u.order={kind:'attack',target:enemy.id};});
  }
  persist();render();if(battle&&(action==='unit'||action==='inspect'))focusInspector();
});
document.addEventListener('keydown',event=>{
  if((event.target               ).matches('input,textarea,select')||event.repeat)return;
  if(event.code==='Escape'){dialog=null;render();}
  if(event.code==='Space'&&battle&&!battle.winner&&!dialog){event.preventDefault();toggleTime();persist();render();}
});
function tick(delta       ){
  if(battle?.phase==='combat'&&!paused&&!dialog&&!battle.winner){accumulator+=delta*speed;let steps=0;while(accumulator>=BATTLE_STEP&&steps<12){stepBattle(battle);accumulator-=BATTLE_STEP;steps++;if(battle.winner){paused=true;persist();render();break;}}}
  uiTime+=delta;saveTime+=delta;if(uiTime>.5){uiTime=0;if(battle&&!paused&&!dialog&&!battle.winner)render();}if(saveTime>3){saveTime=0;persist();}
}
const scene=new MapScene(()=>({campaign,battle,selectedUnit,selectedCity,inspectedUnit,showOrders,showNames}),onMap,tick);
new Phaser.Game({type:Phaser.AUTO,parent:'game',width:el('game').clientWidth,height:el('game').clientHeight,backgroundColor:'#e2dbc1',disableContextMenu:true,scene:[scene],scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH},render:{antialias:true},audio:{noAudio:true}});
window.addEventListener('pagehide',persist);
render();persist();
// A small read-only inspection hook for automated integration checks.
Object.defineProperty(window,'strategyABC',{value:{snapshot:()=>structuredClone({campaign,battle,paused,selectedUnit,inspectedUnit})},writable:false});
