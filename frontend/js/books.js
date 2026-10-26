// ===== 典籍的具象化：封面、悬浮灵体、拾取与排布 =====
import * as THREE from "three";

// 环形书库的结构参数（单页容量 = COLS × ROWS = 220 卷，更多卷数由 main.js 分页）
const SHELF = { COLS: 44, ROWS: 5, RADIUS: 8, Y0: 1.8, PITCH: 1.75, SCALE: 0.78 };

// 类别名 → 稳定色相（同一个类别永远同色）
const hueCache = new Map();
function hueFor(name) {
  if (!hueCache.has(name)) {
    let h = 0;
    for (const ch of name) h = (h * 31 + ch.codePointAt(0)) % 360;
    hueCache.set(name, h);
  }
  return hueCache.get(name);
}

// 封面版面分区（逻辑坐标 256×384）——三块互不越界：
//   印记条 0..56 / 书名区 74..306 / 作者栏 342
// 书名无论多长都只在中间那块里排，印记永远独占最顶端一条
const FONT = '"KaiTi", "STKaiti", "Songti SC", "SimSun", serif';
const LAYOUT = {
  bandH: 56,        // 顶部印记条高度（独立区）
  stampY: 33,       // 印记文字中心
  titleTop: 74,     // 书名区上沿
  titleBottom: 306, // 书名区下沿
  authorY: 342,     // 作者栏
};
// 行首不该出现的标点：折行时粘回上一个词末尾，避免"：从入门到实践"这种断法
const NO_LINE_START = "：:，,。.、；;！!？?）)》」』】…·—~～";

// 拆词：连续拉丁字母/数字算一个整体（HTTP、JavaScript 不能被拦腰折断）
function tokenize(text) {
  const tokens = [];
  let word = "";
  for (const ch of text) {
    if (/[0-9A-Za-z]/.test(ch)) {
      word += ch;
      continue;
    }
    if (word) { tokens.push(word); word = ""; }
    if (ch === " " || ch === "\u3000") continue;
    if (NO_LINE_START.includes(ch) && tokens.length) tokens[tokens.length - 1] += ch;
    else tokens.push(ch);
  }
  if (word) tokens.push(word);
  return tokens;
}

// 把词分成 maxLines 行：枚举断点，取"最宽的一行最窄"的方案（行数 ≤3、词数不多，暴力足够）
function balanceLines(tokens, widths, maxLines) {
  const n = tokens.length;
  if (n <= maxLines) return tokens.slice();
  let best = null;
  const cuts = [];
  const dfs = (start, depth) => {
    if (depth === maxLines - 1) {
      cuts.push(n);
      const segs = [];
      let prev = 0;
      for (const c of cuts) { segs.push([prev, c]); prev = c; }
      const cost = Math.max(...segs.map(([a, b]) => widths.slice(a, b).reduce((x, y) => x + y, 0)));
      if (!best || cost < best.cost) best = { cost, segs };
      cuts.pop();
      return;
    }
    for (let i = start + 1; i <= n - (maxLines - 1 - depth); i++) {
      cuts.push(i);
      dfs(i, depth + 1);
      cuts.pop();
    }
  };
  dfs(0, 0);
  return best.segs.map(([a, b]) => tokens.slice(a, b).join(""));
}

