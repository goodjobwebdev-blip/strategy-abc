import Phaser from 'phaser';
import './style.css';
import { TYPES, TYPE_ORDER } from './data.ts';
import type { Point } from './data.ts';
import { newCampaign, nextDay, recruit, setDestination, canBattle, distance, cityAtArmy, collectGarrison, notice, RECRUIT_COST, DAY_MOVEMENT } from './campaign.ts';
import { createBattle, trainingBattle, stepBattle, autoBattle, alive, survivors, losses, forestAt, hillAt, BATTLE_STEP } from './battle.ts';
import type { Battle } from './battle.ts';
import { MapScene } from './view.ts';
import { readSave, writeSave } from './storage.ts';

const save=readSave();
let campaign=save?.campaign??newCampaign();
let battle:Battle|null=save?.battle??null;
let selectedUnit:string|null=battle?.units.find(u=>u.side==='rome'&&alive(u))?.id??null;
let selectedCity:string|null='rome';
let paused=true,speed=1,accumulator=0,uiTime=0,saveTime=0;
let dialog:'help'|'catalog'|'reset'|'retreat'|null=null;
let toast='',toastTimer:ReturnType<typeof setTimeout>|undefined;
let saveOK=true;
const root=document.querySelector<HTMLDivElement>('#app')!;
root.innerHTML=`
  <header class="masthead"><div class="brand"><span class="seal">SPQR</span><div><strong>STRATEGY ABC</strong><span>РИМ · СЕВЕРНАЯ ГРАНИЦА</span></div></div><div id="resources" class="resources"></div><button data-action="help" class="icon-button" aria-label="Открыть помощь">?</button></header>
  <nav class="navigation"><div class="tabs"><button id="campaign-tab" data-action="campaign-tab">Кампания</button><button id="training-tab" data-action="training">Тактический полигон</button></div><div class="nav-right"><span class="version">MVP 0.1</span><button class="quiet" data-action="catalog">8 типов войск</button><button class="quiet" data-action="reset">Новая кампания</button></div></nav>
  <main class="layout"><section class="map-column"><div class="map-heading"><div><span id="map-eyebrow" class="eyebrow"></span><h1 id="map-title"></h1></div><div id="map-tools"></div></div><div id="game" aria-label="Карта игры"></div><div id="map-caption" class="map-caption"></div><div id="bottom-panel"></div></section><aside id="sidebar" aria-label="Управление игрой"></aside></main>
  <footer class="footer"><span id="save-status"></span><span>Условная кампания · III век до н. э.</span><a href="https://github.com/goodjobwebdev-blip/strategy-abc/blob/main/docs/premise.md" target="_blank" rel="noopener">Концепция ↗</a></footer>
  <div id="toast" role="status" aria-live="polite"></div><div id="modal"></div>`;
