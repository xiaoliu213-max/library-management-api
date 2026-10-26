// ===== 三维灵境：场景、灯光、星空、灵气、法阵、相机 =====
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const OVERVIEW = {
  // 站在环形书库圆心附近（书架墙 r=8），环视典籍
  pos: new THREE.Vector3(0, 3.4, 2.6),
  target: new THREE.Vector3(0, 2.9, 0),
};

function radialTexture(inner, outer) {
  // 生成一张中心亮、四周透明的径向渐变贴图（给光晕/星云用）
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

function magicCircleTexture() {
  // 地面法阵：同心圆 + 环形符文 + 内阵星轨
  const S = 1024, R = S / 2;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d");
  ctx.translate(R, R);
  ctx.lineCap = "round";

  const ring = (r, width, color, dash = []) => {
    ctx.beginPath();
    ctx.setLineDash(dash);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  ring(480, 6, "#ffd98a");
  ring(430, 2, "#7ae0ff", [26, 18]);
  ring(300, 3, "#ffd98a");
  ring(180, 2, "#7ae0ff");

  // 环形符文
  const runes = "灵书阁天地玄黄宇宙洪荒日月乾坤万卷藏真";
  ctx.font = '44px "KaiTi", "STKaiti", serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "#ffd98a";
  ctx.shadowBlur = 16;
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    ctx.save();
    ctx.rotate(a);
    ctx.fillStyle = i % 2 ? "#ffd98a" : "#9adfff";
    ctx.fillText(runes[i % runes.length], 0, -365);
    ctx.restore();
  }

  // 内阵：双三角六芒星
  ctx.shadowBlur = 20;
  ctx.strokeStyle = "#9adfff";
  ctx.lineWidth = 3;
  for (const offset of [0, Math.PI / 3]) {
    ctx.beginPath();
    for (let i = 0; i <= 3; i++) {
      const a = offset + (i / 3) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(a) * 170, y = Math.sin(a) * 170;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.strokeStyle = "#ffd98a";
  ctx.lineWidth = 2;
  ctx.arc(0, 0, 60, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#ffe9b8";
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeStars(count, size, color, radius) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // 均匀撒在一个球壳上
    const r = radius * (0.7 + Math.random() * 0.3);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i * 3 + 2] = r * Math.cos(phi);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    size, color, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  return new THREE.Points(geo, mat);
}

function runeTexture(char) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  ctx.font = '64px "KaiTi", "STKaiti", serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(255,217,138,.9)";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#ffe9b8";
  ctx.fillText(char, 64, 64);
  return new THREE.CanvasTexture(c);
}

// ===== 玄关传送门：未登录时的"封面页"场景 =====
function createGate(circleTex) {
  const group = new THREE.Group();
  const C = new THREE.Vector3(0, 2.9, -9); // 传送门中心

  const mkRing = (scale, opacity) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10),
      new THREE.MeshBasicMaterial({
        map: circleTex, transparent: true, opacity,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      })
    );
    m.position.copy(C);
    m.scale.setScalar(scale);
    group.add(m);
    return m;
  };
  const ringA = mkRing(0.72, 0.9);
  const ringB = mkRing(0.42, 0.55);

  // 传送门光核：绯红入紫，和藏书阁的金青区分开
  const core = new THREE.Sprite(new THREE.SpriteMaterial({
    map: radialTexture("rgba(255,150,170,.6)", "rgba(110,50,220,0)"),
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  core.position.copy(C);
  core.scale.setScalar(5.5);
  group.add(core);

  // 环绕符文
  const runes = [];
  const chars = "灵书阁天地玄黄宇宙洪荒日月乾坤".split("");
  chars.forEach((ch, i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: runeTexture(ch), transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    s.scale.setScalar(0.55 + Math.random() * 0.25);
    s.userData = {
      angle: (i / chars.length) * Math.PI * 2,
      speed: 0.12 + Math.random() * 0.15,
      r: 4.6 + Math.random() * 1.2,
      bob: Math.random() * Math.PI * 2,
    };
    group.add(s);
    runes.push(s);
  });

  function update(t, dt) {
    ringA.rotation.z += dt * 0.06;
    ringB.rotation.z -= dt * 0.1;
    // 光核克制一点：它身后是题字，太亮会淹没文字
    core.material.opacity = 0.34 + Math.sin(t * 1.6) * 0.09;
    core.scale.setScalar(4.4 + Math.sin(t * 1.6) * 0.25);
    for (const s of runes) {
      const { angle, speed, r, bob } = s.userData;
      s.userData.angle = angle + speed * dt;
      s.position.set(
        C.x + Math.cos(s.userData.angle) * r,
        C.y + Math.sin(s.userData.angle) * r * 0.5 + Math.sin(t * 0.8 + bob) * 0.25,
        C.z + Math.sin(s.userData.angle * 2) * 0.8
      );
      s.material.rotation = Math.sin(t * 0.5 + bob) * 0.3;
    }
  }

  return { group, update };
}

export function createScene(container) {
  const renderer = new THREE.WebGLRenderer({ canvas: container, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050310);
  scene.fog = new THREE.FogExp2(0x050310, 0.028);

  const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 200);
  camera.position.copy(OVERVIEW.pos);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(OVERVIEW.target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 1.8;
  controls.maxDistance = 6.2; // 别撞穿书架墙（r=8）
  // 俯仰不设上限制（配合每帧的离地钳制），抬头看高层书架不受阻
  controls.maxPolarAngle = Math.PI - 0.06;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.4;

  // ---- 灯光 ----
  scene.add(new THREE.AmbientLight(0x6655aa, 1.05));
  const keyLight = new THREE.PointLight(0xffcc77, 90, 40);
  keyLight.position.set(0, 6.5, 3.5);
  scene.add(keyLight);
  const rimLight = new THREE.PointLight(0x66ccff, 55, 35);
  rimLight.position.set(-6, 3, -4);
  scene.add(rimLight);

  // ---- 远景星云（三团大光晕） ----
  const nebulaSpecs = [
    ["rgba(120,60,220,.20)", "rgba(120,60,220,0)", new THREE.Vector3(-9, 5, -16), 26],
    ["rgba(200,120,60,.16)", "rgba(200,120,60,0)", new THREE.Vector3(10, -2, -14), 22],
    ["rgba(60,140,220,.15)", "rgba(60,140,220,0)", new THREE.Vector3(2, 8, -18), 28],
  ];
  for (const [inner, outer, position, scale] of nebulaSpecs) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: radialTexture(inner, outer),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    sprite.position.copy(position);
    sprite.scale.setScalar(scale);
    scene.add(sprite);
  }

  // ---- 星空（两层反向缓转） ----
  const starsA = makeStars(1400, 0.16, 0xcdd8ff, 70);
  const starsB = makeStars(500, 0.28, 0xffe2b0, 55);
  scene.add(starsA, starsB);

  // ---- 灵气尘埃（缓缓上升的金色微粒） ----
  const DUST = 220;
  const dustPos = new Float32Array(DUST * 3);
  const dustSeed = new Float32Array(DUST);
  for (let i = 0; i < DUST; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 18;
    dustPos[i * 3 + 1] = Math.random() * 8;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 18;
    dustSeed[i] = 0.15 + Math.random() * 0.4;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    size: 0.07, color: 0xffd27a, transparent: true, opacity: 0.7,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  scene.add(dust);

  // ---- 地面法阵（两层反向旋转） ----
  const circleTex = magicCircleTexture();
  const circleA = new THREE.Mesh(
    new THREE.PlaneGeometry(13, 13),
    new THREE.MeshBasicMaterial({
      map: circleTex, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    })
  );
  circleA.rotation.x = -Math.PI / 2;
  circleA.position.y = 0.01;
  const circleB = circleA.clone();
  circleB.material = circleA.material.clone();
  circleB.material.opacity = 0.35;
  circleB.position.y = 0.02;
  circleB.scale.setScalar(0.62);
  scene.add(circleA, circleB);

  // ---- 玄关传送门（未登录封面页；默认隐藏，由阶段切换控制） ----
  const gate = createGate(circleTex);
  gate.group.visible = false;
  scene.add(gate.group);

  // ---- 泛光后处理 ----
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.72, 0.5, 0.32);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ---- 自定义滚轮（仅书库阶段）：朝注视方向推进/后退，能一直凑近书墙 ----
  // 轨道缩放沿着"相机↔房间中心"轴线推拉，人站在圆心永远凑不近墙；改成视向行走
  const ROOM_MAX_R = 7.25; // 书架墙(r=8)内侧的安全半径
  renderer.domElement.addEventListener("wheel", (e) => {
    if (gate.group.visible) return; // 玄关走默认轨道缩放
    e.preventDefault();
    const viewDir = new THREE.Vector3().subVectors(controls.target, camera.position).normalize();
    const dist = camera.position.distanceTo(controls.target);
    const step = THREE.MathUtils.clamp(dist * 0.12, 0.25, 1.5);
    camera.position.addScaledVector(viewDir, e.deltaY < 0 ? step : -step);

    // 安全约束：别穿出书架墙、别钻地、别上天
    const r = Math.hypot(camera.position.x, camera.position.z);
    if (r > ROOM_MAX_R) {
      const k = ROOM_MAX_R / r;
      camera.position.x *= k;
      camera.position.z *= k;
    }
    camera.position.y = THREE.MathUtils.clamp(camera.position.y, 0.6, 9.4);

    // 离房间中心太远后，把旋转轴心挪到眼前——拖转时绕着你看的书转
    const newDist = camera.position.distanceTo(controls.target);
    if (newDist > 5.5 || newDist < 2.2) {
      const t = camera.position.clone().addScaledVector(viewDir, 4);
      const tr = Math.hypot(t.x, t.z);
      if (tr > 6.4) {
        const k2 = 6.4 / tr;
        t.x *= k2;
        t.z *= k2;
      }
      controls.target.copy(t);
    }
  }, { passive: false });

  // ---- 相机飞行（点击典籍时缓缓推近） ----
  const fly = { active: false, t: 0, dur: 1.1, fromPos: new THREE.Vector3(), toPos: new THREE.Vector3(), fromTar: new THREE.Vector3(), toTar: new THREE.Vector3() };
  const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

  function flyTo(pos, target) {
    fly.fromPos.copy(camera.position);
    fly.toPos.copy(pos);
    fly.fromTar.copy(controls.target);
    fly.toTar.copy(target);
    fly.t = 0;
    fly.active = true;
    controls.autoRotate = false;
  }

  function resetView() {
    flyTo(OVERVIEW.pos, OVERVIEW.target);
  }

  // ---- 每帧回调 ----
  const frameCbs = [];
  const clock = new THREE.Clock();
  let keyBase = 90;    // 主光呼吸基准
  let groundDim = 1;   // 地面法阵亮度系数

  // 阶段切换：'gate' = 玄关封面页（未登录）；'library' = 藏书阁
  function applyPhase(phase) {
    const gateMode = phase === "gate";
    gate.group.visible = gateMode;
    keyBase = gateMode ? 48 : 72;
    groundDim = gateMode ? 0.3 : 1;
    // 两个阶段的背景都不自动旋转，固定机位，用户可手动拖转
    controls.autoRotate = false;
    // 书库阶段用自定义滚轮（朝注视方向推进），玄关保留轨道缩放
    controls.enableZoom = gateMode;
    if (gateMode) {
      camera.position.set(0, 3.1, -1.4);
      controls.target.set(0, 2.9, -9);
    } else {
      camera.position.copy(OVERVIEW.pos);
      controls.target.copy(OVERVIEW.target);
    }
    controls.update();
  }

  function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();
    const t = clock.elapsedTime;

    starsA.rotation.y += dt * 0.005;
    starsB.rotation.y -= dt * 0.008;

    // 灵气上升，超出后从底部重来
    const arr = dustGeo.attributes.position.array;
    for (let i = 0; i < DUST; i++) {
      arr[i * 3 + 1] += dustSeed[i] * dt;
      if (arr[i * 3 + 1] > 8) arr[i * 3 + 1] = 0;
      arr[i * 3] += Math.sin(t * 0.6 + i) * 0.0012;
    }
    dustGeo.attributes.position.needsUpdate = true;

    circleA.rotation.z += dt * 0.05;
    circleB.rotation.z -= dt * 0.09;
    circleA.material.opacity = (0.8 + Math.sin(t * 1.4) * 0.15) * groundDim;
    circleB.material.opacity = 0.35 * groundDim;

    keyLight.intensity = keyBase + Math.sin(t * 1.8) * 9; // 灯光微微呼吸

    if (gate.group.visible) gate.update(t, dt);

    if (fly.active) {
      fly.t += dt / fly.dur;
      const k = easeInOut(Math.min(fly.t, 1));
      camera.position.lerpVectors(fly.fromPos, fly.toPos, k);
      controls.target.lerpVectors(fly.fromTar, fly.toTar, k);
      if (fly.t >= 1) fly.active = false;
    }
    controls.update();
    // 离地钳制：允许相机沉到目标下方抬头看高层，但别钻进地板
    if (camera.position.y < 0.45) camera.position.y = 0.45;

    for (const cb of frameCbs) cb(t, dt);
    composer.render();
  }

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
  });

  animate();

  return { renderer, scene, camera, controls, onFrame: (cb) => frameCbs.push(cb), flyTo, resetView, applyPhase, OVERVIEW };
}
