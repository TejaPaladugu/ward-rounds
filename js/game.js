"use strict";
/* Game state, UI, image reading, triage, guided coaching, and scoring. */
let C = null;   // current case
let S = null;   // play state
let toastTimer = null, bannerTimer = null;
const MAX = {dx:30, mg:30, tr:10, ef:15, im:15};
const $ = s => document.querySelector(s);
const pad = n => String(n).padStart(2,'0');
function fmtClock(m){
  if(m >= 1440){ const d = Math.floor(m/1440), h = Math.round((m%1440)/60); return `${d} d ${h} h`; }
  const s = Math.round(m*60), h = Math.floor(s/3600), mi = Math.floor(s%3600/60), se = s%60;
  return h ? `${h}:${pad(mi)}:${pad(se)}` : `${mi}:${pad(se)}`;
}
function fmtDur(min){
  if(min >= 1440){ const d = min/1440; return (Number.isInteger(d) ? d : d.toFixed(1)) + (d===1?' day':' days'); }
  if(min >= 60){ const h = min/60; return (Number.isInteger(h) ? h : h.toFixed(1)) + ' h'; }
  if(min >= 1) return Math.round(min) + ' min';
  return Math.round(min*60) + ' s';
}
const money = n => '$' + n.toLocaleString('en-US');
const clamp = (x,a,b) => Math.max(a, Math.min(b, x));
const lerp = (a,b,t) => a + (b-a)*t;
function shuffle(a, R){ for(let i=a.length-1;i>0;i--){ const j = Math.floor(R()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; } return a; }

const store = {
  get(k, d){ try { const v = localStorage.getItem('wardRounds.'+k); return v==null ? d : JSON.parse(v); } catch(e){ return d; } },
  set(k, v){ try { localStorage.setItem('wardRounds.'+k, JSON.stringify(v)); } catch(e){} },
};
function saveBest(id, score){ const b = store.get('best', {}); if(b[id]==null || score > b[id]){ b[id] = score; store.set('best', b); } }
function gradeOf(s){ return s>=90?'A': s>=80?'B': s>=70?'C': s>=60?'D':'F'; }
const guided = () => S && S.mode==='guided';

function curVitals(){
  if(!C || !S) return null;
  const v = Object.assign({}, C.vitals, {irregular: C.rhythm==='afib'});
  if(S.arrested) return {hr:38, sbp:null, dbp:null, rr:0, spo2:null, temp:v.temp, o2:v.o2, pea:true};
  if(C.decline){
    const f = clamp(S.clock / C.decline.by, 0, 1);
    for(const k in C.decline.to) v[k] = Math.round(lerp(C.vitals[k], C.decline.to[k], f));
  }
  return v;
}
function testMinutes(id){
  const t = TEST[id];
  if(!C || C.care!=='Outpatient') return t.min;
  if(OUT_OVERRIDE[id]!=null) return OUT_OVERRIDE[id];
  const d = OUT_DEFAULT[t.cat]; return d==null ? t.min : d;
}
function defaultImg(id){
  if(id==='ecg'){
    const hr = C.vitals.hr;
    const rh = C.rhythm==='afib' ? 'afib' : hr > 100 ? 'stach' : hr < 60 ? 'sbrady' : 'nsr';
    return {type:'ecg', f:[rh], rate:hr};
  }
  return JSON.parse(JSON.stringify(TEST[id].img));
}
function resultFor(id){
  const t = TEST[id], o = C.tests[id];
  const img = (o && o.img) ? o.img : (t.img ? defaultImg(id) : null);
  if(o) return {r:o.r, y:o.y, w:o.w, img};
  let r = t.normal;
  if(id==='ecg'){
    const hr = C.vitals.hr;
    const name = C.rhythm==='afib' ? 'Atrial fibrillation' : hr > 100 ? 'Sinus tachycardia' : hr < 60 ? 'Sinus bradycardia' : 'Normal sinus rhythm';
    r = `${name}, ${hr}. Normal axis and intervals. No ST changes.`;
  }
  return { r, img, y: t.invasive ? 'harmful' : 'low',
    w: t.invasive ? 'An invasive procedure with no indication here.' : 'Normal or unhelpful here. It didn’t move the diagnosis or the plan.' };
}
function tokenDone(tok){
  const [k, v] = tok.split(':');
  return k==='hx' ? S.asked.includes(v) : k==='ex' ? S.examined.includes(v) : k==='test' ? !!S.ordered[v] : false;
}

/* ---------- actions ---------- */
function newState(id){ return {caseId:id, mode:store.get('mode','graded'), clock:0, cost:0, asked:[], examined:[], ordered:{}, cart:[], log:[], fired:[], arrested:false, tab:'history', unseen:0, dx:null, tri:null, plan:[], orderCat:'All', orderQ:'', coachOpen:true}; }
function startCase(id, restore){
  if(typeof gaitState!=='undefined' && gaitState){ gaitState.onDone = null; stopGait(); }
  C = CASES.find(c=>c.id===id);
  S = restore || newState(id);
  setPatient(C.look);
  ['menu','dxModal','triModal','planModal','debrief','imgModal'].forEach(i=>$('#'+i).hidden = true);
  hideToast(); $('#banner').hidden = true;
  renderAll();
  setCam('overview', true);
  if(!restore) showToast(`<h4>${C.bed} · ${C.setting}<small>${C.care}${guided()?' · guided':''}</small></h4><div class="res"><div class="r plain">${guided() ? 'Guided practice: the coach above the tabs checks off each step as you go, and results explain themselves.' : 'Take a history, examine (click the patient), and send orders.'} Each action takes realistic time${C.care==='Outpatient' ? ', and outpatient results come back in days' : ''}.</div></div>`, 7000);
  if(S.arrested) showBanner('PEA arrest. Commit to your plan now.', true);
}
function advance(min){
  S.clock += min;
  for(const ev of (C.events||[])){
    if(S.clock >= ev.at && !S.fired.includes(ev.at)){ S.fired.push(ev.at); addLog({type:'event', title:'Status change', body:ev.text}); showBanner(ev.text); }
  }
  if(C.arrestAt && S.clock >= C.arrestAt && !S.arrested){
    S.arrested = true; addLog({type:'event', title:'Code blue', body:'PEA arrest. CPR in progress.'}); showBanner('PEA arrest. Commit to your plan now.', true);
  }
  renderTop(true); renderCoach();
}
function addLog(e){ e.at = S.clock; S.log.push(e); if(S.tab !== 'chart' && (e.type==='rx' || e.type==='event')) S.unseen++; return S.log.length-1; }
function askHistory(q){
  if(S.asked.includes(q)) return;
  const h = HISTORY_Q.find(x=>x[0]===q);
  S.asked.push(q); advance(h[2]/60);
  addLog({type:'hx', title:h[1], body:C.hist[q] || C.histDefault || HIST_DEFAULT[q]});
  renderTabs(); renderTab(); renderCoach();
}
function doExam(e){
  const finding = C.exam[e] || EXAM_DEFAULT[e];
  if(!S.examined.includes(e)){ S.examined.push(e); advance((EXAM_SECS[e]||30)/60); addLog({type:'ex', title:EXAM_NAME[e], body:finding}); renderTabs(); renderTab(); renderCoach(); }
  let extra = '', ms = 9000;
  if(e==='heent') extra = `<button class="btn small" data-closeup="mouth">Look in the mouth</button><button class="btn small" data-closeup="eyes">Look at the eyes</button>`;
  if(e==='hands') extra = `<button class="btn small" data-closeup="hands">Look at hands and nails</button>`;
  if(e==='gait' && C.look.gait!=='unable'){ startGait(C.look.gait); extra = `<button class="btn small" data-gait="1">Watch again</button>`; ms = 16000; }
  if(e==='gu' || e==='skin'){ setGown(false); if(e==='gu') setCam('pelvis'); extra = `<button class="btn small" data-gown="1">Replace gown</button>`; }
  const tip = guided() && (C.keyExam||[]).includes(e) ? `<div class="gy"><span class="chip key">Key</span> A key exam finding for this case.</div>` : '';
  showToast(`<h4>${EXAM_NAME[e]}<small>T+${fmtClock(S.clock)}</small></h4><div class="res"><div class="r plain">${finding}</div>${tip}${extra?`<div class="acts">${extra}</div>`:''}</div>`, ms);
}
function sendOrders(){
  const ids = S.cart.filter(id=>!S.ordered[id]);
  if(!ids.length) return;
  const dt = Math.max(...ids.map(testMinutes));
  const cost = ids.reduce((a,id)=>a+TEST[id].cost, 0);
  S.cost += cost; S.cart = [];
  advance(dt);
  const items = ids.map(id=>{
    const R = resultFor(id);
    S.ordered[id] = {at:S.clock};
    const idx = addLog({type:'rx', id, title:TEST[id].name, body:R.r, img:R.img, read:null});
    return {id, R, idx};
  });
  renderTabs(); renderTab(); renderCoach();
  const coach = R => guided() ? `<div class="gy"><span class="chip ${R.y}">${YIELD_LABEL[R.y]}</span> ${R.w}</div>` : '';
  const html = `<h4>${ids.length} result${ids.length>1?'s':''} back<small>+${fmtDur(dt)} · ${money(cost)}</small></h4>` + items.map(({id,R,idx})=>
    R.img ? `<div class="res"><div class="n">${TEST[id].name}</div><div class="studyrow"><button class="thumb" data-read="${idx}" aria-label="Read ${TEST[id].name}"><canvas data-img='${JSON.stringify(R.img)}'></canvas></button><div><div class="r plain">Study ready. Read it yourself before the report is released.</div><button class="btn small" data-read="${idx}">Read study</button></div></div>${coach(R)}</div>`
          : `<div class="res"><div class="n">${TEST[id].name}</div><div class="r">${R.r}</div>${coach(R)}</div>`).join('');
  showToast(html, 0);
  paintThumbs($('#toast'));
}

/* ---------- close-ups ---------- */
function openCloseup(kind){
  const titles = {mouth:'Inside the mouth', eyes:'Eyes and conjunctiva', hands:'Hands and nails'};
  const text = kind==='hands' ? (C.exam.hands || EXAM_DEFAULT.hands) : (C.exam.heent || EXAM_DEFAULT.heent);
  const m = $('#imgModal');
  m.innerHTML = `<div class="sheet"><header><div class="meta">${C.name} · Close-up exam</div><h2>${titles[kind]}</h2></header>
    <div class="body"><div class="closeup"><canvas id="cuImg"></canvas></div><p class="cutext"><b>Your exam note:</b> ${text}</p><div class="fine">Illustration of this patient’s findings.</div></div>
    <footer><button class="btn" data-close="imgModal">Done</button></footer></div>`;
  m.hidden = false; m.scrollTop = 0;
  drawCloseup($('#cuImg'), kind, C.look);
}

/* ---------- image reading ---------- */
function readSetup(idx){
  const e = S.log[idx], img = e.img, mk = modKey(img), voc = VOCAB[mk];
  const truth = new Set(img.f && img.f.length ? img.f : (mk==='ecg' ? [] : ['normal']));
  const R = seeded(hashStr(C.id + e.id));
  const pool = shuffle(voc.filter(v=>!truth.has(v[0])), R);
  let opts = [...voc.filter(v=>truth.has(v[0])), ...pool.slice(0, Math.max(3, 7 - truth.size))];
  shuffle(opts, R);
  if(mk!=='ecg') opts.push(['normal','No abnormality seen']);
  return {e, mk, opts, truth};
}
function openRead(idx){
  const {e, mk, opts, truth} = readSetup(idx);
  const m = $('#imgModal');
  const reviewed = !!e.read || !!S.done;
  const sel = new Set(e.read ? e.read.sel : []);
  const rows = opts.map(([id,label])=>{
    if(!reviewed) return `<label><input type="checkbox" id="rd-${id}" value="${id}"><span>${label}</span></label>`;
    const t = truth.has(id), p = sel.has(id);
    const cls = t && p ? 'hit' : p ? 'miss' : t ? 'skip' : '';
    const tag = t && p ? '✓ correct' : p ? '✗ not present' : t ? 'missed' : '';
    return `<label class="${cls}"><input type="checkbox" disabled ${p?'checked':''}><span>${label}</span><em>${tag}</em></label>`;
  }).join('');
  m.innerHTML = `<div class="sheet wide"><header><div class="meta">T+${fmtClock(e.at)} · ${C.name} · ${VOCAB_NAME[mk]}</div><h2>${reviewed ? 'Your read vs. the report' : 'Read this study'}</h2></header>
    <div class="body readgrid"><div class="readimg ${mk==='ecg'?'ecg':''}"><canvas id="bigImg"></canvas><div class="fine">Schematic teaching image. ${mk==='cxr' ? 'Patient’s right is on the viewer’s left.' : mk.startsWith('ct') ? 'Axial view from the feet: patient’s right on viewer’s left, anterior at top.' : ''}</div></div>
    <div class="readside"><p class="q">${reviewed ? (e.read ? `Score: <b>${Math.round(e.read.score*100)}%</b>` : 'You didn’t read this study. Here are the findings.') : 'Select every finding you see.'}</p><div class="readlist">${rows}</div>
    ${reviewed ? `<div class="report"><b>Report</b>${e.body}</div>` : ''}</div></div>
    <footer>${reviewed ? `<button class="btn" data-close="imgModal">Done</button>` : `<button class="btn ghost" id="readSkip" data-idx="${idx}">Skip and show report</button><button class="btn" id="readSubmit" data-idx="${idx}">Submit read</button>`}</footer></div>`;
  m.hidden = false; m.scrollTop = 0;
  drawImage($('#bigImg'), e.img);
}
function submitRead(idx, skip){
  const {e, truth} = readSetup(idx);
  const sel = skip ? [] : [...document.querySelectorAll('#imgModal .readlist input:checked')].map(i=>i.value);
  const S1 = new Set(sel);
  const inter = [...S1].filter(x=>truth.has(x)).length;
  const union = new Set([...S1, ...truth]).size;
  e.read = {sel, score: union ? inter/union : 0, skipped: !!skip};
  if(S.tab==='chart') renderTab();
  openRead(idx);
  refreshToastReads();
}
function refreshToastReads(){
  document.querySelectorAll('#toast .studyrow').forEach(row=>{
    const b = row.querySelector('button.btn[data-read]'); if(!b) return;
    const e = S.log[+b.dataset.read];
    if(e.read){ row.querySelector('.r').textContent = e.body; b.textContent = `Your read: ${Math.round(e.read.score*100)}%`; }
  });
  renderCommitNote();
}
function unreadCount(){ return S ? S.log.filter(e=>e.type==='rx' && e.img && !e.read).length : 0; }

/* ---------- rendering ---------- */
function renderAll(){ renderTop(); renderBrief(); renderCoach(); renderTabs(); renderTab(); renderCommitNote(); }
function renderTop(flash){
  if(!C){ $('#ptInfo').innerHTML = '<b>No patient</b><small>Choose a case</small>'; $('#vitals').innerHTML=''; return; }
  $('#ptInfo').innerHTML = `<b>${C.name}</b><small>${C.age} ${C.sex} · ${C.setting}${guided()?' · <span class="modetag">Guided</span>':''}</small>`;
  const v = curVitals(), d = x => x==null ? '--' : x;
  $('#vitals').innerHTML =
    `<div class="v hr"><small>HR${v.irregular?' irr':''}</small><b>${d(v.hr)}</b></div>`+
    `<div class="v bp"><small>BP</small><b>${v.sbp==null?'--/--':v.sbp+'/'+v.dbp}</b></div>`+
    `<div class="v rr"><small>RR</small><b>${d(v.rr)}</b></div>`+
    `<div class="v sp"><small>SpO₂ <span class="o2">${v.o2}</span></small><b>${v.spo2==null?'--':v.spo2+'%'}</b></div>`+
    `<div class="v t"><small>TEMP</small><b>${v.temp.toFixed(1)}°</b></div>`;
  const ck = $('#clock'), co = $('#cost');
  ck.textContent = fmtClock(S.clock); co.textContent = money(S.cost);
  if(flash) [ck,co].forEach(el=>{ el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); });
}
function renderBrief(){
  $('#brief').innerHTML = `<div class="meta">${C.subject} · ${C.care} · Tier ${C.tier} · ${C.bed}</div><q>${C.cc}</q><p>${C.brief}</p>`;
}
function renderCoach(){
  const el = $('#coach');
  if(!C || !guided()){ el.hidden = true; return; }
  el.hidden = false;
  const steps = C.approach || [];
  let nextIdx = steps.findIndex(s=>s.do && !s.do.some(tokenDone));
  const items = steps.map((s,i)=>{
    const done = s.do && s.do.some(tokenDone);
    const cls = done ? 'done' : i===nextIdx ? 'next' : s.do ? '' : 'decide';
    return `<li class="${cls}">${s.t}${!s.do ? ' <em>(decide at the end)</em>' : ''}</li>`;
  }).join('');
  el.innerHTML = `<button class="coachhead" id="coachToggle" aria-expanded="${S.coachOpen}"><span>Coach</span><small>${steps.filter(s=>s.do && s.do.some(tokenDone)).length}/${steps.filter(s=>s.do).length} steps done</small></button>${S.coachOpen ? `<ol class="coachlist">${items}</ol>` : ''}`;
}
function renderTabs(){
  document.querySelectorAll('#tabs button').forEach(b=>{
    const t = b.dataset.tab;
    b.setAttribute('aria-selected', String(S.tab===t));
    const label = {history:'History', exam:'Exam', orders:'Orders', chart:'Chart'}[t];
    b.innerHTML = label + (t==='chart' && S.unseen ? `<span class="badge">${S.unseen}</span>` : '');
  });
}
function renderCommitNote(){
  const n = unreadCount();
  $('#commitNote').textContent = n ? `${n} unread stud${n>1?'ies':'y'}. Unread studies score 0 for image reading.` : 'Next: diagnosis, triage, then the plan.';
}
function renderTab(){
  const el = $('#tabbody');
  const key = '<span class="keyhint">Key</span>';
  if(S.tab==='history'){
    el.innerHTML = `<div class="help">Quick questions take seconds. The opening story takes about 2 minutes.</div>` + HISTORY_Q.map(([id,q,secs])=>{
      const done = S.asked.includes(id);
      const ans = C.hist[id] || C.histDefault || HIST_DEFAULT[id];
      const k = guided() && (C.keyHist||[]).includes(id) ? key : '';
      return `<button class="row ${done?'done':''}" data-ask="${id}"><span class="q">${done?`<b>${q}</b>${k}<span class="ans">${ans}</span>`:q+k}</span>${done?'':`<span class="cost">+${fmtDur(secs/60)}</span>`}</button>`;
    }).join('');
  } else if(S.tab==='exam'){
    el.innerHTML = `<div class="help">Click the patient in the 3D view, or pick a system. Times match the bedside: a glance takes seconds, a full neuro exam about 4 minutes.</div>` + EXAM_ITEMS.map(([id,name,verb])=>{
      const done = S.examined.includes(id), f = C.exam[id] || EXAM_DEFAULT[id];
      const k = guided() && (C.keyExam||[]).includes(id) ? key : '';
      const cu = done && (id==='heent' ? `<span class="cubtns"><span class="linkbtn" role="button" tabindex="0" data-closeup="mouth">Mouth</span> · <span class="linkbtn" role="button" tabindex="0" data-closeup="eyes">Eyes</span></span>` : id==='hands' ? `<span class="cubtns"><span class="linkbtn" role="button" tabindex="0" data-closeup="hands">Close-up</span></span>` : id==='gait' && C.look.gait!=='unable' ? `<span class="cubtns"><span class="linkbtn" role="button" tabindex="0" data-gait="1">Watch again</span></span>` : '');
      return `<div class="row ${done?'done':''}" data-exam="${id}" role="button" tabindex="0"><span class="q">${done?`<b>${name}</b>${k}<span class="ans">${f}</span>${cu||''}`:`${name} <span class="verb">· ${verb}</span>${k}`}</span>${done?'':`<span class="cost">+${fmtDur((EXAM_SECS[id]||30)/60)}</span>`}</div>`;
    }).join('');
  } else if(S.tab==='orders'){
    const cats = ['All', ...TEST_CATS];
    const yShort = {key:'Key', useful:'Useful', optional:'OK', low:'Low yield', harmful:'Harmful'};
    el.innerHTML = `<div class="ordertools"><input class="search" id="orderSearch" type="search" placeholder="Search ${TESTS.length} tests…" aria-label="Search tests" value="${S.orderQ.replace(/"/g,'&quot;')}"><div class="chips">${cats.map(c=>`<button class="chip-btn" data-ocat="${c}" aria-pressed="${S.orderCat===c}">${c}</button>`).join('')}</div>${C.care==='Outpatient' ? '<div class="help tight">Outpatient: labs return next day, imaging in days, procedures in weeks.</div>' : ''}</div>` +
      TEST_CATS.map(cat=>`<div class="sect" data-sect="${cat}">${cat}</div>` + TESTS.filter(t=>t.cat===cat).map(t=>{
        const got = !!S.ordered[t.id];
        const ct = C.tests[t.id];
        const g = guided() ? (ct ? ` <span class="ychip ${ct.y}">${yShort[ct.y]}</span>` : ' <span class="ychip none">Not needed</span>') : '';
        return `<label class="ord ${got?'got':''}" for="o-${t.id}" data-cat="${t.cat}" data-name="${t.name.toLowerCase()}"><input type="checkbox" id="o-${t.id}" data-order="${t.id}" ${got?'checked disabled':''} ${S.cart.includes(t.id)?'checked':''}><span class="q">${t.name}${t.img?' <span class="imgtag">image</span>':''}${t.invasive?' <span class="imgtag inv">invasive</span>':''}${g}</span><span class="cost">${money(t.cost)}<br>${fmtDur(testMinutes(t.id))}</span></label>`;
      }).join('')).join('') + `<div class="cartbar" id="cartbar"></div>`;
    filterOrders(); renderCart();
  } else {
    S.unseen = 0; renderTabs();
    if(!S.log.length){ el.innerHTML = `<div class="help">Nothing charted yet. Questions, exam findings, and results show up here, newest first.</div>`; return; }
    const tagName = {hx:'HX', ex:'EXAM', rx:'RESULT', event:'EVENT'};
    el.innerHTML = S.log.map((e,i)=>({e,i})).reverse().map(({e,i})=>{
      let body;
      if(e.img){
        body = `<div class="studyrow"><button class="thumb" data-read="${i}" aria-label="Open ${e.title}"><canvas data-img='${JSON.stringify(e.img)}'></canvas></button><div>${e.read ? `<div class="b mono">${e.body}</div><button class="linkbtn" data-read="${i}">Your read: ${Math.round(e.read.score*100)}% · review</button>` : `<div class="b muted">Report hidden until you read the study.</div><button class="btn small" data-read="${i}">Read study</button>`}</div></div>`;
      } else body = `<div class="b ${e.type==='rx'?'mono':''}">${e.body}</div>`;
      return `<div class="entry"><div class="h"><span class="tm">T+${fmtClock(e.at)}</span><span class="tag ${e.type==='event'?'ev':''}">${tagName[e.type]}</span><b>${e.title}</b></div>${body}</div>`;
    }).join('');
    paintThumbs(el);
  }
}
function filterOrders(){
  const q = S.orderQ.trim().toLowerCase(), cat = S.orderCat;
  document.querySelectorAll('#tabbody .ord').forEach(r=>{ r.hidden = !((cat==='All' || r.dataset.cat===cat) && (!q || r.dataset.name.includes(q))); });
  document.querySelectorAll('#tabbody .sect').forEach(s=>{ s.hidden = ![...document.querySelectorAll(`#tabbody .ord[data-cat="${s.dataset.sect}"]`)].some(r=>!r.hidden); });
}
function renderCart(){
  const cart = S.cart.filter(id=>!S.ordered[id]);
  const dt = cart.length ? Math.max(...cart.map(testMinutes)) : 0;
  const cost = cart.reduce((a,id)=>a+TEST[id].cost,0);
  $('#cartbar').innerHTML = `<span>${cart.length ? `${cart.length} selected · +${fmtDur(dt)} · ${money(cost)}` : 'Nothing selected'}</span><button class="btn" id="sendBtn" ${cart.length?'':'disabled'}>Send orders</button>`;
}
function paintThumbs(root){ root.querySelectorAll('canvas[data-img]').forEach(cv=>{ drawImage(cv, JSON.parse(cv.dataset.img)); }); }
function showToast(html, ms){
  const t = $('#toast'); t.innerHTML = `<button class="x" aria-label="Close">×</button>` + html; t.hidden = false;
  clearTimeout(toastTimer); if(ms) toastTimer = setTimeout(hideToast, ms);
}
function hideToast(){ $('#toast').hidden = true; clearTimeout(toastTimer); }
function showBanner(text, sticky){ const b = $('#banner'); b.textContent = text; b.hidden = false; clearTimeout(bannerTimer); if(!sticky) bannerTimer = setTimeout(()=>{ b.hidden = true; }, 7000); }

