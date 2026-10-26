// ===== 灵书阁主控：把场景、典籍、界面、后端串起来 =====
import * as THREE from "three";
import { api } from "./api.js?v=4";
import { createScene } from "./scene.js?v=4";
import { BookShelf } from "./books.js?v=4";
import { createEnvironment } from "./environment.js?v=4";
import { initGateTitle } from "./gate-title.js?v=4";
import { ui } from "./ui.js?v=4";

const stage = document.getElementById("stage");
const { renderer, scene, camera, onFrame, flyTo, resetView, applyPhase, controls } = createScene(stage);

const shelf = new BookShelf(scene, camera);
const environment = createEnvironment(scene, camera);
initGateTitle();

// ---------- 阶段（玄关 / 藏书阁） ----------
let phase = null;
const flashEl = document.getElementById("flash");

function setPhase(next, { animate = true } = {}) {
  if (phase === next) {
    ui.setPhase(next); // 阶段没变也要保证界面状态同步（幂等）
    return;
  }
  phase = next;
  ui.setPhase(next);
  const apply = () => {
    shelf.group.visible = next === "library";
    applyPhase(next);
  };
  if (animate) {
    // 金光一闪，瞬间换景
    flashEl.classList.add("on");
    setTimeout(() => {
      apply();
      flashEl.classList.remove("on");
    }, 340);
  } else {
    apply();
  }
}

let books = [];
let selectedId = null;
let query = { keyword: "", category: "", sort: "" };
const allCategories = new Set(); // 跨刷新累积，类别下拉永远完整

// ---------- 数据 ----------
const PAGE_SIZE = 220; // 单页上墙卷数（= 书库容量 COLS×ROWS），更多分页
let wallPage = 1;
let totalPages = 1;

// 千卷级书库：按 100/页把所有卷拉齐，再按类别归堆排序（同类相邻 → 墙上形成色带）
async function fetchAllBooks() {
  const first = await api.listBooks({ ...query, page: 1, size: 100 });
  const items = [...first.items];
  const pages = Math.ceil(first.total / 100);
  for (let p = 2; p <= pages; p++) {
    const more = await api.listBooks({ ...query, page: p, size: 100 });
    items.push(...more.items);
  }
  items.sort((a, b) =>
    (a.category?.name || "杂录").localeCompare(b.category?.name || "杂录", "zh") ||
    (a.title || "").localeCompare(b.title || "", "zh"));
  return { total: first.total, items };
}

async function refresh() {
  const { total, items } = await fetchAllBooks();
  books = items;
  ui.setCount(total);
  ui.setEmpty(total === 0, Boolean(query.keyword || query.category || query.sort));
  for (const b of books) if (b.category?.name) allCategories.add(b.category.name);
  ui.setCategories([...allCategories].sort());
  totalPages = Math.max(1, Math.ceil(books.length / PAGE_SIZE));
  wallPage = Math.min(Math.max(1, wallPage), totalPages);
  ui.setPager(wallPage, totalPages);
  shelf.rebuild(books.slice((wallPage - 1) * PAGE_SIZE, wallPage * PAGE_SIZE));
  if (selectedId != null) {
    const still = shelf.findVisual(selectedId);
    if (still) {
      shelf.setSelectedId(selectedId);
      ui.showDetail(still.book);
    } else {
      selectedId = null;
      ui.closeDetail();
      resetView();
    }
  }
}

// ---------- 拾取：悬停 + 点击 ----------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let hovered = null;
let downPos = null;

function pick(e) {
  if (!shelf.group.visible) return null; // 玄关阶段没有典籍可点
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(shelf.meshes, false)[0];
  return hit?.object.userData.visual || null;
}

renderer.domElement.addEventListener("pointermove", (e) => {
  const visual = pick(e);
  if (visual !== hovered) {
    hovered = visual;
    shelf.setHovered(visual);
    renderer.domElement.style.cursor = visual ? "pointer" : "grab";
  }
  ui.tooltipAt(e.clientX, e.clientY, visual?.book.title || null);
});

