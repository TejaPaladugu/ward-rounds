"use strict";
/* Hospital blanket draped over the posed patient with a small cloth simulation, plus procedural
   fabric textures (thermal waffle weave for the blanket, printed cotton for the gown). */

/* ---------- fabric textures ---------- */
const FABRIC = {};
function heightToNormal(h, w, hh, strength){
  const c = document.createElement('canvas'); c.width = w; c.height = hh;
  const g = c.getContext('2d'), img = g.createImageData(w, hh);
  const at = (x, y) => h[((y + hh) % hh)*w + ((x + w) % w)];
  for(let y=0;y<hh;y++) for(let x=0;x<w;x++){
    const dx = (at(x+1, y) - at(x-1, y))*strength, dy = (at(x, y+1) - at(x, y-1))*strength;
    const l = Math.hypot(dx, dy, 1), i = (y*w + x)*4;
    img.data[i] = (-dx/l*.5 + .5)*255; img.data[i+1] = (dy/l*.5 + .5)*255; img.data[i+2] = (1/l*.5 + .5)*255; img.data[i+3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}
function texFrom(canvas, rep){
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); t.anisotropy = 4;
  return t;
}
// Thermal blanket: a grid of soft square pockets with a fine knit on top, all tileable.
function blanketFabric(){
  if(FABRIC.blanket) return FABRIC.blanket;
  const N = 256, cells = 16, cs = N/cells, R = seeded(7);
  const h = new Float32Array(N*N);
  for(let y=0;y<N;y++) for(let x=0;x<N;x++){
    const u = (x % cs)/cs - .5, v = (y % cs)/cs - .5;
    const pocket = Math.max(0, 1 - Math.pow(Math.max(Math.abs(u), Math.abs(v))*2.2, 4));   // 1 inside a pocket, 0 on the ridge
    const knit = .5 + .5*Math.sin(x*Math.PI*1.0)*Math.sin(y*Math.PI*.5);
    h[y*N + x] = -pocket*1.0 + knit*.18 + (R() - .5)*.08;
  }
  const col = document.createElement('canvas'); col.width = col.height = N;
  const g = col.getContext('2d'), img = g.createImageData(N, N);
  for(let i=0;i<N*N;i++){
    const shade = 1 + h[i]*.018;
    img.data[i*4] = 192*shade; img.data[i*4+1] = 212*shade; img.data[i*4+2] = 226*shade; img.data[i*4+3] = 255;
  }
  g.putImageData(img, 0, 0);
  return FABRIC.blanket = {map:texFrom(col, [7, 7]), normalMap:texFrom(heightToNormal(h, N, N, 1.2), [7, 7])};
}
// Gown: pale blue cotton with the classic small navy print and a plain weave.
function gownFabric(rep){
  const key = 'gown' + rep;
  if(FABRIC[key]) return FABRIC[key];
  const N = 256, R = seeded(11);
  const col = document.createElement('canvas'); col.width = col.height = N;
  const g = col.getContext('2d');
  g.fillStyle = '#c9dde6'; g.fillRect(0, 0, N, N);
  // tiny print: staggered dots and diamonds
  for(let y=0;y<N;y+=32) for(let x=((y/32)%2)*16; x<N; x+=32){
    g.fillStyle = '#41678c';
    g.beginPath(); g.moveTo(x, y-6); g.lineTo(x+6, y); g.lineTo(x, y+6); g.lineTo(x-6, y); g.closePath(); g.fill();
    g.fillStyle = '#6d90ad'; g.beginPath(); g.arc(x+16, y+16, 2.6, 0, Math.PI*2); g.fill();
  }
  const h = new Float32Array(N*N);
  const img = g.getImageData(0, 0, N, N);
  for(let y=0;y<N;y++) for(let x=0;x<N;x++){
    const weave = ((x >> 1) + (y >> 1)) % 2 ? .5 : -.5;
    const v = weave*.6 + (R() - .5)*.3, i = y*N + x;
    h[i] = v;
    const s = 1 + v*.05; img.data[i*4] *= s; img.data[i*4+1] *= s; img.data[i*4+2] *= s;
  }
  g.putImageData(img, 0, 0);
  return FABRIC[key] = {map:texFrom(col, [rep, rep]), normalMap:texFrom(heightToNormal(h, N, N, .9), [rep, rep])};
}

/* ---------- body height field from the posed, skinned meshes ---------- */
const DRAPE_GRID = {x0:-.75, x1:.75, z0:-.35, z1:1.5, cell:.01};
function bodyHeightField(meshes, U, pad){
  const G = DRAPE_GRID, nx = Math.round((G.x1 - G.x0)/G.cell), nz = Math.round((G.z1 - G.z0)/G.cell);
  const H = new Float32Array(nx*nz).fill(-1);
  const M = new THREE.Matrix4(), v = new THREE.Vector3(), out = new THREE.Vector3(), tmp = new THREE.Vector3();
  for(const mesh of meshes){
    const g = mesh.geometry, P = g.attributes.position, N = g.attributes.normal, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
    const sk = mesh.skeleton, mats = sk.bones.map((b, i) => new THREE.Matrix4().multiplyMatrices(b.matrixWorld, sk.boneInverses[i]).multiply(mesh.bindMatrix));
    const world = new Float32Array(P.count*3);
    for(let i=0;i<P.count;i++){
      v.set(P.getX(i), P.getY(i), P.getZ(i));
      if(U && N){   // the same soft-tissue offset the shader applies (bind space: front = -y)
        let ny = N.getY(i); if(N.normalized || Math.abs(ny) > 1) ny /= 127;
        v.y -= shapeOffsetZ(U, tmp.set(v.x, v.z, -v.y), -ny);
      }
      const w = [SW.getX(i), SW.getY(i), SW.getZ(i), SW.getW(i)], ix = [SI.getX(i), SI.getY(i), SI.getZ(i), SI.getW(i)];
      const sum = w[0] + w[1] + w[2] + w[3] || 1;
      out.set(0, 0, 0);
      for(let k=0;k<4;k++){ if(!w[k]) continue; tmp.copy(v).applyMatrix4(mats[ix[k]]); out.addScaledVector(tmp, w[k]/sum); }
      world[i*3] = out.x; world[i*3+1] = out.y; world[i*3+2] = out.z;
    }
    // rasterize triangles by sampling them at about 7 mm
    const I = g.index, splat = (x, y, z) => {
      const cx = Math.floor((x - G.x0)/G.cell), cz = Math.floor((z - G.z0)/G.cell);
      if(cx < 0 || cz < 0 || cx >= nx || cz >= nz) return;
      const k = cz*nx + cx; if(y + pad > H[k]) H[k] = y + pad;
    };
    for(let t=0;t<I.count;t+=3){
      const a = I.getX(t)*3, b = I.getX(t+1)*3, c = I.getX(t+2)*3;
      const e = Math.max(Math.hypot(world[a]-world[b], world[a+2]-world[b+2]), Math.hypot(world[a]-world[c], world[a+2]-world[c+2]), Math.hypot(world[b]-world[c], world[b+2]-world[c+2]));
      const n = Math.max(1, Math.ceil(e/.007));
      for(let i=0;i<=n;i++) for(let j=0;j<=n-i;j++){
        const u = i/n, w2 = j/n, s = 1 - u - w2;
        splat(world[a]*s + world[b]*u + world[c]*w2, world[a+1]*s + world[b+1]*u + world[c+1]*w2, world[a+2]*s + world[b+2]*u + world[c+2]*w2);
      }
    }
  }
  // widen thin peaks (toes, knees) so the cloth grid can't slip between samples
  const D = new Float32Array(H.length), rad = 2;
  for(let z=0;z<nz;z++) for(let x=0;x<nx;x++){
    let m = -1;
    for(let j=-rad;j<=rad;j++) for(let i=-rad;i<=rad;i++){ const a = x+i, b = z+j; if(a >= 0 && b >= 0 && a < nx && b < nz && i*i + j*j <= rad*rad){ const v = H[b*nx + a]; if(v > m) m = v; } }
    D[z*nx + x] = m;
  }
  // soften the steep sides so contact doesn't kick the cloth (two 3x3 box blurs over the body cells)
  for(let pass=0; pass<2; pass++){
    const S = D.slice();
    for(let z=1;z<nz-1;z++) for(let x=1;x<nx-1;x++){
      const k = z*nx + x; if(S[k] < 0) continue;
      let sum = 0, c = 0;
      for(let j=-1;j<=1;j++) for(let i=-1;i<=1;i++){ const v = S[k + j*nx + i]; sum += v < 0 ? .63 : v; c++; }
      D[k] = Math.max(sum/c, .63);
    }
  }
  return {H:D, nx, nz};
}

/* ---------- the bed surface under the patient ---------- */
const MATTRESS = {half:.46, top:.63};
// [x0, x1, y0, y1, z0, z1] for the side rails and footboard (see buildBed in scene.js)
const BED_BOXES = [[-.515, -.485, .67, .81, .15, .85], [.485, .515, .67, .81, .15, .85], [-.49, .49, .5, .86, 1.255, 1.305]];
function bedTop(x, z){
  if(Math.abs(x) > MATTRESS.half || z > 1.27) return -1;
  const back = z < .09 ? .617 + .699*(.09 - z) : -1;   // the raised backrest
  return Math.max(back, z >= .05 ? MATTRESS.top : -1);
}

/* ---------- cloth ---------- */
function drapeBlanket(field, opts){
  const G = DRAPE_GRID, {H, nx, nz} = field;
  const hAt = (x, z) => {
    const fx = (x - G.x0)/G.cell - .5, fz = (z - G.z0)/G.cell - .5;
    const ix = Math.floor(fx), iz = Math.floor(fz), tx = fx - ix, tz = fz - iz;
    const get = (a, b) => (a < 0 || b < 0 || a >= nx || b >= nz) ? -1 : H[b*nx + a];
    const h00 = get(ix, iz), h10 = get(ix+1, iz), h01 = get(ix, iz+1), h11 = get(ix+1, iz+1);
    const m = Math.max(h00, h10, h01, h11);
    // treat missing samples as the highest neighbour so the body has no holes at its edges
    const f = h => h < 0 ? m : h;
    const body = m < 0 ? -1 : (f(h00)*(1-tx) + f(h10)*tx)*(1-tz) + (f(h01)*(1-tx) + f(h11)*tx)*tz;
    return Math.max(body, bedTop(x, z));
  };
  const W = opts.width, Lz = opts.length, CX = opts.cols, CZ = opts.rows;
  const dx = W/(CX - 1), dz = Lz/(CZ - 1), n = CX*CZ, r = .007;
  const p = new Float32Array(n*3), q = new Float32Array(n*3);
  let top = 0;
  for(let j=0;j<CZ;j++) for(let i=0;i<CX;i++){ const x = -W/2 + i*dx, z = opts.z0 + j*dz; top = Math.max(top, hAt(x, z)); }
  const R = seeded(opts.seed || 3);
  for(let j=0;j<CZ;j++) for(let i=0;i<CX;i++){
    const k = (j*CX + i)*3;
    p[k] = -W/2 + i*dx; p[k+1] = top + .03 + R()*.002; p[k+2] = opts.z0 + j*dz;
    q[k] = p[k]; q[k+1] = p[k+1]; q[k+2] = p[k+2];
  }
  // structural, shear and (soft) bend links
  const cons = [];
  const link = (a, b, s) => { const d = Math.hypot(p[a*3]-p[b*3], p[a*3+2]-p[b*3+2]); cons.push(a, b, d, s); };
  for(let j=0;j<CZ;j++) for(let i=0;i<CX;i++){
    const a = j*CX + i;
    if(i+1 < CX) link(a, a+1, 1);
    if(j+1 < CZ) link(a, a+CX, 1);
    if(i+1 < CX && j+1 < CZ){ link(a, a+CX+1, .9); link(a+1, a+CX, .9); }
    if(i+2 < CX) link(a, a+2, .45);
    if(j+2 < CZ) link(a, a+2*CX, .45);
  }
  const C = new Float32Array(cons), nc = cons.length/4;
  const dt = 1/90, g = -9.8*dt*dt, damp = .985;
  const collide = (k) => {
    let x = p[k], y = p[k+1], z = p[k+2];
    // side rails and footboard are solid boxes: push out through the face the particle came from
    for(const b of BED_BOXES){
      if(x > b[0] && x < b[1] && y > b[2] && y < b[3] && z > b[4] && z < b[5]){
        const px = q[k], py = q[k+1], pz = q[k+2];
        if(py >= b[3]) y = b[3] + r; else if(pz <= b[4]) z = b[4] - r; else if(pz >= b[5]) z = b[5] + r;
        else if(px <= b[0]) x = b[0] - r; else if(px >= b[1]) x = b[1] + r; else y = b[3] + r;
      }
    }
    // coming down the side of the mattress: stay outside it
    const wasOut = Math.abs(q[k]) >= MATTRESS.half + r - 1e-4;
    if(wasOut && Math.abs(x) < MATTRESS.half + r && y < MATTRESS.top) x = Math.sign(x || 1)*(MATTRESS.half + r);
    if(y < .35) y = .35;
    const s = hAt(x, z) + r;
    let hit = false;
    if(y < s){ y = s; hit = true; q[k+1] = Math.max(q[k+1], y); }   // no bounce: contact removes the downward speed
    p[k] = x; p[k+1] = y; p[k+2] = z;
    return hit;
  };
  for(let step=0; step<opts.steps; step++){
    for(let k=0;k<n*3;k+=3){
      const vx = (p[k]-q[k])*damp, vy = (p[k+1]-q[k+1])*damp, vz = (p[k+2]-q[k+2])*damp;
      q[k] = p[k]; q[k+1] = p[k+1]; q[k+2] = p[k+2];
      p[k] += vx; p[k+1] += vy + g; p[k+2] += vz;
    }
    for(let it=0; it<opts.iters; it++){
      for(let c=0;c<nc;c++){
        const a = C[c*4]*3, b = C[c*4+1]*3, rest = C[c*4+2], st = C[c*4+3];
        const ex = p[b]-p[a], ey = p[b+1]-p[a+1], ez = p[b+2]-p[a+2], d = Math.sqrt(ex*ex + ey*ey + ez*ez) || 1e-6;
        if(st < .5 && d < rest*.7) continue;         // bend links give way under strong compression, so folds can form
        const f = (d - rest)/d*.5*st;
        p[a] += ex*f; p[a+1] += ey*f; p[a+2] += ez*f; p[b] -= ex*f; p[b+1] -= ey*f; p[b+2] -= ez*f;
      }
      if(it % 3 !== 2 && it !== opts.iters - 1) continue;   // collisions every few passes keep it fast
      for(let k=0;k<n*3;k+=3) if(collide(k)){
        // friction: fabric resting on skin or sheets doesn't slide
        q[k] += (p[k] - q[k])*.95; q[k+2] += (p[k+2] - q[k+2])*.95;
      }
    }
  }
  // mesh: a thin double layer so the hem has some thickness
  const geo = new THREE.BufferGeometry(), uv = new Float32Array(n*2), idx = [];
  for(let j=0;j<CZ;j++) for(let i=0;i<CX;i++){ const a = j*CX + i; uv[a*2] = i/(CX-1)*W; uv[a*2+1] = j/(CZ-1)*Lz;
    if(i+1 < CX && j+1 < CZ) idx.push(a, a+CX, a+1, a+1, a+CX, a+CX+1); }
  geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

const DRAPE_CACHE = new Map();   // the same patient always settles the same way, so keep recent results
function buildDrape(meshes, U, opts){
  let geo = opts.key && DRAPE_CACHE.get(opts.key);
  if(!geo){
    const field = bodyHeightField(meshes, U, .018);
    geo = drapeBlanket(field, Object.assign({width:.98, length:1.42, cols:42, rows:54, steps:220, iters:7}, opts));
    geo.userData.keep = true;
    if(opts.key){ DRAPE_CACHE.set(opts.key, geo); if(DRAPE_CACHE.size > 12) DRAPE_CACHE.delete(DRAPE_CACHE.keys().next().value); }
  }
  const F = blanketFabric();
  const mat = new THREE.MeshStandardMaterial({map:F.map, normalMap:F.normalMap, normalScale:new THREE.Vector2(.3, .3), roughness:.97, side:THREE.DoubleSide});
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = m.receiveShadow = true;
  m.raycast = () => {};   // clicks pass through to the exam regions underneath
  return m;
}
