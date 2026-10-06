"use strict";
/* Procedural study renderer. Every finding id in VOCAB has a drawing here.
   Images are schematic teaching renderings, not real patient studies. */

function seeded(seed){ return function(){ seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed>>>15, 1|seed); t = t + Math.imul(t ^ t>>>7, 61|t) ^ t; return ((t ^ t>>>14)>>>0)/4294967296; }; }
function hashStr(s){ let h = 2166136261; for(let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h>>>0; }
function modKey(img){ return img.type==='ct' ? 'ct_'+(img.region||'chest') : img.type==='us' ? 'us_'+(img.region||'ruq') : img.type; }
function setupCanvas(cv, W, H){ cv.width = W*2; cv.height = H*2; const g = cv.getContext('2d'); g.setTransform(2,0,0,2,0,0); return g; }

function drawImage(cv, img){
  const f = new Set(img.f || []);
  if(img.type==='cxr') return drawCXR(cv, f, img);
  if(img.type==='ct') return drawCT(cv, f, img);
  if(img.type==='ecg') return drawECG(cv, f, img);
  if(img.type==='us') return drawUS(cv, f, img);
  return drawMicro(cv, f, img);
}

/* ---------------- Chest X-ray ---------------- */
function drawCXR(cv, f, o){
  const W=300, H=360, g = setupCanvas(cv, W, H), R = seeded(7);
  g.fillStyle='#000'; g.fillRect(0,0,W,H);
  let gr = g.createRadialGradient(150,210,30,150,210,200); gr.addColorStop(0,'#6a6a6a'); gr.addColorStop(1,'#262626');
  g.fillStyle = gr; g.beginPath(); g.moveTo(8,H); g.bezierCurveTo(4,150,18,70,62,46); g.quadraticCurveTo(110,30,128,14); g.lineTo(172,14); g.quadraticCurveTo(190,30,238,46); g.bezierCurveTo(282,70,296,150,292,H); g.closePath(); g.fill();
  const ptxSide = f.has('ptx_R') ? 'R' : f.has('ptx_L') ? 'L' : null;
  const ten = !!ptxSide && f.has('shift_L');
  const shift = ten ? (ptxSide==='R' ? 24 : -24) : 0;
  const hyper = f.has('hyper'), lowVol = f.has('lowvol');
  const bot = hyper ? (o.mild ? 284 : 300) : lowVol ? 244 : 270;
  const lung = (s) => {
    const m = x => 150 + s*x;
    const sideIsPtx = ptxSide && ((ptxSide==='R' && s<0) || (ptxSide==='L' && s>0));
    const md = ten ? (sideIsPtx ? -Math.abs(shift)*.8 : Math.abs(shift)) : 0;
    const b = bot + (sideIsPtx && ten ? 14 : 0);
    const dome = hyper ? 6 : 28;
    const P = new Path2D();
    P.moveTo(m(28+md), 72);
    P.bezierCurveTo(m(38+md*.5),46, m(82),46, m(98),70);
    P.bezierCurveTo(m(120),100, m(127),190, m(116), b);
    P.bezierCurveTo(m(96), b-dome*1.1, m(56), b-dome, m(24+md), b-dome*.7);
    P.lineTo(m(22+md), 120); P.closePath();
    return {P, m, b, s};
  };
  const L = {R: lung(-1), L: lung(1)};
  for(const k of ['R','L']){
    const {P, m} = L[k];
    const lg = g.createLinearGradient(0,60,0,bot); lg.addColorStop(0,'#141414'); lg.addColorStop(1, hyper?'#0a0a0a':'#1b1b1b');
    g.fillStyle = lg; g.fill(P);
    g.save(); g.clip(P);
    g.strokeStyle = hyper ? 'rgba(255,255,255,.08)' : f.has('edema') ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.14)';
    for(let i=0;i<14;i++){
      const a = -1.3 + R()*2.4, len = 40 + R()*70;
      g.lineWidth = (f.has('edema') ? 3 : 2.2) - R();
      g.beginPath(); g.moveTo(m(40), 150+(R()-.5)*20);
      g.quadraticCurveTo(m(40+Math.cos(a)*len*.5), 150+Math.sin(a)*len*.5+(R()-.5)*16, m(40+Math.cos(a)*len), 150+Math.sin(a)*len);
      g.stroke();
    }
    if(f.has('edema')){ // cephalization: prominent upper-zone vessels
      g.lineWidth = 3; g.strokeStyle='rgba(255,255,255,.25)';
      for(let i=0;i<4;i++){ g.beginPath(); g.moveTo(m(42),140); g.quadraticCurveTo(m(50+i*8),110, m(55+i*12),72+i*4); g.stroke(); }
    }
    g.restore();
  }
  for(const s of [-1,1]) for(let i=0;i<9;i++){
    const y = 62 + i*24 + (hyper? i*2 : 0);
    g.strokeStyle='rgba(255,255,255,.13)'; g.lineWidth=7; g.beginPath(); g.moveTo(150+s*12,y); g.quadraticCurveTo(150+s*80,y-30,150+s*128,y+20); g.stroke();
    g.strokeStyle='rgba(0,0,0,.18)'; g.lineWidth=2.5; g.stroke();
  }
  g.strokeStyle='rgba(235,235,235,.55)'; g.lineWidth=8; g.lineCap='round';
  for(const s of [-1,1]){ g.beginPath(); g.moveTo(150+s*22,58); g.quadraticCurveTo(150+s*70,46,150+s*118,40); g.stroke(); }
  g.lineCap='butt';
  const cx = 150 + shift;
  const mw = f.has('widemed') ? 96 : 60;
  let mg = g.createLinearGradient(cx-mw/2,0,cx+mw/2,0); mg.addColorStop(0,'rgba(190,190,190,0)'); mg.addColorStop(.25,'rgba(205,205,205,.6)'); mg.addColorStop(.75,'rgba(205,205,205,.6)'); mg.addColorStop(1,'rgba(190,190,190,0)');
  g.fillStyle = mg; g.fillRect(cx-mw/2, 50, mw, 120);
  mg = g.createLinearGradient(cx-30,0,cx+30,0); mg.addColorStop(0,'rgba(190,190,190,0)'); mg.addColorStop(.3,'rgba(200,200,200,.55)'); mg.addColorStop(.7,'rgba(200,200,200,.55)'); mg.addColorStop(1,'rgba(190,190,190,0)');
  g.fillStyle = mg; g.fillRect(cx-30, 170, 60, H-170);
  g.strokeStyle='rgba(0,0,0,.55)'; g.lineWidth=11; g.beginPath(); g.moveTo(150,20); g.quadraticCurveTo(150,80,cx,130); g.stroke();
  g.fillStyle='rgba(215,215,215,.75)'; g.beginPath(); g.arc(cx+20,108, f.has('widemed')?22:14, 0, Math.PI*2); g.fill();
  const cm = f.has('cardiomeg');
  const hrx = cm ? 76 : hyper ? 38 : 50, hry = cm ? 62 : hyper ? 44 : 50;
  const hg = g.createRadialGradient(cx+12, bot-62, 10, cx+12, bot-62, 80); hg.addColorStop(0,'rgba(215,215,215,.95)'); hg.addColorStop(1,'rgba(170,170,170,.85)');
  g.fillStyle = hg; g.beginPath(); g.ellipse(cx+(cm?20:14), bot-(cm?54:58), hrx, hry, -0.2, 0, Math.PI*2); g.fill();
  if(!(f.has('eff_L')||f.has('eff_bil'))){ g.fillStyle='rgba(0,0,0,.5)'; g.beginPath(); g.ellipse(200, bot+22, 22, 12, 0, 0, Math.PI*2); g.fill(); }
  for(const s of [-1,1]){ g.fillStyle='rgba(210,210,210,.35)'; g.beginPath(); g.ellipse(150+shift+s*40,150,10,16,0,0,Math.PI*2); g.fill(); }

  const zoneY = z => z==='U' ? 98 : bot-48;
  const blob = (side, zone, size) => {
    const {P, m} = L[side]; const y = zoneY(zone), r = 62*size;
    g.save(); g.clip(P);
    const cg = g.createRadialGradient(m(72), y, 5, m(72), y, r); cg.addColorStop(0,'rgba(240,240,240,.85)'); cg.addColorStop(.6,'rgba(220,220,220,.55)'); cg.addColorStop(1,'rgba(200,200,200,0)');
    g.fillStyle = cg; g.fillRect(0,0,W,H);
    g.strokeStyle='rgba(0,0,0,.45)'; g.lineWidth=1.6;
    for(let i=0;i<4;i++){ g.beginPath(); g.moveTo(m(48), y-10+i*6); g.lineTo(m(70+R()*20), y-14+i*10); g.lineTo(m(86+R()*12), y-20+i*14); g.stroke(); }
    g.restore();
  };
  if(f.has('consol_RU')) blob('R','U',.6);
  if(f.has('consol_RL')) blob('R','L',1);
  if(f.has('consol_LL')) blob('L','L',.65);
  const haze = (count, alpha, rad, perihilar) => {
    for(const k of ['R','L']){
      const {P, m} = L[k]; g.save(); g.clip(P);
      for(let i=0;i<count;i++){
        const x = perihilar ? m(30 + R()*55) : m(26 + R()*92), y = perihilar ? 110 + R()*110 : 80 + R()*(bot-90), r = rad + R()*rad;
        const dg = g.createRadialGradient(x,y,2,x,y,r); dg.addColorStop(0,`rgba(230,230,230,${alpha})`); dg.addColorStop(1,'rgba(230,230,230,0)');
        g.fillStyle = dg; g.beginPath(); g.arc(x,y,r,0,Math.PI*2); g.fill();
      }
      g.restore();
    }
  };
  if(f.has('diffuse')) haze(46, .42, 14, false);
  if(f.has('ggo_bil')) haze(30, .26, 18, true);
  if(f.has('edema')){
    haze(16, .22, 16, true);
    g.strokeStyle='rgba(255,255,255,.45)'; g.lineWidth=1.2;
    for(const s of [-1,1]) for(let i=0;i<6;i++){ const y = bot-60+i*7; g.beginPath(); g.moveTo(150+s*112, y); g.lineTo(150+s*98, y); g.stroke(); }
  }
  const retic = (zone) => {
    for(const k of ['R','L']){
      const {P, m} = L[k];
      const y0 = zone==='low' ? bot-90 : 120, y1 = zone==='low' ? bot : 200;
      g.save(); g.clip(P); g.strokeStyle='rgba(255,255,255,.32)'; g.lineWidth=1;
      for(let i=0;i<120;i++){ const x = m(24+R()*96), y = y0+R()*(y1-y0); g.beginPath(); g.moveTo(x,y); g.lineTo(x+(R()-.5)*12, y+(R()-.5)*12); g.stroke(); }
      if(zone==='low') for(let i=0;i<22;i++){ const x = m(92+R()*24), y = y0+20+R()*(y1-y0-30); g.beginPath(); g.arc(x,y,3+R()*2.5,0,Math.PI*2); g.stroke(); }
      g.restore();
    }
  };
  if(f.has('retic_low')) retic('low');
  if(f.has('retic_mid')) retic('mid');
  if(f.has('hilar')){
    for(const s of [-1,1]) for(let i=0;i<3;i++){ g.fillStyle='rgba(225,225,225,.6)'; g.beginPath(); g.arc(150+s*(40+i*4), 136+i*16, 13-i*1.5, 0, Math.PI*2); g.fill(); }
    g.fillStyle='rgba(225,225,225,.45)'; g.beginPath(); g.arc(138,108,10,0,Math.PI*2); g.fill();
  }
  if(f.has('mass_R')){
    const mx = 98, my = 148;
    const mg2 = g.createRadialGradient(mx,my,4,mx,my,36); mg2.addColorStop(0,'rgba(240,240,240,.95)'); mg2.addColorStop(.75,'rgba(225,225,225,.8)'); mg2.addColorStop(1,'rgba(220,220,220,0)');
    g.fillStyle = mg2; g.beginPath();
    for(let a=0;a<Math.PI*2;a+=0.3){ const r = 30 + Math.sin(a*3)*5; const x = mx+Math.cos(a)*r, y = my+Math.sin(a)*r; a===0?g.moveTo(x,y):g.lineTo(x,y); }
    g.closePath(); g.fill();
    g.fillStyle='rgba(220,220,220,.5)'; g.fillRect(122,70,16,60);
  }
  if(f.has('cavity_RU')){
    const x = L.R.m(70), y = 96;
    g.fillStyle='#050505'; g.beginPath(); g.arc(x,y,15,0,Math.PI*2); g.fill();
    g.strokeStyle='rgba(240,240,240,.85)'; g.lineWidth=6; g.beginPath(); g.arc(x,y,18,0,Math.PI*2); g.stroke();
  }
  if(f.has('septic')){
    for(const k of ['R','L']){ const {P, m} = L[k]; g.save(); g.clip(P);
      for(let i=0;i<6;i++){ const x = m(70+R()*45), y = 90+R()*(bot-120), r = 6+R()*5;
        g.fillStyle='rgba(225,225,225,.8)'; g.beginPath(); g.arc(x,y,r,0,Math.PI*2); g.fill();
        if(i%2===0){ g.fillStyle='#080808'; g.beginPath(); g.arc(x,y,r*.45,0,Math.PI*2); g.fill(); } }
      g.restore(); }
  }
  const effusion = (side, size) => {
    const {P, m, b} = L[side]; const level = b - 30 - size*150;
    g.save(); g.clip(P);
    const eg = g.createLinearGradient(0, level-10, 0, level+30); eg.addColorStop(0,'rgba(225,225,225,0)'); eg.addColorStop(1,'rgba(225,225,225,.92)');
    g.fillStyle = eg; g.beginPath(); g.moveTo(m(10), level+18); g.quadraticCurveTo(m(80), level+12, m(130), level-26); g.lineTo(m(130), H); g.lineTo(m(10), H); g.closePath(); g.fill();
    g.restore();
  };
  if(f.has('eff_L')) effusion('L', .45);
  if(f.has('eff_R')) effusion('R', .45);
  if(f.has('eff_bil')){ effusion('L', .18); effusion('R', .18); }
  if(ptxSide){
    const {P, m} = L[ptxSide];
    g.save(); g.clip(P); g.fillStyle='#030303'; g.fillRect(0,0,W,H);
    const CL = new Path2D(); CL.ellipse(m(46 + (ten?-4:0)), 160, ten?20:44, ten?42:80, 0, 0, Math.PI*2);
    g.fillStyle='rgba(120,120,120,.75)'; g.fill(CL); g.strokeStyle='rgba(255,255,255,.7)'; g.lineWidth=1.3; g.stroke(CL);
    g.restore();
  }
  if(f.has('freeair')){
    g.fillStyle='#050505';
    for(const s of [-1,1]){ g.beginPath(); g.moveTo(150+s*30, bot-8); g.quadraticCurveTo(150+s*70, bot-34, 150+s*112, bot-2); g.quadraticCurveTo(150+s*70, bot-20, 150+s*30, bot-2); g.closePath(); g.fill(); }
  }
  g.fillStyle='#fff'; g.font='bold 18px ui-monospace, monospace'; g.fillText('R', 16, 30);
  g.font='11px ui-monospace, monospace'; g.fillStyle='rgba(255,255,255,.7)'; g.fillText(o.view||'PA', W-34, 26);
}

