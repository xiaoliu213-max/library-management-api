// ===== 后端 /v1 接口的唯一出入口 =====
// 所有 fetch 都从这里走：自动带 token、统一解析错误格式 {code, message, detail}

const BASE = "/v1";
const TOKEN_KEY = "lingshuge_token";

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

// 从 JWT 的载荷里取出用户名（仅用于界面显示，真正的校验在后端）
function tokenUser() {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.username || payload.sub || null;
  } catch {
    return null;
  }
}

async function request(path, { method = "GET", body, form } = {}) {
  const headers = {};
  let payload;

  if (form) {
    // OAuth2 登录用表单格式
    payload = new URLSearchParams(form);
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(BASE + path, { method, headers, body: payload });

  let data = null;
  try { data = await res.json(); } catch { /* 空响应体（如 PATCH 归还） */ }

  if (!res.ok) {
    const err = new Error(data?.message || `请求失败 (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  getToken,
  setToken,
  tokenUser,

  // 健康检查挂在根路径，不在 /v1 下
  health: async () => {
    const res = await fetch("/health");
    if (!res.ok) throw new Error("backend not responding");
    return res.json();
  },

  listBooks: (params = {}) => {
    const qs = new URLSearchParams({ page: params.page ?? 1, size: params.size ?? 100 });
    if (params.keyword) qs.set("keyword", params.keyword);
    if (params.category) qs.set("category", params.category);
    if (params.sort) qs.set("sort", params.sort);
    return request(`/books?${qs}`);
  },
  getBook: (id) => request(`/books/${id}`),

  deleteBook: (id) => request(`/books/${id}`, { method: "DELETE" }),

  login: (username, password) => request("/login", { method: "POST", form: { username, password } }),
  register: (body) => request("/users", { method: "POST", body }),

  borrow: (bookId, borrower, note) =>
    request(`/books/${bookId}/records`, { method: "POST", body: { borrower, note } }),

  // 归还接口没有请求体，PATCH 空体即可
  returnRecord: (bookId, recordId) =>
    request(`/books/${bookId}/records/${recordId}`, { method: "PATCH" }),

  addBook: (data) => request("/books", { method: "POST", body: data }),
};
