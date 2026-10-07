"use strict";
/* 3D exam room: bed, monitor, and a procedurally built patient whose look reflects the case. */
let renderer, scene, camera, patientGroup = null, pat = null, raycaster, monCtx, monTex, glOK = true;
const cam = {az:-0.75, el:0.42, dist:2.9, target:null, goal:null};
let hovered = null, lastMon = 0;

function std(color, rough=.7, metal=0){ return new THREE.MeshStandardMaterial({color, roughness:rough, metalness:metal}); }
function canvasTex(w, h, draw, rep){ const c = document.createElement('canvas'); c.width=w; c.height=h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if(rep){ t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; }
function mixHex(a, b, t){ return new THREE.Color(a).lerp(new THREE.Color(b), t); }

function initScene(){
  const cv = document.getElementById('gl');
  try { if(typeof THREE === 'undefined') throw new Error('no three'); renderer = new THREE.WebGLRenderer({canvas:cv, antialias:true}); }
  catch(e){ glOK = false; document.getElementById('view').insertAdjacentHTML('beforeend','<div class="banner" style="top:40%">3D isn’t available in this browser. You can still play from the chart.</div>'); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#121b23');
  scene.fog = new THREE.Fog('#121b23', 6, 13);
  camera = new THREE.PerspectiveCamera(40, 1, 0.05, 50);
  cam.target = new THREE.Vector3(0,.92,-.05);
  raycaster = new THREE.Raycaster();

  scene.add(new THREE.HemisphereLight(0xcfe3f0, 0x1f2c36, .7));
  const sun = new THREE.DirectionalLight(0xffffff, .75); sun.position.set(1.8,4,2.2); sun.castShadow = true;
  sun.shadow.mapSize.set(1024,1024); Object.assign(sun.shadow.camera, {left:-3,right:3,top:3,bottom:-3,near:.5,far:12});
  scene.add(sun);
  const lamp = new THREE.SpotLight(0xfff1dc, .55, 7, .7, .6); lamp.position.set(0,3.1,.2); lamp.target.position.set(0,.7,0); scene.add(lamp, lamp.target);
  const glow = new THREE.PointLight(0x45c8f0, .35, 2.5); glow.position.set(.95,1.5,-1.3); scene.add(glow);

  const floorTex = canvasTex(256,256,(g,w,h)=>{ g.fillStyle='#34444f'; g.fillRect(0,0,w,h); g.fillStyle='#3a4b57'; g.fillRect(0,0,w/2,h/2); g.fillRect(w/2,h/2,w/2,h/2); g.strokeStyle='#2a3740'; g.lineWidth=2; g.strokeRect(0,0,w,h); }, [10,10]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16,16), new THREE.MeshStandardMaterial({map:floorTex, roughness:.85}));
  floor.rotation.x = -Math.PI/2; floor.receiveShadow = true; scene.add(floor);
  const wallM = std('#3c4f5b', .95);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(16,5), wallM); back.position.set(0,2.5,-2.1); back.receiveShadow = true; scene.add(back);
  const side = new THREE.Mesh(new THREE.PlaneGeometry(16,5), wallM); side.rotation.y = Math.PI/2; side.position.set(-2.9,2.5,0); scene.add(side);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(16,.12,.02), std('#2a8a80',.6)); stripe.position.set(0,1.02,-2.09); scene.add(stripe);
  const hw = new THREE.Mesh(new THREE.BoxGeometry(2.3,.42,.08), std('#566d78',.5,.2)); hw.position.set(0,1.42,-2.05); scene.add(hw);
  [['#2fae5a',-.6],['#e9e9e9',-.45],['#e8c84a',-.3],['#2fae5a',.45]].forEach(([c,x])=>{ const o = new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.04,16), std(c,.4)); o.rotation.x = Math.PI/2; o.position.set(x,1.42,-2.0); scene.add(o); });
  const cur = new THREE.Group(); for(let i=0;i<14;i++){ const f = new THREE.Mesh(new THREE.BoxGeometry(.03,2.1,.22), std(i%2?'#7aa6ab':'#6c989d',.95)); f.position.set((i%2)*.05, 1.25, -1.9 + i*.2); f.castShadow = true; cur.add(f); } cur.position.x = 1.95; scene.add(cur);
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(.015,.015,3,8), std('#aab4ba',.3,.6)); rail.rotation.x = Math.PI/2; rail.position.set(1.97,2.32,-.5); scene.add(rail);

  buildBed(); buildMonitor(); buildIVPole();
  if(typeof loadHumans === 'function') loadHumans();
  new ResizeObserver(resize).observe(document.getElementById('view'));
  resize();
  bindPointer(cv);
  requestAnimationFrame(loop);
}