/* ---------- menu ---------- */
function renderMenu(){
  const best = store.get('best', {});
  const filt = store.get('filter', 'All'), care = store.get('care', 'All'), mode = store.get('mode', 'graded');
  const m = $('#menu');
  const played = CASES.filter(c=>best[c.id]!=null);
  const avg = played.length ? Math.round(played.reduce((a,c)=>a+best[c.id],0)/played.length) : null;
  const visible = c => (filt==='All' || c.subject===filt) && (care==='All' || c.care===care);
  const counts = Object.fromEntries(SUBJECTS.map(s=>[s, CASES.filter(c=>c.subject===s && (care==='All'||c.care===care)).length]));
  const careCounts = Object.fromEntries(CARE.map(s=>[s, CASES.filter(c=>c.care===s && (filt==='All'||c.subject===filt)).length]));
  const card = c => { const b = best[c.id]; return `<button class="card" data-case="${c.id}"><div class="top"><span class="subj">${c.subject}</span><span>${c.care} · ${c.setting}</span></div><div class="nm">${c.name}, ${c.age} ${c.sex}</div><q>${c.cc}</q><div class="why">${c.tierWhy}</div><div class="best"><span>${b!=null?'Best score':'Not yet seen'}</span>${b!=null?`<span><span class="grade g-${gradeOf(b)}">${gradeOf(b)}</span> · ${b}</span>`:''}</div></button>`; };
  m.innerHTML = `<div class="menuwrap">
    <div class="hero">
      <div>
        <h1>WARD<span>·</span><br>ROUNDS</h1>
        <svg class="ekg" viewBox="0 0 600 46" preserveAspectRatio="none" aria-hidden="true"><polyline fill="none" stroke="#5be08a" stroke-width="2" points="0,30 80,30 92,26 100,30 118,30 124,34 130,4 136,40 142,30 170,30 184,24 198,30 280,30 292,26 300,30 318,30 324,34 330,4 336,40 342,30 370,30 384,24 398,30 480,30 492,26 500,30 518,30 524,34 530,4 536,40 542,30 570,30 584,24 600,30"/></svg>
        <p>${CASES.length} internal medicine patients across the ED, the wards, and clinic. Take a history, examine the patient in 3D (gown off when you need it, close-ups of the mouth, eyes, and nails, and a gait exam), and read your own studies. Then decide what it is, how urgent it is, and what to do.</p>
        <div class="modes" role="group" aria-label="Mode"><button class="mode-btn" data-mode="graded" aria-pressed="${mode==='graded'}"><b>Graded</b><span>No hints. Your best score is saved.</span></button><button class="mode-btn" data-mode="guided" aria-pressed="${mode==='guided'}"><b>Guided practice</b><span>A coach shows the next step, flags key items, and explains results as they arrive.</span></button></div>
      </div>
      <div class="scoring">
        <div><b>30</b><small>Diagnosis, with partial credit for close calls.</small></div>
        <div><b>30</b><small>Management. Harmful orders cost the most.</small></div>
        <div><b>10</b><small>Triage: from act-now to watchful waiting.</small></div>
        <div><b>15</b><small>Efficiency: time, cost, and low-yield tests.</small></div>
        <div><b>15</b><small>Image reads, scored on the findings you pick.</small></div>
      </div>
    </div>
    <div class="menubar">
      <div class="filters">
        <div class="chips" role="group" aria-label="Filter by care setting"><button class="chip-btn" data-care="All" aria-pressed="${care==='All'}">All settings</button>${CARE.map(s=>`<button class="chip-btn" data-care="${s}" aria-pressed="${care===s}">${s} ${careCounts[s]}</button>`).join('')}</div>
        <div class="chips" role="group" aria-label="Filter by subject"><button class="chip-btn" data-filter="All" aria-pressed="${filt==='All'}">All subjects</button>${SUBJECTS.filter(s=>counts[s]).map(s=>`<button class="chip-btn" data-filter="${s}" aria-pressed="${filt===s}">${s} ${counts[s]}</button>`).join('')}</div>
      </div>
      <div class="menuact"><span class="stat">${played.length}/${CASES.length} graded${avg!=null?` · avg ${avg}`:''}</span>${S && C && !S.done ? `<button class="btn dark" id="resumeBtn">Resume ${C.name.split(' ')[0]}</button>`:''}<button class="btn" id="randomBtn">Random patient</button></div>
    </div>
    ${[1,2,3].map(t=>{ const list = CASES.filter(c=>c.tier===t && visible(c)); if(!list.length) return ''; return `<section class="tier"><div class="tierhead"><h3><span class="tiernum">Tier ${t}</span> ${TIERS[t].name}</h3><p>${TIERS[t].blurb}</p></div><div class="cases">${list.map(card).join('')}</div></section>`; }).join('') || '<p class="stat">No cases match these filters.</p>'}
  </div>`;
  m.hidden = false;
}