const el=(id:string)=>document.getElementById(id)!;
const esc=(s:unknown)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
function showToast(message:string){toast=message;el('toast').textContent=message;el('toast').className='visible';clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toast='';el('toast').className='';},4500);}
function persist(){saveOK=writeSave(campaign,battle);el('save-status').textContent=saveOK?'● Автосохранение в этом браузере':'Сохранение недоступно — оставь вкладку открытой';}
function stat(label:string,value:string|number){return `<div class="resource"><span>${label}</span><strong>${value}</strong></div>`;}
function roster(){
  const units=battle?battle.units.filter(u=>u.side==='rome'):campaign.army;
  return `<div class="roster">${units.map(u=>{const bu=battle?battle.units.find(v=>v.id===u.id):null;return `<button class="unit-card ${selectedUnit===u.id?'selected':''} ${bu?.routed?'routed':''}" data-action="unit" data-id="${esc(u.id)}" ${u.men<1?'disabled':''}><span class="unit-icon">${TYPES[u.type].icon}</span><span><strong>${TYPES[u.type].short}</strong><small>${Math.ceil(u.men)} воинов${bu?` · ${bu.routed?'бегство':'мораль '+Math.round(bu.morale)}`:''}</small></span></button>`;}).join('')||'<p class="muted">Армия потеряна. Найми крестьян в Риме.</p>'}</div>`;
}
function render(){
  const soldiers=campaign.army.reduce((n,u)=>n+u.men,0);
  el('resources').innerHTML=stat('ДЕНЬ',campaign.day)+stat('ДЕНАРИИ',campaign.gold)+stat('АРМИЯ',`${campaign.army.length} / ${soldiers}`);
  el('campaign-tab').classList.toggle('active',!battle);el('training-tab').classList.toggle('active',!!battle?.training);
  (el('campaign-tab') as HTMLButtonElement).disabled=!!battle;
  (el('training-tab') as HTMLButtonElement).disabled=!!battle;
  el('map-eyebrow').textContent=battle?(battle.training?'ПОЛИГОН · ВСЕ ВОСЕМЬ ТИПОВ':'СРАЖЕНИЕ У ФЕЛЬСИНЫ'):'ГЛОБАЛЬНАЯ КАРТА · ИТАЛИЯ';
  el('map-title').textContent=battle?'Строй. Манёвр. Мораль.':'Северная граница';
  if(battle)renderBattle();else renderCampaign();
  renderModal();
}
function renderCampaign(){
  el('map-tools').innerHTML=`<span class="map-badge">${campaign.won?'Победа в кампании':'Рим против бойев'}</span>`;
  el('map-caption').innerHTML='<span><i class="dot roman"></i> Рим</span><span><i class="dot enemy"></i> Бойи</span><span>━ Дороги: движение ×1,92</span><span>▲ Горы и море: непроходимы</span>';
  el('bottom-panel').innerHTML=`<section class="panel army-panel"><div class="section-top"><h2>Полевая армия</h2><span class="muted">${campaign.army.length} / 16 отрядов</span></div>${roster()}</section>`;
  const city=campaign.cities.find(c=>c.id===selectedCity);
  const here=cityAtArmy(campaign);
  el('sidebar').innerHTML=`
    <section class="mission"><p class="eyebrow">${campaign.won?'КАМПАНИЯ ЗАВЕРШЕНА':'ВАША ЦЕЛЬ'}</p><h2>${campaign.won?'Северная граница под контролем':'Занять Фельсину'}</h2><p>${campaign.won?'Бойи отступили. Можно продолжить найм и движение или проверить все типы войск на полигоне.':'Проведи армию на север через Аримин и разбей два отряда бойев.'}</p></section>
    <section class="panel"><div class="section-top"><h2>Приказы армии</h2><span class="chip">${Math.round(campaign.movement)} / ${DAY_MOVEMENT}</span></div><p class="muted">${here?`У города ${esc(here.name)}`:'В походе'}${campaign.route.length?' · маршрут продолжается завтра':''}</p><div class="meter"><span style="width:${campaign.movement/DAY_MOVEMENT*100}%"></span></div><p class="small">Выбери город на карте и нажми «Марш». Для свободного движения нажми на сушу. Дорога через перевал ускоряет путь.</p><button class="primary full" data-action="next-day">Следующий день <span>→</span></button>${campaign.route.length?'<button class="quiet full" data-action="stop-march">Отменить маршрут</button>':''}</section>
    ${canBattle(campaign)?`<section class="panel encounter"><p class="eyebrow">ПРОТИВНИК РЯДОМ</p><h2>Бойи · ${campaign.enemy.length} отряда</h2><p class="small">${campaign.enemy.map(u=>TYPES[u.type].name).join(' · ')}</p><button class="primary full" data-action="battle">Вести бой лично</button><button class="secondary full" data-action="autobattle">Автобой</button></section>`:''}
    <section class="panel"><p class="eyebrow">ГОРОД</p><div class="city-picker">${campaign.cities.map(c=>`<button class="${c.id===selectedCity?'active':''}" data-action="city" data-id="${c.id}">${c.name}</button>`).join('')}</div>${city?`<h2>${city.name} <small class="owner ${city.owner}">${city.owner==='rome'?'РИМ':'БОЙИ'}</small></h2><p class="small">${city.garrison.length?`Гарнизон: ${city.garrison.length} отр. крестьян`:'Гарнизон: нет отрядов'}${here?.id===city.id?' · армия здесь':''}</p>${city.owner==='rome'?`<button class="secondary full" data-action="recruit" data-id="${city.id}" ${campaign.gold<RECRUIT_COST?'disabled':''}>Нанять крестьян <span>35 ◈</span></button><p class="small muted">100 воинов. Присоединяются к армии в городе; иначе ждут в гарнизоне.</p>`:'<p class="small muted">Вражеский город. Победи армию бойев, чтобы занять его.</p>'}<button class="quiet full" data-action="march-city" data-id="${city.id}" ${here?.id===city.id?'disabled':''}>Марш к городу →</button>`:''}</section>
    <section class="panel journal"><h2>Хроника</h2>${campaign.notices.slice(0,4).map(n=>`<p>${esc(n)}</p>`).join('')}</section>`;
}
function renderBattle(){
  const b=battle!,u=b.units.find(v=>v.id===selectedUnit);
  const live=(side:string)=>b.units.filter(v=>v.side===side&&alive(v)).length;
  const seconds=Math.floor(b.elapsed),clock=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
  el('map-tools').innerHTML=`<span class="battle-clock">${clock}</span><button class="secondary" data-action="pause" ${b.winner?'disabled':''}>${paused?'▶ Начать / продолжить':'Ⅱ Пауза'}</button>`;
  el('map-caption').innerHTML='<span><i class="dot roman"></i> Твои отряды</span><span><i class="dot enemy"></i> Противник</span><span>Полоска: мораль · стрелка: фронт</span>';
  el('bottom-panel').innerHTML=`<section class="panel army-panel"><div class="section-top"><h2>Твои отряды</h2><span class="muted">Боеспособны: ${live('rome')} · враг: ${live('boii')}</span></div>${roster()}</section>`;
  el('sidebar').innerHTML=`<section class="mission"><p class="eyebrow">${paused?'ТАКТИЧЕСКАЯ ПАУЗА':'СРАЖЕНИЕ ИДЁТ'}</p><h2>${b.training?'Тактический полигон':'Сражение у Фельсины'}</h2><p>Выбери свой отряд, нажми на землю для движения или на врага для атаки. Shift + нажатие задаёт направление фронта.</p></section>
    <section class="panel"><div class="section-top"><h2>Время</h2><span class="chip">${clock}</span></div><div class="speed-controls">${[1,2,4].map(s=>`<button class="${speed===s?'active':''}" data-action="speed" data-speed="${s}">${s}×</button>`).join('')}</div><p class="small muted">Пробел — пауза. Приказы можно отдавать на паузе.</p><button class="primary full" data-action="advance-all" ${b.winner?'disabled':''}>Всем наступать</button><button class="quiet full" data-action="hold-all" ${b.winner?'disabled':''}>Всем удерживать позицию</button></section>
    <section class="panel"><p class="eyebrow">ВЫБРАННЫЙ ОТРЯД</p>${u?`<h2>${TYPES[u.type].name}</h2><p class="small muted">${TYPES[u.type].description}</p><div class="unit-stats"><span>Воинов <b>${Math.ceil(u.men)} / ${u.initialMen}</b></span><span>Мораль <b>${Math.round(u.morale)} / 100</b></span><span>Усталость <b>${Math.round(u.fatigue*100)}%</b></span><span>Строй <b>${Math.round(u.cohesion*100)}%</b></span></div><p class="small">${u.routed?'Бегство — приказы недоступны':u.order.kind==='hold'?'Удерживает позицию':u.order.kind==='move'?'Выполняет движение':'Атакует противника'} · ${forestAt(u)?'лес':hillAt(u)?'холм':'равнина'}</p><button class="secondary full" data-action="hold" ${!alive(u)||b.winner?'disabled':''}>Удерживать позицию</button><button class="quiet full" data-action="withdraw-unit" ${!alive(u)||b.winner?'disabled':''}>Отвести отряд</button>`:'<p class="muted">Выбери отряд на карте или в списке.</p>'}</section>
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
  if(dialog==='help'){title='Как играть';body=`<ol><li>В Риме уже есть три отряда. Можно нанять крестьян за 35 денариев.</li><li>Выбери Аримин и нажми «Марш к городу». Армия идёт по дороге; «Следующий день» продолжает маршрут и приносит доход.</li><li>От Аримина двигайся к Фельсине. Рядом с врагом появится выбор ручного боя или автобоя.</li><li>В бою выбери отряд → землю для движения → противника для атаки. Shift + нажатие поворачивает фронт. Пробел ставит бой на паузу.</li><li>Обходи кавалерией, прикрывай стрелков, удерживай строй. Бегство соседей снижает мораль. Лес мешает коннице, холм даёт преимущество.</li></ol><p>На тактическом полигоне доступны все восемь типов войск. Он не влияет на кампанию.</p><p class="small muted">Сохранение автоматическое и локальное. После перезагрузки незаконченный бой продолжится на паузе. Карта схематична; сценарий не воспроизводит конкретную историческую битву.</p>`;}
  if(dialog==='catalog'){title='Восемь типов войск';body=`<div class="catalog">${TYPE_ORDER.map(t=>`<article><span class="unit-icon">${TYPES[t].icon}</span><div><h3>${TYPES[t].name}</h3><p>${TYPES[t].description}</p><small>${TYPES[t].men} воинов · мораль ${TYPES[t].morale} · ${TYPES[t].range>50?'дальний':'ближний'} бой</small></div></article>`).join('')}</div>`;}
  if(dialog==='reset'){title='Начать новую кампанию?';body='<p>Текущая кампания и незавершённый бой будут заменены. Рим снова начнёт с трёх отрядов.</p><button class="primary full" data-action="confirm-reset">Начать заново</button>';}
  if(dialog==='retreat'){title='Приказать отступление?';body='<p>Бой завершится поражением. Выжившие вернутся в Рим с текущими потерями.</p><button class="primary full" data-action="confirm-retreat">Отступить</button>';}
  container.innerHTML=`<div class="backdrop"><section class="dialog ${dialog==='catalog'?'wide':''}" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div class="section-top"><h2 id="dialog-title">${title}</h2><button class="icon-button" data-action="close" aria-label="Закрыть">×</button></div>${body}<button class="secondary full" data-action="close">${dialog==='reset'||dialog==='retreat'?'Отмена':'Понятно'}</button></section></div>`;
}
function nearestEnemy(u:{side:string;x:number;y:number}){return battle?.units.filter(v=>v.side!==u.side&&alive(v)).sort((a,b)=>distance(u,a)-distance(u,b))[0];}
function startBattle(training=false,automatic=false){
  if(battle)return;if(!training&&!canBattle(campaign)){showToast('Сначала подойди к армии бойев у Фельсины.');return;}
  battle=training?trainingBattle():createBattle(campaign.army,campaign.enemy,false,automatic);
  selectedUnit=battle.units.find(u=>u.side==='rome')!.id;paused=true;speed=1;accumulator=0;
  if(automatic){autoBattle(battle);}
  persist();render();
}
function finishBattle(){
  if(!battle)return;const b=battle;
  if(!b.training){
    campaign.army=survivors(b,'rome');campaign.enemy=survivors(b,'boii');campaign.route=[];campaign.movement=0;
    if(b.winner==='rome'){
      campaign.enemy=[];campaign.won=true;campaign.gold+=100;
      const city=campaign.cities.find(c=>c.id==='felsina')!;city.owner='rome';campaign.position={x:city.x,y:city.y};
      notice(campaign,`Победа у Фельсины! Потери: ${losses(b,'rome')} римлян. Северная граница под контролем. +100 денариев.`);
    }else{
      const city=campaign.cities.find(c=>c.id==='rome')!;campaign.position={x:city.x,y:city.y};
      notice(campaign,`${b.winner==='draw'?'Ничья':'Поражение'} у Фельсины. Потери: ${losses(b,'rome')}. Выжившие вернулись в Рим.`);
    }
    collectGarrison(campaign);
  }
  battle=null;selectedUnit=null;selectedCity=campaign.won?'felsina':'rome';paused=true;dialog=null;persist();render();
}
function onMap(p:Point,shift:boolean){
  if(dialog||battle?.winner)return;
  if(!battle){
    const city=campaign.cities.find(c=>distance(c,p)<26);
    if(city){selectedCity=city.id;render();return;}
    if(distance(campaign.position,p)<20){showToast('Армия выбрана. Нажми на сушу или выбери город для марша.');return;}
    const error=setDestination(campaign,p);if(error)showToast(error);else if(campaign.movement===0&&campaign.route.length)showToast('Запас движения исчерпан. Следующий день продолжит марш.');
    persist();render();return;
  }
  const selected=battle.units.find(u=>u.id===selectedUnit);
  if(shift&&selected&&alive(selected)){selected.angle=Math.atan2(p.y-selected.y,p.x-selected.x);selected.order={kind:'hold'};persist();render();return;}
  const hit=battle.units.filter(u=>u.men>=1&&distance(u,p)<30).sort((a,b)=>distance(a,p)-distance(b,p))[0];
  if(hit?.side==='rome'){selectedUnit=hit.id;render();return;}
  if(!selected||!alive(selected)){showToast('Выбери боеспособный римский отряд.');return;}
  selected.order=hit&&alive(hit)?{kind:'attack',target:hit.id}:{kind:'move',x:Math.max(30,Math.min(970,p.x)),y:Math.max(35,Math.min(610,p.y))};
  persist();render();
}
root.addEventListener('click',event=>{
  const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');if(!button||button.disabled)return;
  const action=button.dataset.action!,id=button.dataset.id!;
  if(action==='help'||action==='catalog'||action==='reset'){dialog=action;if(battle)paused=true;render();return;}
  if(action==='close'){dialog=null;render();return;}
  if(action==='confirm-reset'){campaign=newCampaign();battle=null;selectedCity='rome';selectedUnit=null;dialog=null;paused=true;persist();render();return;}
  if(action==='training'){startBattle(true);return;}
  if(action==='finish'){finishBattle();return;}
  if(action==='retreat'){if(battle?.training){finishBattle();return;}paused=true;dialog='retreat';render();return;}
  if(action==='confirm-retreat'&&battle){battle.winner='boii';battle.reason='Римский командующий приказал отступить.';dialog=null;persist();render();return;}
  if(!battle){
    if(action==='city'){selectedCity=id;}
    if(action==='unit'){selectedUnit=id;showToast(TYPES[campaign.army.find(u=>u.id===id)!.type].description);}
    if(action==='recruit'){const error=recruit(campaign,id);showToast(error??'Ополчение нанято.');}
    if(action==='next-day')nextDay(campaign);
    if(action==='stop-march')campaign.route=[];
    if(action==='march-city'){const city=campaign.cities.find(c=>c.id===id)!;const error=setDestination(campaign,city);if(error)showToast(error);}
    if(action==='battle'||action==='autobattle'){startBattle(false,action==='autobattle');return;}
  }else if(!battle.winner){
    const unit=battle.units.find(u=>u.id===selectedUnit);
    if(action==='unit')selectedUnit=id;
    if(action==='pause'){paused=!paused;accumulator=0;}
    if(action==='speed')speed=Number(button.dataset.speed);
    if(action==='hold'&&unit)unit.order={kind:'hold'};
    if(action==='withdraw-unit'&&unit)unit.order={kind:'move',x:55,y:unit.y};
    if(action==='hold-all')battle.units.filter(u=>u.side==='rome'&&alive(u)).forEach(u=>u.order={kind:'hold'});
    if(action==='advance-all')battle.units.filter(u=>u.side==='rome'&&alive(u)).forEach(u=>{const enemy=nearestEnemy(u);if(enemy)u.order={kind:'attack',target:enemy.id};});
  }
  persist();render();
});
document.addEventListener('keydown',event=>{
  if((event.target as HTMLElement).matches('input,textarea,select')||event.repeat)return;
  if(event.code==='Escape'){dialog=null;render();}
  if(event.code==='Space'&&battle&&!battle.winner&&!dialog){event.preventDefault();paused=!paused;accumulator=0;render();}
});
function tick(delta:number){
  if(battle&&!paused&&!dialog&&!battle.winner){accumulator+=delta*speed;let steps=0;while(accumulator>=BATTLE_STEP&&steps<12){stepBattle(battle);accumulator-=BATTLE_STEP;steps++;if(battle.winner){paused=true;persist();render();break;}}}
  uiTime+=delta;saveTime+=delta;if(uiTime>.5){uiTime=0;if(battle&&!dialog&&!battle.winner)render();}if(saveTime>3){saveTime=0;persist();}
}
const scene=new MapScene(()=>({campaign,battle,selectedUnit,selectedCity}),onMap,tick);
new Phaser.Game({type:Phaser.AUTO,parent:'game',width:1000,height:650,backgroundColor:'#e2dbc1',scene:[scene],scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},render:{antialias:true},audio:{noAudio:true}});
window.addEventListener('pagehide',persist);
render();persist();
// A small read-only inspection hook for automated integration checks.
Object.defineProperty(window,'strategyABC',{value:{snapshot:()=>structuredClone({campaign,battle,paused,selectedUnit})},writable:false});