function buildBed(){
  const metal = std('#a3adb4',.35,.55), mat = std('#dfe7ea',.8), dark = std('#4a5560',.6,.3);
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.0,.1,2.3), metal); base.position.set(0,.44,.12); base.castShadow = base.receiveShadow = true; scene.add(base);
  const under = new THREE.Mesh(new THREE.BoxGeometry(.7,.3,1.4), dark); under.position.set(0,.25,.02); scene.add(under);
  [[-.42,-.92],[.42,-.92],[-.42,1.12],[.42,1.12]].forEach(([x,z])=>{ const w = new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,.05,16), dark); w.rotation.z = Math.PI/2; w.position.set(x,.07,z); scene.add(w); const post = new THREE.Mesh(new THREE.BoxGeometry(.05,.3,.05), metal); post.position.set(x,.25,z); scene.add(post); });
  const legs = new THREE.Mesh(new THREE.BoxGeometry(.92,.14,1.22), mat); legs.position.set(0,.56,.66); legs.castShadow = legs.receiveShadow = true; scene.add(legs);
  const backG = new THREE.Group(); backG.position.set(0,.56,.05); backG.rotation.x = 0.61; scene.add(backG);
  const bm = new THREE.Mesh(new THREE.BoxGeometry(.92,.14,1.0), mat); bm.position.set(0,0,-.5); bm.castShadow = bm.receiveShadow = true; backG.add(bm);
  const pillow = new THREE.Mesh(new THREE.BoxGeometry(.55,.1,.32), std('#f4f7f8',.9)); pillow.position.set(0,.11,-.86); pillow.castShadow = true; backG.add(pillow);
  const foot = new THREE.Mesh(new THREE.BoxGeometry(.98,.36,.05), std('#7f8d96',.5,.2)); foot.position.set(0,.68,1.28); foot.castShadow = true; scene.add(foot);
  const head = new THREE.Mesh(new THREE.BoxGeometry(.98,.5,.05), std('#7f8d96',.5,.2)); head.position.set(0,.85,-1.0); scene.add(head);
  for(const s of [-1,1]){ const r = new THREE.Mesh(new THREE.BoxGeometry(.03,.14,.7), metal); r.position.set(s*.5,.74,.5); r.castShadow = true; scene.add(r); }
}
function buildMonitor(){
  const c = document.createElement('canvas'); c.width = 512; c.height = 320;
  monCtx = c.getContext('2d'); monTex = new THREE.CanvasTexture(c);
  const grp = new THREE.Group(); grp.position.set(.98,1.52,-1.55); grp.rotation.y = -0.55; scene.add(grp);
  const body = new THREE.Mesh(new THREE.BoxGeometry(.64,.44,.08), std('#2b3138',.5,.2)); body.castShadow = true; grp.add(body);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(.58,.36), new THREE.MeshBasicMaterial({map:monTex})); screen.position.z = .041; grp.add(screen);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,1.5,8), std('#9aa5ad',.4,.5)); arm.position.set(.98,.75,-1.58); scene.add(arm);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(.22,.24,.04,20), std('#4a5560',.5,.3)); foot.position.set(.98,.02,-1.58); scene.add(foot);
}
function buildIVPole(){
  const m = std('#b8c2c8',.3,.6);
  const p = new THREE.Mesh(new THREE.CylinderGeometry(.015,.015,1.9,8), m); p.position.set(-.85,.95,-1.1); scene.add(p);
  const hook = new THREE.Mesh(new THREE.TorusGeometry(.08,.008,6,20), m); hook.position.set(-.85,1.9,-1.1); hook.rotation.x = Math.PI/2; scene.add(hook);
  const bag = new THREE.Mesh(new THREE.BoxGeometry(.13,.2,.04), new THREE.MeshStandardMaterial({color:'#dff3f6', transparent:true, opacity:.7, roughness:.2})); bag.position.set(-.8,1.75,-1.1); scene.add(bag);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,.03,5), m); base.position.set(-.85,.03,-1.1); scene.add(base);
}

const gownTex = () => canvasTex(128,128,(g,w,h)=>{ g.fillStyle='#bcd2de'; g.fillRect(0,0,w,h); g.fillStyle='#8eb0c3'; for(let y=0;y<h;y+=16) for(let x=(y/16%2)*8;x<w;x+=16){ g.beginPath(); g.moveTo(x,y+4); g.lineTo(x+4,y); g.lineTo(x+8,y+4); g.lineTo(x+4,y+8); g.closePath(); g.fill(); } }, [3,2]);

function setPatient(L){
  if(!glOK) return;
  if(patientGroup){ scene.remove(patientGroup); patientGroup.traverse(o=>{ if(o.geometry && !o.userData.keepGeo && !o.geometry.userData.keep) o.geometry.dispose(); }); }
  pat = (typeof humanPatient === 'function' && humanPatient(L)) || buildPatient(L); patientGroup = pat.grp; scene.add(patientGroup);
  hovered = null;
}