/* ---------- diagnosis, triage, plan ---------- */
function openDx(){
  const m = $('#dxModal');
  m.innerHTML = `<div class="sheet"><header><div class="meta">Step 1 of 3 · T+${fmtClock(S.clock)} · ${money(S.cost)} spent</div><h2>What’s your diagnosis for ${C.name}?</h2></header>
    <div class="body"><input class="search" id="dxSearch" type="search" placeholder="Search ${DX.length} diagnoses…" aria-label="Filter diagnoses">
    ${SUBJECTS.map(sub=>{ const list = DX.filter(d=>d[2]===sub); if(!list.length) return ''; return `<div class="dxgroup" data-group="${sub}"><div class="sect">${sub}</div><div class="dxlist">${list.map(([id,n])=>`<label data-n="${n.toLowerCase()}"><input type="radio" name="dx" id="dx-${id}" value="${id}" ${S.dx===id?'checked':''}><span>${n}</span></label>`).join('')}</div></div>`; }).join('')}</div>
    <footer><button class="btn ghost" data-close="dxModal">Keep working</button><button class="btn" id="dxNext">Next: triage</button></footer></div>`;
  m.hidden = false; m.scrollTop = 0;
  $('#dxSearch').addEventListener('input', e=>{
    const q = e.target.value.toLowerCase();
    m.querySelectorAll('.dxlist label').forEach(l=>{ l.hidden = !l.dataset.n.includes(q); });
    m.querySelectorAll('.dxgroup').forEach(gp=>{ gp.hidden = ![...gp.querySelectorAll('label')].some(l=>!l.hidden); });
  });
}
function openTriage(){
  const m = $('#triModal');
  m.innerHTML = `<div class="sheet"><header><div class="meta">Step 2 of 3 · Triage</div><h2>How urgently does this need to be addressed?</h2></header>
    <div class="body"><p class="chosen">Diagnosis: <b>${DXN[S.dx]}</b> · Seen in: <b>${C.setting}</b></p>
    <div class="planlist">${ACUITY.map(([id,name,desc])=>`<label><input type="radio" name="tri" id="tri-${id}" value="${id}" ${S.tri===id?'checked':''}><span><b>${name}</b><br><span class="muted">${desc}</span></span></label>`).join('')}</div></div>
    <footer><button class="btn ghost" id="triBack">Back</button><button class="btn" id="triNext">Next: plan</button></footer></div>`;
  m.hidden = false; m.scrollTop = 0;
}
function openPlan(){
  const m = $('#planModal');
  const order = shuffle(C.plan.map((p,i)=>i), seeded(hashStr(C.id)));
  m.innerHTML = `<div class="sheet"><header><div class="meta">Step 3 of 3 · Management</div><h2>Choose every order that belongs in the plan</h2></header>
    <div class="body"><p class="chosen">Diagnosis: <b>${DXN[S.dx]}</b> · Triage: <b>${ACUITY_NAME[S.tri]}</b></p>
    <div class="planlist">${order.map(i=>`<label><input type="checkbox" id="pl-${i}" value="${i}" ${S.plan.includes(i)?'checked':''}><span>${C.plan[i].t}</span></label>`).join('')}</div></div>
    <footer><button class="btn ghost" id="planBack">Back</button><button class="btn" id="planSubmit">Submit plan</button></footer></div>`;
  m.hidden = false; m.scrollTop = 0;
}