function drawCover(book, c) {
  // 逻辑坐标 256x384，实际 1.25 倍超采样（220 张贴图的显存/上传开销与清晰度的平衡点）
  const W = 256, H = 384, S = 1.25;
  c.width = W * S; c.height = H * S;
  const ctx = c.getContext("2d");
  ctx.scale(S, S);

  const hue = hueFor(book.category?.name || "杂录");
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, `hsl(${hue}, 45%, 11%)`);
  bg.addColorStop(1, `hsl(${(hue + 40) % 360}, 48%, 6%)`);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // 类别色光晕（只铺书名区，别把印记条冲淡）
  const glow = ctx.createRadialGradient(W / 2, H * 0.42, 10, W / 2, H * 0.42, 190);
  glow.addColorStop(0, `hsla(${hue}, 80%, 60%, .28)`);
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // 顶部印记条：压暗一层 + 下沿金线，把"类别区"和"书名区"从视觉上切开
  ctx.fillStyle = "rgba(8, 4, 16, .42)";
  ctx.fillRect(10, 10, W - 20, LAYOUT.bandH - 10);
  ctx.strokeStyle = "rgba(232,201,122,.55)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(20, LAYOUT.bandH);
  ctx.lineTo(W - 20, LAYOUT.bandH);
  ctx.stroke();

  // 双层金边 + 四角饰纹
  ctx.strokeStyle = "rgba(232,201,122,.9)";
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, W - 20, H - 20);
  ctx.strokeStyle = "rgba(232,201,122,.35)";
  ctx.lineWidth = 1;
  ctx.strokeRect(18, 18, W - 36, H - 36);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowBlur = 0;
  const setFont = (size) => { ctx.font = `${size}px ${FONT}`; };
  const strokeFill = (text, x, y, size, color) => {
    setFont(size);
    ctx.lineWidth = Math.max(2.5, size * 0.07);
    ctx.strokeStyle = "rgba(14, 9, 26, .9)";
    ctx.fillStyle = color;
    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
  };
  // 单行文字超宽时缩字号（类别名、作者名可能很长）
  const fitSize = (text, size, maxW, min = 12) => {
    let s = size;
    setFont(s);
    while (s > min && ctx.measureText(text).width > maxW) setFont(--s);
    return s;
  };

  // ---- 书名：≤8 字竖排（按可用高度自适应缩放），长名转横排 ----
  const title = book.title || "无名典籍";
  const chars = [...title];
  const zoneH = LAYOUT.titleBottom - LAYOUT.titleTop;
  const maxTextW = W - 64;
  // 含连续两个以上拉丁字母/数字（HTTP、3D）时竖排会变成一列字母，改走横排
  const hasWordRun = /[0-9A-Za-z]{2,}/.test(title);

  if (chars.length <= 8 && !hasWordRun) {
    // 竖排：整块（含字高）在书名区内垂直居中，字号由"可用高度 ÷ 字数"倒推
    const track = 1.16;
    let fs = Math.floor(zoneH / (chars.length * track + 0.16));
    fs = Math.max(20, Math.min(fs, 56, Math.floor(W * 0.6)));
    // 兜底：极端字号下也保证整块不越界
    if (fs * track * (chars.length - 1) + fs > zoneH) {
      fs = Math.floor(zoneH / ((chars.length - 1) * track + 1));
    }
    const step = fs * track;
    const blockH = step * (chars.length - 1) + fs;
    const firstY = LAYOUT.titleTop + (zoneH - blockH) / 2 + fs / 2;
    chars.forEach((ch, i) => strokeFill(ch, W / 2, firstY + i * step, fs, "#fff6dc"));
  } else {
    // 横排：按词均分成 2 行（>18 字 3 行），字号由"最宽一行"反推，再受行高约束
    const tokens = tokenize(title);
    setFont(100);
    const widths = tokens.map((tk) => ctx.measureText(tk).width);
    const maxLines = chars.length > 18 ? 3 : 2;
    const lines = balanceLines(tokens, widths, maxLines);
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    const fsW = Math.floor((maxTextW * 100) / Math.max(widest, 1));
    const fsH = Math.floor(zoneH / (1.34 * (lines.length - 1) + 1));
    const fs = Math.max(12, Math.min(34, fsW, fsH));
    const step = fs * 1.34;
    const blockH = step * (lines.length - 1) + fs;
    const firstY = LAYOUT.titleTop + (zoneH - blockH) / 2 + fs / 2;
    lines.forEach((l, i) => strokeFill(l, W / 2, firstY + i * step, fs, "#fff6dc"));
  }

  // ---- 顶部类别印记（独占最顶端一条）+ 底部作者 ----
  const cat = book.category?.name || "杂录";
  strokeFill(cat, W / 2, LAYOUT.stampY, fitSize(cat, 21, W - 48), `hsl(${hue}, 85%, 80%)`);
  const author = book.author || "佚名";
  strokeFill(author, W / 2, LAYOUT.authorY, fitSize(author, 21, W - 56), "rgba(240, 222, 180, .95)");

  return c;
}

function makeCoverTexture(book) {
  const tex = new THREE.CanvasTexture(drawCover(book, document.createElement("canvas")));
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 没有真封面图时的兜底：把生成的玄幻封面导出成 dataURL 给详情面板用
export function coverDataURL(book) {
  return drawCover(book, document.createElement("canvas")).toDataURL("image/jpeg", 0.85);
}

let glowTex = null;
function getGlowTexture() {
  if (!glowTex) {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,255,255,.9)");
    g.addColorStop(0.4, "rgba(255,255,255,.25)");
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    glowTex = new THREE.CanvasTexture(c);
  }
  return glowTex;
}

// ===== 典籍封面贴图（带缓存：翻页/刷新不重绘） =====
const coverCache = new Map();
function getCoverTexture(book) {
  const key = `${book.id}:${book.title}`;
  if (!coverCache.has(key)) {
    if (coverCache.size > 240) clearCoverCache();
    coverCache.set(key, makeCoverTexture(book));
  }
  return coverCache.get(key);
}
function clearCoverCache() {
  for (const t of coverCache.values()) t.dispose();
  coverCache.clear();
}