/* ---------------- CT (axial) ---------------- */
function drawCT(cv, f, o){
  const W=360, H=360, g = setupCanvas(cv, W, H), R = seeded(hashStr((o.region||'')+[...f].join()));
  g.fillStyle='#000'; g.fillRect(0,0,W,H);
  g.fillStyle='#2a2a2a'; g.fillRect(40,330,280,8);
  const side = o.side || 'R';
  const sx = s => s==='R' ? -1 : 1; // patient right is viewer left
  if(o.region==='head') drawCTHead(g, f, o, R, sx(side));
  else if(o.region==='abd') drawCTAbd(g, f, o, R);
  else drawCTChest(g, f, o, R, side);
  g.fillStyle='#ddd'; g.font='bold 14px ui-monospace, monospace'; g.fillText('R', 14, 24);
  g.font='10px ui-monospace, monospace'; g.fillStyle='rgba(255,255,255,.6)';
  g.fillText(o.region==='head' ? 'CT HEAD' : o.region==='abd' ? 'CT A/P +C' : (o.contrast ? 'CTA CHEST' : 'CT CHEST'), W-82, 22);
}
function drawCTChest(g, f, o, R, side){
  const con = !!o.contrast;
  g.fillStyle='#3a3a3a'; g.beginPath(); g.ellipse(180,185,152,118,0,0,Math.PI*2); g.fill();
  g.fillStyle='#6c6c6c'; g.beginPath(); g.ellipse(180,185,140,107,0,0,Math.PI*2); g.fill();
  const lungs = {R:new Path2D(), L:new Path2D()};
  lungs.R.ellipse(112,182,60,86,0,0,Math.PI*2); lungs.L.ellipse(248,182,60,86,0,0,Math.PI*2);
  const lungBase = f.has('emphysema') ? '#101010' : '#181818';
  for(const k of ['R','L']){ g.fillStyle = lungBase; g.fill(lungs[k]); }
  // ribs
  g.strokeStyle='#e8e8e8'; g.lineWidth=5;
  for(let a=0.2; a<Math.PI*2; a+=0.42){ if(a>1.2 && a<1.95) continue; const x = 180+Math.cos(a)*134, y = 185+Math.sin(a)*101; g.beginPath(); g.arc(x,y,6,a-.6,a+.6); g.stroke(); }
  g.fillStyle='#e6e6e6'; g.fillRect(170,74,20,12);
  g.fillStyle='#e6e6e6'; g.beginPath(); g.arc(180,268,22,0,Math.PI*2); g.fill(); g.fillStyle='#b8b8b8'; g.beginPath(); g.arc(180,268,13,0,Math.PI*2); g.fill();
  g.fillStyle='#e6e6e6'; g.fillRect(176,288,8,22);
  // vessels / airways
  const vcol = con ? '#e2e2e2' : '#828282';
  const vessel = (x,y,r) => { g.fillStyle=vcol; g.beginPath(); g.arc(x,y,r,0,Math.PI*2); g.fill(); };
  vessel(152,140,18); vessel(208,238,15); vessel(206,124,19); vessel(136,118,9);
  g.fillStyle='#000'; g.beginPath(); g.arc(164,176,8,0,Math.PI*2); g.arc(196,176,8,0,Math.PI*2); g.fill();
  // pulmonary arteries into hila
  g.strokeStyle=vcol; g.lineWidth=11; g.lineCap='round';
  g.beginPath(); g.moveTo(206,124); g.quadraticCurveTo(230,140,238,162); g.stroke();
  g.beginPath(); g.moveTo(200,128); g.quadraticCurveTo(160,150,140,166); g.stroke();
  g.lineCap='butt';
  // lung vessels
  for(const k of ['R','L']){
    g.save(); g.clip(lungs[k]);
    const cx = k==='R' ? 112 : 248;
    for(let i=0;i<55;i++){ const a = R()*Math.PI*2, d = R()*70; g.fillStyle='#5c5c5c'; g.beginPath(); g.arc(cx+Math.cos(a)*d*.8, 182+Math.sin(a)*d, .8+R()*1.8, 0, Math.PI*2); g.fill(); }
    if(f.has('emphysema')) for(let i=0;i<34;i++){ const a = R()*Math.PI*2, d = R()*60; g.fillStyle='#000'; g.beginPath(); g.arc(cx+Math.cos(a)*d*.8, 160+Math.sin(a)*d*.8, 3+R()*5, 0, Math.PI*2); g.fill(); }
    if(f.has('ggo')){ for(let i=0;i<26;i++){ const x = cx+(R()-.5)*100, y = 110+R()*150, r = 14+R()*18; const gg = g.createRadialGradient(x,y,2,x,y,r); gg.addColorStop(0,'rgba(120,120,120,.55)'); gg.addColorStop(1,'rgba(120,120,120,0)'); g.fillStyle=gg; g.beginPath(); g.arc(x,y,r,0,Math.PI*2); g.fill(); } }
    if(f.has('honey')){ g.strokeStyle='#9a9a9a'; g.lineWidth=1.6; for(let i=0;i<34;i++){ const a = (k==='R'? Math.PI*.55 : Math.PI*.05) + R()*Math.PI*.45; const x = cx+Math.cos(a)*52, y = 182+Math.sin(a)*76; g.beginPath(); g.arc(x+(R()-.5)*8, y+(R()-.5)*8, 3+R()*3, 0, Math.PI*2); g.stroke(); } }
    if(f.has('micronod')) for(let i=0;i<40;i++){ const t = R(); const x = (k==='R'?140:220) + (k==='R'?-1:1)*t*50 + (R()-.5)*10, y = 170 + (R()-.5)*60*t; g.fillStyle='#9a9a9a'; g.beginPath(); g.arc(x,y,1.6,0,Math.PI*2); g.fill(); }
    if(f.has('nodules')) for(let i=0;i<4;i++){ const a = R()*Math.PI*2; const x = cx+Math.cos(a)*48, y = 182+Math.sin(a)*70, r = 6+R()*4; g.fillStyle='#8c8c8c'; g.beginPath(); g.arc(x,y,r,0,Math.PI*2); g.fill(); if(i%2===0){ g.fillStyle='#050505'; g.beginPath(); g.arc(x,y,r*.45,0,Math.PI*2); g.fill(); } }
    g.restore();
  }
  const onSides = side==='B' ? ['R','L'] : [side];
  if(f.has('consol')) for(const k of onSides){ g.save(); g.clip(lungs[k]); const cx = k==='R'?112:248; g.fillStyle='#868686'; g.beginPath(); g.ellipse(cx+(k==='R'?-8:8), 230, 52, 34, 0, 0, Math.PI*2); g.fill(); g.strokeStyle='#121212'; g.lineWidth=2; for(let i=0;i<4;i++){ g.beginPath(); g.moveTo(cx, 215); g.lineTo(cx+(R()-.5)*60, 240+R()*12); g.stroke(); } g.restore(); }
  if(f.has('effusion')) for(const k of onSides){ g.save(); g.clip(lungs[k]); const cx = k==='R'?112:248; g.fillStyle='#5c5c5c'; g.beginPath(); g.ellipse(cx, 268, 62, 30, 0, 0, Math.PI*2); g.fill(); g.restore(); }
  if(f.has('loculated')){ const k = side==='B'?'L':side, cx = k==='R'?112:248; g.save(); g.clip(lungs[k]); g.fillStyle='#545454'; g.beginPath(); g.ellipse(cx+(k==='R'?-6:6), 238, 54, 42, 0, 0, Math.PI*2); g.fill(); g.strokeStyle='#cfcfcf'; g.lineWidth=3; g.stroke(); g.beginPath(); g.ellipse(cx+(k==='R'?-6:6), 238, 46, 35, 0, 0, Math.PI*2); g.stroke(); g.restore(); }
  if(f.has('cavity')){ g.save(); g.clip(lungs.R); g.strokeStyle='#8f8f8f'; g.lineWidth=7; g.beginPath(); g.arc(98,130,18,0,Math.PI*2); g.stroke(); g.fillStyle='#030303'; g.beginPath(); g.arc(98,130,13,0,Math.PI*2); g.fill(); g.restore(); }
  if(f.has('mass')){ g.fillStyle='#7a7a7a'; g.beginPath(); for(let a=0;a<Math.PI*2;a+=0.25){ const r = 30+Math.sin(a*4)*5; const x = 140+Math.cos(a)*r, y = 165+Math.sin(a)*r; a===0?g.moveTo(x,y):g.lineTo(x,y); } g.closePath(); g.fill(); }
  if(f.has('lad')){ g.fillStyle='#7c7c7c'; [[180,198,14],[150,104,10],[140,170,12],[222,170,12],[214,104,9]].forEach(([x,y,r])=>{ g.beginPath(); g.arc(x,y,r,0,Math.PI*2); g.fill(); }); }
  if(f.has('pe')){ g.fillStyle='#3a3a3a'; [[226,148,7,5],[152,156,8,5],[236,162,5,4]].forEach(([x,y,rx,ry])=>{ g.beginPath(); g.ellipse(x,y,rx,ry,.5,0,Math.PI*2); g.fill(); }); }
  if(f.has('dissection')){
    g.strokeStyle='#202020'; g.lineWidth=2.5;
    g.beginPath(); g.moveTo(138,132); g.quadraticCurveTo(152,142,166,148); g.stroke();
    g.beginPath(); g.moveTo(196,234); g.quadraticCurveTo(208,240,222,242); g.stroke();
    g.fillStyle='rgba(60,60,60,.35)'; g.beginPath(); g.arc(152,140,18,Math.PI*.15,Math.PI*1.15); g.fill();
  }
  if(f.has('ptx')){ const k = side==='B'?'R':side, cx = k==='R'?112:248; g.save(); g.clip(lungs[k]); g.fillStyle='#020202'; g.fillRect(cx-70,90,140,120); g.fillStyle='#1c1c1c'; g.beginPath(); g.ellipse(cx+(k==='R'?14:-14), 240, 40, 34, 0, 0, Math.PI*2); g.fill(); g.strokeStyle='#bdbdbd'; g.lineWidth=1.2; g.stroke(); g.restore(); }
}
function drawCTAbd(g, f, o, R){
  g.fillStyle='#3a3a3a'; g.beginPath(); g.ellipse(180,185,152,118,0,0,Math.PI*2); g.fill();
  g.strokeStyle='#6c6c6c'; g.lineWidth=9; g.beginPath(); g.ellipse(180,185,141,108,0,0,Math.PI*2); g.stroke();
  const ascites = f.has('ascites');
  // liver
  const nod = f.has('nodularliver');
  g.fillStyle='#909090'; g.beginPath();
  for(let a=0;a<Math.PI*2;a+=0.12){ const rr = (nod ? 62 : 82) + (nod ? Math.sin(a*9)*4 : 0); const x = 110+Math.cos(a)*rr*1.0, y = 168+Math.sin(a)*rr*.95; a===0?g.moveTo(x,y):g.lineTo(x,y); }
  g.closePath(); g.save(); g.clip(new Path2D('M30 70 L330 70 L330 300 L30 300 Z')); g.fill(); g.restore();
  if(f.has('liverlesions')){ g.fillStyle='#585858'; [[90,140,9],[120,180,12],[80,200,7],[132,128,8],[100,170,6]].forEach(([x,y,r])=>{ g.beginPath(); g.arc(x,y,r,0,Math.PI*2); g.fill(); }); }
  // gallbladder
  g.fillStyle='#4c4c4c'; g.beginPath(); g.ellipse(132,214,13,17,.3,0,Math.PI*2); g.fill();
  // spleen
  const sm = f.has('splenomeg');
  g.fillStyle='#8a8a8a'; g.beginPath(); g.ellipse(sm?258:268, sm?190:212, sm?50:28, sm?72:40, .3, 0, Math.PI*2); g.fill();
  // stomach
  g.fillStyle='#5a5a5a'; g.beginPath(); g.ellipse(232,128,40,26,-.2,0,Math.PI*2); g.fill();
  g.fillStyle='#000'; g.beginPath(); g.ellipse(232,116,30,12,-.2,0,Math.PI*2); g.fill();
  // bowel loops
  for(let i=0;i<7;i++){ const x = 150+R()*70, y = 120+R()*60; g.fillStyle = R()>.5 ? '#c8c8c8' : '#4a4a4a'; g.beginPath(); g.arc(x,y,7+R()*4,0,Math.PI*2); g.fill(); g.fillStyle='#000'; g.beginPath(); g.arc(x+2,y-2,2.5,0,Math.PI*2); g.fill(); }
  // colon (ascending, viewer left; descending, viewer right)
  const colWall = f.has('colitis') ? 8 : 3;
  for(const [x,y] of [[62,228],[298,226]]){ g.strokeStyle='#787878'; g.lineWidth=colWall; g.beginPath(); g.arc(x,y,13,0,Math.PI*2); g.stroke(); g.fillStyle='#050505'; g.beginPath(); g.arc(x,y,13-colWall/2,0,Math.PI*2); g.fill(); }
  if(f.has('colonmass')){ g.fillStyle='#7c7c7c'; g.beginPath(); for(let a=0;a<Math.PI*2;a+=0.3){ const r = 19+Math.sin(a*5)*4; const x = 62+Math.cos(a)*r, y = 228+Math.sin(a)*r; a===0?g.moveTo(x,y):g.lineTo(x,y); } g.closePath(); g.fill(); g.fillStyle='#050505'; g.beginPath(); g.arc(66,226,4,0,Math.PI*2); g.fill(); }
  // pancreas
  const pan = f.has('pancreatitis');
  g.strokeStyle='#858585'; g.lineWidth = pan ? 26 : 14; g.lineCap='round';
  g.beginPath(); g.moveTo(168,214); g.quadraticCurveTo(205,196,250,192); g.stroke(); g.lineCap='butt';
  if(pan){
    g.strokeStyle='rgba(150,150,150,.6)'; g.lineWidth=1.2;
    for(let i=0;i<40;i++){ const x = 160+R()*100, y = 178+R()*44; g.beginPath(); g.moveTo(x,y); g.lineTo(x+(R()-.5)*16, y+(R()-.5)*10); g.stroke(); }
    g.fillStyle='rgba(80,80,80,.6)'; g.beginPath(); g.ellipse(232,222,24,9,0,0,Math.PI*2); g.fill();
  }
  if(f.has('cbd')){ g.fillStyle='#454545'; g.beginPath(); g.arc(166,216,7,0,Math.PI*2); g.fill(); g.beginPath(); g.arc(150,196,6,0,Math.PI*2); g.fill(); }
  // vessels, spine, muscles
  g.fillStyle='#d8d8d8'; g.beginPath(); g.arc(196,236,12,0,Math.PI*2); g.fill();
  g.fillStyle='#bdbdbd'; g.beginPath(); g.ellipse(160,230,12,9,0,0,Math.PI*2); g.fill();
  g.fillStyle='#e6e6e6'; g.beginPath(); g.arc(180,270,22,0,Math.PI*2); g.fill(); g.fillStyle='#b8b8b8'; g.beginPath(); g.arc(180,270,13,0,Math.PI*2); g.fill();
  g.fillStyle='#6a6a6a'; g.beginPath(); g.ellipse(144,280,24,17,0,0,Math.PI*2); g.ellipse(216,280,24,17,0,0,Math.PI*2); g.fill();
  // kidneys
  const kidney = (x, hydro, stranding) => {
    if(stranding){ g.strokeStyle='rgba(140,140,140,.7)'; g.lineWidth=1.2; for(let i=0;i<22;i++){ const a = R()*Math.PI*2; g.beginPath(); g.moveTo(x+Math.cos(a)*24, 252+Math.sin(a)*30); g.lineTo(x+Math.cos(a)*34, 252+Math.sin(a)*40); g.stroke(); } }
    g.fillStyle='#cfcfcf'; g.beginPath(); g.ellipse(x,252,20,26,0,0,Math.PI*2); g.fill();
    g.fillStyle = hydro ? '#4a4a4a' : '#8a8a8a'; g.beginPath(); g.ellipse(x+(x<180?7:-7),252, hydro?12:6, hydro?15:8, 0, 0, Math.PI*2); g.fill();
    if(hydro){ g.beginPath(); g.arc(x-4,240,5,0,Math.PI*2); g.arc(x-4,264,5,0,Math.PI*2); g.fill(); }
  };
  kidney(132, f.has('hydro'), f.has('perinephric'));
  kidney(228, false, false);
  if(ascites){
    g.fillStyle='rgba(78,78,78,.95)';
    g.beginPath(); g.ellipse(70,140,28,60,-.3,0,Math.PI*2); g.fill();
    g.beginPath(); g.ellipse(296,180,18,50,.2,0,Math.PI*2); g.fill();
    g.beginPath(); g.ellipse(180,96,70,14,0,0,Math.PI*2); g.fill();
  }
  if(f.has('freeair')){ g.fillStyle='#000'; g.beginPath(); g.ellipse(150,86,46,8,0,0,Math.PI*2); g.fill(); g.beginPath(); g.ellipse(212,88,20,5,0,0,Math.PI*2); g.fill(); }
}
function drawCTHead(g, f, o, R, s){
  // s = +1 lesion on viewer right (patient left), −1 viewer left
  const shift = f.has('shift') ? -s*12 : 0;
  g.fillStyle='#f0f0f0'; g.beginPath(); g.ellipse(180,178,132,158,0,0,Math.PI*2); g.fill();
  g.fillStyle='#707070'; g.beginPath(); g.ellipse(180,178,121,147,0,0,Math.PI*2); g.fill();
  g.fillStyle='#5e5e5e'; g.beginPath(); g.ellipse(180,182,96,120,0,0,Math.PI*2); g.fill();
  // sulci
  g.strokeStyle='#2c2c2c'; g.lineWidth=1.5;
  for(let i=0;i<34;i++){ const a = R()*Math.PI*2; const x = 180+Math.cos(a)*112, y = 178+Math.sin(a)*138; g.beginPath(); g.moveTo(x,y); g.lineTo(180+Math.cos(a)*100, 178+Math.sin(a)*124); g.stroke(); }
  // sylvian fissures
  g.strokeStyle='#262626'; g.lineWidth=3;
  for(const sd of [-1,1]){ g.beginPath(); g.moveTo(180+sd*112, 170); g.quadraticCurveTo(180+sd*80, 175, 180+sd*60, 186); g.stroke(); }
  // falx
  g.strokeStyle='#9a9a9a'; g.lineWidth=1.5; g.beginPath(); g.moveTo(180,30); g.quadraticCurveTo(180+shift,178,180,326); g.stroke();
  // ventricles
  g.fillStyle='#1c1c1c';
  for(const sd of [-1,1]){
    const squeeze = (f.has('shift') && sd===s) ? .45 : 1;
    g.beginPath(); g.ellipse(180+shift+sd*16, 160, 9*squeeze, 34*squeeze+6, sd*.25, 0, Math.PI*2); g.fill();
    g.beginPath(); g.ellipse(180+shift+sd*22, 206, 7*squeeze, 14, sd*-.5, 0, Math.PI*2); g.fill();
  }
  g.fillRect(178+shift,176,4,20);
  if(f.has('sah')){
    g.strokeStyle='#e4e4e4'; g.lineWidth=4;
    for(const sd of [-1,1]){ g.beginPath(); g.moveTo(180+sd*108, 170); g.quadraticCurveTo(180+sd*78, 175, 180+sd*56, 188); g.stroke(); }
    g.beginPath(); g.moveTo(180,40); g.lineTo(180,110); g.stroke();
    g.fillStyle='#e0e0e0'; g.beginPath(); for(let a=0;a<Math.PI*2;a+=Math.PI/3){ g.moveTo(180,236); g.lineTo(180+Math.cos(a)*22, 236+Math.sin(a)*14); } g.lineWidth=5; g.stroke();
  }
  if(f.has('infarct')){ g.fillStyle='rgba(40,40,40,.65)'; g.beginPath(); g.moveTo(180+s*50,186); g.lineTo(180+s*118,120); g.quadraticCurveTo(180+s*128,180,180+s*112,236); g.closePath(); g.fill(); }
  if(f.has('mca_dense')){ g.strokeStyle='#dcdcdc'; g.lineWidth=4; g.lineCap='round'; g.beginPath(); g.moveTo(180+s*30,200); g.lineTo(180+s*62,190); g.stroke(); g.lineCap='butt'; }
  if(f.has('ich')){ const x = 180+s*48, y = 190; g.fillStyle='rgba(30,30,30,.5)'; g.beginPath(); g.ellipse(x,y,34,30,0,0,Math.PI*2); g.fill(); g.fillStyle='#ececec'; g.beginPath(); g.ellipse(x,y,24,20,.4,0,Math.PI*2); g.fill(); }
  if(f.has('sdh')){ g.fillStyle='#d8d8d8'; g.beginPath(); g.ellipse(180+s*114, 170, 12, 110, 0, s>0?-Math.PI/2:Math.PI/2, s>0?Math.PI/2:Math.PI*1.5); g.fill(); }
  if(f.has('ring')){ [[180-s*50,130],[180+s*44,220]].forEach(([x,y])=>{ g.fillStyle='rgba(35,35,35,.6)'; g.beginPath(); g.arc(x,y,24,0,Math.PI*2); g.fill(); g.strokeStyle='#e2e2e2'; g.lineWidth=3; g.beginPath(); g.arc(x,y,11,0,Math.PI*2); g.stroke(); g.fillStyle='#4a4a4a'; g.beginPath(); g.arc(x,y,9,0,Math.PI*2); g.fill(); }); }
}

