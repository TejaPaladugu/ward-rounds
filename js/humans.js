"use strict";
/* Rigged human patients loaded from models/*.glb (converted from TurboSquid free models; personal use).
   Each patient is a SkeletonUtils clone posed lying on the bed. Exam hotspots and skin findings are
   plain meshes parented to bones so they follow the pose. If the models can't load (file://, no
   loader), scene.js keeps using the procedural mannequin. */
const HUMAN_SRC = {M:['male'], F:['female1','female2']};
const HUMAN_HEIGHT = {M:1.76, F:1.64};
const HUMANS = {};           // name -> {scene, cache}
let humanState = 'idle';     // idle | loading | ready | failed
const ARM_DOWN = 1.02;       // radians from the model's A-pose to arms at the sides
const ARM_BED = {sh:s => [.1, 0, s*.14], el:[-.15, 0, 0]};
const BED = {tilt:-0.96, hipFlex:-0.61, pelvis:[0, .745, .11]};
const V3 = (x,y,z) => new THREE.Vector3(x,y,z);
const Q = () => new THREE.Quaternion();
const qE = (x=0, y=0, z=0) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));

function loadHumans(){
  if(humanState !== 'idle') return;
  if(!glOK || !THREE.GLTFLoader || !THREE.SkeletonUtils){ humanState = 'failed'; return; }
  humanState = 'loading';
  const loader = new THREE.GLTFLoader();
  if(typeof MeshoptDecoder !== 'undefined') loader.setMeshoptDecoder(MeshoptDecoder);
  const all = [...HUMAN_SRC.M, ...HUMAN_SRC.F]; let left = all.length;
  const done = () => {
    if(--left) return;
    humanState = Object.keys(HUMANS).length ? 'ready' : 'failed';
    // swap the placeholder mannequin for the real model once it arrives
    if(humanState==='ready' && pat && !pat.human && !gaitState){ const g = pat.gownOn; setPatient(pat.look); setGown(g); }
  };
  all.forEach(n => loader.load(`models/${n}.glb`, g => { HUMANS[n] = {scene:g.scene, cache:{}}; done(); }, undefined, () => done()));
}
function humanFor(L){
  if(humanState !== 'ready') return null;
  const list = HUMAN_SRC[L.sex==='F' ? 'F' : 'M'].filter(n => HUMANS[n]);
  return list.length ? list[hashStr(L.skin + L.hair + (L.habitus||'')) % list.length] : null;
}

/* ---------- rig: rotations expressed in the model's rest frame ---------- */
function makeRig(root){
  root.updateMatrixWorld(true);
  const b = {}, rest = {}, pw = {}, pos = {};
  root.traverse(o => {
    if(!o.name.startsWith('EM3D_Base_') || o.isMesh) return;
    const k = o.name.slice(10); if(b[k]) return;
    b[k] = o; rest[k] = {q:o.quaternion.clone(), s:o.scale.clone()};
    const q = Q(); o.parent.getWorldQuaternion(q); pw[k] = q;
    pos[k] = o.getWorldPosition(V3());
  });
  // R is a rotation about the bone's pivot, in rest-frame axes, relative to its parent's motion
  const rot = (k, R) => { const o = b[k]; if(!o) return; if(!R){ o.quaternion.copy(rest[k].q); return; }
    o.quaternion.copy(pw[k]).invert().multiply(R).multiply(pw[k]).multiply(rest[k].q); };
  const scl = (k, x, y, z) => { const o = b[k]; if(o) o.scale.set(rest[k].s.x*x, rest[k].s.y*(y??x), rest[k].s.z*(z??x)); };
  return {b, pos, rot, scl};
}
const sideKey = s => s < 0 ? 'R' : 'L';
const downQ = s => qE(0, 0, -s*ARM_DOWN);
function armPose(rig, s, sh, el, wr){
  const k = sideKey(s), D = downQ(s), Di = D.clone().invert();
  rig.rot(k+'_Upperarm', qE(...sh).multiply(D));
  rig.rot(k+'_Forearm', Di.clone().multiply(qE(...el)).multiply(D));
  rig.rot(k+'_Hand', Di.clone().multiply(qE(...wr)).multiply(D));
}
function legPose(rig, s, hip, kn, an){
  const k = sideKey(s);
  rig.rot(k+'_Thigh', qE(...hip)); rig.rot(k+'_Calf', qE(...kn)); rig.rot(k+'_Foot', qE(...an));
}