function buildPatient(L){
  const grp = new THREE.Group();
  const regionMeshes = {}, gowned = [], undressedOnly = [], handGroups = {};
  let skinColor = new THREE.Color(L.skin);
  if(L.jaundice) skinColor = skinColor.clone().lerp(new THREE.Color('#d9b23a'), L.jaundice*.45);
  if(L.pallor) skinColor = skinColor.clone().lerp(new THREE.Color('#e6ddd6'), L.pallor*.35);
  const skinM = () => new THREE.MeshStandardMaterial({color:skinColor, roughness: L.sweat ? .32 : .72, metalness: L.sweat ? .06 : 0});
  const darkSkin = skinColor.clone().multiplyScalar(.72);
  const gT = gownTex();
  const gownM = () => new THREE.MeshStandardMaterial({map:gT, roughness:.9});
  const mk = (geo, mat, parent, pos, region) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.castShadow = true; m.receiveShadow = true; parent.add(m);
    if(region){ m.userData.region = region; (regionMeshes[region] = regionMeshes[region] || []).push(m); }
    return m;
  };
  // A gowned mesh swaps between gown and skin when the gown is removed
  const gm = (geo, parent, pos, region) => { const m = mk(geo, gownM(), parent, pos, region); m.userData.gownMat = m.material; m.userData.skinMat = skinM(); gowned.push(m); return m; };
  const nude = (m) => { m.visible = false; undressedOnly.push(m); return m; };
  const limb = (parent, a, b, r1, r2, mat, region) => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = new THREE.Vector3().subVectors(B,A), len = d.length();
    const m = mk(new THREE.CylinderGeometry(r2, r1, len, 14), mat, parent, [0,0,0], region);
    m.position.copy(A).addScaledVector(d,.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), d.normalize());
    return m;
  };
  const H = L.habitus;
  const wide = H==='obese'?1.22 : H==='heavy'?1.1 : H==='thin'?.9 : 1;
  const depth = L.barrel ? .95 : H==='obese' ? .9 : H==='heavy' ? .8 : .68;
  const torso = new THREE.Group(); torso.position.set(0,.736,.125); torso.rotation.x = -0.96; grp.add(torso);

  const abdZ = depth * (L.ascites ? 1.55 : H==='obese' ? 1.25 : H==='heavy' ? 1.1 : 1);
  const abd = gm(new THREE.CylinderGeometry(.18*wide, .175*wide*(H==='obese'?1.18:1), .3, 24), torso, [0,.17,0], 'abd');
  abd.scale.z = abdZ; if(L.ascites) abd.scale.x = 1.12;
  const pel = gm(new THREE.SphereGeometry(.19*wide, 20, 14), torso, [0,.02,0]); pel.scale.set(1,.6,depth);
  const chestR = gm(new THREE.CylinderGeometry(.205*wide, .185*wide, .32, 20, 1, false, Math.PI, Math.PI), torso, [0,.46,0], 'lungR');
  const chestL = gm(new THREE.CylinderGeometry(.205*wide, .185*wide, .32, 20, 1, false, 0, Math.PI), torso, [0,.46,0], 'lungL');
  chestR.scale.z = chestL.scale.z = depth;
  const capTop = gm(new THREE.SphereGeometry(.205*wide, 20, 10, 0, Math.PI*2, 0, Math.PI/2), torso, [0,.6,0]); capTop.scale.set(1,.35,depth);
  for(const s of [-1,1]) gm(new THREE.SphereGeometry(.075*wide, 14, 10), torso, [s*.2*wide,.575,0]);
  // surface helpers (torso-local front surface)
  const chestFront = (x, y) => { const r = (.185 + (.205-.185)*Math.min(1,Math.max(0,(y-.30)/.32)))*wide; return depth*Math.sqrt(Math.max(0, r*r - x*x)); };
  const abdFront = (x) => { const r = .18*wide*(L.ascites?1.12:1); return abdZ*Math.sqrt(Math.max(0, r*r - x*x)); };
  // breasts / chest wall
  if(L.sex==='F'){ for(const s of [-1,1]){ const b = gm(new THREE.SphereGeometry(.07*wide, 16, 12), torso, [s*.085*wide,.45,chestFront(s*.085*wide,.45)-.02], s<0?'lungR':'lungL'); b.scale.set(1,.9,.7); } }
  const gyn = (L.marks||[]).includes('gyn');
  if(L.sex!=='F' && gyn) for(const s of [-1,1]){ const b = nude(mk(new THREE.SphereGeometry(.045, 12, 10), skinM(), torso, [s*.085*wide,.46,chestFront(s*.085*wide,.46)-.012])); b.scale.set(1,.9,.6); }
  for(const s of [-1,1]){
    const nz = L.sex==='F' ? chestFront(s*.085*wide,.44) + .035 : chestFront(s*.085*wide,.46) + (gyn ? .016 : .002);
    const n = nude(mk(new THREE.SphereGeometry(.009, 10, 8), new THREE.MeshStandardMaterial({color:darkSkin, roughness:.6}), torso, [s*.085*wide, L.sex==='F'?.44:.46, nz]));
    n.scale.set(1,1,.4); n.castShadow = false;
  }
  const umb = nude(mk(new THREE.SphereGeometry(.007, 8, 6), new THREE.MeshStandardMaterial({color:darkSkin.clone().multiplyScalar(.7)}), torso, [0,.12,abdFront(0)]));
  umb.castShadow = false;
  // skin marks (visible with the gown off)
  const marks = new Set(L.marks || []);
  if(marks.has('spiders')) for(const [x,y] of [[-.08,.55],[.05,.58],[.11,.52],[-.13,.5],[0,.6]]){ const sp = nude(mk(new THREE.SphereGeometry(.006, 8, 6), std('#c0222a',.5), torso, [x*wide,y,chestFront(x*wide,y)])); sp.castShadow = false;
    for(let k=0;k<4;k++){ const leg = nude(mk(new THREE.BoxGeometry(.016,.0016,.0016), std('#c0222a',.5), torso, [x*wide,y,chestFront(x*wide,y)+.001])); leg.rotation.z = k*Math.PI/4; leg.castShadow = false; } }
  if(marks.has('caput')) for(let k=0;k<7;k++){ const a = k/7*Math.PI*2; const x0 = Math.cos(a)*.03, y0 = .12+Math.sin(a)*.03, x1 = Math.cos(a+.3)*.08, y1 = .12+Math.sin(a+.3)*.08;
    nude(limb(torso, [x0,y0,abdFront(x0)+.002], [x1,y1,abdFront(x1)+.002], .004, .003, std('#4a5f94',.5))); }
  if(marks.has('sternotomy')){ const sc = nude(mk(new THREE.BoxGeometry(.008,.24,.004), std('#b06a6a',.6), torso, [0,.46,chestFront(0,.46)+.001])); sc.castShadow = false; }
  // pubic area and genitals (schematic, chaperoned GU exam)
  const hairM = std(L.hair,.95);
  const pub = nude(mk(new THREE.SphereGeometry(.06*wide, 14, 10), new THREE.MeshStandardMaterial({color:new THREE.Color(L.hair).multiplyScalar(.8), roughness:.95}), torso, [0,-.005,abdFront(0)*.82], 'gu'));
  pub.scale.set(1,.55,.3);
  if(L.sex==='F'){
    const v = nude(mk(new THREE.SphereGeometry(.032, 12, 10), skinM(), grp, [0,.79,.2], 'gu')); v.scale.set(.8,.55,1.2);
    const cleft = nude(mk(new THREE.BoxGeometry(.004,.006,.05), new THREE.MeshStandardMaterial({color:darkSkin.clone().multiplyScalar(.7)}), grp, [0,.807,.205], 'gu')); cleft.castShadow = false;
  } else {
    const scro = nude(mk(new THREE.SphereGeometry(.03, 14, 10), new THREE.MeshStandardMaterial({color:darkSkin, roughness:.8}), grp, [0,.782,.235], 'gu')); scro.scale.set(1.15,.8,1);
    nude(limb(grp, [0,.805,.19], [0,.8,.27], .015, .014, skinM(), 'gu'));
    nude(mk(new THREE.SphereGeometry(.016, 12, 10), new THREE.MeshStandardMaterial({color:darkSkin.clone().lerp(new THREE.Color('#b56a6a'),.3), roughness:.6}), grp, [0,.8,.275], 'gu'));
  }
  // heart hotspot
  const hz = .195*wide*depth + .006;
  const heartHot = mk(new THREE.SphereGeometry(.07, 18, 12), new THREE.MeshBasicMaterial({color:0x6cf0e0, transparent:true, opacity:0, depthWrite:false}), torso, [.06,.42,hz], 'heart');
  heartHot.scale.z = .25; heartHot.castShadow = false;
  const neckR = .052 * (H==='obese'?1.4 : H==='heavy'?1.15 : 1);
  mk(new THREE.CylinderGeometry(neckR, neckR*1.1, .13, 16), skinM(), torso, [0,.67,0], 'neck');
  mk(new THREE.CylinderGeometry(.015,.015,.1,10), new THREE.MeshStandardMaterial({color:skinColor.clone().multiplyScalar(.92), roughness:.7}), torso, [(L.trachea||0)*.026,.67,neckR*.86], 'neck');
  let jvd = null;
  if(L.jvd){ jvd = mk(new THREE.CylinderGeometry(.009,.009,.11,8), std('#4c5f94',.5), torso, [-.036,.672,neckR*.8], 'neck'); jvd.rotation.z = .25; }

  // head
  const headG = new THREE.Group(); headG.position.set(0,.82,0); torso.add(headG);
  const head = mk(new THREE.SphereGeometry(.11, 28, 20), skinM(), headG, [0,0,0], 'heent'); head.scale.set(.92,1.06,1);
  const scleraC = L.jaundice ? mixHex('#f4f1ea','#e2c23a', L.jaundice) : new THREE.Color('#f4f1ea');
  const eyeZ = L.proptosis ? .104 : .096, eyeR = L.proptosis ? .019 : .016;
  for(const s of [-1,1]){
    mk(new THREE.SphereGeometry(eyeR, 14, 10), new THREE.MeshStandardMaterial({color:scleraC, roughness:.3}), headG, [s*.037,.018,eyeZ-.004], 'heent');
    mk(new THREE.SphereGeometry(.0085, 10, 8), std('#2a1d14',.3), headG, [s*.037,.018,eyeZ+eyeR-.012], 'heent');
    if(L.ptosis || L.eyesClosed){
      const lid = mk(new THREE.SphereGeometry(eyeR+.002, 14, 10, 0, Math.PI*2, 0, L.eyesClosed ? Math.PI*.62 : Math.PI*.42), skinM(), headG, [s*.037,.018,eyeZ-.004], 'heent');
      lid.rotation.x = .9;
    }
    mk(new THREE.BoxGeometry(.03,.006,.01), std(L.hair,.9), headG, [s*.037,.045,.098], 'heent');
    const ear = mk(new THREE.SphereGeometry(.025, 10, 8), skinM(), headG, [s*.1,.0,0], 'heent'); ear.scale.set(.45,1,.7);
  }
  const nose = mk(new THREE.ConeGeometry(.017,.045,10), skinM(), headG, [0,-.008,.11], 'heent'); nose.rotation.x = Math.PI/2;
  const lipC = mixHex('#a8645c', '#5a5c98', Math.min(1, L.cyan||0));
  const lips = mk(new THREE.BoxGeometry(.048,.012,.014), new THREE.MeshStandardMaterial({color:lipC, roughness:.5}), headG, [0,-.052,.094], 'heent');
  if(L.droop){ const d = L.droop==='R' ? -1 : 1; lips.rotation.z = d*-.28; lips.position.y -= .004; }
  if(L.malar){
    const rashM = new THREE.MeshStandardMaterial({color:'#b5323a', transparent:true, opacity:.55, roughness:.6, depthWrite:false});
    for(const s of [-1,1]){ const r = mk(new THREE.SphereGeometry(.03, 12, 8), rashM, headG, [s*.046,-.012,.084], 'heent'); r.scale.set(1,.7,.35); r.rotation.y = s*.5; r.castShadow = false; }
    const b = mk(new THREE.SphereGeometry(.014, 10, 8), rashM, headG, [0,.004,.106], 'heent'); b.scale.set(1,.6,.4); b.castShadow = false;
  }
  const cap = mk(new THREE.SphereGeometry(.117, 24, 16, 0, Math.PI*2, 0, Math.PI*.5), hairM, headG, [0,.008,-.008], 'heent'); cap.rotation.x = -0.5; cap.scale.set(.95,1.05,1);
  if(L.sex==='F'){ const long = mk(new THREE.SphereGeometry(.12, 20, 14), hairM, headG, [0,-.07,-.05], 'heent'); long.scale.set(1.05,1.25,.55); }
  if(L.o2==='cannula'){
    const tubeM = new THREE.MeshStandardMaterial({color:'#dff4f5', transparent:true, opacity:.85, roughness:.3});
    const t = mk(new THREE.TorusGeometry(.112,.004,6,40), tubeM, headG, [0,-.022,0]); t.rotation.x = Math.PI/2 - .12;
    for(const s of [-1,1]) limb(headG, [s*.1,-.03,.03], [s*.13,-.2,.06], .004,.004, tubeM);
  } else if(L.o2==='mask'){
    const mm = new THREE.MeshStandardMaterial({color:'#bfe8d0', transparent:true, opacity:.5, roughness:.2});
    const mask = mk(new THREE.SphereGeometry(.062, 18, 12, 0, Math.PI*2, 0, Math.PI/2), mm, headG, [0,-.035,.085], 'heent'); mask.rotation.x = Math.PI/2; mask.scale.set(1,.7,1.2);
    const bag = mk(new THREE.SphereGeometry(.05, 12, 10), mm, headG, [0,-.13,.13]); bag.scale.set(1,1.3,.8);
  }
  // arms + hands (hands are groups so they can tremor or flap)
  const tipC = mixHex(L.skin, '#7880b6', Math.min(1,(L.cyan||0)*.9));
  for(const s of [-1,1]){
    const sh = [s*.215*wide,.56,0], el = [s*.255*wide,.31,.03], wr = [s*.265*wide,.08,.07];
    const sleeve = limb(torso, sh, [s*.23*wide,.47,.01], .06*wide, .058*wide, gownM()); sleeve.userData.gownMat = sleeve.material; sleeve.userData.skinMat = skinM(); gowned.push(sleeve);
    limb(torso, sh, el, .048*wide, .042*wide, skinM());
    limb(torso, el, wr, .041*wide, .033, skinM(), 'hands');
    if(L.track) for(let i=0;i<6;i++){ const t = .25 + i*.09; mk(new THREE.SphereGeometry(.004, 6, 4), std('#5a2f2f',.6), torso, [el[0]+(wr[0]-el[0])*t + s*.02, el[1]+(wr[1]-el[1])*t, el[2]+(wr[2]-el[2])*t+.032], 'hands'); }
    if(L.pustules) for(let i=0;i<3;i++){ const t = .3 + i*.2; const p = mk(new THREE.SphereGeometry(.006, 8, 6), std('#efe2a0',.5), torso, [el[0]+(wr[0]-el[0])*t - s*.015, el[1]+(wr[1]-el[1])*t, el[2]+(wr[2]-el[2])*t+.035], 'skin'); const ring = mk(new THREE.SphereGeometry(.011, 8, 6), new THREE.MeshStandardMaterial({color:'#c0453a', transparent:true, opacity:.6}), torso, p.position.toArray()); ring.scale.z = .3; }
    const hg = new THREE.Group(); hg.position.set(...wr); torso.add(hg); handGroups[s<0?'R':'L'] = hg;
    const hand = mk(new THREE.SphereGeometry(.04, 14, 10), skinM(), hg, [0,-.045,.005], 'hands'); hand.scale.set(1,1.35,.55);
    for(let f=0; f<4; f++){
      const fx = (f-1.5)*.017, base = [fx, -.085, .01], tip = [fx, -.13 + Math.abs(f-1.5)*.008, .012];
      limb(hg, base, tip, .0085, .008, skinM(), 'hands');
      mk(new THREE.SphereGeometry(L.clubbing ? .016 : .0095, 10, 8), new THREE.MeshStandardMaterial({color:tipC, roughness:.5}), hg, tip, 'hands');
    }
  }
  // legs
  for(const s of [-1,1]){
    const sideName = s<0 ? 'R' : 'L';
    const sw = (L.swollen===sideName) || L.edema;
    const legM = (L.swollen===sideName) ? new THREE.MeshStandardMaterial({color:mixHex(L.skin,'#c0574a',.3), roughness:.6}) : skinM();
    const hx = s*.1*wide;
    limb(grp, [hx,.705,.15], [hx,.7,.58], .08*wide, .068*wide, skinM());
    const kneeHot = L.knee===sideName;
    const knee = mk(new THREE.SphereGeometry((kneeHot ? .078 : .06)*wide, 12, 10), kneeHot ? new THREE.MeshStandardMaterial({color:mixHex(L.skin,'#cc4a3c',.4), roughness:.5}) : skinM(), grp, [hx,.7,.58], 'joints');
    limb(grp, [hx,.7,.58], [s*.095,.688,.97], (sw?.078:.06)*wide, (sw?.062:.045), legM, 'legs');
    if(L.petechiae) for(let i=0;i<16;i++){ const t = .1 + Math.random()*.8, a = (Math.random()-.5)*2.2; mk(new THREE.SphereGeometry(.0035, 5, 4), std('#a01818',.6), grp, [hx + (s*.095-hx)*t + Math.sin(a)*.058, .69 + Math.cos(a)*.058, .58 + .39*t], 'legs'); }
    mk(new THREE.BoxGeometry(.075,.15,.065), skinM(), grp, [s*.095,.75,1.0], 'joints');
    const goutHere = L.gout===sideName;
    const toe = mk(new THREE.SphereGeometry(goutHere ? .03 : .018, 12, 10), goutHere ? new THREE.MeshStandardMaterial({color:mixHex(L.skin,'#d0352a',.55), roughness:.45}) : skinM(), grp, [s*.095 - s*.022, .82, 1.0], 'joints');
    toe.scale.set(1,1,.8);
  }
  const blanket = mk(new THREE.BoxGeometry(.68*wide,.07,.6), new THREE.MeshStandardMaterial({map: canvasTex(64,64,(g,w,h)=>{ g.fillStyle='#5f86a3'; g.fillRect(0,0,w,h); g.fillStyle='#6f95b1'; g.fillRect(0,0,w,8); }, [1,4]), roughness:.95}), grp, [0,.8,.36]);
  blanket.rotation.x = .02;
  return {grp, torso, chestR, chestL, abd, jvd, head:headG, regionMeshes, look:L, depth, abdZ, gowned, undressedOnly, blanket, handGroups, gownOn:true};
}