/* ---------------- 12-lead ECG ---------------- */
const ECG_LEADS = ['I','II','III','aVR','aVL','aVF','V1','V2','V3','V4','V5','V6'];
const ECG_BASE = {
  I:{p:.08,q:-.05,r:.7,s:-.1,t:.25}, II:{p:.15,q:-.05,r:1.1,s:-.15,t:.3}, III:{p:.07,q:-.05,r:.5,s:-.2,t:.1},
  aVR:{p:-.1,q:0,r:.15,s:-.9,t:-.25}, aVL:{p:.03,q:-.05,r:.35,s:-.25,t:.08}, aVF:{p:.1,q:-.05,r:.8,s:-.15,t:.2},
  V1:{p:.06,q:0,r:.2,s:-1.0,t:-.05}, V2:{p:.07,q:0,r:.4,s:-1.3,t:.3}, V3:{p:.07,q:0,r:.8,s:-.8,t:.4},
  V4:{p:.08,q:-.05,r:1.3,s:-.4,t:.45}, V5:{p:.08,q:-.08,r:1.4,s:-.2,t:.35}, V6:{p:.08,q:-.08,r:1.1,s:-.1,t:.3},
};
function ecgModel(f, o){
  const L = {};
  for(const k of ECG_LEADS) L[k] = Object.assign({st:0, pr:0, u:0}, ECG_BASE[k]);
  const each = (leads, fn) => leads.forEach(k=>fn(L[k]));
  if(f.has('lvh')){ each(['V1','V2'], l=>{ l.s*=2.3; }); each(['V5','V6'], l=>{ l.r*=2.3; l.t=-.15; l.st=-.06; }); L.aVL.r = .9; L.I.r = 1.1; }
  if(f.has('rad')){ L.I.r=.2; L.I.s=-.6; L.III.r=1.1; L.III.s=-.05; L.aVF.r=1.0; L.aVL.r=.15; L.aVL.s=-.6; }
  if(f.has('ppulm')) each(['II','III','aVF'], l=>{ l.p = .3; });
  if(f.has('stemi_inf')){ L.II.st=.32; L.III.st=.45; L.aVF.st=.38; each(['II','III','aVF'], l=>{ l.t = Math.max(l.t,.45); }); }
  if(f.has('recip_lat')){ L.I.st=-.2; L.aVL.st=-.3; L.aVL.t=-.1; }
  if(f.has('stemi_ant')){ L.V1.st=.25; L.V2.st=.38; L.V3.st=.36; L.V4.st=.28; each(['V1','V2','V3','V4'], l=>{ l.t=.6; }); each(['II','III','aVF'], l=>{ l.st=-.1; }); }
  if(f.has('stdep')) each(['I','II','V4','V5','V6'], l=>{ l.st=-.16; l.t=.05; });
  if(f.has('diffuseSTE')){ each(['I','II','aVF','V2','V3','V4','V5','V6'], l=>{ l.st=.15; l.pr=-.06; }); L.aVR.st=-.1; L.aVR.pr=.06; }
  if(f.has('s1q3t3')){ L.I.s=-.45; L.III.q=-.3; L.III.t=-.2; }
  if(f.has('peakedT')){ for(const k of ECG_LEADS){ const l = L[k]; l.t *= 1.7; l.p *= .3; } each(['V2','V3','V4'], l=>{ l.t = 1.25; }); }
  if(f.has('lowvolt')) for(const k of ECG_LEADS){ const l = L[k]; l.q*=.3; l.r*=.3; l.s*=.3; l.t*=.5; }
  if(f.has('uwave')) for(const k of ECG_LEADS) L[k].u = .1;
  let rate = o.rate || (f.has('stach') ? 122 : f.has('sbrady') ? 50 : f.has('afib') ? 140 : 76);
  const wide = f.has('wideQRS') || f.has('chb');
  return {L, rate, wide, qrs: wide ? .14 : .08, pr: f.has('peakedT') ? .2 : .16,
    qtBase: f.has('longQT') ? .54 : f.has('shortQT') ? .29 : .40, peaked: f.has('peakedT'),
    afib: f.has('afib'), chb: f.has('chb'), alternans: f.has('alternans')};
}
function ecgBeats(M, R){
  const beats = [];
  if(M.chb){ for(let t=.3; t<10.5; t+=60/38) beats.push(t); return beats; }
  let t = .2;
  while(t < 10.6){ beats.push(t); const rr = 60/M.rate; t += M.afib ? rr*(.6 + R()*.85) : rr; }
  return beats;
}
function ecgValue(lead, t, M, beats, pWaves){
  const gs = (x, mu, sd) => Math.exp(-(((x-mu)/sd)**2));
  const sig = x => 1/(1+Math.exp(-x));
  let v = 0;
  for(let i=0;i<beats.length;i++){
    const x = t - beats[i];
    if(x < -.35 || x > .8) continue;
    const l = lead, alt = (M.alternans && i%2) ? .6 : 1;
    const rr = i+1 < beats.length ? beats[i+1]-beats[i] : 60/M.rate;
    const qt = M.qtBase * Math.sqrt(Math.min(1.4, Math.max(.45, rr)));
    const tc = qt - .1, tw = M.peaked ? .034 : .05;
    if(!M.afib && !M.chb){ v += l.p * gs(x, -M.pr+.05, .025); if(l.pr) v += l.pr * (sig((x+M.pr-.09)/.004) - sig(x/.004)); }
    const q = M.qrs;
    v += alt*(l.q * gs(x, q*.12, q*.1) + l.r * gs(x, q*.45, q*.14) + l.s * gs(x, q*.8, q*.12));
    if(l.st) v += l.st * sig((x-q)/.01) * (1 - sig((x-(tc+.04))/.02));
    v += l.t * gs(x, tc, tw);
    if(l.u) v += l.u * gs(x, tc+.13, .035);
  }
  if(pWaves) for(const pt of pWaves){ const x = t-pt; if(x>-.1 && x<.1) v += lead.p * gs(x, 0, .025); }
  if(M.afib) v += .03*Math.sin(t*2*Math.PI*6.3) + .02*Math.sin(t*2*Math.PI*8.7+1.3);
  return v;
}
function drawECG(cv, f, o){
  const pxs = 100, pxmv = 40, rowH = 112, left = 14, W = 1000+left*2, H = rowH*4 + 30;
  const g = setupCanvas(cv, W, H);
  const M = ecgModel(f, o), R = seeded(hashStr([...f].join()+(o.rate||'')));
  const beats = ecgBeats(M, R);
  const pWaves = M.chb ? Array.from({length:14}, (_,i)=>.1 + i*60/80) : null;
  g.fillStyle='#fff7f6'; g.fillRect(0,0,W,H);
  for(let x=left; x<=W-left; x+=4){ g.strokeStyle = ((x-left)%20===0) ? 'rgba(220,90,90,.45)' : 'rgba(235,150,150,.22)'; g.lineWidth = ((x-left)%20===0) ? 1 : .6; g.beginPath(); g.moveTo(x,6); g.lineTo(x,H-18); g.stroke(); }
  for(let y=6; y<=H-18; y+=4){ g.strokeStyle = ((y-6)%20===0) ? 'rgba(220,90,90,.45)' : 'rgba(235,150,150,.22)'; g.lineWidth = ((y-6)%20===0) ? 1 : .6; g.beginPath(); g.moveTo(left,y); g.lineTo(W-left,y); g.stroke(); }
  const layout = [['I','aVR','V1','V4'],['II','aVL','V2','V5'],['III','aVF','V3','V6']];
  g.strokeStyle='#1d1d1d'; g.lineWidth=1.3; g.lineJoin='round';
  const trace = (leadName, t0, t1, x0, y0) => {
    const l = M.L[leadName];
    g.beginPath();
    for(let t=t0; t<=t1; t+=.004){ const x = x0 + (t-t0)*pxs, y = y0 - ecgValue(l, t, M, beats, pWaves)*pxmv; t===t0 ? g.moveTo(x,y) : g.lineTo(x,y); }
    g.stroke();
  };
  for(let r=0;r<3;r++){
    const y0 = 6 + rowH*r + rowH*.6;
    for(let c=0;c<4;c++){
      const t0 = c*2.5, x0 = left + c*250;
      trace(layout[r][c], t0, t0+2.5, x0, y0);
      g.fillStyle='#222'; g.font='600 12px ui-monospace, monospace'; g.fillText(layout[r][c], x0+6, y0-34);
      if(c>0){ g.beginPath(); g.moveTo(x0, y0-10); g.lineTo(x0, y0+10); g.stroke(); }
    }
  }
  const yR = 6 + rowH*3 + rowH*.6;
  trace('II', 0, 10, left, yR);
  g.fillStyle='#222'; g.fillText('II', left+6, yR-34);
  g.font='11px ui-monospace, monospace'; g.fillStyle='#555';
  g.fillText('25 mm/s · 10 mm/mV', W-150, H-5);
}