/* ---------- overlays: triangles whose dominant bone matches, drawn as a second skinned skin ---------- */
function overlayGeo(src, mesh, key, test){
  if(key in src.cache) return src.cache[key];
  const g = mesh.geometry, si = g.attributes.skinIndex, sw = g.attributes.skinWeight, bones = mesh.skeleton.bones;
  const ok = new Uint8Array(si.count);
  for(let i=0;i<si.count;i++){
    let best = 0, bw = -1;
    for(let c=0;c<4;c++){ const w = sw.getComponent ? sw.getComponent(i,c) : [sw.getX(i),sw.getY(i),sw.getZ(i),sw.getW(i)][c]; if(w > bw){ bw = w; best = [si.getX(i),si.getY(i),si.getZ(i),si.getW(i)][c]; } }
    ok[i] = test(bones[best].name.slice(10)) ? 1 : 0;
  }
  const idx = g.index, out = [];
  for(let t=0;t<idx.count;t+=3){ const a = idx.getX(t), b = idx.getX(t+1), c = idx.getX(t+2); if(ok[a] && ok[b] && ok[c]) out.push(a,b,c); }
  let ng = null;
  if(out.length){
    ng = new THREE.BufferGeometry();
    for(const a of ['position','normal','uv','skinIndex','skinWeight']) if(g.attributes[a]) ng.setAttribute(a, g.attributes[a]);
    ng.setIndex(out); ng.boundingSphere = g.boundingSphere; ng.boundingBox = g.boundingBox;
    ng.userData.keep = true;
  }
  return src.cache[key] = ng;
}
/* Soft-tissue shaping in bind space (z-up, front = -y): belly, chest rise and gynecomastia.
   Displacing before skinning keeps the shape in every pose, and the gown gets the same offset. */