renderer.domElement.addEventListener("pointerdown", (e) => {
  downPos = [e.clientX, e.clientY];
  renderer.domElement.style.cursor = "grabbing";
});
renderer.domElement.addEventListener("pointerup", (e) => {
  renderer.domElement.style.cursor = hovered ? "pointer" : "grab";
  // 拖拽视角不算点击：按下和松开距离小于 5px 才算
  if (!downPos || Math.hypot(e.clientX - downPos[0], e.clientY - downPos[1]) > 5) return;
  const visual = pick(e);
  if (visual) selectBook(visual.book.id);
  else if (selectedId != null) closeDetail(); // 点空处 = 收起古卷
});

// 双击空地：视角飞回全景归位
renderer.domElement.addEventListener("dblclick", (e) => {
  if (!pick(e)) {
    closeDetail();
    resetView();
  }
});

function selectBook(bookId) {
  selectedId = bookId;
  const visual = shelf.findVisual(bookId);
  if (!visual) return;
  shelf.setSelectedId(bookId);
  ui.showDetail(visual.book);
  const pos = shelf.visualPosition(bookId);
  const toBook = new THREE.Vector3().subVectors(pos, camera.position).normalize();
  const camDir = new THREE.Vector3().subVectors(camera.position, pos).normalize();
  // 详情面板占屏幕右侧，把对焦落点整体右移，让书停在画面左 2/3 区
  const right = new THREE.Vector3().crossVectors(toBook, new THREE.Vector3(0, 1, 0));
  if (right.lengthSq() > 0.01) {
    right.normalize().multiplyScalar(0.9);
  } else {
    right.set(0, 0, 0);
  }
  const camPos = pos.clone().addScaledVector(camDir, 2.8).add(new THREE.Vector3(0, 0.25, 0)).add(right);
  if (camPos.length() > 7.3) camPos.setLength(7.3); // 别撞穿书架墙
  flyTo(camPos, pos.clone().add(right));
}

function closeDetail() {
  selectedId = null;
  shelf.setSelectedId(null);
  ui.closeDetail();
  resetView();
}

// ---------- 登录 ----------
async function doLogin(username, password) {
  if (!username || !password) return ui.authMsg("道号与口令都要填");
  ui.authMsg("");
  try {
    const token = await api.login(username, password);
    api.setToken(token.access_token);
    ui.setUser(api.tokenUser() || username);
    ui.toast(`灵契已缔结 · 欢迎, ${api.tokenUser() || username}`);
    setPhase("library");
  } catch (err) {
    ui.authMsg(err.message);
  }
}

function doLogout() {
  api.setToken(null);
  ui.setUser(null);
  selectedId = null;
  shelf.setSelectedId(null);
  ui.toast("灵契已断开");
  setPhase("gate");
}

// ---------- 注册（录入道籍） ----------
async function doRegister(username, password, password2) {
  if (!username || !password || !password2) return ui.authMsg("道号与口令都要填");
  if (username.length < 3) return ui.authMsg("道号至少 3 个字符");
  if (password.length < 6) return ui.authMsg("口令至少 6 位");
  if (password !== password2) return ui.authMsg("两次口令不一致");
  ui.authMsg("");
  try {
    await api.register({ username, password });
    // 注册成功直接替他缔结灵契，省一次输入
    const token = await api.login(username, password);
    api.setToken(token.access_token);
    ui.setUser(api.tokenUser() || username);
    ui.toast(`道籍已录入 · 欢迎入阁, ${api.tokenUser() || username}`);
    setPhase("library");
  } catch (err) {
    ui.authMsg(err.message);
  }
}

// ---------- 统一错误处理 ----------
function handleErr(err) {
  window.__lastErr = err.stack || err.message; // 排查用：完整堆栈留在 window 上
  // token 过期/无效：退出登录态，请他重新缔结
  if (err.status === 401) {
    api.setToken(null);
    ui.setUser(null);
    ui.toast("灵契已失效，请重新缔结", true);
    return;
  }
  ui.toast(err.message, true);
}