function setGown(on){
  if(!pat) return;
  setHover(null);
  pat.gownOn = on;
  pat.gowned.forEach(m=>{ m.material = on ? m.userData.gownMat : m.userData.skinMat; });
  pat.undressedOnly.forEach(m=>{ m.visible = !on; });
  (pat.gownOnly||[]).forEach(m=>{ m.visible = on; });
  pat.blanket.visible = on;
  const b = document.getElementById('gownBtn'); if(b) b.textContent = on ? 'Remove gown' : 'Replace gown';
}

/* ---------- camera ---------- */
function camPreset(name){
  const w = new THREE.Vector3();
  if(!pat) return {az:-0.75, el:.42, dist:2.9, target:new THREE.Vector3(0,.92,-.05)};
  if(name==='head'){ pat.head.getWorldPosition(w); return {az:-0.25, el:.55, dist:.95, target:w.clone().add(new THREE.Vector3(0,-.06,0))}; }
  if(name==='chest'){ pat.chestR.getWorldPosition(w); return {az:-0.35, el:.85, dist:1.25, target:w.clone()}; }
  if(name==='hands' && pat.handAnchor){ pat.handAnchor.getWorldPosition(w); return {az:-1.25, el:.8, dist:.85, target:w.clone().add(new THREE.Vector3(.06,0,-.08))}; }
  if(name==='hands'){ return {az:-1.2, el:.7, dist:1.0, target:new THREE.Vector3(0,.72,.15)}; }
  if(name==='legs'){ return {az:-0.6, el:.6, dist:1.3, target:new THREE.Vector3(0,.72,.78)}; }
  if(name==='pelvis'){ return {az:-0.5, el:.95, dist:.9, target:new THREE.Vector3(0,.8,.2)}; }
  return {az:-0.75, el:.42, dist:2.9, target:new THREE.Vector3(0,.92,-.05)};
}
function setCam(name, instant){
  if(!glOK) return;
  const p = camPreset(name);
  if(instant){ cam.az=p.az; cam.el=p.el; cam.dist=p.dist; cam.target.copy(p.target); cam.goal=null; }
  else cam.goal = p;
}
function applyCam(){
  if(cam.goal){
    const k = .12;
    cam.az += (cam.goal.az-cam.az)*k; cam.el += (cam.goal.el-cam.el)*k; cam.dist += (cam.goal.dist-cam.dist)*k; cam.target.lerp(cam.goal.target, k);
    if(Math.abs(cam.az-cam.goal.az)<.002 && Math.abs(cam.dist-cam.goal.dist)<.002) cam.goal = null;
  }
  const t = cam.target;
  camera.position.set(t.x + cam.dist*Math.cos(cam.el)*Math.sin(cam.az), t.y + cam.dist*Math.sin(cam.el), t.z + cam.dist*Math.cos(cam.el)*Math.cos(cam.az));
  camera.lookAt(t);
}
function resize(){
  const v = document.getElementById('view'); const w = v.clientWidth, h = v.clientHeight;
  if(!w || !h) return;
  renderer.setSize(w, h, false); camera.aspect = w/h; camera.updateProjectionMatrix();
}