const SHAPE_GLSL = `
uniform vec3 uBellyC, uBellyR, uChestCL, uChestCR, uChestR, uGynL, uGynR;
uniform float uBelly, uGyn; uniform vec2 uChestA;
float bump(vec3 p, vec3 c, vec3 r){ vec3 d = (p - c) / r; return exp(-2.0*dot(d, d)); }
vec3 shapeOff(vec3 p, vec3 n){
  float a = uBelly*bump(p, uBellyC, uBellyR) + uChestA.x*bump(p, uChestCL, uChestR) + uChestA.y*bump(p, uChestCR, uChestR)
          + uGyn*(bump(p, uGynL, vec3(.055)) + bump(p, uGynR, vec3(.055)));
  return vec3(0.0, -a*smoothstep(-0.1, 0.7, -normalize(n).y), 0.0);
}
`;
function shapeUniforms(){
  const v = () => ({value:new THREE.Vector3()});
  return {uBellyC:v(), uBellyR:{value:new THREE.Vector3(.13,.1,.12)}, uBelly:{value:0}, uChestCL:v(), uChestCR:v(), uChestR:{value:new THREE.Vector3(.09,.1,.13)}, uChestA:{value:new THREE.Vector2()}, uGynL:v(), uGynR:v(), uGyn:{value:0}};
}
const toBind = m => V3(m.x, -m.z, m.y);
function shapeOffsetZ(U, m, nz){ // the same displacement in model space (front = +z), for decals and hotspots
  const p = toBind(m);
  const bump = (c, r) => { const x = (p.x-c.x)/r.x, y = (p.y-c.y)/r.y, z = (p.z-c.z)/r.z; return Math.exp(-2*(x*x + y*y + z*z)); };
  const g = V3(.055,.055,.055);
  const a = U.uBelly.value*bump(U.uBellyC.value, U.uBellyR.value) + U.uChestA.value.x*bump(U.uChestCL.value, U.uChestR.value) + U.uChestA.value.y*bump(U.uChestCR.value, U.uChestR.value) + U.uGyn.value*(bump(U.uGynL.value, g) + bump(U.uGynR.value, g));
  const t = Math.min(1, Math.max(0, (nz + .1)/.8));
  return a * t*t*(3 - 2*t);
}
function shapeWeights(U, m, nz){ // per-bump weights (without amplitude), so surface decals can ride the breathing
  const p = toBind(m), t0 = Math.min(1, Math.max(0, (nz + .1)/.8)), f = t0*t0*(3 - 2*t0);
  const bump = (c, r) => { const x = (p.x-c.x)/r.x, y = (p.y-c.y)/r.y, z = (p.z-c.z)/r.z; return Math.exp(-2*(x*x + y*y + z*z)); };
  return {L:f*bump(U.uChestCL.value, U.uChestR.value), R:f*bump(U.uChestCR.value, U.uChestR.value), B:f*bump(U.uBellyC.value, U.uBellyR.value)};
}
function shapedMat(mat, U, d){
  mat.skinning = true;
  // the body has no UVs, so textured overlays wrap their fabric around the trunk in bind space (meters)
  const projUV = !!mat.map;
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    let vs = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n  transformed += shapeOff(position, normal);` + (d ? `\n  transformed += normalize(normal) * ${d.toFixed(4)};` : ''));
    if(projUV) vs = vs.replace('#include <uv_vertex>', 'vUv = ( uvTransform * vec3( atan( position.x, -position.y ) * .16, position.z, 1. ) ).xy;');
    sh.vertexShader = SHAPE_GLSL + vs;
  };
  mat.customProgramCacheKey = () => 'shape' + (d||0) + (projUV ? 'uv' : '');
  return mat;
}
function addOverlay(H, key, test, mat, d){
  const made = [];
  for(const m of H.bodyMeshes){
    const geo = overlayGeo(H.src, H.srcMeshes[m.name], key + m.name, test); if(!geo) continue;
    const o = new THREE.SkinnedMesh(geo, shapedMat(mat, H.U, d));
    o.position.copy(m.position); o.quaternion.copy(m.quaternion); o.scale.copy(m.scale);
    m.parent.add(o); o.bind(m.skeleton, m.bindMatrix);
    o.frustumCulled = false; o.castShadow = true; o.receiveShadow = true; o.raycast = () => {};
    made.push(o);
  }
  return made;
}

/* ---------- build a posed patient ---------- */
function buildHumanPatient(L, name){
  const src = HUMANS[name];
  const model = THREE.SkeletonUtils.clone(src.scene);
  const sex = L.sex==='F' ? 'F' : 'M';
  const U = shapeUniforms();
  const H = {src, model, bodyMeshes:[], clothMeshes:[], srcMeshes:{}, U};
  src.scene.traverse(o => { if(o.isSkinnedMesh) H.srcMeshes[o.name] = o; });

  // materials: per-patient copies, tinted for the case
  let skinColor = new THREE.Color(L.skin);
  if(L.jaundice) skinColor = skinColor.clone().lerp(new THREE.Color('#d9b23a'), L.jaundice*.45);
  if(L.pallor) skinColor = skinColor.clone().lerp(new THREE.Color('#e6ddd6'), L.pallor*.35);
  const headColor = skinColor.clone().lerp(new THREE.Color('#7d86b8'), Math.min(.3, (L.cyan||0)*.35));
  const tipC = mixHex(L.skin, '#7880b6', Math.min(1, (L.cyan||0)*.9));
  const scleraC = L.jaundice ? mixHex('#ffffff', '#e8c84a', L.jaundice*.8) : new THREE.Color('#ffffff');
  const hairC = new THREE.Color(L.hair);
  const morphMeshes = [];
  model.traverse(o => {
    if(!o.isMesh) return;
    o.material = o.material.clone();
    const n = o.material.name;
    if(/Skin_(Body|Arm|Leg)/.test(n)) o.material.color.copy(skinColor);
    else if(/Skin_Head/.test(n)) o.material.color.copy(headColor);
    else if(/Nails/.test(n)) o.material.color.copy(tipC);
    else if(/Eye_[RL]$/.test(n)) o.material.color.copy(scleraC);
    else if(/Hair|Scalp|Slicked|Eyebrow|Female_Flat|Eyelash/.test(n)) o.material.color.copy(/Eyelash/.test(n) ? hairC.clone().multiplyScalar(.35) : hairC);
    else if(/Bra|Underwear|Boxers/.test(n)){ o.material.color.set('#cfd8de'); o.material.roughness = .85; o.material.metalness = 0; }
    else if(/Cornea/.test(n)) Object.assign(o.material, {transparent:true, opacity:.12, depthWrite:false, roughness:.05});
    else if(/OEM3Dlusion/.test(n)){ Object.assign(o.material, {transparent:true, opacity:.12, depthWrite:false}); o.material.color.set('#3a2a24'); }
    else if(/Tearline/.test(n)) Object.assign(o.material, {transparent:true, opacity:.25, depthWrite:false});
    if(/Flat_Base/.test(n)) o.visible = false;
    if(/Skin_/.test(n)){ o.material.map = null; o.material.roughness = L.sweat ? .3 : .62; o.material.metalness = L.sweat ? .05 : 0; o.material.needsUpdate = true; }
    if(/Skin_(Body|Arm|Leg)/.test(n)) H.bodyMeshes.push(o);
    if(o.isSkinnedMesh && /Skin_(Body|Arm|Leg)|Bra|Underwear|Boxers/.test(n)) shapedMat(o.material, U, 0);
    if(o.isSkinnedMesh && /Bra|Underwear|Boxers/.test(n)) H.clothMeshes.push(o);
    if(o.isSkinnedMesh){ o.frustumCulled = false; o.castShadow = true; o.receiveShadow = true; o.raycast = () => {}; o.userData.keepGeo = true; }
    if(o.morphTargetDictionary) morphMeshes.push(o);
  });
  const morph = (k, v) => morphMeshes.forEach(o => { const i = o.morphTargetDictionary[k]; if(i != null) o.morphTargetInfluences[i] = v; });
  if(L.eyesClosed) morph('Eyes_Blink', 1);
  if(L.ptosis) morph('Eye_Blink_R', .62);
  if(L.proptosis){ morph('Eye_Wide_L', 1); morph('Eye_Wide_R', 1); }
  if(L.droop){ morph('Mouth_Frown_' + L.droop, 1); morph('Mouth_Down', .25); }
  if(L.habitus==='thin') morph('Cheeks_Suck', .55);
  if(L.o2==='mask' || L.kussmaul) morph('Mouth_Lips_Part', .5);

  // rest-pose measurements (model space, before scaling and posing)
  const rig = makeRig(model);
  const P = rig.pos;
  // rest pose == bind pose here, so plain meshes over the bind geometry give the true surface
  const surfMeshes = H.bodyMeshes.concat(model.getObjectByName('EM3D_Base_Body_1') || []).map(m => {
    const p = new THREE.Mesh(m.geometry, m.material); p.matrixAutoUpdate = false; p.matrixWorld.copy(m.matrixWorld); return p; });
  const ray = new THREE.Raycaster();
  let shapeOn = false;
  const surf = (x, y, dir) => {
    const d = dir || V3(0,0,-1), o = V3(x, y, 0).addScaledVector(d, -1.2);
    ray.set(o, d); ray.far = 3;
    const hs = ray.intersectObjects(surfMeshes, false); hs.sort((a,b) => a.distance - b.distance);
    const hit = hs[0];
    if(!hit) return {p:V3(x, y, .1), n:d.clone().negate()};
    const n = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : d.clone().negate();
    if(n.dot(d) > 0) n.negate();
    const p = hit.point.clone(); if(shapeOn) p.z += shapeOffsetZ(U, p, n.z);
    return {p, n};
  };
  const attach = (bone, obj) => { const b = rig.b[bone] || model; b.attach(obj); return obj; };
  const regionMeshes = {}, undressedOnly = [], gowned = [], gownOnly = [];
  const hot = (region, geo, pos, bone, scale, quat) => {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({color:0x6cf0e0, transparent:true, opacity:0, depthWrite:false}));
    m.position.copy(pos); if(scale) m.scale.set(...scale); if(quat) m.quaternion.copy(quat);
    m.userData.region = region; m.userData.hl = .26; m.castShadow = false; m.renderOrder = 2;
    (regionMeshes[region] = regionMeshes[region] || []).push(m);
    model.add(m); attach(bone, m); return m;
  };
  const movers = [];
  const decal = (geo, mat, s, bone, lift=.0015) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(s.p).addScaledVector(s.n, lift);
    m.quaternion.setFromUnitVectors(V3(0,0,1), s.n);
    m.castShadow = false; model.add(m);
    const w = shapeWeights(U, s.p, s.n.z);
    attach(bone, m);
    if(w.L + w.R + w.B > .01){ const q = Q(); (rig.b[bone] || model).getWorldQuaternion(q); movers.push({m, base:m.position.clone(), dir:V3(0,0,1).applyQuaternion(q.invert()), w}); }
    return m;
  };
  const dot = (r, c, rough=.5) => [new THREE.CircleGeometry(r, 10), std(c, rough)];

  // key landmarks
  const chestY = (P.R_RibsTwist.y + P.R_Clavicle.y) / 2;
  const nippleY = P.R_Breast ? P.R_Breast.y : P.R_RibsTwist.y + .1;
  const navelY = P.Spine01.y - .005;
  const headC = P.Head.clone().add(V3(0, .085, .02));
  const eyeY = P.R_Eye ? P.R_Eye.y : headC.y;
  const chestFront = surf(0, chestY).p.z;
  const abdS = surf(0, navelY);
  const H2 = L.habitus;
  U.uBelly.value = L.ascites ? .07 : H2==='obese' ? .055 : H2==='heavy' ? .025 : 0;
  U.uBellyC.value.copy(toBind(V3(0, navelY - .025, abdS.p.z - .03)));
  U.uBellyR.value.set(L.ascites ? .15 : .14, .12, L.ascites ? .14 : .12);
  for(const [k, c] of [['L','uChestCL'], ['R','uChestCR']]) U[c].value.copy(toBind(V3((k==='L' ? 1 : -1)*.075, chestY - .02, chestFront - .03)));
  const chest0 = L.barrel ? .022 : 0; U.uChestA.value.set(chest0, chest0);
  if((L.marks||[]).includes('gyn') && sex==='M'){ U.uGyn.value = .026; U.uGynL.value.copy(toBind(surf(P.L_Breast.x, P.L_Breast.y).p)); U.uGynR.value.copy(toBind(surf(P.R_Breast.x, P.R_Breast.y).p)); }
  shapeOn = true;

  // exam hotspots
  hot('heent', new THREE.SphereGeometry(.125, 18, 14), headC, 'Head', [.95, 1.1, 1.05]);
  const neckLen = P.Head.y - P.NeckTwist01.y + .03;
  hot('neck', new THREE.CylinderGeometry(.068, .075, neckLen, 14), V3(0, (P.Head.y + P.NeckTwist01.y)/2 - .01, P.NeckTwist01.z + .03), 'NeckTwist01');
  const lungW = Math.abs(P.R_Clavicle.x) + .07;
  for(const s of [-1,1]) hot(s<0 ? 'lungR' : 'lungL', new THREE.SphereGeometry(1, 16, 12), V3(s*lungW*.52, chestY - .015, chestFront - .1), 'Spine02', [lungW*.52, .11, .12]);
  hot('heart', new THREE.SphereGeometry(1, 16, 12), surf(.035, nippleY - .035).p.add(V3(0,0,.012)), 'Spine02', [.045, .045, .02]);
  hot('abd', new THREE.SphereGeometry(1, 16, 12), V3(0, navelY, surf(0, navelY).p.z - .06), 'Spine01', [.12, .12, .09]);
  for(const s of [-1,1]){
    const k = sideKey(s);
    const hand = P[k+'_Hand'], mid = P[k+'_Mid1'] || hand, fore = P[k+'_Forearm'] || P[k+'_ForearmTwist01'];
    hot('hands', new THREE.SphereGeometry(.075, 14, 10), hand.clone().lerp(mid, .6), k+'_Hand', [1, .7, 1]);
    const fa = new THREE.CylinderGeometry(.05, .05, fore.distanceTo(hand), 12); fa.rotateZ(Math.PI/2);
    hot('hands', fa, fore.clone().lerp(hand, .5), k+'_Forearm', null, Q().setFromUnitVectors(V3(1,0,0), hand.clone().sub(fore).normalize()));
    const knee = P[k+'_Calf'] || P[k+'_KneeShareBone'], foot = P[k+'_Foot'];
    hot('joints', new THREE.SphereGeometry(.07, 14, 10), knee.clone().add(V3(0,.01,.03)), k+'_Calf');
    const cg = new THREE.CylinderGeometry(.066, .056, knee.y - foot.y - .16, 12);
    hot('legs', cg, V3(knee.x, (knee.y + foot.y)/2 - .02, knee.z + .005), k+'_Calf');
    const toe = P[k+'_BigToe1'] || foot;
    hot('joints', new THREE.SphereGeometry(.07, 12, 10), foot.clone().lerp(toe, .55).add(V3(0,.01,0)), k+'_Foot', [.8, .6, 1.3]);
  }
  const gu = hot('gu', new THREE.SphereGeometry(1, 14, 10), V3(0, P.L_Thigh ? P.L_Thigh.y - .03 : P.Pelvis.y - .08, surf(0, P.Pelvis.y - .07).p.z - .03), 'Pelvis', [.08, .07, .06]);
  gu.visible = false; undressedOnly.push(gu);
  const skinHot = [];

  // skin findings
  const marks = new Set(L.marks || []);
  if(marks.has('spiders')) for(const [x,y] of [[-.08,.05],[.05,.08],[.11,.02],[-.13,0],[0,.1]]){
    const s = surf(x*lungW/.2, chestY + y - .02), [g, m] = dot(.005, '#c0222a');
    const c = decal(g, m, s, 'Spine02'); undressedOnly.push(c); c.visible = false;
    for(let k=0;k<4;k++){ const leg = new THREE.Mesh(new THREE.PlaneGeometry(.018, .0016), m); leg.rotation.z = k*Math.PI/4; c.add(leg); }
  }
  if(marks.has('caput')) for(let k=0;k<7;k++){ const a = k/7*Math.PI*2;
    for(let j=1;j<=5;j++){ const r = .022 + j*.013, s = surf(Math.cos(a + j*.05)*r, navelY + Math.sin(a + j*.05)*r), [g, m] = dot(.0042, '#4a5f94');
      const d = decal(g, m, s, 'Spine01', .003); d.scale.set(1.4, 1, 1); undressedOnly.push(d); d.visible = false; } }
  if(marks.has('sternotomy')) for(let y = P.R_RibsTwist.y - .03; y < P.R_Clavicle.y - .01; y += .008){
    const d = decal(new THREE.PlaneGeometry(.007, .009), std('#b06a6a', .6), surf(0, y), 'Spine02'); undressedOnly.push(d); d.visible = false; }
  if(L.malar){
    const rashM = new THREE.MeshStandardMaterial({color:'#b5323a', transparent:true, opacity:.45, roughness:.6, depthWrite:false});
    for(const s of [-1,1]){ const d = decal(new THREE.CircleGeometry(.024, 16), rashM, surf(s*.043, eyeY - .032), 'Head', .003); d.scale.set(1, .7, 1); }
    const nb = decal(new THREE.CircleGeometry(.012, 12), rashM, surf(0, eyeY - .022), 'Head', .003); nb.scale.set(1, .7, 1);
  }
  if(L.track || L.pustules) for(const s of [-1,1]){
    const k = sideKey(s), a = P[k+'_Forearm'] || P[k+'_ForearmTwist01'], h = P[k+'_Hand'];
    if(L.track) for(let i=0;i<6;i++){ const p = a.clone().lerp(h, .12 + i*.12); const [g, m] = dot(.0035, '#5a2f2f', .6);
      decal(g, m, surf(p.x, p.y), i < 3 ? k+'_ForearmTwist01' : k+'_ForearmTwist02'); }
    if(L.pustules) for(let i=0;i<3;i++){ const p = a.clone().lerp(h, .25 + i*.22); const sp = surf(p.x + s*.01, p.y - .004);
      const ring = decal(new THREE.CircleGeometry(.011, 12), new THREE.MeshStandardMaterial({color:'#c0453a', transparent:true, opacity:.6, depthWrite:false}), sp, k+'_ForearmTwist01', .0015);
      const [g, m] = dot(.0055, '#efe2a0'); const pu = decal(g, m, sp, k+'_ForearmTwist01', .0025);
      for(const o of [ring, pu]){ o.userData.region = 'skin'; skinHot.push(o); }
    }
  }
  if(skinHot.length) regionMeshes.skin = skinHot;
  if(L.petechiae) { const R = seeded(hashStr(L.skin + 'pet')); for(const s of [-1,1]){
    const k = sideKey(s), kn = P[k+'_Calf'], ft = P[k+'_Foot'];
    for(let i=0;i<16;i++){ const p = kn.clone().lerp(ft, .15 + R()*.7); const [g, m] = dot(.0028, '#a01818', .6);
      decal(g, m, surf(p.x + (R()-.5)*.07, p.y), R() < .5 ? k+'_CalfTwist01' : k+'_CalfTwist02'); } } }

  // swelling and erythema
  const red = (op=.38) => new THREE.MeshStandardMaterial({color:'#c4473a', transparent:true, opacity:op, roughness:.55, depthWrite:false, polygonOffset:true, polygonOffsetFactor:-2});
  const swell = (k, f) => { rig.scl(k+'_CalfTwist01', f, 1, f); rig.scl(k+'_CalfTwist02', f, 1, f); };
  if(L.edema) for(const k of ['R','L']){ swell(k, 1.13); rig.scl(k+'_Foot', 1.08); }
  if(L.swollen){ swell(L.swollen, 1.24); addOverlay(H, 'calf'+L.swollen, n => n===L.swollen+'_CalfTwist01' || n===L.swollen+'_CalfTwist02', red(.22), .003); }
  if(L.knee){ rig.scl(L.knee+'_KneeShareBone', 1.18); addOverlay(H, 'knee'+L.knee, n => n===L.knee+'_KneeShareBone', red(), .003); }
  if(L.gout){ rig.scl(L.gout+'_BigToe1', 1.35); addOverlay(H, 'toe'+L.gout, n => n.startsWith(L.gout+'_BigToe'), red(.5), .002); }
  if(L.clubbing) for(const k of ['R','L']) for(const f of ['Index3','Mid3','Ring3','Pinky3']) rig.scl(k+'_'+f, 1.35, 1.05, 1.35);

  // gown: a fitted second skin over the trunk, upper arms and thighs
  const GF = gownFabric(3);
  const gown = addOverlay(H, 'gown', n => /^(Hip|Pelvis|Waist|Spine0[12]|[LR]_(RibsTwist|Breast|Clavicle|UpperarmTwist0[12]|ThighTwist01))$/.test(n), new THREE.MeshStandardMaterial({map:GF.map, normalMap:GF.normalMap, normalScale:new THREE.Vector2(.18, .18), roughness:.92}), .016);
  gown.forEach(m => gownOnly.push(m));

  // oxygen
  if(L.o2==='cannula' || L.o2==='mask'){
    const nose = surf(0, eyeY - .045), earY = eyeY - .02, earZ = P.Head.z + .01, w = .085;
    if(L.o2==='cannula'){
      const tubeM = new THREE.MeshStandardMaterial({color:'#dff4f5', transparent:true, opacity:.85, roughness:.3});
      const pts = [V3(-w, earY - .12, earZ - .02), V3(-w - .005, earY, earZ), V3(-.05, nose.p.y - .012, nose.p.z - .035), V3(0, nose.p.y - .008, nose.p.z + .006), V3(.05, nose.p.y - .012, nose.p.z - .035), V3(w + .005, earY, earZ), V3(w, earY - .12, earZ - .02)];
      const t = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, .0035, 6, false), tubeM);
      model.add(t); attach('Head', t);
    } else {
      const mm = new THREE.MeshStandardMaterial({color:'#bfe8d0', transparent:true, opacity:.5, roughness:.2, depthWrite:false});
      const mask = new THREE.Mesh(new THREE.SphereGeometry(.06, 18, 12, 0, Math.PI*2, 0, Math.PI/2), mm);
      mask.position.set(0, nose.p.y - .025, nose.p.z - .02); mask.rotation.x = Math.PI/2; mask.scale.set(1, .75, 1.15);
      model.add(mask); attach('Head', mask);
      const bag = new THREE.Mesh(new THREE.SphereGeometry(.05, 12, 10), mm); bag.position.set(0, nose.p.y - .14, nose.p.z + .02); bag.scale.set(1, 1.3, .8);
      model.add(bag); attach('Head', bag);
    }
  }
  // distended jugular vein on the patient's right neck
  let jvd = null;
  if(L.jvd){
    jvd = new THREE.Mesh(new THREE.CylinderGeometry(.006, .007, neckLen*.9, 8), std('#4c5f94', .5));
    const s = surf(-.03, (P.Head.y + P.NeckTwist01.y)/2);
    jvd.position.copy(s.p).addScaledVector(s.n, .001); jvd.rotation.z = .25; model.add(jvd); attach('NeckTwist01', jvd);
  }

  // anchors used by camera presets
  const headAnchor = new THREE.Object3D(); headAnchor.position.copy(headC); model.add(headAnchor); attach('Head', headAnchor);
  const handAnchor = new THREE.Object3D(); handAnchor.position.copy(P.R_Hand).lerp(P.R_Mid1 || P.R_Hand, .5); model.add(handAnchor); attach('R_Hand', handAnchor);
  const chestAnchor = new THREE.Object3D(); chestAnchor.position.set(0, chestY, chestFront); model.add(chestAnchor); attach('Spine02', chestAnchor);

  // size and habitus
  const top = new THREE.Box3().setFromObject(rig.b.Head ? model.getObjectByName('EM3D_Base_Body_1') || model : model).max.y;
  const k = HUMAN_HEIGHT[sex] / (top || HUMAN_HEIGHT[sex]);
  const wide = H2==='obese' ? 1.18 : H2==='heavy' ? 1.08 : H2==='thin' ? .93 : 1;
  return {model, rig, k, wide, P, bodyMeshes:H.bodyMeshes, clothMeshes:H.clothMeshes, regionMeshes, undressedOnly, gowned, gownOnly, movers, jvd, headAnchor, chestAnchor, handAnchor, U, chest0, belly0:U.uBelly.value, setMorph:morph};
}

/* ---------- lying on the bed ---------- */
function humanPatient(L){
  const name = humanFor(L); if(!name) return null;
  const H = buildHumanPatient(L, name);
  const grp = new THREE.Group(), tilt = new THREE.Group();
  grp.add(tilt); tilt.add(H.model);
  H.model.scale.set(H.k*H.wide, H.k, H.k*H.wide);
  tilt.rotation.x = BED.tilt;
  const pel = H.P.Pelvis.clone().multiply(H.model.scale).applyEuler(tilt.rotation);
  tilt.position.set(...BED.pelvis).sub(pel);
  // pose: arms at the sides with elbows slightly bent, legs flat on the bed
  const rig = H.rig;
  const restPose = () => { for(const s of [-1,1]){ armPose(rig, s, ARM_BED.sh(s), ARM_BED.el, [0, 0, 0]); legPose(rig, s, [BED.hipFlex, 0, s*.04], [.05, 0, 0], [.35, 0, 0]); } };
  restPose();
  rig.rot('Head', qE(.12, 0, 0));
  // the blanket is simulated once against the posed body (arms stay on top of it)
  grp.updateMatrixWorld(true);
  const blanket = buildDrape(H.bodyMeshes.filter(m => !/Skin_Arm/.test(m.material.name)).concat(H.clothMeshes), H.U, {z0:BED.pelvis[2] - .13, seed:hashStr(L.skin), key:name + JSON.stringify(L)});
  grp.add(blanket);
  const R = rig, look = L;
  return {
    human:true, U:H.U, H, grp, torso:tilt, regionMeshes:H.regionMeshes, look:L, gowned:H.gowned, gownOnly:H.gownOnly, undressedOnly:H.undressedOnly,
    blanket, handGroups:{}, gownOn:true, jvd:H.jvd, head:H.headAnchor, chestR:H.chestAnchor, handAnchor:H.handAnchor, depth:1, abdZ:1,
    breathe(ph, amp, asym){
      const rise = (ph + 1)*.5*amp*.2;
      H.U.uChestA.value.set(H.chest0 + rise*(asym==='L' ? .15 : 1), H.chest0 + rise*(asym==='R' ? .15 : 1));
      H.U.uBelly.value = H.belly0 + rise*.6;
      const dL = H.U.uChestA.value.x - H.chest0, dR = H.U.uChestA.value.y - H.chest0, dB = H.U.uBelly.value - H.belly0;
      for(const o of H.movers) o.m.position.copy(o.base).addScaledVector(o.dir, dL*o.w.L + dR*o.w.R + dB*o.w.B);
      R.rot('Head', qE(.12 + ph*.015, 0, 0));
    },
    animHands(t){
      const tr = look.tremor; if(!tr) return;
      for(const s of [-1,1]){
        const k = sideKey(s); let wr = [0, 0, 0];
        if(tr==='rest' && k==='R') wr = [0, .32*Math.sin(2*Math.PI*5*t), 0];
        else if(tr==='fine') wr = [0, 0, .05*Math.sin(2*Math.PI*11*t + (k==='R' ? 0 : 1))];
        else if(tr==='asterixis'){ const p = ((t*.75 + (k==='R' ? 0 : .4)) % 1); wr = [0, 0, p < .14 ? s*.5*Math.sin(p/.14*Math.PI) : 0]; }
        armPose(R, s, ARM_BED.sh(s), ARM_BED.el, wr);
      }
    }
  };
}

/* ---------- standing walker for the gait exam ---------- */
function humanWalker(L){
  const name = humanFor(L); if(!name) return null;
  const H = buildHumanPatient(Object.assign({}, L, {o2:null, marks:[]}), name);
  const root = new THREE.Group(); root.add(H.model);
  H.model.scale.set(H.k*H.wide, H.k, H.k*H.wide);
  // hide exam hotspots; the gown stays on
  Object.values(H.regionMeshes).flat().forEach(m => { if(m.material && m.material.isMeshBasicMaterial) m.visible = false; });
  const O = () => new THREE.Object3D();
  const torso = O(), head = O(), arms = {}, legs = {};
  torso.position.y = .94;
  for(const k of ['R','L']){ arms[k] = {sh:O(), el:O(), wr:O()}; legs[k] = {hip:O(), kn:O(), an:O()}; }
  const R = H.rig, e = o => [o.rotation.x, o.rotation.y, o.rotation.z];
  const apply = () => {
    R.rot('Spine01', qE(...e(torso)));
    R.rot('Head', qE(...e(head)));
    for(const s of [-1,1]){
      const k = sideKey(s), a = arms[k], l = legs[k];
      armPose(R, s, e(a.sh), e(a.el), e(a.wr));
      legPose(R, s, e(l.hip), e(l.kn), e(l.an));
    }
    H.model.position.y = (torso.position.y - .94);
  };
  root.visible = false; scene.add(root);
  return {root, torso, head, arms, legs, apply};
}
