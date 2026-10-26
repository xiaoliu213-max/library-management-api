// ===== 界面层：门匾、灵契、古卷详情、召唤法阵、浮语 =====
import { api } from "./api.js?v=4";
import { coverDataURL } from "./books.js?v=4";

const $ = (id) => document.getElementById(id);

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

function fmtDate(iso) {
  if (!iso) return "";
  return iso.replace("T", " ").slice(0, 16);
}

export const ui = {
  handlers: {},
  currentBook: null,

  init(handlers) {
    this.handlers = handlers;

    // --- 灵契（登录 / 注册） ---
    $("auth-toggle").onclick = () => {
      if (api.tokenUser()) return; // 已登录时这个按钮根本不显示
      $("auth-panel").classList.toggle("hidden");
    };
    $("tab-login").onclick = () => this.setAuthMode("login");
    $("tab-register").onclick = () => this.setAuthMode("register");
    $("login-btn").onclick = () => this.submitAuth();
    $("register-btn").onclick = () => this.submitAuth();
    for (const id of ["login-pass", "register-pass2"]) {
      $(id).addEventListener("keydown", (e) => {
        if (e.key === "Enter") this.submitAuth();
      });
    }
    $("logout-btn").onclick = () => handlers.onLogout();

    // --- 古卷详情 ---
    $("detail-close").onclick = () => handlers.onClose();
    $("borrow-btn").onclick = () => {
      if (this.currentBook) handlers.onBorrow(this.currentBook, $("borrow-note").value.trim());
    };
    $("detail-records").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-rid]");
      if (btn) handlers.onReturn(this.currentBook, Number(btn.dataset.rid));
    });

    // --- 焚毁（两段确认，防手滑） ---
    $("destroy-btn").onclick = () => {
      const btn = $("destroy-btn");
      if (btn.dataset.armed) {
        this.disarmDestroy();
        if (this.currentBook) handlers.onDestroy(this.currentBook);
      } else {
        btn.dataset.armed = "1";
        btn.classList.add("armed");
        btn.textContent = "✕ 确认焚毁？再点一次";
        clearTimeout(this._armTimer);
        this._armTimer = setTimeout(() => this.disarmDestroy(), 3000);
      }
    };

    // --- 检索法阵 ---
    let searchTimer = null;
    $("search-box").addEventListener("input", () => {
      $("search-clear").classList.toggle("hidden", !$("search-box").value);
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        handlers.onSearch({ keyword: $("search-box").value.trim() });
      }, 400);
    });
    // 回车立即搜索，不等防抖
    $("search-box").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        clearTimeout(searchTimer);
        handlers.onSearch({ keyword: $("search-box").value.trim() });
      }
    });
    $("search-clear").onclick = () => {
      $("search-box").value = "";
      $("search-clear").classList.add("hidden");
      handlers.onSearch({ keyword: "" });
      $("search-box").focus();
    };
    $("filter-reset").onclick = () => {
      $("search-box").value = "";
      $("search-clear").classList.add("hidden");
      $("filter-category").value = "";
      $("filter-sort").value = "";
      handlers.onSearch({ keyword: "", category: "", sort: "" });
    };
    $("filter-category").onchange = () => handlers.onSearch({ category: $("filter-category").value });
    $("filter-sort").onchange = () => handlers.onSearch({ sort: $("filter-sort").value });

    // --- 书库分页 ---
    $("page-prev").onclick = () => handlers.onPage(Number($("page-label").dataset.page) - 1);
    $("page-next").onclick = () => handlers.onPage(Number($("page-label").dataset.page) + 1);

    // --- 召唤典籍 ---
    $("summon-toggle").onclick = () => this.toggleSummon(true);
    $("summon-cancel").onclick = () => this.toggleSummon(false);
    $("summon-modal").addEventListener("click", (e) => {
      if (e.target === $("summon-modal")) this.toggleSummon(false);
    });
    $("summon-submit").onclick = () => this.submitSummon();
    for (const id of ["f-title", "f-author", "f-price", "f-year", "f-publisher", "f-category", "f-tags", "f-translators"]) {
      $(id).addEventListener("keydown", (e) => {
        if (e.key === "Enter") this.submitSummon();
      });
    }
  },

  submitSummon() {
    this.handlers.onSubmitSummon({
      title: $("f-title").value.trim(),
      author: $("f-author").value.trim(),
      price: Number($("f-price").value),
      first_published: Number($("f-year").value),
      publisher_name: $("f-publisher").value.trim(),
      category_name: $("f-category").value.trim(),
      tag_names: $("f-tags").value.split(/[,，]/).map((s) => s.trim()).filter(Boolean),
      translator_names: $("f-translators").value.split(/[,，]/).map((s) => s.trim()).filter(Boolean),
    });
  },

  // ---- 状态区 ----
  setHealth(ok, text) {
    $("pulse-dot").classList.toggle("bad", !ok);
    $("health-text").textContent = text;
  },

  setCount(n) {
    $("book-count").textContent = n;
  },

  setEmpty(empty, filtered = false) {
    const el = $("empty-hint");
    el.classList.toggle("hidden", !empty);
    if (empty) {
      // 区分"库里真没书"和"筛选没命中"
      el.innerHTML = filtered
        ? "查 无 此 卷 ——<br>换个关键词或类别试试"
        : "灵阁空空如也 ——<br>召唤第一卷典籍吧";
    }
  },

  toast(msg, isErr = false) {
    const el = $("toast");
    el.textContent = msg;
    el.classList.toggle("err", isErr);
    el.classList.remove("hidden");
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.add("hidden"), 2600);
  },

  tooltipAt(x, y, text) {
    const el = $("tooltip");
    if (!text) return el.classList.add("hidden");
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.classList.remove("hidden");
  },

  // ---- 阶段（玄关 / 藏书阁） ----
  setPhase(phase) {
    const gate = phase === "gate";
    document.body.classList.toggle("gate", gate);
    if (gate) {
      this.closeDetail();
      $("auth-panel").classList.remove("hidden");
      this.authMsg("");
    } else {
      $("auth-panel").classList.add("hidden");
    }
  },

  // ---- 灵契 ----
  _authMode: "login",

  setAuthMode(mode) {
    this._authMode = mode;
    const login = mode === "login";
    $("tab-login").classList.toggle("active", login);
    $("tab-register").classList.toggle("active", !login);
    $("login-btn").classList.toggle("hidden", !login);
    $("register-btn").classList.toggle("hidden", login);
    $("register-pass2").classList.toggle("hidden", login);
    this.authMsg("");
    $("login-user").focus();
  },

  submitAuth() {
    const h = this.handlers;
    const username = $("login-user").value.trim();
    const password = $("login-pass").value;
    if (this._authMode === "login") h.onLogin(username, password);
    else h.onRegister(username, password, $("register-pass2").value);
  },

  setUser(name) {
    const loggedIn = Boolean(name);
    $("auth-user").classList.toggle("hidden", !loggedIn);
    $("auth-toggle").classList.toggle("hidden", loggedIn);
    $("auth-panel").classList.add("hidden");
    if (loggedIn) $("auth-name").textContent = name;
  },

  authMsg(msg) {
    $("auth-msg").textContent = msg;
  },

  // ---- 检索 ----
  // 有任何筛选生效时显示「重置」按钮
  setFilterActive(active) {
    $("filter-reset").classList.toggle("hidden", !active);
  },

  // 书库分页（单页放得下时整个隐藏）
  setPager(page, totalPages) {
    const el = $("pager");
    el.classList.toggle("hidden", totalPages <= 1);
    const label = $("page-label");
    label.textContent = `第 ${page} / ${totalPages} 页`;
    label.dataset.page = page;
    $("page-prev").classList.toggle("disabled", page <= 1);
    $("page-next").classList.toggle("disabled", page >= totalPages);
  },

  // 每次全量重建，避免并发刷新时出现重复选项；同时尽量保持当前选中值
  setCategories(names) {
    const sel = $("filter-category");
    const current = sel.value;
    sel.innerHTML = '<option value="">全部类别</option>';
    for (const n of names) {
      const opt = document.createElement("option");
      opt.value = n;
      opt.textContent = n;
      sel.appendChild(opt);
    }
    if ([...sel.options].some((o) => o.value === current)) sel.value = current;
  },

  // ---- 古卷详情 ----
  showDetail(book) {
    this.currentBook = book;
    $("detail").classList.remove("hidden");

    $("detail-title").textContent = book.title;

    // 封面：本地 covers/ 里有真图就用；加载失败退回生成的玄幻封面
    const cover = $("detail-cover");
    cover.onerror = () => {
      cover.onerror = null;
      cover.src = coverDataURL(book);
    };
    cover.src = `covers/${encodeURIComponent(book.title)}.jpg`;

    $("borrow-note").value = "";
    this.disarmDestroy();
    $("destroy-btn").classList.toggle("hidden", !api.tokenUser());

    const attrs = [
      ["作者", book.author],
      ["类别", book.category?.name],
      ["书坊", book.publisher?.name],
      ["灵石", `${book.price} 枚`],
      ["成书之年", book.first_published],
      ["重刊", book.reprint_year ?? "—"],
    ];
    $("detail-attrs").innerHTML = attrs
      .map(([k, v]) => `<div class="attr"><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span></div>`)
      .join("");

    const renderTags = (list, cls) =>
      (list || []).map((t) => `<span class="tag ${cls}">${esc(t.name ?? t)}</span>`).join("") || "—";
    $("detail-tags").innerHTML = renderTags(book.tags, "gold");
    $("detail-trans").innerHTML = renderTags(book.translators, "");

    // 借阅符契：在外 / 已归；召回按钮仅登录用户可见
    const canAct = Boolean(api.tokenUser());
    const records = book.records || [];
    $("detail-records").innerHTML = records.length
      ? records
          .map((r) => {
            const state = r.returned
              ? '<span class="state back">已归</span>'
              : '<span class="state out">在外</span>';
            const btn = r.returned || !canAct ? "" : `<button class="record-return" data-rid="${r.id}">召回</button>`;
            const note = r.note ? `<span class="when">· ${esc(r.note)}</span>` : "";
            return `<div class="record">
                <span><span class="who">${esc(r.borrower)}</span>${note}</span>
                <span class="when">${fmtDate(r.borrowed_at)}</span>
                ${state}${btn}
              </div>`;
          })
          .join("")
      : '<div class="record"><span class="when">尚无人借阅此卷</span></div>';
  },

  disarmDestroy() {
    const btn = $("destroy-btn");
    delete btn.dataset.armed;
    btn.classList.remove("armed");
    btn.textContent = "✕ 焚 毁 此 卷";
  },

  closeDetail() {
    this.currentBook = null;
    $("detail").classList.add("hidden");
  },

  // ---- 召唤典籍 ----
  toggleSummon(show) {
    $("summon-modal").classList.toggle("hidden", !show);
    if (show) {
      $("summon-msg").textContent = "";
      $("f-title").focus();
    }
  },

  summonMsg(msg) {
    $("summon-msg").textContent = msg;
  },
};