/* ---------- pointer ---------- */
function pick(ev){
  if(!patientGroup) return null;
  const r = document.getElementById('gl').getBoundingClientRect();
  const v = new THREE.Vector2(((ev.clientX-r.left)/r.width)*2-1, -((ev.clientY-r.top)/r.height)*2+1);
  raycaster.setFromCamera(v, camera);
  const shown = o => { for(let n=o; n; n=n.parent){ if(!n.visible) return false; } return true; };
  const hit = raycaster.intersectObject(patientGroup, true).find(h=>shown(h.object));
  return hit && hit.object.userData.region ? hit.object.userData.region : null;
}
function setHover(region){
  if(hovered === region || !pat) return;
  const paint = (rg, on) => (pat.regionMeshes[rg]||[]).forEach(m=>{
    if(m.material.isMeshBasicMaterial) m.material.opacity = on ? (m.userData.hl || .4) : 0;
    else if(m.material.emissive) m.material.emissive.setHex(on ? 0x1d5f59 : 0x000000);
  });
  if(hovered) paint(hovered, false);
  hovered = region;
  if(region) paint(region, true);
}
function bindPointer(cv){
  const pts = new Map(); let moved = 0, pinch0 = 0;
  const tip = document.getElementById('tip'), view = document.getElementById('view');
  cv.addEventListener('pointerdown', e=>{ if(gaitState){ stopGait(); return; } cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, {x:e.clientX, y:e.clientY}); moved = 0; if(pts.size===2){ const [a,b] = [...pts.values()]; pinch0 = Math.hypot(a.x-b.x, a.y-b.y); } });
  cv.addEventListener('pointermove', e=>{
    if(pts.has(e.pointerId)){
      const p = pts.get(e.pointerId); const dx = e.clientX-p.x, dy = e.clientY-p.y; p.x = e.clientX; p.y = e.clientY;
      moved += Math.abs(dx)+Math.abs(dy);
      if(pts.size===2){ const [a,b] = [...pts.values()]; const d = Math.hypot(a.x-b.x, a.y-b.y); if(pinch0 && d){ cam.dist = Math.max(.6, Math.min(5, cam.dist * pinch0/d)); } pinch0 = d; cam.goal = null; }
      else if(moved > 4){ cam.goal = null; cam.az -= dx*.006; cam.el = Math.max(.05, Math.min(1.45, cam.el + dy*.005)); cv.classList.add('dragging'); tip.hidden = true; }
      return;
    }
    const rg = pick(e); setHover(rg);
    cv.classList.toggle('pointing', !!rg);
    if(rg && typeof S !== 'undefined' && S && !S.done){ const r = view.getBoundingClientRect(); tip.innerHTML = `${REGION_TIP[rg]}<em>${S.examined.includes(rg)?'done':'+2 min'}</em>`; tip.style.left = (e.clientX-r.left)+'px'; tip.style.top = (e.clientY-r.top)+'px'; tip.hidden = false; }
    else tip.hidden = true;
  });
  const up = e=>{
    const was = pts.has(e.pointerId); pts.delete(e.pointerId); if(pts.size<2) pinch0 = 0;
    cv.classList.remove('dragging');
    if(was && moved < 6 && typeof S !== 'undefined' && S && !S.done && pts.size===0){ const rg = pick(e); if(rg) doExam(rg); }
  };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', e=>{ pts.delete(e.pointerId); cv.classList.remove('dragging'); });
  cv.addEventListener('pointerleave', ()=>{ if(!pts.size){ setHover(null); tip.hidden = true; } });
  cv.addEventListener('wheel', e=>{ e.preventDefault(); cam.goal = null; cam.dist = Math.max(.6, Math.min(5, cam.dist * (1 + e.deltaY*.0012))); }, {passive:false});
}

