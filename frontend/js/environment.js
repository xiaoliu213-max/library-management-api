// ===== 环境层：地台、盘龙柱、远山、天环、花瓣、云雾、浮岛 =====
// 与书阵无关的"世界感"元素都放这里， main.js 只需要 createEnvironment + 每帧 update
import * as THREE from "three";

function softDisc(inner, outer) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function petalTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, "rgba(255,205,180,.95)");
  g.addColorStop(0.55, "rgba(255,160,150,.55)");
  g.addColorStop(1, "rgba(255,150,150,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(32, 32, 26, 16, Math.PI / 5, 0, Math.PI * 2);
  ctx.fill();
  return new THREE.CanvasTexture(c);
}

export function createEnvironment(scene, camera) {
  const group = new THREE.Group();
  scene.add(group);

  // ---- 地台：一块巨大的暗色圆盘，让世界不再悬空 ----
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(26, 48),
    new THREE.MeshBasicMaterial({ color: 0x0a0618 })
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = -0.03;
  group.add(disc);

  // ---- 六根盘龙柱（后排四根围护法阵，侧柱退远做前景框） ----
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x181030, roughness: 0.7, metalness: 0.3 });
  const bandMat = new THREE.MeshStandardMaterial({
    color: 0xe8c97a, emissive: 0xe8c97a, emissiveIntensity: 0.9, roughness: 0.4,
  });
  const orbTex = softDisc("rgba(255,225,160,.95)", "rgba(255,180,90,0)");
  const orbs = [];
  const pillarTops = []; // 供光链使用
  for (const [deg, r] of [[95, 13.5], [125, 10.5], [155, 10.5], [-95, 13.5], [-125, 10.5], [-155, 10.5]]) {
    const a = (deg * Math.PI) / 180;
    const p = new THREE.Group();
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.62, 7.5, 10), pillarMat);
    col.position.y = 3.75;
    p.add(col);
    for (const y of [1.4, 4.4, 6.9]) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.06, 8, 24), bandMat);
      band.rotation.x = Math.PI / 2;
      band.position.y = y;
      p.add(band);
    }
    const orb = new THREE.Sprite(new THREE.SpriteMaterial({
      map: orbTex, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    orb.position.y = 8.15;
    orb.scale.setScalar(1.6);
    orb.userData.phase = Math.random() * Math.PI * 2;
    p.add(orb);
    orbs.push(orb);
    p.position.set(Math.sin(a) * r, 0, Math.cos(a) * r);
    group.add(p);
    pillarTops.push({ x: p.position.x, y: 8.15, z: p.position.z, deg });
  }

  // ---- 天环：头顶交错的浑天双环 ----
  const ring1 = new THREE.Mesh(
    new THREE.TorusGeometry(12.5, 0.07, 8, 90),
    new THREE.MeshBasicMaterial({ color: 0xe8c97a, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  ring1.position.y = 8.6;
  const ring2 = new THREE.Mesh(
    new THREE.TorusGeometry(12.5, 0.07, 8, 90),
    new THREE.MeshBasicMaterial({ color: 0x7ae0ff, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  ring2.position.y = 8.6;
  ring2.rotation.x = Math.PI / 3;
  group.add(ring1, ring2);

  // ---- 远山剪影（雾里若隐若现） ----
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + Math.random() * 0.25;
    const r = 34 + Math.random() * 10;
    const h = 5 + Math.random() * 8;
    const m = new THREE.Mesh(
      new THREE.ConeGeometry(5 + Math.random() * 5, h, 5),
      new THREE.MeshBasicMaterial({ color: 0x0d0822 })
    );
    m.position.set(Math.sin(a) * r, h / 2 - 0.5, Math.cos(a) * r);
    m.rotation.y = Math.random() * Math.PI;
    group.add(m);
  }

  // ---- 飘落花瓣 ----
  const petals = [];
  const petalTex = petalTexture();
  for (let i = 0; i < 46; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: petalTex, transparent: true, opacity: 0.75,
      depthWrite: false,
    }));
    s.scale.setScalar(0.12 + Math.random() * 0.1);
    s.userData = {
      speed: 0.35 + Math.random() * 0.45,
      sway: Math.random() * Math.PI * 2,
      swayAmp: 0.4 + Math.random() * 0.6,
      rot: (Math.random() - 0.5) * 1.6,
    };
    s.position.set((Math.random() - 0.5) * 22, Math.random() * 9 + 1, (Math.random() - 0.5) * 22);
    group.add(s);
    petals.push(s);
  }

  // ---- 地面云雾 ----
  const mistTex = softDisc("rgba(140,90,220,.16)", "rgba(140,90,220,0)");
  const mists = [];
  for (let i = 0; i < 7; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: mistTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    const r = 12 + Math.random() * 9;
    const a = Math.random() * Math.PI * 2;
    s.position.set(Math.sin(a) * r, 0.5 + Math.random(), Math.cos(a) * r);
    s.scale.set(7 + Math.random() * 5, 2.6 + Math.random() * 1.6, 1);
    s.userData = { drift: 0.12 + Math.random() * 0.18 };
    group.add(s);
    mists.push(s);
  }

  // ---- 浮岛两座 ----
  const islands = [];
  for (const [x, y, z, s] of [[-17.5, 6.2, -10, 1], [16.5, 7.4, -13, 0.75]]) {
    const isl = new THREE.Group();
    const rock = new THREE.Mesh(
      new THREE.ConeGeometry(2.4, 3.6, 7),
      new THREE.MeshStandardMaterial({ color: 0x241840, roughness: 0.8, emissive: 0x6655aa, emissiveIntensity: 0.25 })
    );
    rock.rotation.x = Math.PI; // 倒锥，浮岛底尖朝下
    rock.position.y = -1.8;
    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(2.4, 2.55, 0.55, 7),
      new THREE.MeshStandardMaterial({ color: 0x2a1d4a, roughness: 0.8, emissive: 0xe8c97a, emissiveIntensity: 0.18 })
    );
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: softDisc("rgba(122,224,255,.3)", "rgba(122,224,255,0)"),
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    glow.position.y = -0.6;
    glow.scale.setScalar(5.5);
    isl.add(rock, top, glow);
    isl.scale.setScalar(s);
    isl.position.set(x, y, z);
    isl.userData = { baseY: y, phase: Math.random() * Math.PI * 2 };
    group.add(isl);
    islands.push(isl);
  }

  // ---- 环形柱廊：14 根矮柱把世界围成一圈 ----
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + 0.12;
    const r = 17;
    const p = new THREE.Group();
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.4, 4.6, 8),
      new THREE.MeshStandardMaterial({ color: 0x100a20, roughness: 0.8 })
    );
    col.position.y = 2.3;
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.4, 0.045, 6, 18),
      new THREE.MeshStandardMaterial({ color: 0xe8c97a, emissive: 0xe8c97a, emissiveIntensity: 0.55, roughness: 0.5 })
    );
    band.rotation.x = Math.PI / 2;
    band.position.y = 3.6;
    const orb = new THREE.Sprite(new THREE.SpriteMaterial({
      map: orbTex, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    orb.position.y = 5.0;
    orb.scale.setScalar(0.8);
    p.add(col, band, orb);
    p.position.set(Math.sin(a) * r, 0, Math.cos(a) * r);
    group.add(p);
  }

  // ---- 光链：相邻主柱柱顶之间垂一串光珠 ----
  const chainOrbs = [];
  const sorted = [...pillarTops].sort((p, q) => p.deg - q.deg);
  const pairs = [];
  for (let i = 0; i < sorted.length - 1; i++) pairs.push([sorted[i], sorted[i + 1]]);
  pairs.push([sorted[sorted.length - 1], sorted[0]]); // 跨正后方的收尾链
  for (const [A, B] of pairs) {
    const dist = Math.hypot(B.x - A.x, B.z - A.z);
    const sag = Math.min(1.6, dist * 0.14);
    const M = { x: (A.x + B.x) / 2, y: Math.min(A.y, B.y) - sag, z: (A.z + B.z) / 2 };
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const x = (1 - t) ** 2 * A.x + 2 * (1 - t) * t * M.x + t * t * B.x;
      const y = (1 - t) ** 2 * A.y + 2 * (1 - t) * t * M.y + t * t * B.y;
      const z = (1 - t) ** 2 * A.z + 2 * (1 - t) * t * M.z + t * t * B.z;
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: orbTex, transparent: true,
        color: i % 2 ? 0x9adfff : 0xffe9b8,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      s.position.set(x, y, z);
      s.scale.setScalar(0.3);
      s.userData = { baseY: y, phase: Math.random() * Math.PI * 2 };
      group.add(s);
      chainOrbs.push(s);
    }
  }

  // ---- 地面灵波：从法阵一圈圈向外扩散的涟漪 ----
  const ripples = [];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(0.94, 1.0, 64),
      new THREE.MeshBasicMaterial({
        color: 0xe8c97a, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.05 + i * 0.004;
    m.userData.offset = i * 1.4;
    group.add(m);
    ripples.push(m);
  }

  // ---- 符文石碑：后排立四座，碑面刻灵纹 ----
  const steleTex = (() => {
    const c = document.createElement("canvas");
    c.width = 64; c.height = 256;
    const ctx = c.getContext("2d");
    ctx.font = '34px "KaiTi", "STKaiti", serif';
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const runes = "天地玄黄宇宙洪荒";
    for (let i = 0; i < runes.length; i++) {
      ctx.shadowColor = "rgba(122,224,255,.9)";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#cdefff";
      ctx.fillText(runes[i], 32, 26 + i * 32);
    }
    return new THREE.CanvasTexture(c);
  })();
  for (const deg of [110, 140, -110, -140]) {
    const a = (deg * Math.PI) / 180;
    const x = Math.sin(a) * 8.2, z = Math.cos(a) * 8.2;
    const st = new THREE.Group();
    const stone = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 2.5, 0.32),
      new THREE.MeshStandardMaterial({ color: 0x171028, roughness: 0.75 })
    );
    stone.position.y = 1.25;
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 2.1),
      new THREE.MeshBasicMaterial({
        map: steleTex, transparent: true, opacity: 0.9,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    face.position.set(0, 1.25, 0.17);
    st.add(stone, face);
    st.position.set(x, 0, z);
    st.rotation.y = Math.atan2(-x, -z); // 碑面朝向阵心
    st.rotation.z = (Math.random() - 0.5) * 0.05;
    group.add(st);
  }

  // ---- 光蝶：绕着书阵飞舞的小光点 ----
  const flyTex = (() => {
    const c = document.createElement("canvas");
    c.width = 64; c.height = 48;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "rgba(255,255,255,.95)";
    ctx.shadowColor = "rgba(255,255,255,.9)";
    ctx.shadowBlur = 8;
    for (const dx of [-11, 11]) {
      ctx.beginPath();
      ctx.ellipse(32 + dx, 22, 12, 17, dx < 0 ? -0.5 : 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(255,255,255,.6)";
    ctx.beginPath();
    ctx.ellipse(32, 26, 2.4, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    return new THREE.CanvasTexture(c);
  })();
  const flies = [];
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: flyTex, transparent: true, opacity: 0.85,
      color: i % 2 ? 0x9adfff : 0xffd98a,
      depthWrite: false,
    }));
    s.userData = {
      r: 3 + Math.random() * 1.8,
      a: Math.random() * Math.PI * 2,
      sp: (0.25 + Math.random() * 0.3) * (i % 2 ? 1 : -1),
      h: 1.6 + Math.random() * 1.6,
      bob: Math.random() * Math.PI * 2,
      fl: Math.random() * Math.PI * 2,
    };
    group.add(s);
    flies.push(s);
  }

  function update(t, dt) {
    // 柱顶灵珠呼吸
    for (const orb of orbs) {
      orb.material.opacity = 0.75 + Math.sin(t * 2 + orb.userData.phase) * 0.2;
      orb.scale.setScalar(1.5 + Math.sin(t * 2 + orb.userData.phase) * 0.18);
    }
    // 浑天双环缓转
    ring1.rotation.z += dt * 0.02;
    ring2.rotation.z -= dt * 0.015;
    // 花瓣飘落：左右摇曳 + 自转，落到地面回顶端；贴脸时淡出
    for (const s of petals) {
      const u = s.userData;
      s.position.y -= u.speed * dt;
      s.position.x += Math.sin(t * 0.8 + u.sway) * u.swayAmp * dt;
      s.material.rotation += u.rot * dt;
      if (s.position.y < 0.15) {
        s.position.set((Math.random() - 0.5) * 22, 8 + Math.random() * 2, (Math.random() - 0.5) * 22);
      }
      const d = camera.position.distanceTo(s.position);
      s.material.opacity = 0.75 * THREE.MathUtils.clamp((d - 0.5) / 1.0, 0, 1);
    }
    // 云雾漂移
    for (const s of mists) {
      s.position.x += s.userData.drift * dt;
      if (s.position.x > 24) s.position.x = -24;
    }
    // 浮岛沉浮
    for (const isl of islands) {
      isl.position.y = isl.userData.baseY + Math.sin(t * 0.3 + isl.userData.phase) * 0.45;
      isl.rotation.y += dt * 0.05;
    }
    // 光链光珠明灭 + 轻坠；贴到相机眼前时淡出，避免糊成一片白光
    for (const s of chainOrbs) {
      s.position.y = s.userData.baseY + Math.sin(t * 1.1 + s.userData.phase) * 0.08;
      const d = camera.position.distanceTo(s.position);
      const near = THREE.MathUtils.clamp((d - 0.8) / 1.8, 0, 1);
      s.material.opacity = (0.55 + Math.sin(t * 2.2 + s.userData.phase) * 0.3) * near;
    }
    // 灵波扩散：一圈由法阵涌向四周
    for (const m of ripples) {
      const cyc = 4.2;
      const k = ((t + m.userData.offset) % cyc) / cyc;
      const sc = 2.5 + k * 13;
      m.scale.set(sc, sc, 1);
      m.material.opacity = (1 - k) * (1 - k) * 0.3;
    }
    // 光蝶绕场飞舞，扑翼；飘到相机眼前时淡出（否则贴近会糊成一片白光）
    for (const s of flies) {
      const u = s.userData;
      u.a += u.sp * dt;
      u.fl += dt * 13;
      s.position.set(
        Math.cos(u.a) * u.r,
        u.h + Math.sin(t * 1.1 + u.bob) * 0.35,
        Math.sin(u.a) * u.r
      );
      s.scale.set(0.34 * (0.3 + 0.7 * Math.abs(Math.sin(u.fl))), 0.26, 1);
      const d = camera.position.distanceTo(s.position);
      s.material.opacity = 0.85 * THREE.MathUtils.clamp((d - 0.9) / 1.4, 0, 1);
    }
  }

  return { group, update };
}