/* ---------- scoring ---------- */
function score(){
  const notes = {dx:[], mg:[], tr:[], ef:[], im:[]};
  let dx = 0;
  if(S.dx===C.dx){ dx = MAX.dx; notes.dx.push(`Correct diagnosis +${MAX.dx}`); }
  else if(C.dxPartial && C.dxPartial[S.dx]){ dx = Math.round(C.dxPartial[S.dx]*MAX.dx/40); notes.dx.push(`Close: ${DXN[S.dx]} +${dx}`); }
  else notes.dx.push(`${DXN[S.dx]} is incorrect. +0`);
  const W = {essential:2, good:1};
  const tot = C.plan.reduce((a,p)=>a+(W[p.k]||0),0);
  let got = 0, wrong = 0, harm = 0;
  S.plan.forEach(i=>{ const k = C.plan[i].k; if(W[k]) got += W[k]; if(k==='wrong') wrong++; if(k==='harmful') harm++; });
  const base = Math.round(MAX.mg*got/tot);
  notes.mg.push(`Indicated orders chosen: ${got}/${tot} weight → ${base}`);
  if(wrong) notes.mg.push(`${wrong} not-indicated order${wrong>1?'s':''}: −${3*wrong}`);
  if(harm) notes.mg.push(`${harm} harmful order${harm>1?'s':''}: −${8*harm}`);
  const missedEss = C.plan.filter((p,i)=>p.k==='essential' && !S.plan.includes(i)).length;
  if(missedEss) notes.mg.push(`${missedEss} essential order${missedEss>1?'s':''} missed`);
  const mg = clamp(base - 3*wrong - 8*harm, 0, MAX.mg);
  let tr = 0;
  if(S.tri===C.acuity.level){ tr = MAX.tr; notes.tr.push(`Triage: ${ACUITY_NAME[S.tri]} +${MAX.tr}`); }
  else if((C.acuity.partial||[]).includes(S.tri)){ tr = Math.round(MAX.tr/2); notes.tr.push(`Triage: ${ACUITY_NAME[S.tri]} is close (best: ${ACUITY_NAME[C.acuity.level]}) +${tr}`); }
  else notes.tr.push(`Triage: ${ACUITY_NAME[S.tri]} (best: ${ACUITY_NAME[C.acuity.level]}) +0`);
  let ef = MAX.ef;
  Object.keys(S.ordered).forEach(id=>{
    const y = resultFor(id).y;
    if(y==='low'){ ef -= 2; notes.ef.push(`Low yield: ${TEST[id].name} −2`); }
    if(y==='harmful'){ ef -= 5; notes.ef.push(`Harmful: ${TEST[id].name} −5`); }
  });
  const overT = S.clock / C.target.min - 1;
  if(overT > 0){ const p = Math.min(5, Math.ceil(overT*10)); ef -= p; notes.ef.push(`Time ${fmtClock(S.clock)} vs ${fmtClock(C.target.min)} target −${p}`); }
  else notes.ef.push(`Time ${fmtClock(S.clock)}, within the ${fmtClock(C.target.min)} target`);
  const overC = S.cost / C.target.cost - 1;
  if(overC > 0){ const p = Math.min(3, Math.ceil(overC*5)); ef -= p; notes.ef.push(`Spent ${money(S.cost)} vs ${money(C.target.cost)} target −${p}`); }
  else notes.ef.push(`Spent ${money(S.cost)}, within the ${money(C.target.cost)} target`);
  const keys = [...Object.entries(C.tests).filter(([,t])=>t.y==='key').map(([id])=>'test:'+id), ...(C.keyExam||[]).map(e=>'ex:'+e), ...(C.keyHist||[]).map(h=>'hx:'+h)];
  if(keys.length && !keys.some(tokenDone)){ ef -= 4; notes.ef.push('No key finding obtained before committing −4'); }
  ef = clamp(ef, 0, MAX.ef);
  const studies = S.log.filter(e=>e.type==='rx' && e.img);
  let im = null;
  if(studies.length){
    const mean = studies.reduce((a,e)=>a+(e.read ? e.read.score : 0),0)/studies.length;
    im = Math.round(MAX.im*mean);
    studies.forEach(e=>notes.im.push(`${e.title}: ${e.read ? (e.read.skipped ? 'skipped' : Math.round(e.read.score*100)+'%') : 'not read'}`));
  } else notes.im.push('No studies ordered. The other sections are scaled to 100.');
  const sub = dx+mg+tr+ef;
  let total = im==null ? Math.round(sub*100/(MAX.dx+MAX.mg+MAX.tr+MAX.ef)) : sub+im;
  if(S.arrested){ total = Math.max(0, total - 15); notes.ef.push('Patient arrested before treatment: −15 overall'); }
  return {dx, mg, tr, ef, im, total, notes};
}