/* ---------- monitor ---------- */
const gauss = (p, mu, s) => Math.exp(-(((p-mu)/s)**2));
let irregularBeats = null;
function beatPhase(t, hr, irregular){
  const beat = 60/hr;
  if(!irregular) return (((t%beat)+beat)%beat)/beat;
  if(!irregularBeats){ const R = seeded(99); irregularBeats = [0]; while(irregularBeats[irregularBeats.length-1] < 1200) irregularBeats.push(irregularBeats[irregularBeats.length-1] + .6 + R()*.85); }
  const span = irregularBeats[irregularBeats.length-1];
  const tt = ((t*hr/90) % span + span) % span; // scale so the mean rate matches hr
  let lo = 0, hi = irregularBeats.length-1;
  while(hi-lo > 1){ const mid = (lo+hi)>>1; if(irregularBeats[mid] <= tt) lo = mid; else hi = mid; }
  return (tt - irregularBeats[lo]) / (irregularBeats[hi]-irregularBeats[lo]);
}
function ecgAt(t, v){ if(!v.hr) return 0; const p = beatPhase(t, v.hr, v.irregular);
  if(v.pea) return .35*gauss(p,.3,.06) - .1*gauss(p,.45,.08);
  return (v.irregular ? 0 : .12*gauss(p,.12,.025)) - .12*gauss(p,.215,.006) + 1*gauss(p,.235,.009) - .28*gauss(p,.255,.008) + .22*gauss(p,.45,.045) + (v.irregular ? .03*Math.sin(t*40) : 0); }
function plethAt(t, v){ if(v.spo2==null || !v.hr) return 0; const p = beatPhase(t-.12, v.hr, v.irregular); return .9*gauss(p,.18,.08) + .35*gauss(p,.42,.07); }
function respAt(t, v){ if(!v.rr) return 0; return Math.sin(2*Math.PI*t*v.rr/60)*.8; }
function drawMonitor(t){
  const g = monCtx, W = 512, H = 320;
  g.fillStyle = '#03070a'; g.fillRect(0,0,W,H);
  g.strokeStyle = '#0d1a20'; g.lineWidth = 1; for(let x=0;x<340;x+=20){ g.beginPath(); g.moveTo(x,0); g.lineTo(x,H); g.stroke(); }
  const v = (typeof curVitals === 'function') ? curVitals() : null;
  if(!v){ g.fillStyle='#45c8f0'; g.font='600 22px monospace'; g.fillText('STANDBY', 190, 165); monTex.needsUpdate = true; return; }
  const rows = [{y:80, c:'#5be08a', f:ecgAt, a:48, lab:'II'}, {y:175, c:'#45c8f0', f:plethAt, a:42, lab:'Pleth'}, {y:265, c:'#f5d04a', f:respAt, a:26, lab:'Resp'}];
  for(const r of rows){
    g.fillStyle = r.c; g.font = '14px monospace'; g.fillText(r.lab, 8, r.y-48);
    g.strokeStyle = r.c; g.lineWidth = 2.5; g.beginPath();
    for(let x=0; x<=330; x+=3){ const tt = t - (330-x)/120; const y = r.y - r.f(tt, v)*r.a; x?g.lineTo(x,y):g.moveTo(x,y); }
    g.stroke();
  }
  const num = (label, val, c, y, size) => { g.fillStyle = c; g.font = '14px monospace'; g.fillText(label, 350, y-size+4); g.font = `600 ${size}px monospace`; g.fillText(val, 350, y+6); };
  num('HR', v.hr ?? '--', '#5be08a', 70, 46);
  num('SpO2 %', v.spo2 ?? '--', '#45c8f0', 150, 40);
  num('NIBP', v.sbp==null ? '--/--' : `${v.sbp}/${v.dbp}`, '#ff7a72', 220, 30);
  num('RR', v.rr ?? '--', '#f5d04a', 285, 30);
  g.fillStyle='#e3ebf0'; g.font='600 22px monospace'; g.fillText(`${v.temp.toFixed(1)}°`, 440, 290);
  if(v.pea && Math.floor(t*2)%2){ g.fillStyle='#ff4a3d'; g.font='700 20px monospace'; g.fillText('NO PULSE', 120, 30); }
  monTex.needsUpdate = true;
}