/* ---------------- Ultrasound ---------------- */
function drawUS(cv, f, o){
  const W=360, H=300, g = setupCanvas(cv, W, H), R = seeded(hashStr((o.region||'')+[...f].join()));
  g.fillStyle='#000'; g.fillRect(0,0,W,H);
  const apex = [180, 8], rad = 285, a0 = Math.PI/2 - .72, a1 = Math.PI/2 + .72;
  const sector = new Path2D(); sector.moveTo(apex[0]-14, apex[1]); sector.lineTo(apex[0]+14, apex[1]); sector.arc(apex[0], apex[1], rad, a0, a1); sector.closePath();
  g.save(); g.clip(sector);
  const base = o.region==='renal' ? 62 : 84;
  const tg = g.createLinearGradient(0,0,0,H); tg.addColorStop(0,`rgb(${base+14},${base+14},${base+14})`); tg.addColorStop(1,`rgb(${base-30},${base-30},${base-30})`);
  g.fillStyle = tg; g.fillRect(0,0,W,H);
  for(let i=0;i<26000;i++){ const x = R()*W, y = R()*H; const c = base + (R()-.5)*110; g.fillStyle=`rgba(${c|0},${c|0},${c|0},.55)`; g.fillRect(x,y,2,1.3); }
  const shadow = (x, y, w) => { const sg = g.createLinearGradient(0,y,0,H); sg.addColorStop(0,'rgba(0,0,0,.92)'); sg.addColorStop(1,'rgba(0,0,0,.75)'); g.fillStyle=sg; g.beginPath(); g.moveTo(x-w/2,y); g.lineTo(x+w/2,y); g.lineTo(x+w*.75,H); g.lineTo(x-w*.75,H); g.closePath(); g.fill(); };
  if(o.region==='renal'){
    g.fillStyle='rgba(55,55,55,.9)'; g.beginPath(); g.ellipse(180,150,105,52,0,0,Math.PI*2); g.fill();
    g.strokeStyle='rgba(210,210,210,.8)'; g.lineWidth=2; g.stroke();
    for(let i=0;i<1600;i++){ const a = R()*Math.PI*2, d = Math.sqrt(R()); const x = 180+Math.cos(a)*100*d, y = 150+Math.sin(a)*48*d; const c = 60+R()*60; g.fillStyle=`rgb(${c},${c},${c})`; g.fillRect(x,y,1.5,1.2); }
    g.fillStyle='rgba(200,200,200,.75)'; g.beginPath(); g.ellipse(180,150,58,18,0,0,Math.PI*2); g.fill();
    if(f.has('hydro')){ g.fillStyle='#030303'; g.beginPath(); g.ellipse(184,152,38,14,0,0,Math.PI*2); g.fill(); [[148,136],[150,166],[214,134],[218,166]].forEach(([x,y])=>{ g.beginPath(); g.ellipse(x,y,14,9,0,0,Math.PI*2); g.fill(); }); g.fillRect(212,148,70,9); }
    if(f.has('stone_renal')){ g.fillStyle='#f4f4f4'; g.beginPath(); g.ellipse(150,150,8,5,0,0,Math.PI*2); g.fill(); shadow(150, 156, 16); }
  } else {
    if(f.has('ascites')){ g.fillStyle='#020202'; g.beginPath(); g.moveTo(40,70); g.quadraticCurveTo(110,40,200,44); g.lineTo(200,70); g.quadraticCurveTo(110,70,60,110); g.closePath(); g.fill(); }
    const thick = f.has('thickwall');
    g.strokeStyle = thick ? 'rgba(220,220,220,.9)' : 'rgba(200,200,200,.8)'; g.lineWidth = thick ? 9 : 2.5;
    g.beginPath(); g.ellipse(180,150,66,32,.12,0,Math.PI*2); g.stroke();
    g.fillStyle='#030303'; g.beginPath(); g.ellipse(180,150,thick?60:64,thick?26:30,.12,0,Math.PI*2); g.fill();
    if(f.has('stones')){ for(const [x,w] of [[168,16],[188,14],[206,12]]){ g.strokeStyle='#f6f6f6'; g.lineWidth=4; g.beginPath(); g.arc(x,176,w/2,Math.PI*1.05,Math.PI*1.95); g.stroke(); shadow(x, 178, w+4); } }
    const cbdW = f.has('cbd') ? 11 : 3.5;
    g.strokeStyle='#030303'; g.lineWidth=cbdW; g.beginPath(); g.moveTo(232,92); g.quadraticCurveTo(262,108,292,126); g.stroke();
    g.strokeStyle='rgba(30,30,30,.9)'; g.lineWidth=14; g.beginPath(); g.moveTo(236,112); g.quadraticCurveTo(266,128,296,146); g.stroke();
  }
  g.restore();
  g.fillStyle='rgba(255,255,255,.7)'; g.font='11px ui-monospace, monospace';
  g.fillText(o.region==='renal' ? 'RIGHT KIDNEY · LONG' : 'RUQ · GB LONG', 10, H-10);
  g.fillText('C5-1  4.5 MHz', W-96, H-10);
}