function finish(){
  S.done = true;
  const Rs = score();
  if(!guided()) saveBest(C.id, Rs.total);
  const g = gradeOf(Rs.total);
  const oneOfDone = id => (C.keyOneOf||[]).some(gp=>gp.includes(id) && gp.some(x=>S.ordered[x]));
  const skipped = [
    ...Object.entries(C.tests).filter(([id,t])=>t.y==='key' && !S.ordered[id] && !oneOfDone(id)).map(([id])=>TEST[id].name),
    ...(C.keyExam||[]).filter(e=>!S.examined.includes(e)).map(e=>'Exam: '+EXAM_NAME[e]),
    ...(C.keyHist||[]).filter(h=>!S.asked.includes(h)).map(h=>'History: '+HISTORY_Q.find(q=>q[0]===h)[1]),
  ];
  const orderedIds = Object.keys(S.ordered).sort((a,b)=>S.ordered[a].at - S.ordered[b].at);
  const recommended = Object.entries(C.tests).filter(([,t])=>t.y==='key' || t.y==='useful');
  const bar = (label, v, max) => `<div class="bar"><span>${label}</span><div class="track"><div class="fill" style="width:${v==null?0:100*v/max}%"></div></div><b>${v==null?'n/a':v+'/'+max}</b></div>`;
  const studies = S.log.map((e,i)=>({e,i})).filter(({e})=>e.type==='rx' && e.img);
  const triOk = S.tri===C.acuity.level, triClose = (C.acuity.partial||[]).includes(S.tri);
  const m = $('#debrief');
  m.innerHTML = `<div class="sheet">
    <header><div class="meta">${C.subject} · ${C.care} · Tier ${C.tier} · ${C.name}, ${C.age} ${C.sex} · T+${fmtClock(S.clock)} · ${money(S.cost)}${guided()?' · Guided practice (not saved)':''}</div><h2>${DXN[C.dx]}</h2></header>
    <div class="body">
      <div class="scorehead"><div class="biggrade g-${g}">${g}</div><div class="bars">${bar('Diagnosis',Rs.dx,MAX.dx)}${bar('Management',Rs.mg,MAX.mg)}${bar('Triage',Rs.tr,MAX.tr)}${bar('Efficiency',Rs.ef,MAX.ef)}${bar('Image reads',Rs.im,MAX.im)}<div class="total">Total ${Rs.total}/100${S.arrested?' (includes −15 for the arrest)':''}</div></div></div>
      <p class="verdict">You said <b>${DXN[S.dx]}</b>. ${S.dx===C.dx?'Correct.':`The answer was <b>${DXN[C.dx]}</b>.`}</p>
      <div class="dsec"><h3>Triage</h3><div class="rv"><span class="chip ${triOk?'key':triClose?'ok':'harmful'}">${triOk?'Correct':triClose?'Close':'Off'}</span><span>You chose <b>${ACUITY_NAME[S.tri]}</b>. Best: <b>${ACUITY_NAME[C.acuity.level]}</b>.</span><span class="why">${C.acuity.why}</span></div></div>
      <div class="dsec"><h3>How to approach this case</h3><ol class="approach">${(C.approach||[]).map(s=>{ const done = s.do && s.do.some(tokenDone); return `<li><span>${s.t}</span>${s.do ? `<em class="${done?'yes':'no'}">${done?'✓ you did this':'not done'}</em>` : ''}</li>`; }).join('')}</ol></div>
      <div class="dsec"><h3>Recommended workup, and why</h3>${recommended.map(([id,t])=>{ const did = S.ordered[id] || oneOfDone(id); return `<div class="rv"><span class="chip ${t.y}">${YIELD_LABEL[t.y]}</span><span><b>${TEST[id].name}</b> <span class="pick ${did?'on':''}">${S.ordered[id]?'· ordered':oneOfDone(id)?'· alternative ordered':'· not ordered'}</span></span><span class="why">${t.w}</span></div>`; }).join('') || '<p class="muted">This case is a clinical diagnosis. History and exam carry it.</p>'}</div>
      <div class="dsec"><h3>Scoring details</h3><ul class="ded">${[...Rs.notes.dx,...Rs.notes.mg,...Rs.notes.tr,...Rs.notes.ef,...Rs.notes.im].map(n=>`<li>${n}</li>`).join('')}</ul></div>
      ${studies.length ? `<div class="dsec"><h3>Your image reads</h3><div class="readsum">${studies.map(({e,i})=>`<button class="readcard" data-read="${i}"><canvas data-img='${JSON.stringify(e.img)}'></canvas><span><b>${e.title}</b><em>${e.read ? (e.read.skipped?'Skipped':Math.round(e.read.score*100)+'%') : 'Not read'}</em></span></button>`).join('')}</div></div>` : ''}
      <div class="dsec"><h3>Everything you ordered</h3>${orderedIds.length ? orderedIds.map(id=>{ const r = resultFor(id); return `<div class="rv"><span class="chip ${r.y}">${YIELD_LABEL[r.y]}</span><span><b>${TEST[id].name}</b></span><span class="why">${r.w}</span></div>`; }).join('') : '<p class="muted">You didn’t order any tests.</p>'}
        ${skipped.map(s=>`<div class="rv"><span class="chip missed">Missed</span><span><b>${s}</b></span><span class="why">A key part of this workup.</span></div>`).join('')}
      </div>
      <div class="dsec"><h3>Management review</h3>${C.plan.map((p,i)=>{ const on = S.plan.includes(i); return `<div class="rv"><span class="chip ${p.k}">${KIND_LABEL[p.k]}</span><span><b>${p.t}</b> <span class="pick ${on?'on':''}">${on?'· you chose this':'· not chosen'}</span></span><span class="why">${p.w}</span></div>`; }).join('')}</div>
      <div class="dsec"><h3>High-yield pearls</h3><ul class="pearls">${C.pearls.map(p=>`<li>${p}</li>`).join('')}</ul></div>
    </div>
    <footer><button class="btn ghost" id="dbMenu">All patients</button><button class="btn ghost" id="dbRetry">Retry this case</button><button class="btn" id="dbNext">Next patient</button></footer></div>`;
  ['dxModal','triModal','planModal'].forEach(i=>$('#'+i).hidden = true);
  m.hidden = false; m.scrollTop = 0;
  paintThumbs(m);
}