/* ---------- gait exam: a standing patient walks across the room ---------- */
const GAITS = {
  normal:     {A:.34, K:.62, f:.9,  B:.28, stoop:.02, base:0,   turn:1.0},
  shuffle:    {A:.11, K:.16, f:1.3, B:.03, stoop:.34, base:0,   turn:2.2, tremor:'R', armR:.2},
  magnetic:   {A:.11, K:.06, f:.62, B:.22, stoop:.08, base:.11, turn:2.4, turnOut:.35},
  ataxic:     {A:.3,  K:1.0, f:.6,  B:.1,  stoop:.16, base:.12, turn:1.8, sway:.07, armsOut:.35, look:.35, romberg:true},
  hemiparetic:{A:.28, K:.55, f:.55, B:.22, stoop:.05, base:0,   turn:1.8, hemi:'R'},
  antalgic:   {A:.3,  K:.55, f:.8,  B:.24, stoop:.03, base:0,   turn:1.2, limp:'R'},
};
let walker = null, gaitState = null;
function buildWalker(L){
  const hw = pat && pat.human && typeof humanWalker === 'function' && humanWalker(L);
  if(hw) return hw;
  const root = new THREE.Group();
  const wide = L.habitus==='obese'?1.2 : L.habitus==='heavy'?1.1 : L.habitus==='thin'?.92 : 1;
  const skin = new THREE.MeshStandardMaterial({color:new THREE.Color(L.skin), roughness:.7});
  const gown = new THREE.MeshStandardMaterial({map:gownTex(), roughness:.9});
  const sock = std('#d7dde2',.9), hairM = std(L.hair,.9);
  const seg = (parent, len, r1, r2, mat) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, len, 12), mat); m.position.y = -len/2; m.castShadow = true; parent.add(m); return m; };
  const torso = new THREE.Group(); torso.position.y = .94; root.add(torso);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.2*wide, .19*wide, .58, 18), gown); body.position.y = .27; body.scale.z = .62; body.castShadow = true; torso.add(body);
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(.2*wide, .23*wide, .22, 18, 1, true), gown); skirt.position.y = -.08; skirt.scale.z = .7; torso.add(skirt);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.05,.055,.1,12), skin); neck.position.y = .6; torso.add(neck);
  const head = new THREE.Group(); head.position.y = .74; torso.add(head);
  const hs = new THREE.Mesh(new THREE.SphereGeometry(.11, 20, 14), skin); hs.scale.set(.92,1.06,1); hs.castShadow = true; head.add(hs);
  const hc = new THREE.Mesh(new THREE.SphereGeometry(.117, 20, 12, 0, Math.PI*2, 0, Math.PI*.5), hairM); hc.position.set(0,.01,-.01); hc.rotation.x = -.5; head.add(hc);
  if(L.sex==='F'){ const lh = new THREE.Mesh(new THREE.SphereGeometry(.12, 16, 12), hairM); lh.position.set(0,-.06,-.05); lh.scale.set(1.05,1.25,.55); head.add(lh); }
  for(const s of [-1,1]){ const e = new THREE.Mesh(new THREE.SphereGeometry(.012, 8, 6), std('#1d1d1d',.3)); e.position.set(s*.037,.02,.1); head.add(e); }
  const arms = {}, legs = {};
  for(const s of [-1,1]){
    const k = s<0 ? 'R' : 'L';
    const sh = new THREE.Group(); sh.position.set(s*.22*wide,.52,0); torso.add(sh);
    seg(sh, .3, .045, .04, skin);
    const el = new THREE.Group(); el.position.y = -.3; sh.add(el);
    seg(el, .26, .038, .03, skin);
    const wr = new THREE.Group(); wr.position.y = -.27; el.add(wr);
    const hd = new THREE.Mesh(new THREE.SphereGeometry(.042, 12, 10), skin); hd.position.y = -.04; hd.scale.set(.8,1.3,.6); wr.add(hd);
    arms[k] = {sh, el, wr};
    const hip = new THREE.Group(); hip.position.set(s*.1*wide,.94,0); root.add(hip);
    seg(hip, .44, .075*wide, .06*wide, skin);
    const kn = new THREE.Group(); kn.position.y = -.44; hip.add(kn);
    seg(kn, .44, .055, .04, skin);
    const an = new THREE.Group(); an.position.y = -.44; kn.add(an);
    const ft = new THREE.Mesh(new THREE.BoxGeometry(.09,.055,.24), sock); ft.position.set(0,-.03,.06); ft.castShadow = true; an.add(ft);
    legs[k] = {hip, kn, an};
  }
  root.visible = false; scene.add(root);
  return {root, torso, head, arms, legs};
}
function startGait(type, onDone){
  if(!glOK || !pat) { if(onDone) onDone(); return; }
  if(walker){ scene.remove(walker.root); }
  walker = buildWalker(pat.look);
  const P = GAITS[type] || GAITS.normal;
  const v = 1.9*Math.sin(P.A)*P.f;
  const span = Math.min(3.0, v*5);
  gaitState = {type, P, v, span, phase:0, stage:'walk1', t:0, stageT:0, onDone, prevCam:{az:cam.az, el:cam.el, dist:cam.dist, target:cam.target.clone()}};
  walker.root.position.set(-span/2, 0, 1.75); walker.root.rotation.y = Math.PI/2; walker.root.visible = true;
  patientGroup.visible = false;
  cam.goal = null; cam.az = 0; cam.el = .06; cam.dist = walker.apply ? 3.4 : 2.7; cam.target.set(0, walker.apply ? 1.0 : .85, 1.75);
}
function stopGait(){
  if(!gaitState) return;
  const g = gaitState; gaitState = null;
  walker.root.visible = false; patientGroup.visible = true;
  cam.az = g.prevCam.az; cam.el = g.prevCam.el; cam.dist = g.prevCam.dist; cam.target.copy(g.prevCam.target);
  if(g.onDone) g.onDone();
}
function poseWalker(G, dt){
  const P = G.P, W = walker, t = G.t;
  const walking = G.stage==='walk1' || G.stage==='walk2';
  const turning = G.stage==='turn';
  const rate = walking ? 1 : turning ? .8 : 0;
  G.phase += 2*Math.PI*P.f*dt*rate;
  const amp = walking ? 1 : turning ? .35 : 0;
  for(const k of ['R','L']){
    const s = k==='R' ? -1 : 1, ph = G.phase + (k==='L' ? 0 : Math.PI);
    const leg = W.legs[k], arm = W.arms[k];
    const hemi = P.hemi===k, limp = P.limp===k;
    const A = P.A * amp * (limp ? .65 : 1);
    const swing = Math.max(0, Math.cos(ph));
    leg.hip.rotation.x = -A*Math.sin(ph);
    leg.kn.rotation.x = amp ? (hemi ? .06 : .05 + P.K*Math.pow(swing,1.5)) : 0;
    leg.an.rotation.x = amp ? (P.romberg ? .25*Math.pow(swing,3) - .1 : -.15*swing) : 0;
    leg.an.rotation.y = s*(P.turnOut||0);
    leg.hip.rotation.z = s*((P.base||0) + (hemi ? .28*swing*amp : 0));
    // arms
    const B = (P.armR && k==='R') ? P.armR*P.B : P.B;
    if(hemi){ arm.sh.rotation.x = -.35; arm.el.rotation.x = -1.7; arm.sh.rotation.z = s*.1; }
    else if(G.stage==='romberg'){ arm.sh.rotation.x = -1.45; arm.el.rotation.x = 0; arm.sh.rotation.z = s*.05; }
    else { arm.sh.rotation.x = B*amp*Math.sin(ph); arm.el.rotation.x = -.25; arm.sh.rotation.z = s*(.06 + (P.armsOut||0)); }
    arm.wr.rotation.z = (P.tremor===k) ? .22*Math.sin(2*Math.PI*5*t) : 0;
  }
  if(G.stage==='romberg'){ for(const k of ['R','L']){ W.legs[k].hip.rotation.set(0,0,0); W.legs[k].kn.rotation.x = 0; W.legs[k].an.rotation.set(0,0,0); } }
  // trunk
  const sway = (P.sway||0)*Math.sin(G.phase*.5 + .7*Math.sin(t*1.7));
  let roll = sway;
  if(P.limp){ const s = P.limp==='R' ? -1 : 1; roll += s*.07*Math.max(0, -Math.cos(G.phase + (P.limp==='L' ? 0 : Math.PI))); }
  if(G.stage==='romberg'){ const grow = Math.min(1, G.stageT/1.2); roll = .16*grow*Math.sin(t*2.4) + .06*grow*Math.sin(t*5.1); }
  W.torso.rotation.set(P.stoop, 0, roll);
  W.head.rotation.x = (P.look||0) - P.stoop*.5;
  W.torso.position.y = .94 - .02*Math.abs(Math.sin(G.phase))*amp;
  if(W.apply) W.apply();
}
function updateGait(dt){
  const G = gaitState; G.t += dt; G.stageT += dt;
  const dur = G.span / Math.max(.05, G.v);
  if(G.stage==='walk1' || G.stage==='walk2'){
    const dir = G.stage==='walk1' ? 1 : -1;
    walker.root.position.x += dir*G.v*dt;
    if(G.stageT >= dur){ G.stage = G.stage==='walk1' ? 'turn' : (G.P.romberg ? 'romberg' : 'done'); G.stageT = 0; }
  } else if(G.stage==='turn'){
    const k = Math.min(1, G.stageT/G.P.turn);
    walker.root.rotation.y = Math.PI/2 - Math.PI*k;
    if(k>=1){ G.stage = 'walk2'; G.stageT = 0; }
  } else if(G.stage==='romberg'){
    walker.root.rotation.y = 0;
    if(G.stageT > 3.5){ G.stage = 'done'; }
  }
  poseWalker(G, dt);
  if(G.stage==='done') stopGait();
}