/* ---------------- Microscopy (smear, urine, synovial, Gram) ---------------- */
function drawMicro(cv, f, o){
  const W=340, H=340, g = setupCanvas(cv, W, H), R = seeded(hashStr(o.type+[...f].join()));
  const cx=170, cy=170, cr=165;
  g.fillStyle='#000'; g.fillRect(0,0,W,H);
  g.save(); g.beginPath(); g.arc(cx,cy,cr,0,Math.PI*2); g.clip();
  const bg = {smear:'#f4e8ec', urine:'#ecebdf', synovial:'#17130d', gram:'#f3e6ea'}[o.type] || '#eee';
  g.fillStyle = bg; g.fillRect(0,0,W,H);
  const pts = (n, minD) => { const out=[]; let tries=0; while(out.length<n && tries<n*60){ tries++; const x = 20+R()*300, y = 20+R()*300; if((x-cx)**2+(y-cy)**2 > (cr-10)**2) continue; if(out.every(p=>(p[0]-x)**2+(p[1]-y)**2 > minD*minD)) out.push([x,y]); } return out; };
  if(o.type==='smear') drawSmear(g, f, R, pts);
  else if(o.type==='urine') drawUrine(g, f, R, pts);
  else if(o.type==='synovial') drawSynovial(g, f, R, pts);
  else drawGram(g, f, R, pts);
  const vg = g.createRadialGradient(cx,cy,cr*.7,cx,cy,cr); vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,.35)');
  g.fillStyle = vg; g.fillRect(0,0,W,H);
  g.restore();
  g.fillStyle='rgba(255,255,255,.7)'; g.font='10px ui-monospace, monospace';
  g.fillText({smear:'Wright stain · 100×', urine:'Urine sediment · 40×', synovial:'Compensated polarized · 40×', gram:'Gram stain · 100×'}[o.type] || '', 8, 14);
}
function rbc(g, x, y, r, opts={}){
  const pale = opts.hypo ? .62 : .42;
  const gr = g.createRadialGradient(x,y,r*.1,x,y,r);
  if(opts.sphero){ gr.addColorStop(0,'#c45a6c'); gr.addColorStop(1,'#b44a5e'); }
  else { gr.addColorStop(0,'#f8dde1'); gr.addColorStop(pale,'#f2c3cb'); gr.addColorStop(1,'#d27585'); }
  g.fillStyle = gr; g.beginPath();
  if(opts.ell) g.ellipse(x,y,r*opts.ell,r,opts.rot||0,0,Math.PI*2); else g.arc(x,y,r,0,Math.PI*2);
  g.fill();
  if(opts.target){ g.fillStyle='#d27585'; g.beginPath(); g.arc(x,y,r*.32,0,Math.PI*2); g.fill(); }
  if(opts.hj){ g.fillStyle='#3e2161'; g.beginPath(); g.arc(x+r*.35,y-r*.2,2,0,Math.PI*2); g.fill(); }
}
function neutrophil(g, x, y, lobes){
  g.fillStyle='#ead6e8'; g.beginPath(); g.arc(x,y,17,0,Math.PI*2); g.fill();
  g.fillStyle='#5b2c83';
  for(let i=0;i<lobes;i++){ const a = i/lobes*Math.PI*2; g.beginPath(); g.ellipse(x+Math.cos(a)*7, y+Math.sin(a)*7, 5, 4, a, 0, Math.PI*2); g.fill(); }
}
function drawSmear(g, f, R, pts){
  if(f.has('rouleaux')){
    for(let row=0; row<7; row++){ const y0 = 40+row*42+R()*10, x0 = 20+R()*40, n = 6+Math.floor(R()*8), ang = (R()-.5)*.6;
      for(let i=0;i<n;i++) rbc(g, x0+i*Math.cos(ang)*9, y0+i*Math.sin(ang)*9, 10); }
  } else {
    const cells = pts(58, 22);
    cells.forEach(([x,y],i)=>{
      const roll = R();
      if(f.has('schisto') && roll < .25){ g.fillStyle='#d57886'; g.beginPath(); if(i%2){ g.moveTo(x-9,y+4); g.quadraticCurveTo(x,y-12,x+9,y+4); g.lineTo(x+3,y+1); g.lineTo(x-3,y+1); } else { g.moveTo(x-8,y+6); g.lineTo(x+9,y+4); g.lineTo(x,y-9); } g.closePath(); g.fill(); return; }
      if(f.has('sickle') && roll < .3){ g.fillStyle='#c9606f'; g.beginPath(); g.save(); g.translate(x,y); g.rotate(R()*Math.PI); g.moveTo(-14,0); g.quadraticCurveTo(0,-11,14,0); g.quadraticCurveTo(0,-4,-14,0); g.fill(); g.restore(); return; }
      if(f.has('spherocyte') && roll < .3){ rbc(g,x,y,7.5,{sphero:true}); return; }
      const micro = f.has('micro'), macro = f.has('macro');
      const r = micro ? 7 + R()*3.5 : macro ? 13 + R()*2 : 10 + R()*1.2;
      const ell = micro && roll > .85 ? 2.4 : macro ? 1.25 : null;
      rbc(g, x, y, r, {hypo:micro, ell, rot:R()*Math.PI, target: f.has('target') && roll > .55 && roll < .8, hj: f.has('howell') && roll > .9});
    });
  }
  const nPlt = f.has('lowplt') ? 1 : 10;
  for(let i=0;i<nPlt;i++){ g.fillStyle='#7d4b9a'; g.beginPath(); g.arc(30+R()*280, 30+R()*280, 1.6+R()*1.2, 0, Math.PI*2); g.fill(); }
  if(f.has('hyperseg')) neutrophil(g, 210, 120, 6); else if(!f.has('blasts')) neutrophil(g, 230, 230, 3);
  if(f.has('blasts')) [[110,120],[220,200],[150,250]].forEach(([x,y])=>{ g.fillStyle='#d9c6e6'; g.beginPath(); g.arc(x,y,22,0,Math.PI*2); g.fill(); g.fillStyle='#6a3d8f'; g.beginPath(); g.arc(x+2,y,18,0,Math.PI*2); g.fill(); g.strokeStyle='#c41f4b'; g.lineWidth=2; g.beginPath(); g.moveTo(x-14,y-15); g.lineTo(x-4,y-19); g.stroke(); g.fillStyle='#8c63ab'; g.beginPath(); g.arc(x+5,y-3,3,0,Math.PI*2); g.fill(); });
}
function cast(g, x, y, len, rot, fill, inner){
  g.save(); g.translate(x,y); g.rotate(rot);
  g.fillStyle=fill; g.strokeStyle='rgba(90,80,60,.6)'; g.lineWidth=1.2;
  g.beginPath(); g.moveTo(-len/2,-11); g.lineTo(len/2-11,-11); g.arc(len/2-11,0,11,-Math.PI/2,Math.PI/2); g.lineTo(-len/2,11); g.arc(-len/2,0,11,Math.PI/2,Math.PI*1.5); g.closePath(); g.fill(); g.stroke();
  inner(len); g.restore();
}
function drawUrine(g, f, R, pts){
  // squamous cell for orientation
  g.fillStyle='rgba(230,228,215,.9)'; g.strokeStyle='rgba(120,115,90,.5)'; g.lineWidth=1;
  g.beginPath(); g.moveTo(40,250); g.lineTo(90,232); g.lineTo(112,270); g.lineTo(80,298); g.lineTo(44,286); g.closePath(); g.fill(); g.stroke();
  g.fillStyle='rgba(100,95,70,.6)'; g.beginPath(); g.arc(78,266,4,0,Math.PI*2); g.fill();
  const rbcU = (x,y,dys) => { g.fillStyle='#e8bfa6'; g.strokeStyle='#b9876b'; g.lineWidth=1; g.beginPath(); g.arc(x,y,5,0,Math.PI*2); g.fill(); g.stroke(); if(dys){ g.beginPath(); g.arc(x+5,y-2,2,0,Math.PI*2); g.arc(x-3,y+5,1.8,0,Math.PI*2); g.fill(); g.stroke(); } };
  const wbcU = (x,y) => { g.fillStyle='#e0dccc'; g.strokeStyle='#8f8a70'; g.beginPath(); g.arc(x,y,8,0,Math.PI*2); g.fill(); g.stroke(); g.fillStyle='#8a8470'; for(let i=0;i<5;i++){ g.beginPath(); g.arc(x+(R()-.5)*8,y+(R()-.5)*8,1.2,0,Math.PI*2); g.fill(); } g.fillStyle='#6f6a55'; g.beginPath(); g.arc(x-2,y,2.4,0,Math.PI*2); g.arc(x+2,y+1,2.4,0,Math.PI*2); g.fill(); };
  if(f.has('rbccast')) cast(g, 170, 130, 110, -.3, 'rgba(226,170,130,.75)', (len)=>{ for(let i=0;i<8;i++){ g.fillStyle='#e9b28f'; g.strokeStyle='#b37a5a'; g.beginPath(); g.arc(-len/2+12+i*12, (R()-.5)*8, 4.5, 0, Math.PI*2); g.fill(); g.stroke(); } });
  if(f.has('wbccast')) cast(g, 190, 220, 120, .25, 'rgba(225,222,205,.85)', (len)=>{ for(let i=0;i<7;i++){ g.fillStyle='#8f8a70'; g.beginPath(); g.arc(-len/2+14+i*14, (R()-.5)*6, 4, 0, Math.PI*2); g.fill(); } });
  if(f.has('muddy')) [[150,110,-.4],[220,230,.3],[110,220,1.2]].forEach(([x,y,r])=>cast(g, x, y, 100, r, 'rgba(126,92,52,.85)', (len)=>{ for(let i=0;i<60;i++){ g.fillStyle='rgba(60,40,20,.7)'; g.fillRect(-len/2+R()*len, (R()-.5)*18, 2, 2); } }));
  if(f.has('dysRBC')) pts(14, 22).forEach(([x,y])=>rbcU(x,y,true));
  if(f.has('wbc')) pts(26, 20).forEach(([x,y])=>wbcU(x,y));
  if(f.has('bacteria')) for(let i=0;i<260;i++){ const x = 20+R()*300, y = 20+R()*300, a = R()*Math.PI; g.strokeStyle='rgba(70,70,60,.8)'; g.lineWidth=1.4; g.beginPath(); g.moveTo(x,y); g.lineTo(x+Math.cos(a)*4, y+Math.sin(a)*4); g.stroke(); }
  if(f.has('oval')) [[230,90],[120,150]].forEach(([x,y])=>{ g.fillStyle='#e6e2cc'; g.strokeStyle='#8f8a70'; g.beginPath(); g.arc(x,y,14,0,Math.PI*2); g.fill(); g.stroke(); for(let i=0;i<8;i++){ g.fillStyle='#fff'; g.strokeStyle='#333'; g.lineWidth=1; g.beginPath(); g.arc(x+(R()-.5)*16,y+(R()-.5)*16,2.6,0,Math.PI*2); g.fill(); g.stroke(); } });
  if(!f.size){ rbcU(200,90,false); rbcU(260,170,false); }
}
function drawSynovial(g, f, R, pts){
  // compensator axis
  g.strokeStyle='#d9d2b0'; g.fillStyle='#d9d2b0'; g.lineWidth=1.5; g.beginPath(); g.moveTo(60,40); g.lineTo(130,40); g.stroke();
  g.beginPath(); g.moveTo(130,40); g.lineTo(122,35); g.lineTo(122,45); g.closePath(); g.fill();
  g.font='10px ui-monospace, monospace'; g.fillText('slow ray', 62, 32);
  const nCells = f.has('pmn') ? 22 : 4;
  pts(nCells, 30).forEach(([x,y])=>{ g.fillStyle='rgba(120,110,90,.35)'; g.beginPath(); g.arc(x,y,9,0,Math.PI*2); g.fill(); g.fillStyle='rgba(160,150,120,.35)'; g.beginPath(); g.arc(x-2,y,3,0,Math.PI*2); g.arc(x+3,y+2,3,0,Math.PI*2); g.fill(); });
  if(f.has('needle')){
    for(let i=0;i<16;i++){ const x = 50+R()*240, y = 70+R()*220; const par = R() < .55; const a = par ? (R()-.5)*.5 : Math.PI/2 + (R()-.5)*.5; const len = 18+R()*16;
      g.strokeStyle = par ? '#f3d44c' : '#5aa8ff'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(x-Math.cos(a)*len/2, y-Math.sin(a)*len/2); g.lineTo(x+Math.cos(a)*len/2, y+Math.sin(a)*len/2); g.stroke(); }
  }
  if(f.has('rhomboid')){
    for(let i=0;i<14;i++){ const x = 50+R()*240, y = 70+R()*220; const par = R() < .55; const a = par ? (R()-.5)*.4 : Math.PI/2 + (R()-.5)*.4;
      g.save(); g.translate(x,y); g.rotate(a); g.fillStyle = par ? 'rgba(90,168,255,.75)' : 'rgba(243,212,76,.75)'; g.beginPath(); g.moveTo(-7,-3); g.lineTo(5,-3); g.lineTo(7,3); g.lineTo(-5,3); g.closePath(); g.fill(); g.restore(); }
  }
}
function drawGram(g, f, R, pts){
  const many = f.has('pmn');
  const pmns = pts(many ? 14 : 3, 44);
  pmns.forEach(([x,y])=>{ g.fillStyle='#e8bcc8'; g.beginPath(); g.arc(x,y,16,0,Math.PI*2); g.fill(); g.fillStyle='#b8466c'; for(let i=0;i<3;i++){ const a = i*2.1; g.beginPath(); g.ellipse(x+Math.cos(a)*6, y+Math.sin(a)*6, 5, 4, a, 0, Math.PI*2); g.fill(); } });
  const pos = '#3c1f6e', neg = '#c7365a';
  const rand = () => [30+R()*280, 30+R()*280];
  const place = (n, fn, intra) => { for(let i=0;i<n;i++){ let x, y; if(intra && pmns.length && i%2===0){ const p = pmns[i % pmns.length]; x = p[0]+(R()-.5)*14; y = p[1]+(R()-.5)*14; } else [x,y] = rand(); fn(x,y,R()*Math.PI); } };
  if(f.has('gpdc')) place(26, (x,y,a)=>{ g.fillStyle=pos; for(const d of [-1,1]){ g.save(); g.translate(x+Math.cos(a)*d*3.2, y+Math.sin(a)*d*3.2); g.rotate(a); g.beginPath(); g.ellipse(0,0,3.4,2.4,0,0,Math.PI*2); g.fill(); g.restore(); } });
  if(f.has('gndc')) place(26, (x,y,a)=>{ g.fillStyle=neg; for(const d of [-1,1]){ g.save(); g.translate(x+Math.cos(a)*d*2.8, y+Math.sin(a)*d*2.8); g.rotate(a); g.beginPath(); g.ellipse(0,0,2.4,3.2,0,0,Math.PI*2); g.fill(); g.restore(); } }, true);
  if(f.has('gpc_clusters')) for(let c=0;c<9;c++){ const [x,y] = rand(); g.fillStyle=pos; for(let i=0;i<9;i++){ g.beginPath(); g.arc(x+(R()-.5)*14, y+(R()-.5)*14, 2.6, 0, Math.PI*2); g.fill(); } }
  if(f.has('gnr')) place(40, (x,y,a)=>{ g.strokeStyle=neg; g.lineWidth=3; g.lineCap='round'; g.beginPath(); g.moveTo(x-Math.cos(a)*4, y-Math.sin(a)*4); g.lineTo(x+Math.cos(a)*4, y+Math.sin(a)*4); g.stroke(); g.lineCap='butt'; });
  if(f.has('gncb')) place(60, (x,y,a)=>{ g.fillStyle=neg; g.beginPath(); g.ellipse(x,y,2.2,1.5,a,0,Math.PI*2); g.fill(); });
  if(f.has('gpr')) place(30, (x,y,a)=>{ g.strokeStyle=pos; g.lineWidth=3.2; g.lineCap='round'; g.beginPath(); g.moveTo(x-Math.cos(a)*6, y-Math.sin(a)*6); g.lineTo(x+Math.cos(a)*6, y+Math.sin(a)*6); g.stroke(); g.lineCap='butt'; });
}