/* ---------- wiring ---------- */
document.addEventListener('click', e=>{
  const el = e.target.closest('button, input, [data-exam], [data-closeup], [data-gait]');
  if(!el) return;
  if(el.dataset.closeup){ e.stopPropagation(); if(S) openCloseup(el.dataset.closeup); return; }
  if(el.dataset.gait){ e.stopPropagation(); if(S && C.look.gait!=='unable') startGait(C.look.gait); return; }
  if(el.dataset.case){ startCase(el.dataset.case); return; }
  if(el.dataset.filter){ store.set('filter', el.dataset.filter); renderMenu(); return; }
  if(el.dataset.care){ store.set('care', el.dataset.care); renderMenu(); return; }
  if(el.dataset.mode){ store.set('mode', el.dataset.mode); renderMenu(); return; }
  if(el.id==='randomBtn'){ const f = store.get('filter','All'), cr = store.get('care','All'); const pool = CASES.filter(c=>(f==='All'||c.subject===f) && (cr==='All'||c.care===cr) && (!C || c.id!==C.id)); const p = pool.length ? pool : CASES; startCase(p[Math.floor(Math.random()*p.length)].id); return; }
  if(el.id==='resumeBtn'){ $('#menu').hidden = true; return; }
  if(el.id==='brandBtn'){ renderMenu(); return; }
  if(el.dataset.cam){ setCam(el.dataset.cam); return; }
  if(el.dataset.gown){ if(pat) setGown(!pat.gownOn); return; }
  if(el.dataset.close){ $('#'+el.dataset.close).hidden = true; return; }
  if(el.classList.contains('x')){ hideToast(); return; }
  if(el.id==='dbRetry'){ startCase(C.id); return; }
  if(el.id==='dbMenu'){ $('#debrief').hidden = true; renderMenu(); return; }
  if(el.id==='dbNext'){ const i = CASES.findIndex(c=>c.id===C.id); startCase(CASES[(i+1)%CASES.length].id); return; }
  if(el.dataset.read!=null && S){ openRead(+el.dataset.read); return; }
  if(!S || S.done) return;
  if(el.id==='coachToggle'){ S.coachOpen = !S.coachOpen; renderCoach(); return; }
  if(el.id==='readSubmit'){ submitRead(+el.dataset.idx, false); return; }
  if(el.id==='readSkip'){ submitRead(+el.dataset.idx, true); return; }
  if(el.dataset.tab){ S.tab = el.dataset.tab; renderTabs(); renderTab(); $('#tabbody').scrollTop = 0; return; }
  if(el.dataset.ask){ askHistory(el.dataset.ask); return; }
  if(el.dataset.exam){ doExam(el.dataset.exam); return; }
  if(el.dataset.ocat){ S.orderCat = el.dataset.ocat; document.querySelectorAll('[data-ocat]').forEach(b=>b.setAttribute('aria-pressed', String(b.dataset.ocat===S.orderCat))); filterOrders(); return; }
  if(el.dataset.order){ const id = el.dataset.order; if(el.checked){ if(!S.cart.includes(id)) S.cart.push(id); } else S.cart = S.cart.filter(x=>x!==id); renderCart(); return; }
  if(el.id==='sendBtn'){ sendOrders(); return; }
  if(el.id==='commitBtn'){ openDx(); return; }
  if(el.id==='dxNext'){ const r = document.querySelector('input[name="dx"]:checked'); if(!r){ const s = $('#dxSearch'); s.focus(); s.placeholder = 'Pick a diagnosis first'; return; } S.dx = r.value; $('#dxModal').hidden = true; openTriage(); return; }
  if(el.id==='triBack'){ const r = document.querySelector('input[name="tri"]:checked'); if(r) S.tri = r.value; $('#triModal').hidden = true; openDx(); return; }
  if(el.id==='triNext'){ const r = document.querySelector('input[name="tri"]:checked'); if(!r) return; S.tri = r.value; $('#triModal').hidden = true; openPlan(); return; }
  if(el.id==='planBack'){ S.plan = [...document.querySelectorAll('#planModal input:checked')].map(i=>+i.value); $('#planModal').hidden = true; openTriage(); return; }
  if(el.id==='planSubmit'){ S.plan = [...document.querySelectorAll('#planModal input:checked')].map(i=>+i.value); finish(); return; }
});
document.addEventListener('keydown', e=>{
  if(e.key==='Escape'){ for(const id of ['imgModal','dxModal']) if(!$('#'+id).hidden){ $('#'+id).hidden = true; break; } }
  if((e.key==='Enter' || e.key===' ') && e.target.matches && e.target.matches('[role="button"]')){ e.preventDefault(); e.target.click(); }
});
document.addEventListener('input', e=>{ if(e.target.id==='orderSearch' && S){ S.orderQ = e.target.value; filterOrders(); } });

function boot(data){
  initScene();
  const snap = data && data.st;
  if(snap && CASES.some(c=>c.id===snap.caseId)){ startCase(snap.caseId, snap); if(data.menu) renderMenu(); }
  else { renderTop(); renderMenu(); }
}
const hot = window.claude && window.claude.hot;
if(hot && hot.snapshot){ try { hot.snapshot(()=>({st: S && !S.done ? S : null, menu: !$('#menu').hidden})); } catch(e){} }
if(hot && hot.ready) hot.ready(boot); else boot((hot && hot.data) || {});
