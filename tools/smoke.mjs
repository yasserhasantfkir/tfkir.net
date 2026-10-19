/* اختبار دخان لـ assets/js/app.js و assets/js/admin.js
   يشغّل boot() على DOM وهمي ويرصد أي استثناء أو مرجع غير معرّف. */
import fs from "node:fs";
import vm from "node:vm";

/* ---------- DOM وهمي بسيط ---------- */
const ALL_ATTR = ["id", "href", "src", "value", "type", "content", "alt", "class", "lang", "dir"];

class El {
  constructor(tag = "div", doc) {
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this.attrs = {};
    this.dataset = {};
    this.style = new Proxy({}, { get: () => "", set: () => true });
    this.classList = {
      _s: new Set(),
      add: (c) => this.classList._s.add(c),
      remove: (c) => this.classList._s.delete(c),
      toggle: (c, on) => (on ? this.classList._s.add(c) : this.classList._s.delete(c)),
      contains: (c) => this.classList._s.has(c),
    };
    this.innerHTML = "";
    this.innerText = "";
    this.textContent = "";
    this.hidden = false;
    this.disabled = false;
    this.value = "";
    this.scrollTop = 0;
    this.offsetParent = {};
    this._listeners = {};
    this._doc = doc;
    this.parentElement = null;
  }
  addEventListener(t, fn) { (this._listeners[t] ||= []).push(fn); }
  removeEventListener() {}
  setAttribute(k, v) { this.attrs[k] = v; if (k.startsWith("data-")) this.dataset[k.slice(5).replace(/-(\w)/g, (m, c) => c.toUpperCase())] = v; }
  getAttribute(k) { return this.attrs[k] ?? null; }
  removeAttribute(k) { delete this.attrs[k]; }
  getAttributeNames() { return Object.keys(this.attrs); }
  get tag() { return this.tagName; }
  appendChild(c) { this.children.push(c); c.parentElement = this; return c; }
  append() {}
  prepend() {}
  remove() {}
  removeAndKeepContent() {}
  replaceChild() {}
  cloneNode() { return new El(this.tagName, this._doc); }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  closest() { return null; }
  contains() { return true; }
  focus() {}
  click() {}
  scrollIntoView() {}
  getBoundingClientRect() { return { width: 390, height: 844, top: 0, left: 0 }; }
  insertAdjacentHTML(pos, html) { this._injected = (this._injected || "") + html; }
  set innerHTMLSet(v) { this.innerHTML = v; }
}

function makeDoc(ids, seen) {
  const doc = {
    readyState: "complete",
    documentElement: new El("html"),
    body: new El("body"),
    head: new El("head"),
    title: "t",
    visibilityState: "visible",
    createElement: (t) => new El(t, doc),
    createTextNode: (t) => ({ nodeType: 3, textContent: t }),
    getElementById: (id) => ids[id] || null,
    /* نحلّ #id حتى تُنفَّذ دوال التهيئة فعلًا بدل أن تُتخطَّى */
    querySelector: (sel) => {
      seen.push(sel);
      const m = /^#([\w-]+)$/.exec(sel);
      return m ? ids[m[1]] || null : null;
    },
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {},
    execCommand: () => true,
    queryCommandState: () => false,
    queryCommandValue: () => "",
    DOMParser: class { parseFromString() { return { body: { firstChild: new El("div") } }; } },
  };
  doc.documentElement.getAttribute = (k) => (k === "lang" ? "ar" : null);
  doc.documentElement.setAttribute = () => {};
  doc.documentElement.classList = { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false };
  return doc;
}

