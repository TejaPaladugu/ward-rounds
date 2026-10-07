"use strict";
/* Close-up exam illustrations: inside the mouth, the eyes, and the hands/nails.
   Drawn from the patient's look so findings (thrush, glossitis, icterus, clubbing…) appear when present. */

function hexMix(a, b, t){
  const p = h => [1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
  const A = p(a), B = p(b);
  return '#' + A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join('');
}
function shade(hex, k){ return hexMix(hex, k>0 ? '#ffffff' : '#000000', Math.abs(k)); }

function drawCloseup(cv, kind, L){
  if(kind==='mouth') return drawMouth(cv, L);
  if(kind==='eyes') return drawEyes(cv, L);
  return drawHands(cv, L);
}

function drawMouth(cv, L){
  const W=420, H=340, g = setupCanvas(cv, W, H), R = seeded(11);
  const m = new Set(L.mouth || []);
  const skin = L.skin;
  g.fillStyle = shade(skin, -.08); g.fillRect(0,0,W,H);
  // lips
  let lip = hexMix('#b35a5a', '#5b5c9a', Math.min(1, L.cyan||0));
  if(m.has('pale')) lip = hexMix(lip, '#e2c8c4', .45);
  g.fillStyle = lip; g.beginPath(); g.ellipse(210,175,180,140,0,0,Math.PI*2); g.fill();
  // oral cavity
  let muc = m.has('cyanosis') ? '#8b6f9a' : m.has('pale') ? '#e3b3ad' : '#d9787a';
  g.fillStyle = '#3a0f14'; g.beginPath(); g.ellipse(210,180,150,112,0,0,Math.PI*2); g.fill();
  // palate
  const pal = new Path2D(); pal.ellipse(210,120,118,70,0,Math.PI,0); pal.lineTo(328,140); pal.quadraticCurveTo(210,175,92,140); pal.closePath();
  g.fillStyle = muc; g.fill(pal);
  g.strokeStyle = shade(muc,-.15); g.lineWidth = 1.2;
  for(let i=0;i<7;i++){ g.beginPath(); g.moveTo(150+i*20,72); g.quadraticCurveTo(155+i*20,100,150+i*20,125); g.stroke(); } // rugae
  // uvula and tonsils (hidden if Mallampati IV)
  const mall4 = m.has('mallampati4');
  if(!mall4){
    g.fillStyle = shade(muc,-.05); g.beginPath(); g.ellipse(210,172,13,22,0,0,Math.PI*2); g.fill();
    g.fillStyle = '#5a1a20'; g.beginPath(); g.ellipse(210,198,58,30,0,0,Math.PI*2); g.fill();
    for(const s of [-1,1]){ g.fillStyle = shade(muc,-.1); g.beginPath(); g.ellipse(210+s*60,190,16,22,0,0,Math.PI*2); g.fill(); }
  }
  // upper teeth
  g.fillStyle = '#f3efe2'; g.strokeStyle = '#cfc6b0';
  for(let i=-5;i<=5;i++){ const x = 210+i*21, y = 64 + Math.abs(i)*3; g.beginPath(); g.roundRect ? g.roundRect(x-9,y-14,18,22,4) : g.rect(x-9,y-14,18,22); g.fill(); g.stroke(); }
  // tongue
  let tongue = m.has('glossitis') ? '#c43a3a' : m.has('cyanosis') ? '#93709c' : m.has('pale') ? '#e8b3ab' : '#d8807f';
  const tY = mall4 ? 178 : 238, tR = mall4 ? 108 : 82;
  g.fillStyle = tongue; g.beginPath(); g.ellipse(210,tY+20,140,tR,0,Math.PI,0); g.lineTo(350,330); g.lineTo(70,330); g.closePath(); g.fill();
  g.strokeStyle = shade(tongue,-.2); g.lineWidth = 2; g.beginPath(); g.moveTo(210,tY-40); g.lineTo(210,tY+60); g.stroke();
  if(!m.has('glossitis')){ for(let i=0;i<260;i++){ const x = 100+R()*220, y = tY-50+R()*120; if(((x-210)/140)**2 + ((y-tY-20)/tR)**2 > 1) continue; g.fillStyle = shade(tongue, R()>.5 ? .12 : -.08); g.fillRect(x,y,2,2); } }
  else { g.fillStyle='rgba(255,255,255,.25)'; g.beginPath(); g.ellipse(180,tY,40,12,-.2,0,Math.PI*2); g.fill(); }
  if(m.has('dry')){ g.strokeStyle = shade(tongue,-.3); g.lineWidth = 1.5; for(let i=0;i<9;i++){ const x = 130+R()*160, y = tY-20+R()*70; g.beginPath(); g.moveTo(x,y); g.lineTo(x+(R()-.5)*30,y+R()*14); g.stroke(); } }
  else { g.fillStyle='rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(240,tY-10,30,7,.2,0,Math.PI*2); g.fill(); }
  // lower teeth
  g.fillStyle = '#f3efe2'; g.strokeStyle = '#cfc6b0';
  for(let i=-4;i<=4;i++){ const x = 210+i*20, y = 300 - Math.abs(i)*3; g.beginPath(); g.roundRect ? g.roundRect(x-8,y-10,16,18,4) : g.rect(x-8,y-10,16,18); g.fill(); g.stroke(); }
  // findings
  if(m.has('thrush')){ g.fillStyle='rgba(250,248,235,.95)'; for(let i=0;i<26;i++){ const onTongue = i<16; const x = onTongue ? 130+R()*160 : (R()>.5? 80+R()*30 : 310+R()*30), y = onTongue ? tY-20+R()*80 : 140+R()*80; g.beginPath(); g.ellipse(x,y,4+R()*7,3+R()*5,R()*3,0,Math.PI*2); g.fill(); } }
  if(m.has('palatalUlcers')) [[180,105],[232,98],[208,128]].forEach(([x,y])=>{ g.fillStyle='rgba(200,40,40,.5)'; g.beginPath(); g.arc(x,y,11,0,Math.PI*2); g.fill(); g.fillStyle='#efe3b8'; g.beginPath(); g.ellipse(x,y,7,5,0,0,Math.PI*2); g.fill(); });
  if(m.has('petechiae')) for(let i=0;i<40;i++){ g.fillStyle='#8f0f1a'; g.beginPath(); g.arc(130+R()*160, 80+R()*70, 1.3+R()*1.2, 0, Math.PI*2); g.fill(); }
  if(m.has('pigment')){ g.fillStyle='rgba(70,40,25,.55)'; for(const [x,y,rx,ry] of [[96,170,16,26],[322,176,14,24],[160,90,20,8]]){ g.beginPath(); g.ellipse(x,y,rx,ry,.3,0,Math.PI*2); g.fill(); } }
  if(m.has('angular')) for(const s of [-1,1]){ g.strokeStyle='#8c2020'; g.lineWidth=3; g.beginPath(); g.moveTo(210+s*176,175); g.lineTo(210+s*196,166); g.moveTo(210+s*176,180); g.lineTo(210+s*194,188); g.stroke(); }
  if(mall4){ g.fillStyle='rgba(255,255,255,.75)'; g.font='12px ui-monospace, monospace'; g.fillText('Only the hard palate is visible (Mallampati IV)', 72, 26); }
}

function drawEyes(cv, L){
  const W=460, H=240, g = setupCanvas(cv, W, H);
  const skin = L.skin;
  const sclera = hexMix('#f5f2ea', '#dcbc2a', Math.min(1, (L.jaundice||0)*1.1));
  const conj = hexMix('#d4626a', '#f0d8d4', Math.min(1, (L.pallor||0)*1.4));
  g.fillStyle = skin; g.fillRect(0,0,W,H);
  g.fillStyle = shade(skin,-.1); g.fillRect(0,0,W,18);
  for(const cx of [120, 340]){
    const cy = 112;
    // lower lid pulled down to show conjunctiva
    g.fillStyle = conj; g.beginPath(); g.ellipse(cx, cy+34, 66, 20, 0, 0, Math.PI); g.fill();
    // eye opening
    const openTop = L.ptosis ? 18 : L.proptosis ? 46 : 36, openBot = 34;
    const eye = new Path2D(); eye.moveTo(cx-74, cy); eye.quadraticCurveTo(cx, cy-openTop*1.6, cx+74, cy); eye.quadraticCurveTo(cx, cy+openBot*1.25, cx-74, cy); eye.closePath();
    g.save(); g.clip(eye);
    g.fillStyle = sclera; g.fillRect(cx-80, cy-80, 160, 160);
    for(let i=0;i<6;i++){ g.strokeStyle='rgba(190,60,60,.35)'; g.lineWidth=1; g.beginPath(); g.moveTo(cx-70+i*4, cy+(i%2?6:-6)); g.quadraticCurveTo(cx-50, cy+(i-3)*4, cx-36, cy+(i-3)*3); g.stroke(); }
    const irisY = cy + (L.ptosis ? 6 : 0);
    g.fillStyle='#5b3d26'; g.beginPath(); g.arc(cx, irisY, 26, 0, Math.PI*2); g.fill();
    g.fillStyle='#120c08'; g.beginPath(); g.arc(cx, irisY, 10, 0, Math.PI*2); g.fill();
    g.fillStyle='rgba(255,255,255,.8)'; g.beginPath(); g.arc(cx-8, irisY-9, 5, 0, Math.PI*2); g.fill();
    g.restore();
    // upper lid crease and lashes
    g.strokeStyle = shade(skin,-.35); g.lineWidth = 3; g.beginPath(); g.moveTo(cx-74, cy); g.quadraticCurveTo(cx, cy-openTop*1.6, cx+74, cy); g.stroke();
    g.strokeStyle = shade(skin,-.2); g.lineWidth = 2; g.beginPath(); g.moveTo(cx-60, cy-openTop-22); g.quadraticCurveTo(cx, cy-openTop*1.6-26, cx+60, cy-openTop-22); g.stroke();
    // brow
    g.strokeStyle = L.hair; g.lineWidth = 8; g.lineCap='round'; g.beginPath(); g.moveTo(cx-66, cy-78); g.quadraticCurveTo(cx, cy-96, cx+66, cy-80); g.stroke(); g.lineCap='butt';
  }
  g.fillStyle='rgba(0,0,0,.55)'; g.font='12px ui-monospace, monospace'; g.fillText('Lower lids everted to show the conjunctiva', 12, H-10);
}

function drawHands(cv, L){
  const W=520, H=300, g = setupCanvas(cv, W, H);
  const n = new Set(L.nails || []);
  if(L.clubbing) n.add('clubbing');
  if((L.cyan||0) > .3) n.add('cyanosis');
  const skin = L.skin;
  g.fillStyle = '#e9ece6'; g.fillRect(0,0,W,H);
  // dorsal fingers
  const nailBase = n.has('cyanosis') ? '#8e86b8' : n.has('pale') ? '#efe2dc' : '#e9a9a6';
  for(let i=0;i<4;i++){
    const x = 50 + i*58, len = [150,170,160,130][i], club = n.has('clubbing');
    g.fillStyle = skin; g.beginPath(); g.roundRect ? g.roundRect(x, 290-len, 44, len, 20) : g.rect(x,290-len,44,len); g.fill();
    if(club){ g.beginPath(); g.ellipse(x+22, 290-len+22, 28, 30, 0, 0, Math.PI*2); g.fill(); }
    const nx = x+22, ny = 290-len+30, nw = club ? 22 : 16, nh = club ? 28 : 22;
    g.fillStyle = nailBase; g.beginPath(); g.ellipse(nx, ny, nw, nh, 0, 0, Math.PI*2); g.fill();
    if(n.has('koilonychia')){ g.fillStyle='rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(nx, ny+4, nw*.6, nh*.35, 0, 0, Math.PI*2); g.fill(); g.strokeStyle='rgba(120,90,80,.6)'; g.lineWidth=1.5; g.beginPath(); g.ellipse(nx, ny, nw, nh, 0, 0, Math.PI*2); g.stroke(); }
    else { g.fillStyle='rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(nx-4, ny-6, nw*.35, nh*.4, -.3, 0, Math.PI*2); g.fill(); }
    if(n.has('splinter') && (i===1 || i===2)){ g.strokeStyle='#5a0f12'; g.lineWidth=1.6; g.beginPath(); g.moveTo(nx-3+i, ny-12); g.lineTo(nx-1+i, ny+6); g.stroke(); }
    if(n.has('creases')){ g.strokeStyle = shade(skin,-.45); g.lineWidth = 3; for(const k of [.55,.72]){ g.beginPath(); g.moveTo(x+6, 290-len*(1-k)); g.lineTo(x+38, 290-len*(1-k)); g.stroke(); } }
  }
  g.fillStyle='#33434f'; g.font='12px ui-monospace, monospace'; g.fillText('Dorsal fingers', 50, 18);
  // side profile of index finger (Lovibond angle)
  const px = 310, py = 120;
  g.fillText('Index finger, side view', px, 18);
  g.fillStyle = skin; g.beginPath(); g.moveTo(px, py+40); g.lineTo(px+150, py+40); g.quadraticCurveTo(px+190, py+40, px+190, py+12); g.quadraticCurveTo(px+185, py-14, px+150, py-14); g.lineTo(px, py-14); g.closePath(); g.fill();
  const club = n.has('clubbing');
  g.strokeStyle = nailBase; g.lineWidth = 7; g.lineCap='round'; g.beginPath();
  if(club){ g.moveTo(px+120, py-12); g.quadraticCurveTo(px+160, py-34, px+188, py+4); }
  else { g.moveTo(px+125, py-15); g.quadraticCurveTo(px+160, py-20, px+186, py-6); }
  g.stroke(); g.lineCap='butt';
  g.strokeStyle='#1f7a72'; g.lineWidth=1.5; g.setLineDash([4,3]);
  g.beginPath(); g.moveTo(px+70, py-14); g.lineTo(px+125, py-14); g.lineTo(px+(club?170:178), py+(club?-36:-20)); g.stroke(); g.setLineDash([]);
  g.fillStyle='#1f7a72'; g.fillText(club ? 'Angle ≥ 180° (clubbing)' : 'Normal angle ≈ 160°', px+40, py+70);
  // palm
  const palmC = n.has('palmarErythema') ? '#e57c78' : n.has('pale') ? hexMix(skin,'#f2e6e0',.5) : shade(skin,.12);
  g.fillStyle = shade(skin,.08); g.beginPath(); g.ellipse(px+90, 240, 92, 48, 0, 0, Math.PI*2); g.fill();
  g.fillStyle = palmC; for(const [x,rx] of [[px+30,30],[px+150,30]]){ g.beginPath(); g.ellipse(x, 240, rx, 36, 0, 0, Math.PI*2); g.fill(); }
  if(n.has('creases')){ g.strokeStyle = shade(skin,-.5); g.lineWidth = 2.5; g.beginPath(); g.moveTo(px+10,228); g.quadraticCurveTo(px+90,212,px+170,232); g.moveTo(px+20,250); g.quadraticCurveTo(px+90,240,px+165,256); g.stroke(); }
  g.fillStyle='#33434f'; g.fillText('Palm', px+76, 300-6);
}