class BookVisual {
  constructor(book) {
    this.book = book;
    this.group = new THREE.Group();

    const hue = hueFor(book.category?.name || "杂录");

    // 封面：MeshBasicMaterial = 不参与任何光照计算，画成什么色就显示什么色，
    // 彻底没有点光源的高光/反射（书名不再被灯光糊住）
    const coverTex = getCoverTexture(book);
    const coverMat = new THREE.MeshBasicMaterial({ map: coverTex });
    // 书脊与纸页仍走 PBR，保留光影立体感
    const pageMat = new THREE.MeshStandardMaterial({ color: 0xd8c9a3, roughness: 0.9 });
    const spineMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(hue / 360, 0.45, 0.22), roughness: 0.5, metalness: 0.2,
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.9, 0.3), [pageMat, spineMat, pageMat, pageMat, coverMat, coverMat]);
    mesh.userData.visual = this;
    this.mesh = mesh;
    this.group.add(mesh);

    // 书格背板：一块暗色底板垫在书后，把封面从明亮的柱子/光链背景里衬出来
    const backboard = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 2.4),
      new THREE.MeshBasicMaterial({ color: 0x0c0716, transparent: true, opacity: 0.88 })
    );
    backboard.position.set(0, 0, -0.34);
    this.backboard = backboard;
    this.group.add(backboard);
    // 灵体光晕
    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: getGlowTexture(),
      color: new THREE.Color().setHSL(hue / 360, 0.9, 0.6),
      transparent: true, opacity: 0.3,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.glow.scale.setScalar(3.1);
    this.group.add(this.glow);

    // 悬浮动画参数
    this.baseY = 2.05;
    this.phase = Math.random() * Math.PI * 2;
    this.hoverT = 0; // 0 = 常态，1 = 悬停/选中
  }

  setSelected(v) {
    this.selected = v;
  }

  update(t, dt, camera) {
    this.group.position.y = this.baseY + Math.sin(t * 0.9 + this.phase) * 0.09;

    const target = this.selected || this.hovered ? 1 : 0;
    this.hoverT += (target - this.hoverT) * Math.min(dt * 8, 1);

    const s = 1 + this.hoverT * 0.12;
    this.mesh.scale.setScalar(s);
    // 光晕在相机贴近时淡出，否则近观时会糊满整个屏幕
    const camDist = camera.position.distanceTo(this.group.position);
    const near = THREE.MathUtils.clamp((camDist - 1.0) / 1.2, 0, 1);
    this.glow.material.opacity = (0.2 + this.hoverT * 0.2) * near;
    this.glow.scale.setScalar(3.1 + this.hoverT * 0.45);
  }

  dispose() {
    this.mesh.geometry.dispose();
    (Array.isArray(this.mesh.material) ? this.mesh.material : [this.mesh.material]).forEach((m) => m.dispose());
    this.glow.material.dispose();
    this.backboard.geometry.dispose();
    this.backboard.material.dispose();
    // 封面贴图归缓存所有，不在这里销毁
  }
}

export class BookShelf {
  // ===== 环形书库：典籍立在内壁书架上围成一圈 =====
  // 容量 = COLS × ROWS（单页上限），更多卷数由外层分页，理论上可容纳数千卷
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.visuals = [];

    // 每层书架一圈微光结构环
    for (let r = 0; r < SHELF.ROWS; r++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(SHELF.RADIUS, 0.03, 6, 96),
        new THREE.MeshBasicMaterial({
          color: 0xe8c97a, transparent: true, opacity: 0.16,
          blending: THREE.AdditiveBlending, depthWrite: false,
        })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = SHELF.Y0 + r * SHELF.PITCH - 0.78;
      this.group.add(ring);
    }
  }

  rebuild(books) {
    for (const v of this.visuals) {
      this.group.remove(v.group);
      v.dispose();
    }
    this.visuals = [];

    const { COLS, RADIUS, Y0, PITCH } = SHELF;
    books.forEach((b, i) => {
      const v = new BookVisual(b);
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      // 从正对默认机位的背面弧段起排：翻页后新上墙的书正好在眼前
      const a = Math.PI + (col / COLS) * Math.PI * 2;
      const y = Y0 + row * PITCH + (Math.random() - 0.5) * 0.07;
      v.baseY = y;
      v.group.scale.setScalar(SHELF.SCALE);
      v.group.position.set(Math.sin(a) * RADIUS, y, Math.cos(a) * RADIUS);
      v.group.rotation.y = a + Math.PI; // 封面朝阵心
      v.group.rotation.z = (Math.random() - 0.5) * 0.05;
      this.visuals.push(v);
      this.group.add(v.group);
    });
  }

  update(t, dt, camera) {
    for (const v of this.visuals) v.update(t, dt, camera);
  }

  get meshes() {
    return this.visuals.map((v) => v.mesh);
  }

  findVisual(bookId) {
    return this.visuals.find((v) => v.book.id === bookId) || null;
  }

  setHovered(visual) {
    for (const v of this.visuals) v.hovered = v === visual;
  }

  setSelectedId(bookId) {
    for (const v of this.visuals) v.setSelected(v.book.id === bookId);
  }

  visualPosition(bookId) {
    const v = this.findVisual(bookId);
    if (!v) return null;
    // 组是被旋转过的，取世界坐标（相机飞行需要世界系）
    this.group.updateMatrixWorld(true);
    return v.group.getWorldPosition(new THREE.Vector3());
  }
}