// ---------- 借阅 / 归还 ----------
async function doBorrow(book, note) {
  const me = api.tokenUser();
  if (!me) {
    ui.toast("先缔结灵契（登录）才能借阅", true);
    document.getElementById("auth-panel").classList.remove("hidden");
    return;
  }
  try {
    await api.borrow(book.id, me, note || null);
    ui.toast(`《${book.title}》已借出 · 符契刻录完成`);
    await refresh();
  } catch (err) {
    handleErr(err);
  }
}

async function doReturn(book, recordId) {
  try {
    await api.returnRecord(book.id, recordId);
    ui.toast("灵卷已归位");
    await refresh();
  } catch (err) {
    handleErr(err);
  }
}

// ---------- 焚毁（仅管理员，后端会把关） ----------
async function doDestroy(book) {
  if (!api.tokenUser()) {
    ui.toast("先缔结灵契（登录）才能焚毁", true);
    return;
  }
  try {
    await api.deleteBook(book.id);
    ui.toast(`《${book.title}》已化作漫天灰烬`);
    closeDetail();
    await refresh();
  } catch (err) {
    handleErr(err);
  }
}

// ---------- 检索（关键词 / 类别 / 排序，全部走后端查询参数） ----------
function doSearch(patch) {
  Object.assign(query, patch);
  wallPage = 1; // 换筛选条件回到第一页
  ui.setFilterActive(Boolean(query.keyword || query.category || query.sort));
  refresh().catch((err) => handleErr(err));
}

function doPage(n) {
  wallPage = Math.min(Math.max(1, n), totalPages);
  refresh().catch((err) => handleErr(err));
}

// ---------- 召唤典籍 ----------
async function doSummon(data) {
  if (!api.tokenUser()) {
    ui.toggleSummon(false);
    ui.toast("先缔结灵契（登录）才能召唤", true);
    document.getElementById("auth-panel").classList.remove("hidden");
    return;
  }
  if (!data.title || !data.author || !data.publisher_name || !data.category_name) {
    return ui.summonMsg("典籍名 / 作者 / 书坊 / 类别 为必填");
  }
  try {
    const created = await api.addBook(data);
    ui.toggleSummon(false);
    ui.toast(`《${created.title}》已飞入灵阁`);
    await refresh();
  } catch (err) {
    // 召唤表单还开着，错误写在弹窗里更直观
    if (err.status === 401) return handleErr(err);
    ui.summonMsg(err.message);
  }
}

// ---------- 启动 ----------
ui.init({
  onLogin: doLogin,
  onRegister: doRegister,
  onLogout: doLogout,
  onBorrow: doBorrow,
  onReturn: doReturn,
  onClose: closeDetail,
  onSubmitSummon: doSummon,
  onSearch: doSearch,
  onDestroy: doDestroy,
  onPage: doPage,
});

// ESC：随手关掉最上层的面板
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!document.getElementById("summon-modal").classList.contains("hidden")) ui.toggleSummon(false);
  else if (!document.getElementById("detail").classList.contains("hidden")) closeDetail();
  else document.getElementById("auth-panel").classList.add("hidden");
});

onFrame((t, dt) => {
  shelf.update(t, dt, camera);
  environment.update(t, dt, camera);
});

ui.setUser(api.tokenUser());

api.health()
  .then(() => ui.setHealth(true, "灵脉畅通"))
  .catch(() => ui.setHealth(false, "灵脉中断 · 后端未启动?"));

// 已有灵契 → 直接入阁；否则停在玄关
setPhase(api.tokenUser() ? "library" : "gate", { animate: false });

refresh()
  .then(() => {
    const loader = document.getElementById("loader");
    loader.classList.add("fade");
    setTimeout(() => loader.remove(), 900);
  })
  .catch((err) => {
    ui.toast(`灵阁未能开启: ${err.message}`, true);
    document.getElementById("loader").remove();
  });
