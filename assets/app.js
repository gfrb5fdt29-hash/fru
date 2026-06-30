(function(){
 'use strict';
 // Mobilon ne nagyítson rá dupla koppintásra az app felülete.
 document.addEventListener('dblclick', function(e){ e.preventDefault(); }, {passive:false});

 const DATA = window.BALANCE_DATA || {};
 const $ = (sel, root=document) => root.querySelector(sel);
 const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
 const storagePrefix = 'balance1600.';
 const storeKeys = {
  settings: storagePrefix + 'settings',
  mealChecks: storagePrefix + 'mealChecks',
  shoppingChecks: storagePrefix + 'shoppingChecks',
  favorites: storagePrefix + 'favorites',
  tracking: storagePrefix + 'trackingEntries',
  ui: storagePrefix + 'uiState'
 };

 const todayIso = () => {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0,10);
 };

 function readStore(key, fallback){
  try{
   const raw = localStorage.getItem(key);
   return raw ? JSON.parse(raw) : fallback;
  }catch(e){ return fallback; }
 }
 function writeStore(key, value){ localStorage.setItem(key, JSON.stringify(value)); }

 let settings = readStore(storeKeys.settings, {
  onboardingCompleted:false,
  dietStartDate: todayIso(),
  cycleModuleEnabled:true,
  cycleStartDate: todayIso(),
  cycleLengthDays:28,
  waterGoalMl:2500,
  trackingMode:'detailed'
 });
 let mealChecks = readStore(storeKeys.mealChecks, {});
 let shoppingChecks = readStore(storeKeys.shoppingChecks, {});
 let favorites = readStore(storeKeys.favorites, {});
 let trackingEntries = readStore(storeKeys.tracking, {});
 const defaultUi = {activeTab:'today', selectedDayNumber:null, activeWeek:1, shoppingView:'today', shoppingWeek:1, shoppingDayNumber:null, shoppingMergeDays:[], onlyOpen:false, recipeSearch:'', recipeFilters:[], dayReturnTab:'weeks', trackingWeek:1};
 let ui = {...defaultUi, ...readStore(storeKeys.ui, {})};
 let navStack = [];

 function snapshotUi(){
  return {
   activeTab: ui.activeTab,
   selectedDayNumber: ui.selectedDayNumber,
   activeWeek: ui.activeWeek,
   shoppingView: ui.shoppingView,
   shoppingWeek: ui.shoppingWeek,
   shoppingDayNumber: ui.shoppingDayNumber,
   shoppingMergeDays: Array.isArray(ui.shoppingMergeDays) ? [...ui.shoppingMergeDays] : [],
   trackingWeek: ui.trackingWeek,
   dayReturnTab: ui.dayReturnTab,
   dayReturnWeek: ui.dayReturnWeek
  };
 }
 function sameNavState(a,b){
  return a && b && a.activeTab === b.activeTab && a.selectedDayNumber === b.selectedDayNumber && a.activeWeek === b.activeWeek && a.shoppingView === b.shoppingView && a.trackingWeek === b.trackingWeek;
 }
 function pushNavState(){
  const snap = snapshotUi();
  const last = navStack[navStack.length - 1];
  if(!sameNavState(last, snap)){
   navStack.push(snap);
   if(navStack.length > 24) navStack.shift();
  }
 }
 function restoreNavState(state){
  if(!state) return false;
  ui = {...ui, ...state};
  render({resetTop:true});
  return true;
 }

 const weeks = DATA.weeks || [];
 const allDays = weeks.flatMap(w => (w.days || []).map((d, idx) => ({...d, globalDayNumber:(d.week-1)*7 + (d.day_number_in_week || idx+1)})));
 const recipes = DATA.recipe_library || [];
 const recipesById = new Map(recipes.map(r => [r.recipe_id, r]));
 const tagLabels = new Map((DATA.tag_catalog || []).map(t => [t.tag_id, t.label_hu]));
 const usageByRecipe = new Map((DATA.recipe_usage_map || []).map(u => [u.recipe_id, u]));

 const SLOT_LABELS = {reggeli:'Reggeli', ebéd:'Ebéd', ebed:'Ebéd', uzsonna:'Uzsonna', vacsora:'Vacsora'};

 function mealSlotKey(slot){
  return String(slot || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 }
 const MEAL_ICON_SRC = {
  reggeli:'assets/meal-icons/reggeli.png',
  ebed:'assets/meal-icons/ebed.png',
  uzsonna:'assets/meal-icons/uzsonna.png',
  vacsora:'assets/meal-icons/vacsora.png'
 };
 function mealSlotIcon(slot){
  const key = mealSlotKey(slot);
  const src = MEAL_ICON_SRC[key] || MEAL_ICON_SRC.ebed;
  return `<img class="meal-slot-img" src="${src}" alt="" aria-hidden="true" loading="lazy" draggable="false">`;
 }
 function mealInlineIcon(slot){
  const key = mealSlotKey(slot);
  const src = MEAL_ICON_SRC[key] || MEAL_ICON_SRC.ebed;
  return `<img class="meal-inline-icon" src="${src}" alt="" aria-hidden="true" loading="lazy" draggable="false">`;
 }
 function mealCalendarIcon(slot){
  const key = mealSlotKey(slot);
  const src = MEAL_ICON_SRC[key] || MEAL_ICON_SRC.ebed;
  return `<img class="meal-calendar-icon" src="${src}" alt="" aria-hidden="true" loading="lazy" draggable="false">`;
 }
 const SLOT_ICON = {reggeli:'R', ebéd:'E', ebed:'E', uzsonna:'U', vacsora:'V'};
 const PHASE_LABELS = {
  menstruacio:'Menstruáció', korai_follikularis:'Korai follikuláris', follikularis:'Follikuláris', ovulacio:'Ovuláció',
  korai_lutealis:'Korai luteális', kesoi_lutealis:'Késői luteális', pms_kesoi_lutealis:'PMS / késői luteális', kesoi_lutealis_pms:'PMS / késői luteális'
 };
 const GROUP_LABELS = {
  vegetable:'Zöldség', fruit:'Gyümölcs', fresh_protein:'Friss fehérje', fresh_dairy:'Friss tejtermék',
  grain_carb:'Gabona és köret', pasta_noodle:'Tészta és rizstészta', plant_drink:'Növényi ital', plant_protein:'Növényi fehérje', fat:'Zsiradék', sweetener:'Édesítő', other:'Egyéb'
 };

 function esc(v){
  return String(v ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 }
 const HUMAN_TEXT_REPLACEMENTS = [
  [/pms_kesoi_lutealis|kesoi_lutealis_pms/gi, 'PMS / késői luteális szakasz'],
  [/kesoi_lutealis/gi, 'késői luteális szakasz'],
  [/korai_lutealis/gi, 'korai luteális szakasz'],
  [/korai_follikularis/gi, 'korai follikuláris szakasz'],
  [/follikularis/gi, 'follikuláris szakasz'],
  [/menstruacio/gi, 'menstruációs szakasz'],
  [/ovulacio/gi, 'ovulációs szakasz'],
  [/full_meat_free_day|full_dairy_free_day|full_plant_based_day/gi, 'speciális napi jelölés'],
  [/has_pasta_or_noodle/gi, 'tésztás vagy rizstésztás nap'],
  [/has_salty_dairy_free_breakfast/gi, 'sós tejmentes reggeli'],
  [/raw_freeze_candidates/gi, 'nyersen porciózható fehérjék'],
  [/same_day_fresh_dairy_items/gi, 'aznap fogyasztandó friss tejtermékek']
 ];
 function humanizeText(text){
  let out = String(text || '');
  HUMAN_TEXT_REPLACEMENTS.forEach(([pattern, replacement]) => { out = out.replace(pattern, replacement); });
  return out
   .replace(/[_]+/g, ' ')
   .replace(/\s{2,}/g, ' ')
   .trim();
 }
 function stripTechText(text){
  return humanizeText(String(text || '')
   .replace(/\bV\s?3\.1\s*[:–—-]?\s*/gi, '')
   .replace(/\bv\s?3\.1\s*[:–—-]?\s*/gi, '')
   .replace(/\bV\s?3\s*[:–—-]?\s*/gi, '')
   .replace(/\bv\s?3\s*[:–—-]?\s*/gi, '')
   .replace(/PWA/gi, 'app')
   .replace(/JSON/gi, 'étrend')
   .replace(/adatlista/gi, 'étrend')
   .replace(/adatforrás/gi, 'tartalom')
   .replace(/validation report/gi, 'ellenőrzés')
   .replace(/schema/gi, 'felépítés')
   .replace(/localStorage|IndexedDB/gi, 'a készülék'));
 }
 function formatHuNumber(value, maxDecimals=2){
  const n = Number(value);
  if(!Number.isFinite(n)) return String(value ?? '');
  return n.toLocaleString('hu-HU', {minimumFractionDigits:0, maximumFractionDigits:maxDecimals});
 }
 function formatAmountValue(value, unit){
  const n = Number(value);
  const u = String(unit || '').trim();
  if(!Number.isFinite(n)) return `${value ?? ''}${u ? ' ' + u : ''}`.trim();
  if(u.toLowerCase() === 'g' && Math.abs(n) >= 1000){
   return `${formatHuNumber(n / 1000, 2)} kg`;
  }
  if(u.toLowerCase() === 'ml' && Math.abs(n) >= 1000){
   return `${formatHuNumber(n / 1000, 2)} l`;
  }
  return `${formatHuNumber(n, n % 1 ? 1 : 0)}${u ? ' ' + u : ''}`;
 }
 function itemNetAmount(item){
  return Number(item?.net_amount ?? item?.amount ?? 0);
 }
 function itemBuyAmount(item){
  return Number(item?.recommended_purchase_amount ?? item?.amount ?? item?.net_amount ?? 0);
 }
 function humanAmount(item){
  if(item && (item.net_amount !== undefined || item.recommended_purchase_amount !== undefined || item.amount !== undefined)){
   const unit = item.unit || '';
   const net = itemNetAmount(item);
   const buy = itemBuyAmount(item);
   const netPart = Number.isFinite(net) && net > 0 ? `Recepthez ${formatAmountValue(net, unit)}` : '';
   const buyPart = Number.isFinite(buy) && buy > 0 ? `Vedd meg kb. ${formatAmountValue(buy, unit)}` : '';
   return [netPart, buyPart].filter(Boolean).join('; ');
  }
  const raw = item?.pwa_display_amount_hu || `${item?.amount ?? item?.net_amount ?? ''} ${item?.unit || ''}`;
  return stripTechText(raw)
   .replace(/nettó/gi, 'Recepthez')
   .replace(/vásárláshoz kb\./gi, 'Vedd meg kb.')
   .replace(/vásárláshoz/gi, 'Vedd meg')
   .replace(/mennyiségből/gi, 'mennyiség alapján');
 }
 function humanNote(text){
  return stripTechText(text || '').replace(/nettó mennyiség/gi, 'Recepthez számolt mennyiség');
 }
 function saveAll(){
  writeStore(storeKeys.settings, settings);
  writeStore(storeKeys.mealChecks, mealChecks);
  writeStore(storeKeys.shoppingChecks, shoppingChecks);
  writeStore(storeKeys.favorites, favorites);
  writeStore(storeKeys.tracking, trackingEntries);
  writeStore(storeKeys.ui, ui);
 }
 function toast(msg){
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(()=>el.classList.remove('show'), 2100);
 }
 if('scrollRestoration' in history) history.scrollRestoration = 'manual';
 function forceTopOnce(){
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  const view = $('#view');
  if(view) view.scrollTop = 0;
 }
 function scrollToViewTop(){
  forceTopOnce();
  requestAnimationFrame(forceTopOnce);
  setTimeout(forceTopOnce, 40);
  setTimeout(forceTopOnce, 140);
 }
 function resetSheetTop(){
  const sheet = $('#sheet');
  const body = $('#sheetBody');
  if(sheet){ sheet.scrollTop = 0; if(sheet.scrollTo) sheet.scrollTo({top:0,left:0,behavior:'auto'}); }
  if(body){ body.scrollTop = 0; if(body.scrollTo) body.scrollTo({top:0,left:0,behavior:'auto'}); }
 }
 function parseDate(iso){ return new Date((iso || todayIso()) + 'T00:00:00'); }
 function dayDiff(a,b){ return Math.floor((parseDate(b) - parseDate(a)) / 86400000); }
 function addDays(date, days){ const d = new Date(date); d.setDate(d.getDate() + Number(days || 0)); return d; }
 function currentCycleOffsetDays(){
  const diff = dayDiff(settings.dietStartDate, todayIso());
  if(diff < 0) return 0;
  return Math.floor(diff / 28) * 28;
 }
 function actualDateForDay(day){ return addDays(parseDate(settings.dietStartDate || todayIso()), currentCycleOffsetDays() + (Number(day?.globalDayNumber || 1) - 1)); }
 function weekdayHu(date){ return ['Vasárnap','Hétfő','Kedd','Szerda','Csütörtök','Péntek','Szombat'][date.getDay()]; }
 function weekdayLower(day){ return weekdayHu(actualDateForDay(day)).toLowerCase(); }
 function calendarShort(date){ return date.toLocaleDateString('hu-HU', {month:'long', day:'numeric'}); }
 function headerTodayDateLabel(){
  const raw = new Date().toLocaleDateString('hu-HU', {month:'long', day:'numeric'}).trim();
  const label = raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : '';
  return /\d\.$/.test(label) ? label : label.replace(/(\d)$/, '$1.');
 }
 function updateHeaderDate(){
  const el = $('#headerTodayDate');
  if(el) el.textContent = headerTodayDateLabel();
 }
 function dayDisplayName(day){ return weekdayHu(actualDateForDay(day)); }
 function dayCalendarShort(day){ return calendarShort(actualDateForDay(day)); }
 function dayNumericShort(day){
  const d = actualDateForDay(day);
  return `${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}.`;
 }
 function fullDateLabel(day){ return `${dayCalendarShort(day)} · ${weekdayLower(day)}`; }
 function weekCardDateTitle(day){ return `${weekdayLower(day)} · ${dayCalendarShort(day)}`; }
 function planDayLabel(day){ return `${day.week}. hét · ${day.day_number_in_week}. nap`; }
 function currentPlanDayNumber(){
  const diff = dayDiff(settings.dietStartDate, todayIso());
  if(diff < 0) return 1;
  return (diff % 28) + 1;
 }
 function planIsFuture(){ return dayDiff(settings.dietStartDate, todayIso()) < 0; }
 function planIsFinished(){ return false; }
 function selectedDay(){
  const n = ui.selectedDayNumber || currentPlanDayNumber();
  return allDays.find(d => d.globalDayNumber === n) || allDays[0];
 }
 function dayForOccurrence(occ){
  return allDays.find(d => d.week === Number(occ?.week) && d.day_number_in_week === Number(occ?.day_number_in_week));
 }
 function dayLabel(day){ return planDayLabel(day); }
 function dayLabelWithDate(day){ return `${fullDateLabel(day)} · ${planDayLabel(day)}`; }

 function dateLogicHelpHtml(){
  return `<div class="date-logic-help card-soft-note">
   <b>Dátumlogika röviden</b>
   <span>Az app a megadott diéta kezdőnapból és a telefon aktuális dátumából számolja, hogy ma a 28 napos terv melyik napja fut. A terv 1–4. hétként marad meg, de a napok mellé valós dátum kerül. Példa: ha kedden kezded, akkor az 1. nap keddi kezdésként jelenik meg; 28 nap után a terv automatikusan újraindul az 1. naptól.</span>
  </div>`;
 }
 function cycleLabels(tags){ return (tags || []).map(t => PHASE_LABELS[t] || tagLabels.get(t) || humanizeText(t)).filter(Boolean); }
 function tagLabel(tag){ return tagLabels.get(tag) || PHASE_LABELS[tag] || humanizeText(tag); }
 function riskText(level){
  const n = Number(level || 0);
  if(n <= 0) return 'kímélő';
  if(n === 1) return 'enyhe figyelem';
  if(n === 2) return 'egyéni teszt';
  return 'erősebb figyelem';
 }
 function maxMealRisk(meal){
  const r = meal?.meal_card?.risk_badges || {};
  return Math.max(Number(r.reflux||0), Number(r.histamine||0), Number(r.purine||0));
 }
 function maxRecipeRisk(recipe){
  const r = recipe?.risk_scores || {};
  return Math.max(Number(r.reflux_risk_level||0), Number(r.histamine_caution_level||0), Number(r.purine_caution_level||0), Number(r.bloating_risk_level||0));
 }
 function macroLine(macros){ return `${macros?.protein ?? 0}g feh. · ${macros?.carbohydrate ?? 0}g ch · ${macros?.fat ?? 0}g zsír`; }
 function mealKey(day, meal){ return `${day.day_id}|${meal.slot}|${meal.recipe_id}`; }
 function shoppingKey(scope, parts){ return `${scope}|${parts.map(p=>String(p).replaceAll('|','-')).join('|')}`; }
 function progressForDay(day){
  const done = (day.meals || []).filter(m => mealChecks[mealKey(day,m)]).length;
  return {done, total:(day.meals || []).length || 4, pct: Math.round(done / ((day.meals || []).length || 4) * 100)};
 }
 function motivation(done,total){
  if(done === 0) return 'Szép, nyugodt indulás';
  if(done < total/2) return 'Jó tempóban haladsz';
  if(done < total) return 'Félig már megvan';
  return 'Mai terv teljesítve';
 }
 function render(options = {}){
  const activeKey = ui.activeTab === 'dayDetail' ? (ui.dayReturnTab || 'weeks') : ui.activeTab;
  document.body.dataset.activeTab = activeKey || 'today';
  $$('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === activeKey));
  try{
   if(ui.activeTab === 'dayDetail') renderDayPage();
   else if(ui.activeTab === 'weeks') renderWeeks();
   else if(ui.activeTab === 'recipes') renderRecipes();
   else if(ui.activeTab === 'shopping') renderShopping();
   else if(ui.activeTab === 'tracking') renderTracking();
   else renderToday();
  }catch(err){
   console.error('View render failed', err);
   $('#view').innerHTML = `<section class="card section"><div class="card-pad stack"><h1 class="headline">Ez a nézet most nem töltődött be.</h1><p class="small-muted">Lépj vissza a főoldalra, majd próbáld újra. A többi fül továbbra is elérhető.</p><button class="primary-btn wide" data-action="goHome">Főoldal</button></div></section>`;
  }
  writeStore(storeKeys.ui, ui);
  const viewEl = $('#view');
  if(viewEl){
   if(!options.noAnimate){
    viewEl.classList.remove('view-enter');
    void viewEl.offsetWidth;
    viewEl.classList.add('view-enter');
   }
   viewEl.focus({preventScroll:true});
  }
  if(options.resetTop) scrollToViewTop();
  updateHeaderDate();
  requestAnimationFrame(updateHeaderCompact);
 }

 function statHero(day){
  const p = progressForDay(day);
  const totals = day.daily_totals || {};
  const planNote = planIsFuture() ? '<div class="chip blue">Az étrend még nem indult el</div>' : (planIsFinished() ? '<div class="chip warn">A 28 napos kör végére értél</div>' : '');
  return `
   <section class="hero card section">
    <div class="hero-top">
     <div>
      <div class="eyebrow">Tervezett mai érték</div>
      <div class="day-label">${esc(fullDateLabel(day))}</div>
      <div class="small-muted">${esc(planDayLabel(day))} · ${esc(motivation(p.done,p.total))} · ${p.done}/${p.total} étkezés</div>
     </div>
     <div class="kcal-bubble"><b>${esc(totals.energy_kcal || 0)}</b><span>kcal</span></div>
    </div>
    <div class="metric-row">
     <div class="metric"><b>${esc(totals.protein || 0)}g</b><span>Fehérje</span></div>
     <div class="metric"><b>${esc(totals.carbohydrate || 0)}g</b><span>Szénhidrát</span></div>
     <div class="metric"><b>${esc(totals.fat || 0)}g</b><span>Zsír</span></div>
     <div class="metric"><b>${p.done}/${p.total}</b><span>Haladás</span></div>
    </div>
    <div class="progress-track" aria-label="Napi haladás"><div class="progress-fill" style="width:${p.pct}%"></div></div>
    <div class="day-switch">
     <button class="ghost-btn" data-action="prevDay" aria-label="Előző nap">‹</button>
     <button class="ghost-btn wide" data-action="openDayPicker">Nap választása</button>
     <button class="ghost-btn" data-action="nextDay" aria-label="Következő nap">›</button>
    </div>
    ${planNote ? `<div class="chip-row" style="margin-top:10px">${planNote}</div>` : ''}
   </section>`;
 }

 function focusBlock(day){
  const chips = [];
  const flags = day.daily_flags || {};
  if(flags.full_meat_free_day && flags.full_dairy_free_day) chips.push('teljes húsmentes és tejmentes nap');
  if(flags.full_plant_based_day) chips.push('növényi nap');
  if(flags.has_pasta_or_noodle) chips.push('tésztás / rizstésztás nap');
  if(flags.has_salty_dairy_free_breakfast) chips.push('sós tejmentes reggeli');
  if(settings.cycleModuleEnabled) chips.push(...cycleLabels(day.cycle_phase_tags || []).slice(0,2));
  return `
   <section class="card section"><div class="card-pad">
    <h2 class="headline">Mai fókusz</h2>
    <p class="small-muted">${esc(day.daily_focus_hu || 'Kímélő, jól követhető napi terv.')}</p>
    <div class="chip-row">${chips.map(c=>`<span class="chip">${esc(c)}</span>`).join('') || '<span class="chip soft">egyszerű kímélő nap</span>'}</div>
   </div></section>`;
 }

 function mealRiskChips(meal){
  const badges = meal.meal_card?.risk_badges || {};
  const rows = [
   ['Reflux', badges.reflux, 'green'],
   ['Hisztamin', badges.histamine, Number(badges.histamine||0) >= 2 ? 'warn' : 'green'],
   ['Purin', badges.purine, Number(badges.purine||0) >= 2 ? 'warn' : 'green']
  ];
  return rows
   .filter(([,v]) => v !== undefined && v !== null && v !== '')
   .map(([label,v,cls]) => `<span class="chip ${cls} meal-risk-chip">${esc(label)}: ${esc(riskText(v))}</span>`)
   .join('');
 }

 function mealCard(day, meal){
  const checked = !!mealChecks[mealKey(day,meal)];
  const tags = (meal.meal_card?.primary_tags || []).slice(0,3).map(stripTechText);
  const recipe = recipesById.get(meal.recipe_id) || {};
  const speed = cookingSpeedLabel(recipe);
  const slotClass = String(meal.slot || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-') || 'fogas';
  return `<article class="meal-card meal-slot-${esc(slotClass)} ${checked ? 'done' : ''}" data-action="openRecipe" data-recipe="${esc(meal.recipe_id)}">
    <div class="meal-slot">${mealSlotIcon(meal.slot)}</div>
    <div class="meal-body">
     <div class="meal-title">${esc(meal.name_hu)}</div>
     <div class="meal-meta"><span class="meal-meta-slot">${mealInlineIcon(meal.slot)}<span>${esc(SLOT_LABELS[meal.slot] || meal.slot)}</span></span><span>${esc(meal.energy_kcal)} kcal</span><span>${esc(meal.macros_g?.protein || 0)}g feh.</span><span class="cook-mini ${cookingSpeedClass(recipe)}">${esc(speed)}</span></div>
     <div class="meal-indicators">
      ${tags.map(t=>`<span class="chip soft">${esc(t)}</span>`).join('')}
      ${mealRiskChips(meal)}
     </div>
    </div>
    <button class="check ${checked ? 'checked' : ''}" data-action="toggleMeal" data-day="${esc(day.day_id)}" data-slot="${esc(meal.slot)}" data-recipe="${esc(meal.recipe_id)}" aria-label="Étkezés kipipálása"></button>
   </article>`;
 }

 function renderToday(){
  const day = selectedDay();
  const risks = day.day_risk_overview || {};
  $('#view').innerHTML = `
   ${statHero(day)}
   ${focusBlock(day)}
   <section class="section stack" aria-label="Mai étkezések">
    ${(day.meals || []).map(m => mealCard(day,m)).join('')}
   </section>
   <section class="card section"><div class="card-pad stack">
    <div>
     <h2 class="headline">Esti kímélő tipp</h2>
     <p class="small-muted">${esc(day.evening_tip_hu || DATA.timing_rules?.pwa_reminder_templates_hu?.dinner_time || '')}</p>
    </div>
    <div class="chip-row">
     <span class="chip green">Reflux: ${esc(riskText(risks.max_reflux_risk_level))}</span>
     <span class="chip ${Number(risks.max_histamine_caution_level||0) >= 2 ? 'warn' : 'green'}">Hisztamin: ${esc(riskText(risks.max_histamine_caution_level))}</span>
     <span class="chip ${Number(risks.max_purine_caution_level||0) >= 2 ? 'warn' : 'green'}">Purin: ${esc(riskText(risks.max_purine_caution_level))}</span>
    </div>
    <div class="grid2">
     <button class="primary-btn" data-action="openDayDetails">Mai részletek</button>
     <button class="ghost-btn" data-action="openTracking">Napló</button>
    </div>
   </div></section>
   <div class="footer-space"></div>`;
 }

 function renderWeeks(){
  const week = weeks.find(w => w.week === ui.activeWeek) || weeks[0];
  const weekDays = allDays.filter(d => d.week === (week?.week || ui.activeWeek));
  $('#view').innerHTML = `
   <section class="section">
    <h1 class="headline">Naptár</h1>
    <p class="small-muted">Válassz hetet, majd nyisd meg a kívánt napot külön lapon.</p>
    <div class="week-tabs uniform-week-tabs">${weeks.map(w => `<button class="week-card week-select ${w.week === ui.activeWeek ? 'active' : ''}" data-action="selectWeek" data-week="${w.week}"><b>${w.week}. hét</b></button>`).join('')}</div>
   </section>
   <section class="card section"><div class="card-pad">
    <h2 class="headline">${esc(week.theme || `${week.week}. hét`)}</h2>
    <p class="small-muted">${esc(week.focus || '')}</p>
    <div class="chip-row">${cycleLabels(week.phase || []).map(p=>`<span class="chip blue">${esc(p)}</span>`).join('')}</div>
   </div></section>
   <section class="section week-days-list">
    ${weekDays.map(day => {
     const flags = day.daily_flags || {};
     const dayChips = [];
     if(flags.full_meat_free_day && flags.full_dairy_free_day) dayChips.push('hús- és tejmentes');
     if(flags.full_plant_based_day) dayChips.push('növényi');
     if(flags.has_pasta_or_noodle) dayChips.push('tészta');
     if(flags.has_salty_dairy_free_breakfast) dayChips.push('sós reggeli');
     const cycle = settings.cycleModuleEnabled ? cycleLabels(day.cycle_phase_tags || []).slice(0,1) : [];
     const selected = day.globalDayNumber === ui.selectedDayNumber;
     return `<article class="mini-day week-day-card ${selected ? 'active' : ''}" data-action="weekDay" data-daynum="${day.globalDayNumber}">
      <div class="week-day-head">
       <div>
        <div class="day-n">${esc(weekCardDateTitle(day))}</div>
        <div class="small-muted">${esc(planDayLabel(day))} · ${esc(day.daily_focus_hu || '')}</div>
       </div>
       <div class="week-kcal"><b>${esc(day.daily_totals?.energy_kcal || 0)}</b><span>kcal</span></div>
      </div>
      <div class="metric-row compact-metrics">
       <div class="metric"><b>${esc(day.daily_totals?.protein || 0)}g</b><span>Feh.</span></div>
       <div class="metric"><b>${esc(day.daily_totals?.carbohydrate || 0)}g</b><span>CH</span></div>
       <div class="metric"><b>${esc(day.daily_totals?.fat || 0)}g</b><span>Zsír</span></div>
       <div class="metric"><b>${esc((day.meals || []).length)}</b><span>Étkezés</span></div>
      </div>
      <div class="chip-row" style="margin:10px 0">${[...dayChips, ...cycle].slice(0,4).map(c=>`<span class="chip soft">${esc(c)}</span>`).join('') || '<span class="chip soft">kímélő nap</span>'}</div>
      <div class="week-meals">
       ${(day.meals || []).map(m => `<div class="meal-mini calendar-meal-mini"><b class="meal-mini-label calendar-icon-only" aria-label="${esc(SLOT_LABELS[m.slot] || m.slot)}">${mealCalendarIcon(m.slot)}</b><span>${esc(m.name_hu)}</span><em>${esc(m.energy_kcal)} kcal</em></div>`).join('')}
      </div>
     </article>`;
    }).join('')}
   </section>
   <div class="footer-space"></div>`;
 }

 function mealSummary(day){
  return (day.meals || []).map(m => `${SLOT_LABELS[m.slot] || m.slot}: ${m.name_hu} (${m.energy_kcal} kcal)`).join('; ');
 }
 function dayFlagLabels(day){
  const f = day.daily_flags || {};
  const labels = [];
  if(f.full_meat_free_day && f.full_dairy_free_day) labels.push('teljes húsmentes és tejmentes nap');
  if(f.full_plant_based_day) labels.push('növényi nap');
  if(f.has_pasta_or_noodle) labels.push('tésztás / rizstésztás fogás is van benne');
  if(f.has_salty_dairy_free_breakfast) labels.push('sós, tejmentes reggeli');
  return labels;
 }
 function mainProteinMeals(day){
  return (day.meals || []).filter(m => /csirke|pulyka|sert|hús|mell/i.test(m.name_hu || '')).map(m => `${SLOT_LABELS[m.slot] || m.slot}: ${m.name_hu}`);
 }
 function cycleSuggestionText(day){
  const labels = cycleLabels(day.cycle_phase_tags || []);
  const suggestions = DATA.cycle_phase_suggestions || {};
  const notes = (day.cycle_phase_tags || []).map(t => suggestions[t]?.pwa_tip_hu || suggestions[t]?.food_focus_hu?.slice(0,2).join(', ')).filter(Boolean);
  if(!labels.length) return 'Ehhez a naphoz nincs külön ciklusfázis kiemelés, ezért a hangsúly az egyszerű, kímélő napi ritmuson van.';
  return `A nap ciklusfókusza: ${labels.join(' és ')}. ${notes.length ? notes.map(stripTechText).join(' ') : 'A választott ételek a stabil energiát, a kímélő emésztést és a könnyen követhető napi ritmust támogatják.'}`;
 }
 function dailyWhySections(day){
  const totals = day.daily_totals || {};
  const flags = dayFlagLabels(day);
  const meals = day.meals || [];
  const dinner = meals.find(m => m.slot === 'vacsora') || meals[3];
  const breakfast = meals.find(m => m.slot === 'reggeli');
  const lunch = meals.find(m => m.slot === 'ebéd' || m.slot === 'ebed');
  const snack = meals.find(m => m.slot === 'uzsonna');
  const highest = [...meals].sort((a,b)=>Number(b.energy_kcal||0)-Number(a.energy_kcal||0))[0];
  const freshItems = (day.shopping_micro_plan?.daily_fresh_items || []).slice(0,6).map(i => i.item).filter(Boolean);
  const pantryItems = (day.shopping_micro_plan?.daily_pantry_or_stable_items || []).slice(0,4).map(i => i.item).filter(Boolean);
  const risk = day.day_risk_overview || {};
  const cycle = cycleLabels(day.cycle_phase_tags || []).join(' és ');
  const mealLine = meals.map(m => `${SLOT_LABELS[m.slot] || m.slot}: ${m.name_hu} (${m.energy_kcal} kcal)`).join('; ');
  const dinnerShare = totals.energy_kcal ? Math.round(Number(dinner?.energy_kcal || 0) / Number(totals.energy_kcal) * 100) : 0;
  const proteinFocus = mainProteinMeals(day);
  const carbNames = ['rizs','burgonya','zab','quinoa','köles','hajdina','tészta','rizstészta','édesburgonya'];
  const carbFocus = [...new Set(meals.flatMap(m => carbNames.filter(c => (m.name_hu || '').toLowerCase().includes(c))))].slice(0,4);
  const special = flags.length ? flags.join(', ') : (day.daily_focus_hu || 'kímélő, egyszerű napi ritmus');
  const eveningText = dinner
   ? `Ma este a(z) ${dinner.name_hu.toLowerCase()} zárja a napot (${dinner.energy_kcal} kcal). Ez a teljes napi terv kb. ${dinnerShare}%-a, ezért nem tolja túl erősen estére az energiát. ${snack ? `Az uzsonna (${snack.name_hu.toLowerCase()}) azért van jó helyen, hogy vacsorára ne farkaséhesen érkezz.` : 'Uzsonna nélkül is az a legjobb, ha a vacsora nyugodt, korábbi lezárás marad.'}`
   : `Ma este a fő cél a nyugodt, nem kapkodós lezárás: kis adag, lassabb tempó, lefekvés előtt kellő idővel.`;
  return [
   {
    title:'Miért így?',
    text:`Ez a nap nem véletlenül ilyen: a fő fókusz ma ${day.daily_focus_hu || 'egy kímélő, jól követhető ritmus'}. A napi terv ${totals.energy_kcal || 0} kcal, benne ${totals.protein || 0} g fehérjével, ${totals.carbohydrate || 0} g szénhidráttal és ${totals.fat || 0} g zsírral. A legnagyobb falat ma ${highest ? `${SLOT_LABELS[highest.slot] || highest.slot}: ${highest.name_hu} (${highest.energy_kcal} kcal)` : 'nem külön kiemelt'}, így a nap nem lesz túl nehéz estére. Mai külön jelleg: ${special}.`
   },
   {
    title:'Étkezési ritmus',
    text:`A négy étkezés azért van szépen szétosztva, hogy ne egyszerre kelljen nagy adaggal terhelni a gyomrát. ${breakfast ? `A reggeli (${breakfast.name_hu.toLowerCase()}) adja a puhább indulást,` : 'A reggeli adja az indulást,'} ${lunch ? `az ebéd (${lunch.name_hu.toLowerCase()}) viszi a nap főbb energiáját,` : 'az ebéd viszi a nap főbb energiáját,'} ${snack ? `az uzsonna (${snack.name_hu.toLowerCase()}) megtartja az egyensúlyt,` : 'az uzsonna a nap közepét tartja egyensúlyban,'} ${dinner ? `a vacsora (${dinner.name_hu.toLowerCase()}) pedig nyugodtabb esti zárás.` : 'a vacsora pedig az esti zárás.'}`
   },
   {
    title:'Reflux logika',
    text:`A mai reflux-jelzés: ${riskText(risk.max_reflux_risk_level)}. A nap paradicsom, citrus, csípős rész és bő olajban sütés nélkül marad. ${dinner ? `A vacsora ${dinner.energy_kcal} kcal, ezért az segít a legtöbbet, ha ez nem késő esti, gyors evés, hanem korábbi, lassabb tempójú étkezés.` : 'Az esti étkezést érdemes korábban és nyugodtabban lezárni.'}`
   },
   {
    title:'Frissesség és hisztamin',
    text:`Hisztamin oldalról a mai jelzés: ${riskText(risk.max_histamine_caution_level)}. ${freshItems.length ? `A legfontosabb frissen kezelendő tételek: ${freshItems.join(', ')}.` : 'Ma nincs külön erősen kiemelt friss tétel.'} ${pantryItems.length ? `A stabilabb alapok közül ezek segítik a napot: ${pantryItems.join(', ')}.` : ''} Itt az aznapi készítés vagy a nyers porciózás a legjobb irány, nem a másnapos készétel.`
   },
   {
    title:'Purin kontroll',
    text:`Purin szempontból a mai jelzés: ${riskText(risk.max_purine_caution_level)}. ${proteinFocus.length ? `A fehérjés pontok ma: ${proteinFocus.join('; ')}.` : 'Ma nincs nagy húsos fókusz, inkább könnyebb alapokra épül a nap.'} ${carbFocus.length ? `A kímélő energia alapja főleg: ${carbFocus.join(', ')}.` : ''} Belsőség, hal, tenger gyümölcsei és koncentrált húslé nincs benne.`
   },
   {
    title:'Ciklushoz igazítva',
    text:`${cycle ? `Mai ciklusfókusz: ${cycle}. ` : ''}${cycleSuggestionText(day)} Ez nem szigorú szabály, csak finom kapaszkodó: ma a lényeg a(z) ${day.daily_focus_hu || 'stabil, kímélő energia'}, ezért az ételek egyszerűek, követhetők és nem túl harsányak.`
   },
   {
    title:'Esti tipp',
    text: eveningText
   }
  ];
 }
 function dailyWhyHtml(day, wrapperClass='small-muted'){
  return dailyWhySections(day).map(sec => `<div><h3 class="subhead">${esc(sec.title)}</h3><p class="${wrapperClass}">${esc(stripTechText(sec.text))}</p></div>`).join('');
 }
 function dailyWhySheetHtml(day){
  return dailyWhySections(day).map(sec => `<div class="sheet-section"><h3 class="subhead">${esc(sec.title)}</h3><p>${esc(stripTechText(sec.text))}</p></div>`).join('');
 }


 function renderDayPage(){
  const day = selectedDay();
  const totals = day.daily_totals || {};
  const risks = day.day_risk_overview || {};
  const tags = [...(day.day_tags || []), ...(settings.cycleModuleEnabled ? (day.cycle_phase_tags || []) : [])].map(tagLabel);
  const mp = day.shopping_micro_plan || {};
  $('#view').innerHTML = `
   <section class="section day-page-toolbar">
    <button class="ghost-btn back-btn" data-action="backFromDay">‹ Vissza</button>
    <div class="small-muted">${esc(dayLabel(day))}</div>
   </section>
   <section class="hero card section detail-hero">
    <div class="hero-top">
     <div>
      <div class="eyebrow">Napi terv</div>
      <div class="day-label">${esc(fullDateLabel(day))}</div>
      <div class="small-muted">${esc(planDayLabel(day))} · ${esc(day.daily_focus_hu || 'Részletes napi nézet')}</div>
     </div>
     <div class="kcal-bubble"><b>${esc(totals.energy_kcal || 0)}</b><span>kcal</span></div>
    </div>
    <div class="metric-row">
     <div class="metric"><b>${esc(totals.protein || 0)}g</b><span>Fehérje</span></div>
     <div class="metric"><b>${esc(totals.carbohydrate || 0)}g</b><span>Szénhidrát</span></div>
     <div class="metric"><b>${esc(totals.fat || 0)}g</b><span>Zsír</span></div>
     <div class="metric"><b>${progressForDay(day).done}/${progressForDay(day).total}</b><span>Haladás</span></div>
    </div>
   </section>
   <section class="section stack" aria-label="Napi étkezések">
    ${(day.meals || []).map(m => mealCard(day,m)).join('')}
   </section>
   <section class="card section"><div class="card-pad stack">
    <h2 class="headline">Miért így?</h2>
    ${dailyWhyHtml(day)}
   </div></section>
   <section class="card section"><div class="card-pad stack">
    <h2 class="headline">Napi vásárlás</h2>
    <p class="small-muted">${esc(humanNote(mp.freshness_logic_note_hu || 'Friss készítés, készétel-maradék nélkül.'))}</p>
    ${(mp.daily_fresh_items || []).slice(0,10).map(it=>`<div class="list-item"><div class="item-main"><div class="item-title">${esc(it.item)}</div><div class="item-note">${esc(humanAmount(it))}</div></div></div>`).join('') || '<div class="empty">Nincs külön napi friss tétel.</div>'}
   </div></section>
   <div class="footer-space"></div>`;
 }

 function openDayPage(dayNum){
  const n = Number(dayNum);
  const day = allDays.find(d => d.globalDayNumber === n);
  if(!day) return;
  pushNavState();
  ui.dayReturnTab = ui.activeTab === 'dayDetail' ? (ui.dayReturnTab || 'weeks') : ui.activeTab;
  ui.dayReturnWeek = ui.activeWeek;
  ui.selectedDayNumber = day.globalDayNumber;
  ui.activeTab = 'dayDetail';
  render({resetTop:true});
 }


 function recipeMatches(recipe){
  const q = (ui.recipeSearch || '').trim().toLowerCase();
  const hay = [recipe.name_hu, recipe.pwa_title, recipe.pwa_short_note, ...(recipe.search_helper?.ingredient_names_hu || []), ...(recipe.search_helper?.keywords_hu || [])].join(' ').toLowerCase();
  if(q && !hay.includes(q)) return false;
  const flags = recipe.suitability_flags || recipe.search_helper?.filter_flags || {};
  const active = new Set(ui.recipeFilters || []);
  for(const f of active){
   if(f === 'tejmentes' && !flags.dairy_free) return false;
   if(f === 'husmentes' && !flags.meat_free) return false;
   if(f === 'novenyi' && !flags.plant_based) return false;
   if(f === 'sos' && !flags.salty_breakfast) return false;
   if(f === 'teszta' && !flags.pasta_or_noodle) return false;
   if(f === 'gyors' && !String(recipe.cooking_time_level || '').includes('gyors')) return false;
   if(f === 'kozepes' && !String(recipe.cooking_time_level || '').includes('közep')) return false;
   if(f === 'hosszabb' && !((recipe.tag_ids||[]).includes('hosszabb_fozes') || Number(recipe.cooking_profile?.total_minutes||0) >= 35)) return false;
   if(f === 'ovatos' && !(recipe.risk_scores?.individual_test_required || maxRecipeRisk(recipe) >= 2)) return false;
   if(f.startsWith('phase:') && !(recipe.cycle_fit?.best_cycle_phases || []).includes(f.split(':')[1])) return false;
  }
  return true;
 }

 function renderRecipes(){
  const filterDefs = [
   ['tejmentes','Tejmentes'], ['husmentes','Húsmentes'], ['novenyi','Növényi'], ['sos','Sós reggeli'], ['teszta','Tészta'], ['gyors','Gyors'], ['kozepes','Általános'], ['hosszabb','Hosszabb'], ['ovatos','Egyéni teszt']
  ];
  const phaseDefs = ['menstruacio','follikularis','ovulacio','korai_lutealis','pms_kesoi_lutealis'].map(p => [`phase:${p}`, PHASE_LABELS[p] || p]);
  const shown = recipes.filter(recipeMatches);
  const activeFilter = (ui.recipeFilters || [])[0] || '';
  $('#view').innerHTML = `
   <section class="searchbar recipe-search-only">
    <input id="recipeSearch" type="search" placeholder="Keresés receptnévben vagy alapanyagban" value="${esc(ui.recipeSearch || '')}" aria-label="Receptkeresés" autocomplete="off" />
   </section>
   <section class="section recipe-filter-section">
    <div class="recipe-filter-grid" aria-label="Receptszűrők">
     <button class="filter-chip all-filter ${!activeFilter ? 'active' : ''}" data-action="clearFilter">Mind</button>
     ${[...filterDefs, ...phaseDefs].map(([id,label]) => `<button class="filter-chip ${activeFilter === id ? 'active' : ''}" data-action="toggleFilter" data-filter="${esc(id)}">${esc(label)}</button>`).join('')}
    </div>
   </section>
   <section class="section">
    <h1 class="headline">Recepttár</h1>
    <p class="small-muted"><span id="recipeCount">${shown.length}</span> fogás látható a 112-ből.</p>
   </section>
   <section class="section" id="recipeResults">
    ${recipeResultsHtml(shown)}
   </section>`;
  const search = $('#recipeSearch');
  search.addEventListener('input', e => {
   ui.recipeSearch = e.target.value;
   writeStore(storeKeys.ui, ui);
   updateRecipeResults();
  });
 }
 function recipeResultsHtml(shown){
  return shown.length ? shown.map(r => recipeCard(r)).join('') : `<div class="empty">${esc(DATA.empty_state_and_logic_messages_hu?.no_filter_results || 'Nincs találat.')}</div>`;
 }
 function cookingSpeedLabel(recipe){
  const raw = String(recipe.cooking_time_level || recipe.cooking_profile?.difficulty_level || '').toLowerCase();
  const mins = Number(recipe.cooking_profile?.total_minutes || recipe.prep_minutes_estimate || 0);
  if(raw.includes('gyors') || (mins && mins <= 20)) return 'Gyors';
  if(raw.includes('hossz') || (recipe.tag_ids || []).includes('hosszabb_fozes') || mins >= 35) return 'Hosszabb';
  return 'Általános';
 }
 function cookingSpeedClass(recipe){
  const label = cookingSpeedLabel(recipe);
  if(label.startsWith('Gyors')) return 'green';
  if(label.startsWith('Hosszabb')) return 'warn';
  return 'soft';
 }
 function updateRecipeResults(){
  const shown = recipes.filter(recipeMatches);
  const count = $('#recipeCount');
  const results = $('#recipeResults');
  if(count) count.textContent = shown.length;
  if(results) results.innerHTML = recipeResultsHtml(shown);
 }

 function recipeCard(r){
  const flags = (r.compatibility_summary_hu?.short_flags_hu || (r.tag_ids || []).slice(0,2).map(tagLabel)).map(stripTechText);
  const fav = !!favorites[r.recipe_id];
  return `<article class="recipe-card ${fav ? 'favorite' : ''}" data-action="openRecipe" data-recipe="${esc(r.recipe_id)}">
   <div class="recipe-card-top">
    <div>
     <div class="small-muted meal-type-line">${mealInlineIcon(r.meal_type)}<span>${esc(SLOT_LABELS[r.meal_type] || r.meal_type || 'Fogás')}</span></div>
     <div class="meal-title">${esc(r.name_hu || r.pwa_title)}</div>
     <div class="meal-meta"><span>${esc(r.energy_kcal)} kcal</span><span>${esc(macroLine(r.macros_g))}</span></div>
    </div>
    <button class="fav-btn ${fav ? 'active' : ''}" data-fav-control="true" data-action="toggleFavorite" data-recipe="${esc(r.recipe_id)}" aria-pressed="${fav ? 'true' : 'false'}" aria-label="${fav ? 'Kedvencnek jelölve' : 'Kedvenc jelölése'}" title="${fav ? 'Kedvencnek jelölve' : 'Kedvenc jelölése'}">★</button>
   </div>
   <div class="chip-row recipe-card-chips" style="margin-top:10px"><span class="chip cook-chip ${cookingSpeedClass(r)}">${esc(cookingSpeedLabel(r))}</span>${flags.slice(0,2).map(f=>`<span class="chip soft">${esc(f)}</span>`).join('')}<span class="chip ${maxRecipeRisk(r)>=2?'warn':'green'}">${esc(riskText(maxRecipeRisk(r)))}</span></div>
  </article>`;
 }

 function updateFavoriteUi(recipeId){
  const active = !!favorites[recipeId];
  $$('[data-fav-control]').forEach(btn => {
   if(btn.dataset.recipe !== recipeId) return;
   btn.classList.toggle('active', active);
   btn.setAttribute('aria-pressed', active ? 'true' : 'false');
   btn.setAttribute('aria-label', active ? 'Kedvencnek jelölve' : 'Kedvenc jelölése');
   btn.setAttribute('title', active ? 'Kedvencnek jelölve' : 'Kedvenc jelölése');
   if(btn.classList.contains('favorite-action-btn')) btn.textContent = active ? '★ Kedvencnek jelölve' : '☆ Kedvencnek jelölöm';
  });
  $$('.recipe-card[data-recipe]').forEach(card => {
   if(card.dataset.recipe === recipeId) card.classList.toggle('favorite', active);
  });
}

 function shoppingDay(){
  const n = Number(ui.shoppingDayNumber || currentPlanDayNumber());
  return allDays.find(d => d.globalDayNumber === n) || selectedDay();
 }
 function selectedMergeDays(){
  const nums = Array.from(new Set((ui.shoppingMergeDays || []).map(Number))).filter(n => n >= 1 && n <= 28).sort((a,b)=>a-b);
  ui.shoppingMergeDays = nums;
  return nums.map(n => allDays.find(d => d.globalDayNumber === n)).filter(Boolean);
 }
 function activeShoppingDayNumbers(){
  let nums = Array.from(new Set((ui.shoppingMergeDays || []).map(Number))).filter(n => n >= 1 && n <= 28).sort((a,b)=>a-b);
  if(!nums.length) nums = [Number(ui.shoppingDayNumber || currentPlanDayNumber())];
  return nums;
 }
 function selectedShoppingDays(){
  return activeShoppingDayNumbers().map(n => allDays.find(d => d.globalDayNumber === n)).filter(Boolean);
 }
 function compactDayName(day){
  const name = dayDisplayName(day) || '';
  const map = {Hétfő:'H', Kedd:'K', Szerda:'Sze', Csütörtök:'Cs', Péntek:'P', Szombat:'Szo', Vasárnap:'V'};
  return map[name] || name.slice(0,3);
 }
 function weekBoxDaySelector(action, activeNums, extraClass=''){
  const nums = new Set((activeNums || []).map(Number));
  return `<div class="week-box-grid premium-week-grid ${extraClass}">
   ${weeks.map(w => {
    const weekDays = allDays.filter(d => d.week === w.week);
    const hasActive = weekDays.some(d => nums.has(d.globalDayNumber));
    return `<div class="mini-week-box premium-week-box ${hasActive ? 'active' : ''}">
     <div class="mini-week-title"><span>${w.week}. hét</span><em>${weekDays.length} nap</em></div>
     <div class="mini-day-grid">
      ${weekDays.map(d => `<button class="mini-day-btn ${nums.has(d.globalDayNumber) ? 'active' : ''}" data-action="${action}" data-daynum="${d.globalDayNumber}" aria-label="${d.day_number_in_week}. nap ${esc(dayDisplayName(d))}"><b>${d.day_number_in_week}</b><span>${esc(compactDayName(d))}</span></button>`).join('')}
     </div>
    </div>`;
   }).join('')}
  </div>`;
 }
 function weekOnlySelector(action, activeWeek, extraClass=''){
  const active = Number(activeWeek || 1);
  return `<div class="week-box-grid premium-week-grid week-only-grid ${extraClass}">
   ${weeks.map(w => `<button class="mini-week-box premium-week-box week-only-box ${Number(w.week) === active ? 'active' : ''}" data-action="${action}" data-week="${w.week}" aria-label="${w.week}. hét kiválasztása">
    <div class="mini-week-title"><span>${w.week}. hét</span><em>heti lista</em></div>
    <div class="week-only-meta">${esc((w.theme || '').replace(/\s*\+.*/, '').slice(0,42) || 'Bevásárlás')}</div>
   </button>`).join('')}
  </div>`;
 }
 function trackingWeekAccordionSelector(activeDay){
  const activeWeek = Number(activeDay?.week || ui.trackingWeek || 1);
  const activeDayNum = Number(activeDay?.globalDayNumber || selectedDay().globalDayNumber);
  return `<div class="tracking-accordion">
   ${weeks.map(w => {
    const weekDays = allDays.filter(d => d.week === w.week);
    const open = Number(w.week) === activeWeek;
    return `<div class="tracking-week-row ${open ? 'open active' : ''}">
     <button class="tracking-week-bar" data-action="trackingWeekToggle" data-week="${w.week}" aria-expanded="${open ? 'true' : 'false'}">
      <span>${w.week}. hét</span>
      <i class="week-chevron" aria-hidden="true">${open ? '⌃' : '⌄'}</i>
     </button>
     ${open ? `<div class="tracking-week-days">${weekDays.map(d => `<button class="tracking-day-pill compact-day-only ${Number(d.globalDayNumber) === activeDayNum ? 'active' : ''}" data-action="trackingDay" data-daynum="${d.globalDayNumber}" aria-label="${esc(planDayLabel(d))} · ${esc(fullDateLabel(d))}"><b>${esc(compactDayName(d))}</b><span>${esc(dayNumericShort(d))}</span></button>`).join('')}</div>` : ''}
    </div>`;
   }).join('')}
  </div>`;
 }

 function shoppingWeekAccordionSelector(activeNums){
  const nums = new Set((activeNums || []).map(Number));
  const activeWeek = Number(ui.shoppingWeek || (selectedShoppingDays()[0]?.week) || 1);
  return `<div class="tracking-accordion shopping-accordion">
   ${weeks.map(w => {
    const weekDays = allDays.filter(d => d.week === w.week);
    const open = Number(w.week) === activeWeek;
    const hasActive = weekDays.some(d => nums.has(d.globalDayNumber));
    return `<div class="tracking-week-row shopping-week-row ${open ? 'open active' : ''} ${hasActive ? 'has-selected' : ''}">
     <button class="tracking-week-bar" data-action="shoppingWeekToggle" data-week="${w.week}" aria-expanded="${open ? 'true' : 'false'}">
      <span>${w.week}. hét</span>
      <i class="week-chevron" aria-hidden="true">${open ? '⌃' : '⌄'}</i>
     </button>
     ${open ? `<div class="tracking-week-days shopping-week-days">${weekDays.map(d => `<button class="tracking-day-pill compact-day-only ${nums.has(d.globalDayNumber) ? 'active' : ''}" data-action="toggleMergeDay" data-daynum="${d.globalDayNumber}" aria-label="${esc(planDayLabel(d))} · ${esc(fullDateLabel(d))}"><b>${esc(compactDayName(d))}</b><span>${esc(dayNumericShort(d))}</span></button>`).join('')}</div>` : ''}
    </div>`;
   }).join('')}
  </div>`;
 }

 function shoppingDayButtons(activeWeek){
  const weekDays = allDays.filter(d => d.week === activeWeek);
  const activeNums = activeShoppingDayNumbers();
  return `<div class="tracking-day-grid shopping-day-grid">
   ${weekDays.map(d => {
    const active = activeNums.includes(d.globalDayNumber);
    return `<button class="tracking-day-btn ${active ? 'active' : ''}" data-action="toggleMergeDay" data-daynum="${d.globalDayNumber}"><b>${d.day_number_in_week}. nap</b><span>${esc(dayDisplayName(d))}</span></button>`;
   }).join('')}
  </div>`;
 }
 function renderShopping(){
  const selectedDays = selectedShoppingDays();
  const day = selectedDays[0] || shoppingDay();
  const activeWeek = ui.shoppingWeek || day.week || 1;
  const views = [['today','Kijelölt napok'],['weekly','Heti'],['pantry','Kamra'],['fresh','Frissen kezelendő']];
  const isWeekly = ui.shoppingView === 'weekly';
  const selectedText = isWeekly ? `${activeWeek}. hét bevásárlása` : (selectedDays.length === 1 ? `${compactDayName(selectedDays[0])} · ${planDayLabel(selectedDays[0])}` : `${selectedDays.length} nap összevonva`);
  const selectorHtml = isWeekly
   ? `<section class="card section shopping-select-card premium-selector-card"><div class="card-pad">
     <h2 class="subhead">Heti lista kiválasztása</h2>
     <p class="small-muted">Heti nézetben csak a hetek közül válassz. A napok kijelölése ilyenkor nem jelenik meg.</p>
     ${weekOnlySelector('shoppingWeek', activeWeek, 'shopping-week-selector')}
    </div></section>`
   : `<section class="card section shopping-select-card premium-selector-card"><div class="card-pad">
     <h2 class="subhead">Napok kiválasztása</h2>
     <p class="small-muted">Egy kijelölt napnál napi lista látszik, több napnál automatikusan összevont lista készül.</p>
     ${shoppingWeekAccordionSelector(activeShoppingDayNumbers())}
     <div class="selection-summary"><b>${selectedDays.length} nap kijelölve</b><span>${esc(selectedDays.map(d => compactDayName(d)).join(', '))}</span></div>
    </div></section>`;
  $('#view').innerHTML = `
   <section class="section shopping-head">
    <h1 class="headline">Bevásárlás</h1>
    <p class="small-muted">${esc(selectedText)}</p>
    <div class="shopping-mode-grid">${views.map(v=>`<button class="${ui.shoppingView===v[0]?'active':''}" data-action="shoppingView" data-view="${v[0]}">${v[1]}</button>`).join('')}</div>
    <div class="grid2 shopping-actions ${isWeekly ? 'single-action' : ''}">
     <button class="ghost-btn" data-action="toggleOnlyOpen">${ui.onlyOpen ? 'Minden tétel' : 'Csak még nem pipált'}</button>
     ${isWeekly ? '' : `<button class="ghost-btn" data-action="clearMergeDays">Mai napra vissza</button>`}
    </div>
   </section>
   ${selectorHtml}
   <section class="section stack">${shoppingContent(selectedDays)}</section>`;
 }
 function shoppingContent(selectedDays){
  const days = Array.isArray(selectedDays) && selectedDays.length ? selectedDays : [shoppingDay()];
  const day = days[0];
  if(ui.shoppingView === 'weekly') return weeklyShopping();
  if(days.length > 1 && ui.shoppingView === 'today') return mergedShoppingHtml(days);
  if(ui.shoppingView === 'pantry') return pantryShopping(day);
  if(ui.shoppingView === 'fresh') return freshHandling(day);
  return dailyFreshShopping(day);
 }
 function listItems(items, scope, title, note){
  const visible = (items || []).map((item, idx) => ({item, idx})).filter(obj => !ui.onlyOpen || !shoppingChecks[shoppingKey(scope,[title,obj.idx,obj.item.item || obj.item.name_hu])]);
  return `<div class="card"><div class="card-pad">
   <h2 class="subhead">${esc(title)}</h2>${note ? `<p class="small-muted">${esc(humanNote(note))}</p>` : ''}
   ${visible.length ? visible.map(({item,idx}) => {
    const key = shoppingKey(scope,[title,idx,item.item || item.name_hu]);
    const checked = !!shoppingChecks[key];
    return `<div class="list-item ${checked?'checked':''}">
     <button class="small-check ${checked?'checked':''}" data-action="toggleShoppingItem" data-key="${esc(key)}" aria-label="Tétel kipipálása"></button>
     <div class="item-main"><div class="item-title">${esc(item.item || item.name_hu || 'Tétel')}</div><div class="item-note">${esc(humanAmount(item))}</div>${item.note_hu || item.buying_note_hu ? `<div class="item-note">${esc(humanNote(item.note_hu || item.buying_note_hu))}</div>` : ''}</div>
    </div>`;
   }).join('') : `<div class="empty">Minden látható tétel kipipálva.</div>`}
  </div></div>`;
 }
 function dailyFreshShopping(day){
  const mp = day.shopping_micro_plan || {};
  const groups = {};
  (mp.daily_fresh_items || []).forEach(it => {
   const g = GROUP_LABELS[it.category_group] || 'Friss tételek';
   groups[g] = groups[g] || [];
   groups[g].push(it);
  });
  return Object.entries(groups).map(([title,items]) => listItems(items, `daily-${day.day_id}`, title, 'Friss tételek az adott napi fogásokhoz.')).join('') || `<div class="empty">${esc(DATA.empty_state_and_logic_messages_hu?.shopping_not_generated || 'Nincs lista ehhez a naphoz.')}</div>`;
 }
 function weeklyShopping(){
  const week = DATA.weekly_shopping_lists?.find(w => w.week === ui.shoppingWeek) || DATA.weekly_shopping_lists?.[0];
  return `<div class="card"><div class="card-pad">
   <h2 class="subhead">${esc(ui.shoppingWeek || 1)}. hét bevásárlása</h2>
   <p class="small-muted">${esc(humanNote(week?.freshness_note_hu || ''))}</p>
   <button class="ghost-btn wide" data-action="resetShoppingWeekly">Heti lista visszaállítása</button>
  </div></div>
  ${(week?.shopping_groups || []).map(g => listItems(g.items, `weekly-${week.week}`, g.category, '')).join('')}`;
 }
 function pantryShopping(day){
  const daily = day.shopping_micro_plan?.daily_pantry_or_stable_items || [];
  const strategy = DATA.shopping_strategy?.find(s => s.week === day.week);
  const weekly = strategy?.pantry_or_stable_summary || [];
  return listItems(daily, `pantry-day-${day.day_id}`, 'Napi kamra és stabil alapok', 'Ezek nem a napi friss tételek közé tartoznak.') + listItems(weekly, `pantry-week-${day.week}`, `${day.week}. heti kamraáttekintés`, 'Heti szinten tervezhető alapanyagok.');
 }
 function freshHandling(day){
  const mp = day.shopping_micro_plan || {};
  return listItems(mp.raw_freeze_candidates || [], `raw-${day.day_id}`, 'Nyersen porciózható fehérjék', 'Kész ételként ne tedd el másnapra; csak nyersen porciózva kezeld előre.') +
   listItems(mp.same_day_fresh_dairy_items || [], `dairy-${day.day_id}`, 'Aznap fogyasztandó friss tejtermékek', 'Frissen bontva, rövid időn belül fogyasztva illeszkedik legjobban a tervhez.');
 }
 function dailyShoppingItemsForMerge(day){
  const mp = day.shopping_micro_plan || {};
  return [
   ...(mp.daily_fresh_items || []).map(i => ({...i, source:'Friss'})),
   ...(mp.daily_pantry_or_stable_items || []).map(i => ({...i, source:'Kamra'}))
  ];
 }
 function aggregateShopping(days){
  const map = new Map();
  days.forEach(day => dailyShoppingItemsForMerge(day).forEach(item => {
   const name = item.item || item.name_hu || 'Tétel';
   const unit = item.unit || '';
   const group = GROUP_LABELS[item.category_group] || item.source || 'Egyéb';
   const key = `${name.toLowerCase()}|${unit}|${group}`;
   const buy = Number(item.recommended_purchase_amount ?? item.amount ?? item.net_amount ?? 0) || 0;
   const net = Number(item.net_amount ?? item.amount ?? 0) || 0;
   const current = map.get(key) || {name, unit, group, buy:0, net:0, days:[]};
   current.buy += buy;
   current.net += net;
   current.days.push(`${day.week}. hét ${day.day_number_in_week}. nap (${dayDisplayName(day)})`);
   map.set(key, current);
  }));
  return Array.from(map.values()).sort((a,b) => a.group.localeCompare(b.group, 'hu') || a.name.localeCompare(b.name, 'hu'));
 }
 function mergedShoppingHtml(days){
  const rows = aggregateShopping(days);
  const groups = rows.reduce((acc,item) => { (acc[item.group] ||= []).push(item); return acc; }, {});
  return `<div class="card"><div class="card-pad"><h2 class="subhead">Összevont lista</h2><p class="small-muted">Kijelölt napok: ${esc(days.map(dayLabel).join(' · '))}</p><button class="ghost-btn wide" data-action="openMergedShopping">Megnyitás felcsúszó listában</button></div></div>` +
   (Object.entries(groups).map(([group,items]) => {
    const visible = items.map((it,idx)=>({it,idx,key:shoppingKey('merged', [group, idx, it.name, it.unit, days.map(d=>d.day_id).join('-')])})).filter(row => !ui.onlyOpen || !shoppingChecks[row.key]);
    return `<div class="card shopping-group-card"><div class="card-pad"><h3 class="subhead">${esc(group)}</h3>${visible.length ? visible.map(({it,idx,key}) => {
     const checked = !!shoppingChecks[key];
     return `<div class="list-item ${checked?'checked':''}"><button class="small-check ${checked?'checked':''}" data-action="toggleShoppingItem" data-key="${esc(key)}" aria-label="Tétel kipipálása"></button><div class="item-main"><div class="item-title">${esc(it.name)}</div><div class="item-note">Vedd meg kb. ${esc(formatAmountValue(it.buy, it.unit))} · recepthez összesen ${esc(formatAmountValue(it.net, it.unit))}</div><div class="item-note">Napok: ${esc([...new Set(it.days)].join(', '))}</div></div></div>`;
    }).join('') : '<div class="empty">Minden látható tétel kipipálva.</div>'}</div></div>`;
   }).join('') || '<div class="empty">Nincs összeadható tétel.</div>');
 }
 function openMergedShopping(){
  const days = selectedShoppingDays();
  if(!days.length){ toast('Válassz ki legalább egy napot.'); return; }
  const rows = aggregateShopping(days);
  const groups = rows.reduce((acc,item) => { (acc[item.group] ||= []).push(item); return acc; }, {});
  openSheet('Összevont bevásárlás', `
   <div class="sheet-section"><p class="small-muted">Kijelölt napok: ${esc(days.map(dayLabel).join(' · '))}</p></div>
   ${Object.entries(groups).map(([group,items]) => {
    const visible = items.map((it,idx)=>({it,idx,key:shoppingKey('merged', [group, idx, it.name, it.unit, days.map(d=>d.day_id).join('-')])})).filter(row => !ui.onlyOpen || !shoppingChecks[row.key]);
    return `<div class="sheet-section"><h3 class="subhead">${esc(group)}</h3>${visible.length ? visible.map(({it,idx,key}) => {
     const checked = !!shoppingChecks[key];
     return `<div class="list-item ${checked?'checked':''}"><button class="small-check ${checked?'checked':''}" data-action="toggleShoppingItem" data-key="${esc(key)}" aria-label="Tétel kipipálása"></button><div class="item-main"><div class="item-title">${esc(it.name)}</div><div class="item-note">Vedd meg kb. ${esc(formatAmountValue(it.buy, it.unit))} · recepthez összesen ${esc(formatAmountValue(it.net, it.unit))}</div><div class="item-note">Napok: ${esc([...new Set(it.days)].join(', '))}</div></div></div>`;
    }).join('') : '<div class="empty">Minden látható tétel kipipálva.</div>'}</div>`;
   }).join('') || '<div class="empty">Nincs összeadható tétel.</div>'}
  `);
 }
 function weeklyTrackingSummary(weekNo){
  const ds = allDays.filter(d => Number(d.week) === Number(weekNo));
  const entries = ds.map(d => ({day:d, entry:trackingEntries[d.day_id] || {}}));
  const fullDays = ds.filter(d => {
   const meals = d.meals || [];
   return meals.length && meals.every(m => mealChecks[mealKey(d,m)]);
  }).length;
  const logged = entries.filter(x => Object.keys(x.entry).length > 0).length;
  const waterValues = entries.map(x => Number(x.entry.waterMl || 0)).filter(v => v > 0);
  const avgWater = waterValues.length ? waterValues.reduce((a,b)=>a+b,0) / waterValues.length / 1000 : 0;
  const refluxValues = entries.map(x => Number(x.entry.reflux)).filter(v => Number.isFinite(v) && v > 0);
  const avgReflux = refluxValues.length ? refluxValues.reduce((a,b)=>a+b,0) / refluxValues.length : 0;
  const energyValues = entries.map(x => Number(x.entry.energy)).filter(v => Number.isFinite(v) && v > 0);
  const avgEnergy = energyValues.length ? energyValues.reduce((a,b)=>a+b,0) / energyValues.length : 0;
  return {fullDays, logged, avgWater, avgReflux, avgEnergy, total:ds.length || 7};
 }
 function weeklyTrackingSummaryHtml(weekNo){
  const s = weeklyTrackingSummary(weekNo);
  const waterText = s.avgWater ? `${formatHuNumber(s.avgWater,1)} l` : 'nincs adat';
  const refluxText = s.avgReflux ? `${formatHuNumber(s.avgReflux,1)}/10` : 'nincs adat';
  const energyText = s.avgEnergy ? `${formatHuNumber(s.avgEnergy,1)}/10` : 'nincs adat';
  const note = s.logged
   ? `Ezen a héten ${s.logged} naphoz került naplóadat. A teljesen kipipált napok száma ${s.fullDays}, az átlag víz ${waterText}, a reflux átlag ${refluxText}, az energia átlag ${energyText}.`
   : 'Ehhez a héthez még nincs naplóadat. Ha elkezded vezetni a vizet és a közérzetet, itt jelenik meg a heti összkép.';
  return `<section class="card section weekly-summary-card"><div class="card-pad stack"><h2 class="subhead">${esc(weekNo)}. heti mini összegzés</h2><div class="metric-row weekly-summary-metrics"><div class="metric"><b>${esc(s.fullDays)}/${esc(s.total)}</b><span>Teljes nap</span></div><div class="metric"><b>${esc(waterText)}</b><span>Átlag víz</span></div><div class="metric"><b>${esc(refluxText)}</b><span>Reflux</span></div><div class="metric"><b>${esc(energyText)}</b><span>Energia</span></div></div><p class="small-muted">${esc(note)}</p></div></section>`;
 }

 function renderTracking(){
  const day = selectedDay();
  const key = day.day_id;
  const entry = trackingEntries[key] || {waterMl:0, reflux:0, bloating:0, histamine:0, energy:2, hunger:1, note:''};
  const p = progressForDay(day);
  const weekPct = weeklyProgress(day.week);
  const waterGoal = Number(settings.waterGoalMl || 2500);
  const waterLiters = Math.round(Number(entry.waterMl || 0) / 500) / 2;
  const waterMaxLiters = Math.max(5, Math.ceil((waterGoal / 1000) * 2) / 2);
  $('#view').innerHTML = `
   <section class="section tracking-picker">
    <h1 class="headline">Napló</h1>
    <p class="small-muted">Válassz hetet és napot, majd vezesd a részletes napi naplót. Minden bejegyzés csak ezen a készüléken marad.</p>
    ${trackingWeekAccordionSelector(day)}
   </section>
   ${weeklyTrackingSummaryHtml(day.week)}
   <section class="card section"><div class="card-pad">
    <h2 class="headline">${esc(fullDateLabel(day))} naplója</h2>
    <p class="small-muted">${esc(planDayLabel(day))} · ${esc(day.daily_focus_hu || 'részletes napi követés')}</p>
    <div class="metric-row">
     <div class="metric"><b>${p.done}/${p.total}</b><span>Étkezés</span></div>
     <div class="metric"><b>${weekPct}%</b><span>Heti teljesítés</span></div>
     <div class="metric"><b>${formatHuNumber(waterLiters,1)} l</b><span>Víz</span></div>
     <div class="metric"><b>${esc(day.daily_totals?.energy_kcal || 0)}</b><span>kcal terv</span></div>
    </div>
   </div></section>
   <section class="card section water-card"><div class="card-pad stack">
    <h2 class="subhead">Víz</h2>
    <p class="small-muted">Állítsd be csúszkával, mennyi folyadék ment le ma. A lépték 0,5 liter.</p>
    <label class="range-row tracking-range water-range"><span>Mai víz</span><input id="waterRange" type="range" min="0" max="${waterMaxLiters}" step="0.5" value="${esc(waterLiters)}" /><small class="range-value" data-range-value-for="waterRange" data-range-unit="l">${formatHuNumber(waterLiters,1)} l</small><em class="range-help">0 l = még nincs rögzítve. A csúszka 0,5 literenként állítható.</em></label>
    <div class="water-actions"><button class="ghost-btn water-reset" data-action="setWater" data-value="0">Víz nullázása</button><button class="primary-btn water-save" data-action="saveWater">Mentés</button></div>
   </div></section>
   <section class="card section"><div class="card-pad stack">
    <h2 class="subhead">Mai közérzet</h2>
    ${detailedTrackingFields(entry)}
    <label>Jegyzet<textarea class="note-area" id="trackNote" placeholder="Rövid saját megjegyzés">${esc(entry.note || '')}</textarea></label>
    <button class="primary-btn wide" data-action="saveTracking">Napló mentése</button>
   </div></section>`;
 }
 function detailedTrackingFields(entry){
  const rows = [
   {id:'trackReflux', label:'Reflux érzet', type:'range', value: entry.reflux ?? 0, help:'0/10 = nincs refluxérzet, 10/10 = nagyon erős / rossz.'},
   {id:'trackBloating', label:'Puffadás', type:'range', value: entry.bloating ?? 0, help:'0/10 = nincs puffadás, 10/10 = nagyon erős / zavaró.'},
   {id:'trackHistamine', label:'Hisztaminszerű reakció', type:'range', value: entry.histamine ?? 0, help:'0/10 = nincs reakció, 10/10 = nagyon erős tünetérzet.'},
   {id:'trackEnergy', label:'Energia', type:'range', value: entry.energy ?? 5, help:'0/10 = nagyon alacsony energia, 10/10 = nagyon jó energiaszint.'},
   {id:'trackHunger', label:'Éhség / jóllakottság', type:'range', value: entry.hunger ?? 5, help:'0/10 = egyáltalán nem vagy éhes, 10/10 = nagyon éhes vagy.'}
  ];
  return rows.map(row => {
   if(row.type === 'range'){
    const val = Number(row.value || 0);
    return `<label class="range-row tracking-range"><span>${esc(row.label)}</span><input id="${row.id}" type="range" min="0" max="10" step="1" value="${esc(val)}" /> <small class="range-value" data-range-value-for="${row.id}">${val}/10</small><em class="range-help">${esc(row.help)}</em></label>`;
   }
   return `<label><span>${esc(row.label)}</span><input id="${row.id}" type="${row.type}" value="${esc(row.value)}" /> <small class="small-muted">${esc(row.suffix)}</small></label>`;
  }).join('');
 }
 function weeklyProgress(weekNo){
  const ds = allDays.filter(d => d.week === weekNo);
  const total = ds.reduce((sum,d)=>sum+(d.meals||[]).length,0) || 1;
  const done = ds.reduce((sum,d)=>sum+(d.meals||[]).filter(m=>mealChecks[mealKey(d,m)]).length,0);
  return Math.round(done / total * 100);
 }

 function openDayDetails(day = selectedDay()){
  const totals = day.daily_totals || {};
  const risks = day.day_risk_overview || {};
  const mp = day.shopping_micro_plan || {};
  const tags = [...(day.day_tags || []), ...(settings.cycleModuleEnabled ? (day.cycle_phase_tags || []) : [])].map(tagLabel);
  openSheet('Mai részletek', `
   <div class="sheet-section">
    <div class="kcal-bubble" style="margin-bottom:12px"><b>${esc(totals.energy_kcal)}</b><span>tervezett kcal</span></div>
    <div class="metric-row"><div class="metric"><b>${esc(totals.protein)}g</b><span>Fehérje</span></div><div class="metric"><b>${esc(totals.carbohydrate)}g</b><span>Szénhidrát</span></div><div class="metric"><b>${esc(totals.fat)}g</b><span>Zsír</span></div><div class="metric"><b>${progressForDay(day).done}/${progressForDay(day).total}</b><span>Haladás</span></div></div>
   </div>
   ${dailyWhySheetHtml(day)}
   <div class="sheet-section"><h3 class="subhead">Mai frissesség</h3><p>${esc(humanNote(mp.freshness_logic_note_hu || 'Friss készítés, készétel-maradék nélkül.'))}</p></div>
   <div class="sheet-section"><h3 class="subhead">Napi vásárlási áttekintés</h3><ul>${(mp.daily_fresh_items || []).slice(0,8).map(it=>`<li>${esc(it.item)} — ${esc(humanAmount(it))}</li>`).join('') || '<li>Nincs külön napi friss tétel.</li>'}</ul></div>
   <div class="sheet-section"><h3 class="subhead">Napló alap</h3><p>Mai terv: ${esc(totals.energy_kcal)} kcal. ${day.tracking_prefill?.full_meat_free_dairy_free_day ? 'Ez húsmentes és tejmentes nap.' : 'A napi pipák nem módosítják a tervezett kcal értéket.'}</p></div>
  `);
 }
 function sectionTitle(k){
  return ({why_this_day_works_hu:'Miért így?', reflux_logic_hu:'Reflux logika', histamine_logic_hu:'Frissesség és hisztamin', purine_logic_hu:'Purin kontroll', cycle_logic_hu:'Ciklushoz igazítva', evening_tip_hu:'Esti tipp'})[k] || 'Részlet';
 }

 function recipePrepHtml(recipe){
  const steps = Array.isArray(recipe.prep_steps_structured) ? recipe.prep_steps_structured.filter(s => (s.instruction_hu || '').trim()) : [];
  if(steps.length){
   return `<div class="sheet-section recipe-prep-section"><h3 class="subhead">Elkészítés lépésről lépésre</h3><div class="prep-step-list">${steps.map((step, idx) => {
    const no = step.step || (idx + 1);
    const title = stripTechText(step.title_hu || `${idx + 1}. lépés`);
    const instruction = stripTechText(step.instruction_hu || '');
    return `<div class="prep-step"><div class="prep-step-no">${esc(no)}</div><div class="prep-step-copy"><b>${esc(title)}</b><p>${esc(instruction)}</p></div></div>`;
   }).join('')}</div></div>`;
  }
  const fallback = stripTechText(recipe.prep_steps_hu || 'Ehhez a fogáshoz nincs külön részletes elkészítési leírás.');
  return `<div class="sheet-section recipe-prep-section"><h3 class="subhead">Elkészítés</h3><p>${esc(fallback)}</p></div>`;
 }

 function openRecipe(recipeId){
  const r = recipesById.get(recipeId);
  if(!r) return;
  const usages = r.usage_in_meal_plan?.occurrences || usageByRecipe.get(recipeId)?.occurrences || [];
  const risks = r.risk_scores || {};
  const subs = r.smart_substitutions || [];
  const fallbacks = r.fallback_if_not_tolerated?.fallbacks || [];
  openSheet(r.name_hu || r.pwa_title || 'Recept', `
   <div class="sheet-section"><div class="small-muted meal-type-line">${mealInlineIcon(r.meal_type)}<span>${esc(SLOT_LABELS[r.meal_type] || r.meal_type || 'Fogás')} ${usages[0] ? '· ' + esc(usages[0].week) + '. hét · ' + esc(dayDisplayName(dayForOccurrence(usages[0]) || selectedDay())) : ''}</span></div><h3 class="headline">${esc(r.name_hu || r.pwa_title)}</h3></div>
   <div class="sheet-section"><div class="metric-row"><div class="metric"><b>${esc(r.energy_kcal)}</b><span>kcal</span></div><div class="metric"><b>${esc(r.macros_g?.protein)}g</b><span>Fehérje</span></div><div class="metric"><b>${esc(r.macros_g?.carbohydrate)}g</b><span>Szénhidrát</span></div><div class="metric"><b>${esc(r.macros_g?.fat)}g</b><span>Zsír</span></div></div></div>
   <div class="sheet-section"><p>${esc(stripTechText(r.pwa_short_note || r.compatibility_summary_hu?.reflux_logic_hu || ''))}</p></div>
   <div class="sheet-section"><h3 class="subhead">Fő címkék</h3><div class="chip-row">${(r.compatibility_summary_hu?.short_flags_hu || (r.tag_ids||[]).map(tagLabel)).map(stripTechText).slice(0,8).map(t=>`<span class="chip soft">${esc(t)}</span>`).join('')}</div></div>
   <div class="sheet-section"><h3 class="subhead">Kímélő jelzések</h3><div class="chip-row"><span class="chip green">Reflux: ${esc(riskText(risks.reflux_risk_level))}</span><span class="chip ${Number(risks.histamine_caution_level||0)>=2?'warn':'green'}">Hisztamin: ${esc(riskText(risks.histamine_caution_level))}</span><span class="chip ${Number(risks.purine_caution_level||0)>=2?'warn':'green'}">Purin: ${esc(riskText(risks.purine_caution_level))}</span>${risks.individual_test_required ? '<span class="chip warn">egyéni teszt</span>' : ''}</div>${risks.why_caution_hu ? `<p>${esc(stripTechText(risks.why_caution_hu))}</p>` : ''}</div>
   <div class="sheet-section"><h3 class="subhead">Hozzávalók</h3><ul>${(r.ingredients || []).map(i=>`<li>${esc(i.item)} — ${esc(i.amount)} ${esc(i.unit)}</li>`).join('') || '<li>Nincs megadott hozzávaló.</li>'}</ul></div>
   ${recipePrepHtml(r)}
   <div class="sheet-section"><h3 class="subhead">Idő és eszközök</h3><p>${esc(r.cooking_profile?.total_minutes || r.prep_minutes_estimate || '—')} perc · ${esc(r.cooking_profile?.difficulty_level || r.cooking_time_level || 'könnyű')}</p>${r.cooking_profile?.required_tools?.length ? `<div class="chip-row">${r.cooking_profile.required_tools.map(t=>`<span class="chip soft">${esc(t)}</span>`).join('')}</div>` : ''}</div>
   <div class="sheet-section"><h3 class="subhead">Frissesség</h3><p>${esc(stripTechText(r.freshness_rule_hu || r.cooking_profile?.component_prep_note_hu || 'Frissen készítve a legjobb.'))}</p></div>
   <div class="sheet-section"><h3 class="subhead">Illeszkedés</h3>${compatibilityHtml(r.compatibility_summary_hu)}</div>
   ${cycleFitHtml(r)}
   <div class="sheet-section"><h3 class="subhead">Csereopciók</h3>${subs.length || fallbacks.length ? substitutionHtml(subs, fallbacks) : '<p class="small-muted">Ehhez a fogáshoz nincs külön cserejavaslat.</p>'}</div>
   <div class="sheet-section"><h3 class="subhead">Melyik napokon szerepel?</h3><ul>${usages.map(u=>{ const od = dayForOccurrence(u); return `<li>${esc(od ? planDayLabel(od) : (String(u.week) + '. hét · ' + String(u.day_number_in_week) + '. nap'))} · ${esc(od ? fullDateLabel(od) : (u.weekday_hu || 'nap'))} · ${esc(SLOT_LABELS[u.slot] || u.slot)}</li>`; }).join('') || '<li>A tervben egyszer szerepel.</li>'}</ul></div>
   <div class="grid2"><button class="primary-btn favorite-action-btn ${favorites[r.recipe_id] ? 'active' : ''}" data-fav-control="true" data-action="toggleFavorite" data-recipe="${esc(r.recipe_id)}" aria-pressed="${favorites[r.recipe_id] ? 'true' : 'false'}" aria-label="${favorites[r.recipe_id] ? 'Kedvencnek jelölve' : 'Kedvenc jelölése'}">${favorites[r.recipe_id] ? '★ Kedvencnek jelölve' : '☆ Kedvencnek jelölöm'}</button><button class="ghost-btn" data-action="closeSheet">Bezárás</button></div>
  `);
 }
 function compatibilityHtml(c){
  if(!c) return '<p class="small-muted">Nincs külön összefoglaló.</p>';
  return ['reflux_logic_hu','histamine_logic_hu','purine_logic_hu','cycle_logic_hu'].map(k => c[k] ? `<p>${esc(stripTechText(c[k]))}</p>` : '').join('');
 }
 function cycleFitHtml(recipe){
  const fit = recipe.cycle_fit || {};
  const phases = (fit.best_cycle_phases || fit.suitable_cycle_phases || []).map(tagLabel).filter(Boolean);
  const note = stripTechText(fit.why_hu || fit.note_hu || '');
  if(!phases.length && !note) return '';
  return `<div class="sheet-section"><h3 class="subhead">Ciklushoz igazítva</h3>${phases.length ? `<div class="chip-row">${phases.map(p=>`<span class="chip blue">${esc(p)}</span>`).join('')}</div>` : ''}${note ? `<p>${esc(note)}</p>` : '<p class="small-muted">Ez a fogás ezekben a szakaszokban illeszkedik a legjobban.</p>'}</div>`;
 }
 function substitutionHtml(subs, fallbacks){
  const subHtml = subs.slice(0,4).map(s => `<li>${esc(s.replace_name_hu)} helyett: <b>${esc(s.with_name_hu)}</b> — ${esc(stripTechText(s.impact_hu || s.ratio_hint || 'hasonló mennyiségben'))}</li>`).join('');
  const fbHtml = fallbacks.slice(0,3).flatMap(f => (f.fallback_candidates || []).slice(0,2).map(c => `<li>${esc(f.trigger_ingredient_name_hu)} helyett: <b>${esc(c.name_hu || c.with_name_hu || c.item || 'csere')}</b></li>`)).join('');
  return `<ul>${subHtml}${fbHtml}</ul>`;
 }

 function openDayPicker(){
  openSheet('Nap választása', `<div class="grid2">${allDays.map(d => `<button class="week-card ${d.globalDayNumber === selectedDay().globalDayNumber ? 'active' : ''}" data-action="chooseDay" data-daynum="${d.globalDayNumber}"><b>${esc(weekCardDateTitle(d))}</b><br><span class="small-muted">${esc(planDayLabel(d))} · ${esc(d.daily_totals?.energy_kcal)} kcal</span></button>`).join('')}</div>`);
 }

 function openTrackingSheet(){
  pushNavState();
  ui.trackingWeek = selectedDay().week || ui.trackingWeek || 1;
  ui.activeTab = 'tracking';
  closeSheet();
  render({resetTop:true});
 }

 function openSettingsSheet(){
  const copy = DATA.app_copy_hu || {};
  openSheet('Beállítások', `
   <div class="sheet-section"><h3 class="headline">28 napos étrend</h3><p>Kímélő 28 napos étrend. Internet nélkül is használható, és nincs bejelentkezés.</p><p><b>Minden naplód csak ezen a készüléken marad.</b></p></div>
   <div class="sheet-section">${dateLogicHelpHtml()}</div>
   <div class="sheet-section stack settings-form">
    <label>Kezdőnap<input type="date" id="setDietStart" value="${esc(settings.dietStartDate)}"></label>
    <label>Napi vízcél literben<input type="number" id="setWaterGoal" min="1" max="5" step="0.1" value="${esc((settings.waterGoalMl||2500)/1000)}"></label>
    <label>Ciklus kezdőnapja<input type="date" id="setCycleStart" value="${esc(settings.cycleStartDate || todayIso())}"></label>
    <label>Ciklushossz<input type="number" id="setCycleLength" min="21" max="40" value="${esc(settings.cycleLengthDays || 28)}"></label>
    <button class="primary-btn wide" data-action="saveSettings">Beállítások mentése</button>
    <button class="ghost-btn wide" data-action="restartOnboarding">Belépő beállítás újraindítása</button>
   </div>
   <div class="sheet-section"><h3 class="subhead">Az étrend logikája</h3>
    <p>${esc(stripTechText(copy.calorie_goal_explanation || 'A napi cél heti átlagban kb. 1600 kcal.'))}</p>
    <p>${esc(stripTechText(copy.reflux_explanation || 'Kímélő reflux szemlélet.'))}</p>
    <p>${esc(stripTechText(copy.low_histamine_explanation || 'A frissesség kiemelt szempont.'))}</p>
    <p>${esc(stripTechText(copy.purine_explanation || 'Mértékletes fehérje és purin kontroll.'))}</p>
    <p>${esc(stripTechText(copy.meat_free_dairy_free_day_explanation || 'Hetente egy húsmentes és tejmentes nap szerepel.'))}</p>
    <p>A kcal és makró értékek becslésként kezelendők, nem hivatalos tápérték-állításként.</p>
    <p>${esc(stripTechText(copy.medical_safety_text || DATA.medical_safety_note_hu || 'Erős vagy tartós panasz esetén szakember bevonása javasolt.'))}</p>
   </div>
   <div class="sheet-section card-pad danger-zone"><h3 class="subhead">Törlés</h3><div class="stack">
    <button class="ghost-btn danger-btn" data-action="confirmReset" data-reset="mealChecks">Étkezéspipák törlése</button>
    <button class="ghost-btn danger-btn" data-action="confirmReset" data-reset="shoppingChecks">Bevásárlólista pipák törlése</button>
    <button class="ghost-btn danger-btn" data-action="confirmReset" data-reset="favorites">Kedvencek törlése</button>
    <button class="ghost-btn danger-btn" data-action="confirmReset" data-reset="tracking">Naplóadatok törlése</button>
    <button class="ghost-btn danger-btn" data-action="confirmReset" data-reset="settings">Onboarding / kezdőnap beállítások törlése</button>
    <button class="ghost-btn danger-btn" data-action="confirmReset" data-reset="all">Összes helyi adat törlése</button>
   </div></div>
  `);
 }

 function openConfirmReset(type){
  const labels = {mealChecks:'étkezéspipákat', shoppingChecks:'bevásárlólista pipákat', favorites:'kedvenceket', tracking:'naplóadatokat', settings:'belépő és kezdőnap beállításokat', all:'összes helyi adatot'};
  openSheet('Biztos törlöd?', `<p class="small-muted">A(z) ${esc(labels[type] || 'kiválasztott elemeket')} törlöd erről a készülékről.</p><div class="grid2"><button class="ghost-btn" data-action="openSettings">Mégsem</button><button class="primary-btn" data-action="doReset" data-reset="${esc(type)}">Törlés</button></div>`);
 }
 function doReset(type){
  if(type === 'mealChecks' || type === 'all'){ mealChecks = {}; localStorage.removeItem(storeKeys.mealChecks); }
  if(type === 'shoppingChecks' || type === 'all'){ shoppingChecks = {}; localStorage.removeItem(storeKeys.shoppingChecks); }
  if(type === 'favorites' || type === 'all'){ favorites = {}; localStorage.removeItem(storeKeys.favorites); }
  if(type === 'tracking' || type === 'all'){ trackingEntries = {}; localStorage.removeItem(storeKeys.tracking); }
  if(type === 'settings' || type === 'all'){
   settings = {...settings, onboardingCompleted:false, dietStartDate:todayIso(), cycleModuleEnabled:true, cycleStartDate:todayIso(), cycleLengthDays:28, waterGoalMl:2500, trackingMode:'detailed'};
   localStorage.removeItem(storeKeys.settings);
   showOnboarding();
  }
  if(type === 'all'){ ui = {...defaultUi}; localStorage.removeItem(storeKeys.ui); }
  saveAll();
  closeSheet();
  render({resetTop:true});
  toast('Törölve.');
 }

 function openSheet(title, html){
  $('#sheetTitle').textContent = title;
  $('#sheetBody').innerHTML = html;
  resetSheetTop();
  $('#sheetBackdrop').hidden = false;
  $('#sheet').hidden = false;
  resetSheetTop();
  requestAnimationFrame(()=>{
   resetSheetTop();
   $('#sheetBackdrop').classList.add('show');
   $('#sheet').classList.add('show');
   requestAnimationFrame(resetSheetTop);
  });
  setTimeout(resetSheetTop, 40);
  setTimeout(resetSheetTop, 100);
  setTimeout(resetSheetTop, 220);
  setTimeout(resetSheetTop, 420);
  document.body.style.overflow = 'hidden';
  $('#sheetClose').focus({preventScroll:true});
 }
 function closeSheet(){
  $('#sheetBackdrop').classList.remove('show');
  $('#sheet').classList.remove('show');
  document.body.style.overflow = '';
  setTimeout(()=>{ $('#sheetBackdrop').hidden = true; $('#sheet').hidden = true; $('#sheetBody').innerHTML = ''; }, 220);
 }

 function showOnboarding(){
  $('#onboarding').hidden = false;
  $('#onboarding').scrollTop = 0;
  scrollToViewTop();
  $('#obDietStart').value = settings.dietStartDate || todayIso();
  $('#obCycleStart').value = settings.cycleStartDate || todayIso();
  $('#obCycleLength').value = settings.cycleLengthDays || 28;
  $('#obWaterGoal').value = (settings.waterGoalMl || 2500) / 1000;
  const cycleFields = $('#obCycleFields');
  if(cycleFields) cycleFields.hidden = false;
 }
 function finishOnboarding(){
  settings = {
   ...settings,
   onboardingCompleted:true,
   dietStartDate: $('#obDietStart').value || todayIso(),
   cycleModuleEnabled: true,
   cycleStartDate: $('#obCycleStart').value || todayIso(),
   cycleLengthDays: Number($('#obCycleLength').value || 28),
   waterGoalMl: Math.round(Number($('#obWaterGoal').value || 2.5) * 1000),
   trackingMode: 'detailed'
  };
  ui.selectedDayNumber = null;
  saveAll();
  $('#onboarding').hidden = true;
  render({resetTop:true});
 }

 function saveTracking(){
  const day = selectedDay();
  const current = trackingEntries[day.day_id] || {};
  trackingEntries[day.day_id] = {
   ...current,
   waterMl: Math.round(Number($('#waterRange')?.value ?? ((current.waterMl || 0) / 1000)) * 1000),
   reflux: Number($('#trackReflux')?.value || current.reflux || 0),
   bloating: Number($('#trackBloating')?.value || current.bloating || 0),
   histamine: Number($('#trackHistamine')?.value || current.histamine || 0),
   energy: Number($('#trackEnergy')?.value || current.energy || 5),
   hunger: Number($('#trackHunger')?.value || current.hunger || 5),
   note: $('#trackNote')?.value || ''
  };
  writeStore(storeKeys.tracking, trackingEntries);
  toast('Napló mentve.');
  renderTracking();
 }

 function handleAction(action, el, event){
  if(action === 'toggleMeal'){
   event.stopPropagation();
   const day = allDays.find(d => d.day_id === el.dataset.day) || selectedDay();
   const meal = (day.meals || []).find(m => m.slot === el.dataset.slot && m.recipe_id === el.dataset.recipe);
   if(meal){ const k = mealKey(day, meal); mealChecks[k] = !mealChecks[k]; writeStore(storeKeys.mealChecks, mealChecks); render(); }
  }
  if(action === 'openRecipe') openRecipe(el.dataset.recipe || el.closest('[data-recipe]')?.dataset.recipe);
  if(action === 'prevDay'){ ui.selectedDayNumber = Math.max(1, (selectedDay().globalDayNumber || 1) - 1); render({resetTop:true}); }
  if(action === 'nextDay'){ ui.selectedDayNumber = Math.min(28, (selectedDay().globalDayNumber || 1) + 1); render({resetTop:true}); }
  if(action === 'openDayPicker') openDayPicker();
  if(action === 'chooseDay'){ ui.selectedDayNumber = Number(el.dataset.daynum); closeSheet(); render({resetTop:true}); }
  if(action === 'openDayDetails') openDayDetails();
  if(action === 'openTracking') openTrackingSheet();
  if(action === 'selectWeek'){ ui.activeWeek = Number(el.dataset.week); render({noAnimate:true}); }
  if(action === 'weekDay') openDayPage(el.dataset.daynum);
  if(action === 'backFromDay'){ ui.activeTab = ui.dayReturnTab || 'weeks'; if(ui.dayReturnWeek) ui.activeWeek = ui.dayReturnWeek; render(); }
  if(action === 'toggleFilter'){
   const current = (ui.recipeFilters || [])[0] || '';
   const next = el.dataset.filter || '';
   ui.recipeFilters = current === next ? [] : [next];
   render({noAnimate:true}); writeStore(storeKeys.ui, ui);
  }
  if(action === 'clearFilter'){
   ui.recipeFilters = [];
   render({noAnimate:true}); writeStore(storeKeys.ui, ui);
  }
  if(action === 'toggleFavorite'){
   event.preventDefault();
   event.stopPropagation();
   const id = el.dataset.recipe;
   const next = !favorites[id];
   if(next) favorites[id] = true;
   else delete favorites[id];
   writeStore(storeKeys.favorites, favorites);
   updateFavoriteUi(id);
   toast(next ? 'Kedvenchez adva.' : 'Kedvenc levéve.');
   return;
  }
  if(action === 'trackingWeekToggle'){
   const weekNo = Number(el.dataset.week);
   ui.trackingWeek = weekNo;
   const current = selectedDay();
   if(!current || Number(current.week) !== weekNo){
    const first = allDays.find(d => Number(d.week) === weekNo);
    if(first) ui.selectedDayNumber = first.globalDayNumber;
   }
   render();
  }
  if(action === 'trackingWeek'){
   ui.trackingWeek = Number(el.dataset.week);
   const first = allDays.find(d => d.week === ui.trackingWeek);
   if(first) ui.selectedDayNumber = first.globalDayNumber;
   render({resetTop:true});
  }
  if(action === 'trackingDay'){
   const n = Number(el.dataset.daynum);
   const d = allDays.find(day => day.globalDayNumber === n);
   if(d){ ui.selectedDayNumber = n; ui.trackingWeek = d.week; render({noAnimate:true}); }
  }
  if(action === 'shoppingWeekToggle'){
   const weekNo = Number(el.dataset.week);
   ui.shoppingWeek = weekNo;
   writeStore(storeKeys.ui, ui);
   render();
  }
  if(action === 'shoppingView'){ ui.shoppingView = el.dataset.view; render({resetTop:true}); }
  if(action === 'shoppingWeek'){ ui.shoppingWeek = Number(el.dataset.week); render({resetTop:true}); }
  if(action === 'setShoppingDay'){
   const n = Number(el.dataset.daynum);
   const d = allDays.find(day => day.globalDayNumber === n);
   if(d){ ui.shoppingDayNumber = n; ui.shoppingWeek = d.week; writeStore(storeKeys.ui, ui); render({resetTop:true}); }
  }
  if(action === 'toggleMergeDay'){
   const n = Number(el.dataset.daynum);
   const current = activeShoppingDayNumbers();
   const set = new Set(current.map(Number));
   if(set.has(n)){
    if(set.size > 1) set.delete(n);
   }else{
    set.add(n);
   }
   ui.shoppingMergeDays = Array.from(set).sort((a,b)=>a-b);
   const d = allDays.find(day => day.globalDayNumber === n);
   if(d){ ui.shoppingWeek = d.week; ui.shoppingDayNumber = n; }
   writeStore(storeKeys.ui, ui); renderShopping();
  }
  if(action === 'clearMergeDays'){
   const n = currentPlanDayNumber();
   const d = allDays.find(day => day.globalDayNumber === n) || selectedDay();
   ui.shoppingMergeDays = [d.globalDayNumber];
   ui.shoppingDayNumber = d.globalDayNumber;
   ui.shoppingWeek = d.week;
   writeStore(storeKeys.ui, ui); renderShopping();
  }
  if(action === 'openMergedShopping') openMergedShopping();
  if(action === 'toggleShoppingItem'){
   const k = el.dataset.key; shoppingChecks[k] = !shoppingChecks[k]; if(!shoppingChecks[k]) delete shoppingChecks[k]; writeStore(storeKeys.shoppingChecks, shoppingChecks); if(!$('#sheet').hidden && $('#sheetTitle').textContent === 'Összevont bevásárlás') openMergedShopping(); else renderShopping();
  }
  if(action === 'toggleOnlyOpen'){ ui.onlyOpen = !ui.onlyOpen; renderShopping(); }
  if(action === 'resetShoppingDaily'){
   const day = shoppingDay();
   Object.keys(shoppingChecks).forEach(k => { if(k.includes(day.day_id)) delete shoppingChecks[k]; });
   writeStore(storeKeys.shoppingChecks, shoppingChecks); toast('Napi lista visszaállítva.'); renderShopping();
  }
  if(action === 'resetShoppingWeekly'){
   Object.keys(shoppingChecks).forEach(k => { if(k.startsWith(`weekly-${ui.shoppingWeek}|`) || k.startsWith(`pantry-week-${ui.shoppingWeek}|`)) delete shoppingChecks[k]; });
   writeStore(storeKeys.shoppingChecks, shoppingChecks); toast('Heti lista visszaállítva.'); renderShopping();
  }
  if(action === 'setWater'){
   const day = selectedDay(); const entry = trackingEntries[day.day_id] || {};
   entry.waterMl = Number(el.dataset.value || 0); trackingEntries[day.day_id] = entry; writeStore(storeKeys.tracking, trackingEntries); renderTracking();
  }
  if(action === 'saveWater'){
   const day = selectedDay(); const entry = trackingEntries[day.day_id] || {};
   entry.waterMl = Math.round(Number($('#waterRange')?.value || 0) * 1000);
   trackingEntries[day.day_id] = entry;
   writeStore(storeKeys.tracking, trackingEntries);
   toast('Víz mentve.');
   renderTracking();
  }
  if(action === 'saveTracking') saveTracking();
  if(action === 'saveSettings'){
   settings.dietStartDate = $('#setDietStart').value || todayIso();
   settings.waterGoalMl = Math.round(Number($('#setWaterGoal').value || 2.5) * 1000);
   settings.trackingMode = 'detailed';
   settings.cycleModuleEnabled = true;
   settings.cycleStartDate = $('#setCycleStart').value || todayIso();
   settings.cycleLengthDays = Number($('#setCycleLength').value || 28);
   writeStore(storeKeys.settings, settings); toast('Beállítások mentve.'); closeSheet(); render({resetTop:true});
  }
  if(action === 'restartOnboarding'){ closeSheet(); showOnboarding(); }
  if(action === 'confirmReset') openConfirmReset(el.dataset.reset);
  if(action === 'doReset') doReset(el.dataset.reset);
  if(action === 'goHome'){ if(!$('#sheet').hidden) closeSheet(); ui.selectedDayNumber = null; ui.activeTab = 'today'; render({resetTop:true}); }
  if(action === 'openSettings') openSettingsSheet();
  if(action === 'closeSheet') closeSheet();
 }

 function performBackGesture(){
  const onboarding = $('#onboarding');
  if(onboarding && !onboarding.hidden) return false;
  const sheetOpen = $('#sheet') && !$('#sheet').hidden;
  if(sheetOpen){ closeSheet(); return true; }
  if(ui.activeTab === 'dayDetail'){
   ui.activeTab = ui.dayReturnTab || 'weeks';
   if(ui.dayReturnWeek) ui.activeWeek = ui.dayReturnWeek;
   render({resetTop:true});
   return true;
  }
  const previous = navStack.pop();
  if(previous) return restoreNavState(previous);
  if(ui.activeTab && ui.activeTab !== 'today'){
   ui.activeTab = 'today';
   ui.selectedDayNumber = null;
   render({resetTop:true});
   return true;
  }
  return false;
 }

 function updateHeaderCompact(){
  const topbar = $('.topbar');
  if(!topbar) return;
  // v34: a fejléc mindig kompakt méretű; görgetéskor nem változtatja a méretét.
  topbar.classList.add('header-compact');
 }

 function initEvents(){
  updateHeaderDate();
  window.addEventListener('scroll', updateHeaderCompact, {passive:true});
  updateHeaderCompact();
  $$('.tab-btn').forEach(btn => btn.addEventListener('click', () => { const changed = ui.activeTab !== btn.dataset.tab; if(changed) pushNavState(); ui.activeTab = btn.dataset.tab; if(btn.dataset.tab === 'today') ui.selectedDayNumber = null; if(btn.dataset.tab === 'tracking') ui.trackingWeek = selectedDay().week || ui.trackingWeek || 1; writeStore(storeKeys.ui, ui); render({resetTop:changed}); }));
  $('#todayBtn').addEventListener('click', () => { if(!$('#sheet').hidden) closeSheet(); if(ui.activeTab !== 'today') pushNavState(); ui.selectedDayNumber = null; ui.activeTab = 'today'; render({resetTop:true}); });
  $('#settingsBtn').addEventListener('click', openSettingsSheet);
  $('#sheetClose').addEventListener('click', closeSheet);
  $('#sheetBackdrop').addEventListener('click', closeSheet);
  document.addEventListener('input', e => {
   if(e.target && e.target.matches('input[type=range]')){
    const valueEl = document.querySelector(`[data-range-value-for="${e.target.id}"]`);
    if(valueEl){
     if(valueEl.dataset.rangeUnit === 'l'){
      const v = Number(e.target.value || 0);
      valueEl.textContent = `${formatHuNumber(v,1)} l`;
     }else{
      valueEl.textContent = `${e.target.value}/10`;
     }
    }
   }
  });
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && !$('#sheet').hidden) closeSheet(); });
  document.addEventListener('click', e => {
   const el = e.target.closest('[data-action]');
   if(el) handleAction(el.dataset.action, el, e);
  });
  $('#startApp').addEventListener('click', finishOnboarding);

  let edgeStart = null;
  document.addEventListener('touchstart', e => {
   const t = e.touches && e.touches[0];
   if(!t) return;
   if(t.clientX <= 26) edgeStart = {x:t.clientX, y:t.clientY, handled:false};
   else edgeStart = null;
  }, {passive:true});
  document.addEventListener('touchmove', e => {
   if(!edgeStart || edgeStart.handled) return;
   const t = e.touches && e.touches[0];
   if(!t) return;
   const dx = t.clientX - edgeStart.x;
   const dy = Math.abs(t.clientY - edgeStart.y);
   if(dx > 72 && dy < 70){
    edgeStart.handled = true;
    if(performBackGesture()) e.preventDefault();
   }
  }, {passive:false});
  document.addEventListener('touchend', () => { edgeStart = null; }, {passive:true});

  let startY = null;
  const sheet = $('#sheet');
  sheet.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, {passive:true});
  sheet.addEventListener('touchmove', e => {
   if(startY === null) return;
   const delta = e.touches[0].clientY - startY;
   const body = $('#sheetBody');
   if(delta > 90 && (!body || body.scrollTop === 0)){ startY = null; closeSheet(); }
  }, {passive:true});
 }

 function registerOffline(){
  if('serviceWorker' in navigator){
   window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));
  }
 }

 function init(){
  if(ui.activeTab === 'today') ui.selectedDayNumber = null;
  initEvents();
  registerOffline();
  render();
  if(!settings.onboardingCompleted) showOnboarding();
 }

 init();
})();