/* ---------- hand animations on the bed ---------- */
function animateHands(t){
  if(pat.animHands) return pat.animHands(t);
  const tr = pat.look.tremor; if(!tr) return;
  for(const k of ['R','L']){
    const hg = pat.handGroups[k]; if(!hg) continue;
    if(tr==='rest' && k==='R') hg.rotation.z = .16*Math.sin(2*Math.PI*5*t);
    else if(tr==='fine') hg.rotation.x = .035*Math.sin(2*Math.PI*11*t + (k==='R'?0:1));
    else if(tr==='asterixis'){ const p = ((t*.75 + (k==='R'?0:.4)) % 1); hg.rotation.x = p < .14 ? -.5*Math.sin(p/.14*Math.PI) : 0; }
  }
}

let lastLoop = 0;
function loop(ms){
  const t = ms/1000, dt = Math.min(.05, (ms - lastLoop)/1000 || 0); lastLoop = ms;
  if(gaitState) updateGait(dt);
  if(pat && !gaitState && typeof curVitals === 'function'){
    const v = curVitals();
    if(v){
      const rr = v.rr || 0;
      const ph = rr ? Math.sin(2*Math.PI*t*rr/60) : 0;
      const amp = pat.look.kussmaul ? .11 : rr > 28 ? .07 : .045;
      const asym = pat.look.asym;
      if(pat.breathe) pat.breathe(ph, amp, asym);
      else {
        pat.chestR.scale.z = pat.depth * (1 + ph*amp*(asym==='R' ? .15 : 1));
        pat.chestL.scale.z = pat.depth * (1 + ph*amp*(asym==='L' ? .15 : 1));
        pat.chestR.scale.x = 1 + ph*amp*.3*(asym==='R'?.15:1); pat.chestL.scale.x = 1 + ph*amp*.3*(asym==='L'?.15:1);
        pat.abd.scale.z = pat.abdZ * (1 + ph*amp*.35);
        pat.head.rotation.x = ph*.02;
      }
      animateHands(t);
      if(pat.jvd) pat.jvd.scale.x = pat.jvd.scale.z = 1 + .35*Math.max(0, Math.sin(2*Math.PI*t*(v.hr||60)/60));
    }
  }
  if(ms - lastMon > 45){ drawMonitor(t); lastMon = ms; }
  applyCam();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