/* ---------- مشغّل ---------- */
export function run(file, idList = [], opts = {}) {
  const ids = {};
  /* نبني كل عنصر يشير إليه الملف بـ #id تلقائيًا حتى لا يفوتنا مرجع */
  const src = fs.readFileSync(file, "utf8");
  const found = new Set(idList);
  for (const m of src.matchAll(/["'`]#([A-Za-z][\w-]*)["'`]/g)) found.add(m[1]);
  for (const id of found) {
    const el = new El(opts.tag || "div");
    el.id = id;
    ids[id] = el;
  }
  const seen = [];
  const doc = makeDoc(ids, seen);
  const errors = [];

  const win = {
    document: doc,
    location: { pathname: opts.path || "/", search: opts.search || "", href: "https://tfkir.net/", origin: "https://tfkir.net", hash: "" },
    matchMedia: () => ({ matches: false, addEventListener: () => {}, addListener: () => {} }),
    addEventListener: () => {},
    removeEventListener: () => {},
    requestAnimationFrame: (fn) => { fn(0); return 1; },
    cancelAnimationFrame: () => {},
    getComputedStyle: () => ({}),
    localStorage: (() => { const m = {}; return { getItem: (k) => m[k] ?? null, setItem: (k, v) => { m[k] = v; }, removeItem: (k) => { delete m[k]; }, clear: () => {} }; })(),
    sessionStorage: (() => { const m = {}; return { getItem: (k) => m[k] ?? null, setItem: (k, v) => { m[k] = v; }, removeItem: (k) => { delete m[k]; } }; })(),
    navigator: { clipboard: null, onLine: true },
    fetch: () => Promise.resolve({ ok: false, json: () => Promise.resolve(null) }),
    setTimeout, clearTimeout, setInterval, clearInterval,
    URLSearchParams, URL, Blob: class { constructor() {} }, AbortController: class { constructor() { this.signal = {}; } abort() {} },
    IntersectionObserver: class { constructor() {} observe() {} unobserve() {} },
    MutationObserver: class { constructor() {} observe() {} },
    DOMParser: doc.DOMParser,
    console: { log: () => {}, warn: () => {}, error: () => {} },
  };
  win.window = win;
  win.self = win;
  win.globalThis = win;
  win.pageXOffset = 0;

  const ctx = vm.createContext(win);
  try {
    const code = fs.readFileSync(file, "utf8");
    vm.runInContext(code, ctx, { filename: file, timeout: 5000 });
    /* نُجبر مستمعي التمرير على العمل كما في المتصفح */
    for (const id of ["site-header"]) {
      const el = ids[id];
      for (const fn of (el?._listeners.scroll || [])) fn({});
    }
  } catch (e) {
    errors.push(`${file}: ${e.constructor.name}: ${e.message}`);
  }
  if (process.env.SMOKE_TRACE) console.error("   queries:", seen.slice(0, 20).join(" "));
  return errors;
}

/* ---------- تشغيل ---------- */
const appIds = [
  "site-header", "scroll-progress", "to-top", "nav-toggle", "drawer",
  "theme-toggle", "toast", "toast-text", "contact-form", "article-head",
  "article-body", "article-loading", "article-404", "article-cat", "article-title",
  "article-date", "article-read", "crumb-title", "toc", "toc-list", "article-share",
  "share-x", "share-wa", "share-in", "share-copy", "year", "idea-grid", "idea-empty",
  "idea-filters", "hero", "articles-rail",
];
const adminIds = [
  "adm-top", "adm-user", "adm-theme", "adm-settings", "adm-logout", "adm-main",
  "view-login", "view-force", "view-app", "view-editor", "login-form", "login-error",
  "login-submit", "force-form", "cred-form", "modal", "preview", "confirm", "toast",
  "toast-text", "adm-list", "adm-empty", "adm-stats", "c-drafts", "c-published",
  "c-total", "adm-search", "adm-cat", "adm-refresh", "adm-new", "ed-content", "ed-toolbar",
  "ed-back", "ed-status", "ed-preview", "ed-draft", "ed-publish", "ed-delete",
  "ed-title", "ed-excerpt", "ed-category", "ed-tags", "ed-slug", "ed-counts",
  "ed-autosave", "pv-title", "pv-cat", "pv-read", "pv-body", "confirm-text",
  "confirm-title", "confirm-yes", "fc-old", "fc-user", "fc-pass", "fc-pass2",
  "cc-old", "cc-user", "cc-pass", "cc-pass2", "lg-user", "lg-pass",
];

let bad = 0;
for (const [f, ids, opts] of [
  ["assets/js/app.js", appIds, { path: "/", tag: "div" }],
  ["assets/js/app.js", appIds, { path: "/article", search: "?id=x", tag: "div" }],
  ["assets/js/admin.js", adminIds, { path: "/admin", tag: "div" }],
]) {
  const errs = run("/workspace/tfkir.net/" + f, ids, opts);
  if (errs.length) { bad++; console.log("✗", f, opts.path, "→"); errs.forEach((e) => console.log("   ", e)); }
  else console.log("✓", f, opts.path);
}
process.exit(bad ? 1 : 0);