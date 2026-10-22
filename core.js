/* 厨房帳 core.js — 統括担当。各モジュールは CONTRACT.md の K API のみ使用すること。 */
(function () {
  "use strict";
  const K = (window.K = {});

  /* ---------- 境界（コレクション所有者） ---------- */
  const OWNERS = {
    core: ["settings"],
    inventory: ["items", "suppliers", "counts", "orders", "waste"],
    recipe: ["recipes", "prep"],
    shift: ["staff", "shifts", "notes", "hygiene"],
    sales: ["sales", "kaizen", "events"],
  };
  const ALL_COLLS = Object.values(OWNERS).flat();
  K.OWNERS = OWNERS;

  /* ---------- イベントバス ---------- */
  const bus = {};
  K.on = (evt, fn) => {
    (bus[evt] = bus[evt] || new Set()).add(fn);
    return () => bus[evt].delete(fn);
  };
  K.emit = (evt, payload) => {
    (bus[evt] || []).forEach((fn) => {
      try { fn(payload); } catch (e) { console.error(e); }
    });
  };

  /* ---------- ストレージ（db / local フォールバック） ---------- */
  const cache = {}; // coll -> rows[]
  const watchers = {}; // coll -> Set(cb)
  const loaded = {};
  let backend = null; // {mode, db}
  let readOnly = false;
  const LS_KEY = "kitchen-ledger-local-v1";

  /* ---------- 端末内の保存領域（KV） ----------
     独立アプリ（Claude外）では IndexedDB に保存（容量が大きく写真も入る）。メモリに全件を持ち、書き込みは即時に IndexedDB へ反映。
     共有データはコレクションごとに別キー（kitchen-ledger-local-v1/<coll>）＝1回の保存で書くのは変わったコレクションだけ。
     同時に書けるのは1つの画面（タブ／ホーム画面アプリ）だけ（Web Locks）。2つ目は「別の画面で開いています」で止める＝上書き事故を防ぐ。
     IndexedDB が使えない場合や Claude 上では従来どおり localStorage（1キー）。 */
  const DATA_KEY_RE = /^kitchen-ledger-(local-v1|my-|memos-v1)/;
  const KV = (() => {
    const mem = new Map(); let idb = null; const dirty = new Set(); let timer = null; let failed = false; let stopped = false;
    const openDB = () => new Promise((res, rej) => { const r = indexedDB.open("brigade", 1); r.onupgradeneeded = () => r.result.createObjectStore("kv"); r.onsuccess = () => { const d = r.result; d.onclose = () => { if (idb === d) idb = null; }; d.onversionchange = () => { d.close(); if (idb === d) idb = null; }; res(d); }; r.onerror = () => rej(r.error); r.onblocked = () => rej(new Error("blocked")); });
    const reqP = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const warn = () => { if (!failed) { failed = true; K.toast("この端末に保存できませんでした。アプリを開き直し、バックアップを書き出してください", "bad"); } };
    const writeOnce = (keys) => new Promise((res) => {
      let tx; try { tx = idb.transaction("kv", "readwrite"); } catch (e) { res(false); return; }
      const st = tx.objectStore("kv");
      try { keys.forEach((k) => { mem.has(k) ? st.put(mem.get(k), k) : st.delete(k); }); } catch (e) { try { tx.abort(); } catch (x) {} res(false); return; }
      tx.oncomplete = () => res(true);
      tx.onerror = tx.onabort = () => res(false);
    });
    // 戻り値：保存できたら true
    const flush = async () => {
      timer = null; if (!api.enabled) return true; if (!dirty.size) return !failed;
      const keys = [...dirty]; dirty.clear();
      let ok = idb ? await writeOnce(keys) : false;
      if (!ok) { // 接続切れ（iOS で起きることがある）→ つなぎ直して1回だけ再試行
        try { idb = await openDB(); ok = await writeOnce(keys); } catch (e) { ok = false; }
      }
      if (ok) { failed = false; return true; }
      keys.forEach((k) => dirty.add(k)); warn(); return false;
    };
    const schedule = () => { if (!timer) timer = setTimeout(flush, 0); };
    const api = {
      kind: "localStorage", enabled: false,
      async init() {
        if (!window.indexedDB) return;
        try {
          idb = await openDB();
          const st = idb.transaction("kv", "readonly").objectStore("kv");
          const [keys, vals] = await Promise.all([reqP(st.getAllKeys()), reqP(st.getAll())]);
          keys.forEach((k, i) => mem.set(k, vals[i]));
          api.enabled = true; api.kind = "indexedDB";
          // 以前の版（localStorage）からの引っ越し。両方にある場合は消さずに legacy として残す
          const moved = [];
          try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (DATA_KEY_RE.test(k)) moved.push(k); } } catch (e) {}
          const hasShared = [...mem.keys()].some((k) => k.indexOf(LS_KEY) === 0);
          moved.forEach((k) => {
            const v = localStorage.getItem(k);
            const clash = k === LS_KEY ? hasShared : mem.has(k);
            if (clash) mem.set("kitchen-ledger-legacy-" + k.replace("kitchen-ledger-", ""), v); else mem.set(k, v);
            dirty.add(clash ? "kitchen-ledger-legacy-" + k.replace("kitchen-ledger-", "") : k);
          });
          if (await flush()) moved.forEach((k) => { try { localStorage.removeItem(k); } catch (e) {} });
          addEventListener("pagehide", flush); document.addEventListener("visibilitychange", () => { if (document.hidden) flush(); });
        } catch (e) { idb = null; api.enabled = false; api.kind = "localStorage"; console.warn("IndexedDB 不可。localStorage を使います", e); }
      },
      get(k) { if (api.enabled) return mem.has(k) ? mem.get(k) : null; try { return localStorage.getItem(k); } catch (e) { return null; } },
      set(k, v) { if (stopped) throw new Error("stopped"); if (api.enabled) { mem.set(k, v); dirty.add(k); schedule(); return; } localStorage.setItem(k, v); },
      remove(k) { if (stopped) return; if (api.enabled) { mem.delete(k); dirty.add(k); schedule(); return; } try { localStorage.removeItem(k); } catch (e) {} },
      keys() { if (api.enabled) return [...mem.keys()]; const out = []; try { for (let i = 0; i < localStorage.length; i++) out.push(localStorage.key(i)); } catch (e) {} return out; },
      flush,
      stop() { stopped = true; },
    };
    return api;
  })();
  K.storage = KV;

  /* ---------- 1つの画面だけが書き込む（Web Locks）---------- */
  const LOCK = "brigade-writer";
  let lockLost = null;
  function acquireLock() {
    if (!navigator.locks || !navigator.locks.request) return Promise.resolve(true);
    return new Promise((resolve) => {
      let got = false;
      navigator.locks.request(LOCK, { ifAvailable: true }, (lock) => {
        if (!lock) { resolve(false); return; }
        got = true; resolve(true);
        return new Promise(() => {}); // 画面を閉じるまで持ち続ける
      }).catch(() => { if (got && lockLost) lockLost(); else resolve(false); });
    });
  }
  function busyScreen(title, text, btnLabel, onBtn) {
    const old = document.getElementById("busy-screen"); if (old) old.remove();
    const el = h("div", { id: "busy-screen", class: "busy-screen", role: "alertdialog", "aria-modal": "true", "aria-label": title },
      h("div", { class: "busy-card" },
        h("div", { class: "busy-ico" }, K.icon("alert")),
        h("h2", { text: title }), h("p", { text: text }),
        h("button", { class: "btn primary", onClick: onBtn }, btnLabel)));
    document.body.appendChild(el);
    const b = el.querySelector("button"); if (b) b.focus();
  }
  async function takeOver() {
    // 開いている別の画面から書き込み権を引き継ぐ：相手が保存を終える時間をおいてから再起動
    try { await new Promise((res, rej) => navigator.locks.request(LOCK, { steal: true }, () => { res(); return new Promise(() => {}); }).catch(rej)); } catch (e) {}
    setTimeout(() => location.reload(), 700);
  }

  function shardKey(coll) { return LS_KEY + "/" + coll; }
  function lsLoad() {
    if (KV.enabled) {
      // 旧形式（1キーに全部）があれば、コレクションごとのキーに分けて保存し直す
      const legacy = KV.get(LS_KEY);
      if (legacy) {
        let obj = {}; try { obj = JSON.parse(legacy) || {}; } catch (e) {}
        Object.keys(obj).forEach((c) => KV.set(shardKey(c), JSON.stringify(obj[c] || {})));
        KV.remove(LS_KEY);
      }
      const all = {};
      KV.keys().filter((k) => k.indexOf(LS_KEY + "/") === 0).forEach((k) => { try { all[k.slice(LS_KEY.length + 1)] = JSON.parse(KV.get(k) || "{}") || {}; } catch (e) {} });
      return all;
    }
    try { return JSON.parse(KV.get(LS_KEY) || "{}"); } catch (e) { return {}; }
  }
  function lsSave(all, coll) {
    try {
      if (KV.enabled) { (coll ? [coll] : Object.keys(all)).forEach((c) => KV.set(shardKey(c), JSON.stringify(all[c] || {}))); return; }
      KV.set(LS_KEY, JSON.stringify(all));
    } catch (e) { K.toast("この端末に保存できませんでした（容量不足の可能性）", "bad"); }
  }
  let localAll = null;

  function setRows(coll, rows) {
    rows.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    cache[coll] = rows;
    loaded[coll] = true;
    (watchers[coll] || []).forEach((cb) => {
      try { cb(rows); } catch (e) { console.error(e); }
    });
    if (coll === "settings") K.emit("settings", K.settings());
    if (coll === "staff") K.emit("staff", K.currentStaffId());
  }
  function localPublish(coll) {
    const m = localAll[coll] || {};
    setRows(coll, Object.keys(m).map((id) => Object.assign({ id }, m[id])));
  }

  const subscribed = {};
  function ensureSub(coll) {
    if (subscribed[coll] || !backend) return;
    subscribed[coll] = true;
    if (backend.mode === "local") return localPublish(coll);
    backend.db.collection(coll).onSnapshot(
      (snap) => setRows(coll, snap.docs.map((d) => Object.assign({ id: d.id }, clone(d.data())))),
      (e) => {
        subscribed[coll] = false;
        console.warn("snapshot error", coll, e);
        if (e && e.code === "unavailable") setTimeout(() => ensureSub(coll), 3000);
      }
    );
  }
  const clone = (o) => (o == null ? o : JSON.parse(JSON.stringify(o)));

  K.watch = (coll, cb) => {
    if (!ALL_COLLS.includes(coll)) throw new Error("未定義のコレクション: " + coll);
    (watchers[coll] = watchers[coll] || new Set()).add(cb);
    ensureSub(coll);
    if (loaded[coll]) { try { cb(cache[coll]); } catch (e) { console.error(e); } }
    return () => watchers[coll].delete(cb);
  };
  K.list = (coll) => cache[coll] || [];
  K.getDoc = (coll, id) => (cache[coll] || []).find((r) => r.id === id) || null;
  K.mode = () => (backend ? backend.mode : "connecting");
  K.readOnly = () => readOnly;

  function writeErr(e) {
    const code = e && e.code;
    if (code === "invalid_argument" || code === "not_granted") {
      if (!readOnly) { readOnly = true; K.emit("readonly", true); }
      K.toast("この共有リンクでは閲覧のみです。編集はオーナーに依頼してください。", "bad");
    } else if (code === "quota_exceeded") {
      K.toast("保存容量の上限です。古い記録を削除してから保存してください。", "bad");
    } else {
      K.toast("保存できませんでした。通信状態を確認してもう一度お試しください。", "bad");
    }
    throw e;
  }

  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  function strip(data) {
    const o = clone(data) || {};
    delete o.id;
    return o;
  }

  async function doWrite(op, coll, id, data) {
    if (readOnly) { K.toast("閲覧のみのため保存できません", "bad"); throw new Error("readonly"); }
    if (backend.mode === "local") {
      const m = (localAll[coll] = localAll[coll] || {});
      if (op === "set") m[id] = strip(data);
      else if (op === "update") {
        if (!m[id]) throw new Error("not found");
        m[id] = Object.assign({}, m[id], strip(data));
      } else if (op === "delete") delete m[id];
      lsSave(localAll, coll);
      localPublish(coll);
      return id;
    }
    const ref = backend.db.collection(coll).doc(id);
    try {
      if (op === "set") await ref.set(strip(data));
      else if (op === "update") await ref.update(strip(data));
      else await ref.delete();
    } catch (e) {
      if (e && e.code === "unavailable") {
        await new Promise((r) => setTimeout(r, 400 + Math.random() * 600));
        try {
          if (op === "set") await ref.set(strip(data));
          else if (op === "update") await ref.update(strip(data));
          else await ref.delete();
          return id;
        } catch (e2) { return writeErr(e2); }
      }
      return writeErr(e);
    }
    return id;
  }

  K.scope = (moduleKey) => {
    const own = OWNERS[moduleKey];
    if (!own) throw new Error("未登録のモジュール: " + moduleKey);
    const guard = (coll) => {
      if (!own.includes(coll)) {
        const msg = "境界違反: " + moduleKey + " は " + coll + " に書き込めません";
        console.error(msg);
        throw new Error(msg);
      }
    };
    return {
      add: (coll, data) => { guard(coll); return doWrite("set", coll, newId(), data); },
      put: (coll, id, data) => { guard(coll); return doWrite("set", coll, id, data); },
      patch: (coll, id, data) => { guard(coll); return doWrite("update", coll, id, data); },
      del: (coll, id) => { guard(coll); return doWrite("delete", coll, id); },
    };
  };
  const CORE = K.scope("core");

  /* ---------- 設定・担当者 ---------- */
  const DEFAULT_SETTINGS = { storeName: "", targetFoodCost: 0.3, targetLabor: 0.25, openDays: "" };
  K.settings = () => Object.assign({}, DEFAULT_SETTINGS, K.getDoc("settings", "main") || {});
  const STAFF_KEY = "kitchen-ledger-staff";
  K.currentStaffId = () => {
    let id = null;
    try { id = localStorage.getItem(STAFF_KEY); } catch (e) {}
    const st = id && K.getDoc("staff", id);
    if (id && (!st || st.active === false)) return null; // 削除・退職した担当者は未選択扱い
    return id || null;
  };
  K.setCurrentStaff = (id) => {
    try { id ? localStorage.setItem(STAFF_KEY, id) : localStorage.removeItem(STAFF_KEY); } catch (e) {}
    K.emit("staff", id);
  };
  K.staffName = (id) => {
    const s = id && K.getDoc("staff", id);
    return s ? s.name : "未選択";
  };

  /* ---------- 日付・書式 ---------- */
  const pad = (n) => String(n).padStart(2, "0");
  const toIso = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const fromIso = (iso) => { const [y, m, d] = String(iso).split("-").map(Number); return new Date(y, m - 1, d); };
  K.today = () => toIso(new Date());
  // 日付が変わったら "day" を通知（画面を開いたまま0時を越えたとき用）。各担当は K.on("day", 再描画) で受け取る
  let lastDay = toIso(new Date());
  setInterval(() => { const d = toIso(new Date()); if (d !== lastDay) { lastDay = d; K.emit("day", d); } }, 30000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { const d = toIso(new Date()); if (d !== lastDay) { lastDay = d; K.emit("day", d); } } });
  K.addDays = (iso, n) => { const d = fromIso(iso); d.setDate(d.getDate() + n); return toIso(d); };
  K.weekStart = (iso) => { const d = fromIso(iso || K.today()); const w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return toIso(d); };
  K.daysBetween = (a, b) => Math.round((fromIso(b) - fromIso(a)) / 86400000);
  K.hours = (start, end, breakMin) => {
    if (!start || !end) return 0;
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    let min = eh * 60 + em - (sh * 60 + sm);
    if (min < 0) min += 1440;
    return Math.max(0, (min - (Number(breakMin) || 0)) / 60);
  };
  const DOW = ["日", "月", "火", "水", "木", "金", "土"];
  K.fmt = {
    yen: (n) => "¥" + Math.round(Number(n) || 0).toLocaleString("ja-JP"),
    num: (n, d = 0) => (Number(n) || 0).toLocaleString("ja-JP", { minimumFractionDigits: d, maximumFractionDigits: d }),
    pct: (r) => (r == null || !isFinite(r) ? "—" : (r * 100).toFixed(1) + "%"),
    dow: (iso) => DOW[fromIso(iso).getDay()],
    md: (iso) => { const d = fromIso(iso); return d.getMonth() + 1 + "/" + d.getDate(); },
    date: (iso) => { const d = fromIso(iso); return d.getMonth() + 1 + "/" + d.getDate() + "(" + DOW[d.getDay()] + ")"; },
  };

  /* ---------- DOM ヘルパー ---------- */
  K.h = (tag, props, ...children) => {
    const el = document.createElement(tag);
    if (props) {
      for (const k in props) {
        const v = props[k];
        if (v == null || v === false) continue;
        if (k === "class") el.className = v;
        else if (k === "text") el.textContent = v;
        else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
        else if (k === "style") el.setAttribute("style", v);
        else if (k === "dataset") Object.assign(el.dataset, v);
        else if (k === "attrs") for (const a in v) el.setAttribute(a, v[a]);
        else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === "value" || k === "checked" || k === "disabled" || k === "selected" || k === "hidden") el[k] = v;
        else el.setAttribute(k, v);
      }
    }
    const add = (c) => {
      if (c == null || c === false) return;
      if (Array.isArray(c)) return c.forEach(add);
      el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
    };
    children.forEach(add);
    return el;
  };
  const h = K.h;

  const styleHost = () => document.getElementById("mod-styles") || document.head;
  const cssDone = {};
  K.css = (prefix, text) => {
    if (cssDone[prefix]) return;
    cssDone[prefix] = true;
    styleHost().appendChild(h("style", { "data-mod": prefix, text }));
  };

  let fieldSeq = 0;
  K.field = (label, control, hint) => {
    const id = control.id || (control.id = "f" + ++fieldSeq);
    return h("label", { class: "field", for: id }, h("span", { class: "field-label", text: label }), control, hint ? h("span", { class: "field-hint", text: hint }) : null);
  };
  // 入力エラー：欄を赤枠にして直下に理由、最初のエラー欄へスクロール＆フォーカス
  K.fieldError = (control, msg) => {
    if (!control) return;
    control.setAttribute("aria-invalid", "true");
    const host = control.closest(".field") || control.parentElement;
    let el = host && host.querySelector(":scope > .field-error");
    if (!el && host) { el = h("span", { class: "field-error", role: "alert" }); host.appendChild(el); }
    if (el) el.textContent = msg || "入力を確認してください";
    const clear = () => { control.removeAttribute("aria-invalid"); if (el) el.remove(); control.removeEventListener("input", clear); };
    control.addEventListener("input", clear);
  };
  K.clearErrors = (root) => { (root || document).querySelectorAll('[aria-invalid="true"]').forEach((c) => c.removeAttribute("aria-invalid")); (root || document).querySelectorAll(".field > .field-error").forEach((e) => e.remove()); };
  K.focusFirstError = (root) => { const c = (root || document).querySelector('[aria-invalid="true"]'); if (c) { c.scrollIntoView({ block: "center", behavior: "smooth" }); try { c.focus({ preventScroll: true }); } catch (e) {} } return !!c; };
  K.input = (attrs) => {
    const a = Object.assign({ type: "text" }, attrs || {});
    const el = h("input", { class: "inp" });
    for (const k in a) {
      if (a[k] == null) continue;
      if (k === "value") el.value = a[k];
      else if (k.startsWith("on") && typeof a[k] === "function") el.addEventListener(k.slice(2).toLowerCase(), a[k]);
      else el.setAttribute(k, a[k]);
    }
    if (a.type === "number") { el.setAttribute("inputmode", a.step && String(a.step).includes(".") ? "decimal" : "decimal"); }
    return el;
  };
  K.select = (options, value, attrs) => {
    const el = h("select", { class: "inp" });
    (options || []).forEach((o) => {
      const opt = typeof o === "object" ? o : { value: o, label: o };
      el.appendChild(h("option", { value: opt.value, text: opt.label }));
    });
    if (value != null) el.value = value;
    if (attrs) for (const k in attrs) {
      if (k.startsWith("on") && typeof attrs[k] === "function") el.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
      else el.setAttribute(k, attrs[k]);
    }
    return el;
  };
  K.empty = (title, text, actionLabel, onAction) =>
    h("div", { class: "empty" },
      K.icon("tray"),
      h("div", { class: "empty-title", text: title }),
      text ? h("div", { class: "empty-text", text }) : null,
      actionLabel ? h("button", { class: "btn primary", text: actionLabel, onClick: onAction, disabled: readOnly }) : null);

  /* ---------- トースト / シート / 確認 ---------- */
  // opts.action = {label, onClick} で「元に戻す」等のボタン付き（表示5秒）
  K.toast = (msg, kind, opts) => {
    const host = document.getElementById("toasts");
    if (!host) return console.log(msg);
    const act = opts && opts.action;
    const t = h("div", { class: "toast " + (kind || "") + (act ? " has-act" : ""), role: "status" },
      h("span", { text: msg }),
      act ? h("button", { class: "toast-act", text: act.label, onClick: () => { t.remove(); try { act.onClick(); } catch (e) { console.error(e); } } }) : null);
    host.appendChild(t);
    while (host.children.length > 2) host.firstChild.remove();
    const life = act ? 5000 : 2600;
    setTimeout(() => t.classList.add("out"), life);
    setTimeout(() => t.remove(), life + 500);
  };
  const coarse = () => { try { return window.matchMedia("(pointer: coarse)").matches; } catch (e) { return false; } };
  // シートを閉じた直後の誤タップ（下にあるボタンへの貫通）を300ms吸収
  function tapGuard() {
    const g = h("div", { class: "tap-guard", "aria-hidden": "true" });
    document.body.appendChild(g);
    setTimeout(() => g.remove(), 300);
  }
  // シート：dirty 保護（入力が変わっていれば「破棄しますか」を確認）、menu（ヘッダー右上の「…」）、onClose
  function syncSheetState() { document.body.classList.toggle("has-sheet", !!document.querySelector("#sheets .sheet-wrap")); }
  K.sheet = ({ title, body, actions, className, onClose, menu, guard }) => {
    const host = document.getElementById("sheets");
    const prevFocus = document.activeElement;
    let closed = false, dirty = false;
    const finish = () => {
      if (closed) return; closed = true;
      wrap.remove(); document.removeEventListener("keydown", onKey); tapGuard(); syncSheetState();
      if (onClose) { try { onClose(); } catch (e) { console.error(e); } }
      if (prevFocus && prevFocus.focus && document.contains(prevFocus)) prevFocus.focus({ preventScroll: true });
    };
    // 保存以外の閉じ方（×・キャンセル）で、入力が変わっていれば確認する。guard:false で無効化
    const close = async (force) => {
      if (closed) return;
      if (force !== true && dirty && guard !== false) {
        const ok = await K.confirm("入力した内容は保存されていません。破棄して閉じますか？", "破棄して閉じる", { danger: true });
        if (!ok) return;
      }
      finish();
    };
    const isTop = () => host.lastElementChild === wrap;
    const hasInputs = () => !!panel.querySelector("input:not([type=hidden]),select,textarea");
    const onKey = (e) => { if (e.key === "Escape" && isTop()) { e.stopImmediatePropagation(); if (!hasInputs()) finish(); else close(); } };
    const acts = (actions || [{ label: "閉じる", kind: "ghost" }]).map((a) =>
      h("button", {
        class: "btn " + (a.kind || ""),
        text: a.label,
        disabled: a.disabled,
        onClick: async (ev) => {
          const btn = ev.currentTarget;
          if (!a.onClick) return close();
          if (btn.dataset.busy) return;
          btn.dataset.busy = "1";
          try { const r = await a.onClick(); if (r !== false) finish(); } catch (e) { console.error(e); }
          finally { delete btn.dataset.busy; }
        },
      }));
    const titleEl = h("div", { class: "sheet-title", text: title, tabindex: "-1" });
    const menuBtn = menu && menu.length ? h("button", { class: "icon-btn sheet-menu-btn", "aria-label": "その他の操作", title: "その他の操作", onClick: () => openMenu() }, K.icon("more")) : null;
    function openMenu() {
      const items = menu.filter((m) => m && !m.hidden);
      let chosen = null;
      const list = h("div", { class: "list" }, items.map((m) => h("button", { class: "li sheet-menu-item" + (m.danger ? " is-danger" : ""), disabled: m.disabled, onClick: () => { chosen = m; mclose(); } }, m.icon ? K.icon(m.icon) : null, h("span", { text: m.label }))));
      const mclose = K.sheet({ title: "その他の操作", className: "is-menu", body: list, actions: [{ label: "閉じる", kind: "ghost" }], onClose: async () => {
        if (!chosen) return;
        try { const r = await chosen.onClick(); if (r === "close") finish(); } catch (e) { console.error(e); }
      } });
    }
    const panel = h("div", { class: "sheet " + (className || ""), role: "dialog", "aria-modal": "true", "aria-label": title },
      h("div", { class: "sheet-head" }, titleEl, menuBtn,
        h("button", { class: "btn ghost sm icon-only", "aria-label": "閉じる", onClick: () => close() }, K.icon("x"))),
      h("div", { class: "sheet-body" }, body),
      h("div", { class: "sheet-actions" }, acts));
    panel.addEventListener("input", () => { dirty = true; });
    panel.addEventListener("change", (e) => { if (e.target && e.target.type !== "file") dirty = true; });
    const wrap = h("div", { class: "sheet-wrap", onClick: (e) => { if (e.target === wrap && !hasInputs()) finish(); } }, panel);
    host.appendChild(wrap); syncSheetState();
    document.addEventListener("keydown", onKey);
    setTimeout(() => {
      const f = panel.querySelector("input,select,textarea");
      if (f && !coarse()) f.focus(); else titleEl.focus({ preventScroll: true });
    }, 30);
    const api = (force) => close(force === undefined ? true : force);
    api.markClean = () => { dirty = false; };
    api.markDirty = () => { dirty = true; };
    return api;
  };
  // 確定ボタンは左・やめるは右（元のボタンと同じ位置）。表示直後450msは確定不可＝二度押し素通り防止
  const DANGER_RE = /削除|破棄|消す|上書き|退職|取り消/;
  K.confirm = (msg, okLabel, opts) =>
    new Promise((res) => {
      const danger = opts && typeof opts.danger === "boolean" ? opts.danger : DANGER_RE.test(okLabel || "");
      let done = false;
      const close = K.sheet({
        title: "確認",
        className: "is-confirm",
        onClose: () => { if (!done) { done = true; res(false); } },
        body: h("p", { class: "confirm-msg", text: msg }),
        actions: [
          { label: okLabel || "実行する", kind: (danger ? "danger" : "primary") + " confirm-ok", disabled: true, onClick: () => { done = true; res(true); } },
          { label: "やめる", kind: "ghost", onClick: () => { done = true; res(false); } },
        ],
      });
      setTimeout(() => { const ok = document.querySelector("#sheets .sheet-wrap:last-child .confirm-ok"); if (ok) ok.disabled = false; }, 450);
      void close;
    });

  /* ---------- アイコン ---------- */
  const ICONS = {
    home: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
    box: "M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10",
    book: "M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3zM4 17a3 3 0 0 1 3-3h11",
    calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
    chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
    tray: "M3 13l3-8h12l3 8v6H3zM3 13h5l1 2h6l1-2h5",
    x: "M6 6l12 12M18 6L6 18",
    plus: "M12 5v14M5 12h14",
    more: "M5 12h.01M12 12h.01M19 12h.01",
    gear: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1",
    user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
    alert: "M12 3l10 18H2zM12 10v5M12 18v.5",
    check: "M5 12l5 5 9-10",
    edit: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4",
    trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
    send: "M4 12l16-8-6 16-3-7z",
    pin: "M9 3h6l-1 6 4 4H6l4-4zM12 13v8",
    bell: "M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0",
    cart: "M3 4h2l2 12h11l2-8H6M9 20a1 1 0 1 0 0 .1M17 20a1 1 0 1 0 0 .1",
    clip: "M9 4h6v3H9zM7 5H5v16h14V5h-2M8 12h8M8 16h5",
    bulb: "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z",
    chev: "M9 6l6 6-6 6",
    knife: "M3 21l9-9M12 12l8-8c1 3 0 6-3 9l-2 2z",
    clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2",
    sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
    thermo: "M10 4a2 2 0 1 1 4 0v10.5a4 4 0 1 1-4 0zM12 9v8",
    list: "M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01",
    waste: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11l4 5M14 11l-4 5",
    truck: "M2 6h11v10H2zM13 9h5l3 3v4h-8M6 19a2 2 0 1 0 0-.1M17 19a2 2 0 1 0 0-.1",
    chevl: "M15 6l-6 6 6 6",
  };
  K.icon = (name) => {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("class", "ico");
    svg.setAttribute("aria-hidden", "true");
    const p = document.createElementNS(ns, "path");
    p.setAttribute("d", ICONS[name] || ICONS.box);
    p.setAttribute("fill", "none");
    p.setAttribute("stroke", "currentColor");
    p.setAttribute("stroke-width", "1.8");
    p.setAttribute("stroke-linecap", "round");
    p.setAttribute("stroke-linejoin", "round");
    svg.appendChild(p);
    return svg;
  };

  /* ---------- サブタブ ---------- */
  K.subtabs = (root, moduleKey, tabs) => {
    const key = "kitchen-ledger-sub-" + moduleKey;
    let cur = null;
    try { cur = localStorage.getItem(key); } catch (e) {}
    if (!tabs.find((t) => t.id === cur)) cur = tabs[0].id;
    const bar = h("div", { class: "subtabs", role: "tablist" });
    const panes = {};
    const btns = {};
    tabs.forEach((t) => {
      btns[t.id] = h("button", { class: "subtab", role: "tab", text: t.label, onClick: () => show(t.id) });
      bar.appendChild(btns[t.id]);
      panes[t.id] = h("div", { class: "pane", role: "tabpanel", hidden: true });
    });
    const rendered = {};
    function show(id) {
      if (!panes[id]) return;
      cur = id;
      try { localStorage.setItem(key, id); } catch (e) {}
      tabs.forEach((t) => {
        panes[t.id].hidden = t.id !== id;
        btns[t.id].setAttribute("aria-selected", String(t.id === id));
      });
      if (!rendered[id]) { rendered[id] = true; tabs.find((t) => t.id === id).render(panes[id]); }
    }
    root.appendChild(bar);
    tabs.forEach((t) => root.appendChild(panes[t.id]));
    show(cur);
    subtabApi[moduleKey] = { show };
    return { show };
  };
  const subtabApi = {};

  /* ---------- 入力欄が下の固定バー・下タブ・キーボードに隠れないよう自動スクロール ---------- */
  function obstructBottom() {
    const vv = window.visualViewport;
    const viewBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
    let top = viewBottom;
    document.querySelectorAll("#nav, [data-fixed-bottom]").forEach((el) => {
      const cs = getComputedStyle(el); if (cs.position !== "fixed" && cs.position !== "sticky") return;
      const r = el.getBoundingClientRect(); if (r.height && r.top < viewBottom && r.bottom >= viewBottom - 2) top = Math.min(top, r.top);
    });
    return top;
  }
  function keepVisible(el) {
    if (!el || !el.getBoundingClientRect) return;
    const inSheet = el.closest(".sheet-body");
    const r = el.getBoundingClientRect();
    const limit = inSheet ? Math.min(inSheet.getBoundingClientRect().bottom, (window.visualViewport ? window.visualViewport.offsetTop + window.visualViewport.height : innerHeight)) : obstructBottom();
    const topLimit = inSheet ? inSheet.getBoundingClientRect().top : (document.querySelector(".top") ? document.querySelector(".top").getBoundingClientRect().bottom : 0) + 48;
    if (r.bottom > limit - 12 || r.top < topLimit) el.scrollIntoView({ block: "center", behavior: "smooth" });
  }
  document.addEventListener("focusin", (e) => {
    const t = e.target; if (!t || !/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    setTimeout(() => keepVisible(t), 60);
    setTimeout(() => keepVisible(t), 350); // キーボード表示後にもう一度
  });
  K.keepVisible = keepVisible;

  /* ---------- 窓口（サービス登録）：クイックメモ等から各モジュールの処理を呼ぶ ----------
     各モジュールは自分のデータへ書く処理だけを登録する。core は呼ぶだけで他モジュールのデータに直接書かない。 */
  const services = {};
  K.provide = (key, def) => {
    if (!def || typeof def.handle !== "function") throw new Error("K.provide: handle が必要です");
    services[key] = Object.assign({ key, label: key, icon: "send", order: 50 }, def);
    K.emit("services", Object.keys(services));
  };
  K.services = () => Object.values(services).sort((a, b) => a.order - b.order);
  K.callService = async (key, payload) => {
    const sv = services[key];
    if (!sv) { K.toast("この行き先は使えません", "bad"); return false; }
    try { return !!(await sv.handle(Object.freeze(Object.assign({}, payload)))); } catch (e) { console.error(e); return false; }
  };

  /* ---------- 問い合わせ窓口（読み取り専用の計算結果を他モジュールへ渡す） ----------
     計算ロジックの持ち主だけが K.answer で登録し、他は K.ask で結果を読むだけ（複製禁止）。
     fn は同期関数で、返り値は凍結コピー。未登録・例外時は null。 */
  const answers = {};
  K.answer = (key, fn) => { if (typeof fn !== "function") throw new Error("K.answer: 関数が必要です"); answers[key] = fn; K.emit("answers", key); };
  K.ask = (key, args) => {
    const fn = answers[key];
    if (!fn) return null;
    try { const r = fn(Object.freeze(Object.assign({}, args || {}))); return r == null ? null : JSON.parse(JSON.stringify(r)); } catch (e) { console.error(e); return null; }
  };

  /* ---------- ナビのバッジ（各モジュールは自分のタブにだけ付ける） ---------- */
  const badgeState = {};
  K.badge = (key, count, kind) => {
    badgeState[key] = { count: Number(count) || 0, kind: kind || "bad" };
    const b = document.querySelector('.nav-btn[data-key="' + key + '"] .nav-badge');
    if (!b) return;
    const st = badgeState[key];
    b.hidden = !st.count;
    b.textContent = st.count > 99 ? "99+" : String(st.count);
    b.className = "nav-badge " + st.kind;
    b.closest(".nav-btn").setAttribute("aria-label", b.closest(".nav-btn").querySelector(".nav-label").textContent + (st.count ? "（" + st.count + "件）" : ""));
  };

  /* ---------- モジュール登録・ナビ ---------- */
  const modules = [];
  K.register = (m) => modules.push(m);
  let currentKey = null;
  const views = {};
  K.go = (key, sub, opts) => {
    const m = modules.find((x) => x.key === key);
    if (!m) return;
    currentKey = key;
    modules.forEach((x) => {
      if (!views[x.key]) return;
      views[x.key].hidden = x.key !== key;
    });
    if (!views[key].dataset.mounted) {
      views[key].dataset.mounted = "1";
      try { m.mount(views[key]); } catch (e) { console.error(e); views[key].appendChild(K.empty("この画面を表示できませんでした", String(e.message || e))); }
    }
    document.querySelectorAll(".nav-btn").forEach((b) => b.setAttribute("aria-current", b.dataset.key === key ? "page" : "false"));
    if (sub && subtabApi[key]) subtabApi[key].show(sub);
    try { localStorage.setItem("kitchen-ledger-tab", key); } catch (e) {}
    window.scrollTo(0, 0);
    K.emit("nav", { key, sub, filter: opts && opts.filter ? opts.filter : null });
  };

  /* ---------- ヘッダー（統括） ---------- */
  function renderHeader() {
    const s = K.settings();
    const nameEl = document.getElementById("store-name");
    if (nameEl) nameEl.textContent = s.storeName || "店舗名未設定";
    const sel = document.getElementById("staff-pick");
    if (sel) {
      const cur = K.currentStaffId() || "";
      sel.textContent = "";
      sel.appendChild(h("option", { value: "", text: "担当者を選ぶ" }));
      K.list("staff").filter((x) => x.active !== false).forEach((x) => sel.appendChild(h("option", { value: x.id, text: x.name })));
      sel.value = cur;
    }
    const st = document.getElementById("conn");
    if (st) {
      const m = K.mode();
      st.textContent = readOnly ? "閲覧のみ" : m === "db" ? "共有中" : m === "local" ? "この端末のみ" : "接続中…";
      st.className = "conn " + (readOnly ? "warn" : m === "db" ? "ok" : m === "local" ? "info" : "");
      st.setAttribute("role", "button"); st.tabIndex = 0;
      st.setAttribute("aria-label", "接続状態：" + st.textContent);
      if (!st.dataset.bound) { st.dataset.bound = "1"; const say = () => K.toast(st.title || ("接続状態：" + st.textContent)); st.addEventListener("click", say); st.addEventListener("keydown", (e) => { if (e.key === "Enter") say(); }); }
      st.title = m === "local" ? "共有データに接続できないため、この端末のブラウザにだけ保存しています" : m === "db" ? "スタッフ全員とデータを共有しています" : "";
    }
  }
  /* ---------- データの保存・バックアップ（独立アプリ／この端末のみモード） ---------- */
  const fmtBytes = (n) => (n >= 1048576 ? (n / 1048576).toFixed(1) + "MB" : Math.max(1, Math.round(n / 1024)) + "KB");
  function backupObject() {
    const data = {};
    KV.keys().filter((k) => DATA_KEY_RE.test(k)).forEach((k) => { data[k] = KV.get(k); });
    return { app: "BRIGADE", format: 1, exportedAt: new Date().toISOString(), storeName: K.settings().storeName || "", data };
  }
  async function exportBackup() {
    await KV.flush();
    const obj = backupObject();
    const json = JSON.stringify(obj);
    const d = new Date(), pad = (x) => String(x).padStart(2, "0");
    const name = "BRIGADE_backup_" + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "_" + pad(d.getHours()) + pad(d.getMinutes()) + ".json";
    const file = new File([json], name, { type: "application/json" });
    // スマホ：共有シート（ファイルに保存・AirDrop・LINE など）。使えなければダウンロード
    try { if (navigator.canShare && navigator.canShare({ files: [file] }) && /iPhone|iPad|Android/i.test(navigator.userAgent)) { await navigator.share({ files: [file], title: name }); markBackup(); return; } } catch (e) { if (e && e.name === "AbortError") return; }
    const a = document.createElement("a"); a.href = URL.createObjectURL(file); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    markBackup();
    K.toast("バックアップを書き出しました（" + fmtBytes(json.length) + "）", "ok");
  }
  function markBackup() { try { localStorage.setItem("kitchen-ledger-last-backup", new Date().toISOString()); } catch (e) {} }
  function importBackup() {
    const inp = h("input", { type: "file", accept: "application/json,.json", style: { display: "none" } });
    inp.addEventListener("change", async () => {
      const f = inp.files && inp.files[0]; inp.remove(); if (!f) return;
      let obj; try { obj = JSON.parse(await f.text()); } catch (e) { K.toast("バックアップのファイルを読み込めませんでした", "bad"); return; }
      if (!obj || obj.app !== "BRIGADE" || !obj.data || typeof obj.data !== "object") { K.toast("BRIGADE のバックアップではありません", "bad"); return; }
      if (!(Number(obj.format) >= 1 && Number(obj.format) <= 1)) { K.toast("このバックアップは新しい版のBRIGADEで作られています。アプリを更新してから読み込んでください", "bad"); return; }
      const keys = Object.keys(obj.data).filter((k) => DATA_KEY_RE.test(k));
      const valid = keys.length && keys.some((k) => k.indexOf(LS_KEY) === 0) && keys.every((k) => { const v = obj.data[k]; if (typeof v !== "string") return false; try { const p = JSON.parse(v); return p !== null && typeof p === "object"; } catch (e) { return false; } });
      if (!valid) { K.toast("バックアップの中身が壊れているため読み込めません（いまのデータはそのままです）", "bad"); return; }
      if (!(await K.confirm("「" + (obj.storeName || "店舗名なし") + "」のバックアップ（" + K.fmt.date(String(obj.exportedAt || "").slice(0, 10)) + " 書き出し）で、この端末のデータを上書きします。いまのデータは消えます。", "上書きして読み込む", { danger: true }))) return;
      // 念のため、上書き前のデータを退避（設定の「読み込み前に戻す」で戻せる）
      KV.set("kitchen-ledger-prev-backup", JSON.stringify(backupObject()));
      KV.keys().filter((k) => DATA_KEY_RE.test(k)).forEach((k) => KV.remove(k));
      keys.forEach((k) => KV.set(k, obj.data[k]));
      if (!(await KV.flush())) return;
      K.toast("読み込みました。再起動します", "ok");
      setTimeout(() => location.reload(), 600);
    });
    document.body.appendChild(inp); inp.click();
  }
  async function loadSample() {
    if (Object.keys((lsLoad().items) || {}).length && !(await K.confirm("いまのデータをサンプルデータで置き換えます。いまのデータは消えます。", "置き換える", { danger: true }))) return;
    let txt; try { const r = await fetch("sample.json", { cache: "no-cache" }); txt = await r.text(); } catch (e) { K.toast("サンプルデータを読み込めませんでした", "bad"); return; }
    // サンプルの日付を今日に合わせてずらす（曜日を保つため7日単位）
    const base = (JSON.parse(txt).__base) || K.today();
    const off = K.daysBetween(K.weekStart(base), K.weekStart(K.today())); // 週単位（曜日と今週のシフトを保つ）
    if (off) txt = txt.replace(/\b(20\d\d-\d\d-\d\d)/g, (d) => K.addDays(d, off));
    const sample = JSON.parse(txt); delete sample.__base;
    KV.keys().filter((k) => k.indexOf(LS_KEY) === 0).forEach((k) => KV.remove(k));
    KV.set(LS_KEY, JSON.stringify(sample)); if (!(await KV.flush())) return;
    K.toast("サンプルデータを入れました。再起動します", "ok"); setTimeout(() => location.reload(), 600);
  }
  async function wipeAll() {
    if (!(await K.confirm("この端末の BRIGADE のデータ（在庫・レシピ・シフト・売上・自分のタスク・メモ・写真）をすべて消します。元に戻せません。先にバックアップの書き出しをおすすめします。", "すべて消す", { danger: true }))) return;
    KV.keys().filter((k) => DATA_KEY_RE.test(k) || k === "kitchen-ledger-prev-backup").forEach((k) => KV.remove(k)); if (!(await KV.flush())) return;
    try { localStorage.removeItem("kitchen-ledger-staff"); } catch (e) {}
    K.toast("消去しました。再起動します", "ok"); setTimeout(() => location.reload(), 600);
  }
  async function restorePrev() {
    let obj; try { obj = JSON.parse(KV.get("kitchen-ledger-prev-backup") || "null"); } catch (e) { obj = null; }
    if (!obj || !obj.data) { K.toast("戻せるデータがありません", "bad"); return; }
    if (!(await K.confirm("最後にバックアップを読み込む直前（" + K.fmt.date(String(obj.exportedAt).slice(0, 10)) + " " + String(obj.exportedAt).slice(11, 16) + "）のデータに戻します。いまのデータは消えます。", "戻す", { danger: true }))) return;
    KV.keys().filter((k) => DATA_KEY_RE.test(k)).forEach((k) => KV.remove(k));
    Object.keys(obj.data).filter((k) => DATA_KEY_RE.test(k)).forEach((k) => KV.set(k, obj.data[k]));
    KV.remove("kitchen-ledger-prev-backup");
    if (!(await KV.flush())) return;
    K.toast("戻しました。再起動します", "ok"); setTimeout(() => location.reload(), 600);
  }
  function dataSection() {
    const info = h("div", { class: "data-info muted small", text: "保存状況を確認中…" });
    (async () => {
      await KV.flush();
      let used = 0; KV.keys().filter((k) => DATA_KEY_RE.test(k)).forEach((k) => { used += (KV.get(k) || "").length; });
      let persisted = null; try { if (navigator.storage && navigator.storage.persisted) persisted = await navigator.storage.persisted(); } catch (e) {}
      let last = null; try { last = localStorage.getItem("kitchen-ledger-last-backup"); } catch (e) {}
      info.textContent = "";
      info.append(...[
        h("span", null, "保存方式：" + (KV.kind === "indexedDB" ? "この端末のアプリ内（IndexedDB）" : "この端末のブラウザ（localStorage・容量小）")),
        h("span", null, "使用量：約 " + fmtBytes(used)),
        persisted === null ? null : h("span", null, persisted ? "自動削除からの保護：あり" : "自動削除からの保護：なし（ホーム画面に追加すると守られやすくなります）"),
        h("span", { class: last ? "" : "is-warn" }, "最後のバックアップ：" + (last ? K.fmt.date(last.slice(0, 10)) + " " + last.slice(11, 16) : "まだありません")),
      ].filter(Boolean));
    })();
    return h("div", { class: "data-sec" },
      h("div", { class: "data-title" }, K.icon("box"), "データ（この端末に保存）"),
      info,
      h("div", { class: "data-btns" },
        h("button", { class: "btn", onClick: exportBackup }, K.icon("send"), "バックアップを書き出す"),
        h("button", { class: "btn", onClick: importBackup }, K.icon("tray"), "バックアップから読み込む")),
      h("p", { class: "muted small", text: "機種変更や別の端末へ移すときは、書き出したファイルを新しい端末で「読み込む」。週に1回の書き出しをおすすめします。" }),
      h("div", { class: "data-btns" },
        K.standalone ? h("button", { class: "btn ghost", onClick: loadSample }, "サンプルデータで試す") : null,
        KV.get("kitchen-ledger-prev-backup") ? h("button", { class: "btn ghost", onClick: restorePrev }, "読み込み前のデータに戻す") : null,
        h("button", { class: "btn danger-ghost", onClick: wipeAll }, K.icon("trash"), "すべてのデータを消す")));
  }

  function openSettings() {
    const s = K.settings();
    const name = K.input({ value: s.storeName, placeholder: "例：和食 さかい" });
    const food = K.input({ type: "number", value: Math.round(s.targetFoodCost * 100), min: 0, max: 100 });
    const labor = K.input({ type: "number", value: Math.round(s.targetLabor * 100), min: 0, max: 100 });
    const days = K.input({ value: s.openDays, placeholder: "例：火〜日（月曜定休）" });
    K.sheet({
      title: "店舗設定",
      body: h("div", { class: "stack" },
        K.field("店舗名", name),
        h("div", { class: "grid2" }, K.field("目標原価率（%）", food), K.field("目標人件費率（%）", labor)),
        K.field("営業日", days),
        h("p", { class: "muted small", text: "保存先：" + (K.mode() === "db" ? "共有データ（スタッフ全員に反映）" : "この端末のみ") }),
        K.mode() === "local" ? dataSection() : null),
      actions: [
        { label: "キャンセル", kind: "ghost" },
        {
          label: "保存", kind: "primary", disabled: readOnly,
          onClick: async () => {
            K.clearErrors(food.closest(".stack"));
            [food, labor].forEach((c) => { const v = c.value.trim(), n = Number(v); if (v === "" || !isFinite(n) || n < 0 || n > 100) K.fieldError(c, "0〜100の数値で入力してください"); });
            if (K.focusFirstError(food.closest(".stack"))) return false;
            await CORE.put("settings", "main", {
              storeName: name.value.trim(),
              targetFoodCost: Number(food.value) / 100,
              targetLabor: Number(labor.value) / 100,
              openDays: days.value.trim(),
            });
            K.toast("店舗設定を保存しました", "ok");
          },
        },
      ],
    });
  }

  /* ---------- 起動 ---------- */
  K.boot = async () => {
    modules.sort((a, b) => (a.order || 0) - (b.order || 0));
    const nav = document.getElementById("nav");
    const main = document.getElementById("views");
    modules.forEach((m) => {
      const b = h("button", { class: "nav-btn", dataset: { key: m.key }, onClick: () => K.go(m.key) }, h("span", { class: "nav-ico" }, K.icon(m.icon), h("b", { class: "nav-badge", hidden: true })), h("span", { class: "nav-label", text: m.label, dataset: { short: m.short || String(m.label).split("・")[0] } }));
      nav.appendChild(b);
      views[m.key] = h("section", { class: "view", hidden: true, "aria-label": m.label });
      main.appendChild(views[m.key]);
    });
    // クイックメモのボタン：スマホは下タブの中央、PCはサイドバー下端
    const memoBtn = h("button", { class: "memo-fab", id: "memo-fab", "aria-label": "クイックメモ（M）", onClick: () => K.openMemos() },
      h("span", { class: "memo-fab-ico" }, K.icon("plus"), h("b", { class: "nav-badge info", id: "memo-badge", hidden: true })),
      h("span", { class: "memo-fab-label" }, "メモ"), h("kbd", { class: "memo-kbd", text: "M" }));
    const navBtns = nav.querySelectorAll(".nav-btn");
    nav.insertBefore(memoBtn, navBtns[Math.floor(navBtns.length / 2)] || null); // メモは下タブの真ん中
    document.addEventListener("keydown", (e) => {
      if ((e.key === "m" || e.key === "M") && !e.ctrlKey && !e.metaKey && !e.altKey && !/^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || "") && !(e.target && e.target.isContentEditable) && !document.querySelector("#sheets .sheet-wrap")) { e.preventDefault(); K.openMemos(); }
    });
    Object.keys(badgeState).forEach((k) => K.badge(k, badgeState[k].count, badgeState[k].kind));
    document.getElementById("settings-btn").addEventListener("click", openSettings);
    document.getElementById("today-btn").addEventListener("click", () => K.openToday());
    document.addEventListener("keydown", (e) => { if ((e.key === "t" || e.key === "T") && !e.ctrlKey && !e.metaKey && !e.altKey && !/^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || "") && !document.querySelector("#sheets .sheet-wrap") && !document.getElementById("today-mode")) { e.preventDefault(); K.openToday(); } });
    document.getElementById("staff-pick").addEventListener("change", (e) => K.setCurrentStaff(e.target.value || null));
    K.on("staff", renderHeader);
    K.on("settings", renderHeader);
    K.on("readonly", () => { renderHeader(); document.body.classList.add("is-readonly"); });
    renderHeader();

    // バックエンド選択
    let db = null;
    if (window.claude && typeof window.claude.use === "function") {
      try { db = await window.claude.use("db"); } catch (e) { db = null; }
    }
    if (db) {
      backend = { mode: "db", db };
      // 写真（assets）は待たずに取得。null のとき写真の追加は不可（表示は可）
      window.claude.use("assets").then((a) => { assetsApi = a || null; K.emit("photos", K.photos.canUpload()); }).catch(() => {});
      try {
        const user = await window.claude.use("user");
        if (user) { const can = await user.can("data.write"); if (can === false) { readOnly = true; document.body.classList.add("is-readonly"); } }
        if (user) { try { memoUid = await user.id(); } catch (e) { memoUid = null; } }
      } catch (e) {}
    } else {
      const indep = !window.claude; // Claude の外（独立アプリ）
      if (indep) {
        if (!(await acquireLock())) {
          busyScreen("別の画面で開いています", "BRIGADE は同時に1つの画面（ブラウザのタブまたはホーム画面のアプリ）でだけ使えます。データの上書きを防ぐためです。", "この画面で使う", takeOver);
          return;
        }
        lockLost = () => { KV.flush(); KV.stop(); readOnly = true; busyScreen("別の画面で開かれました", "この画面は止めました（データは保存済みです）。続けてこの画面で使う場合は下のボタンを押してください。", "この画面で使う", takeOver); };
        await KV.init();
      }
      localAll = lsLoad();
      backend = { mode: "local" };
      K.standalone = indep;
      if (indep) document.body.classList.add("is-standalone");
      // 端末の保存領域を「消されにくい」設定にする（ブラウザが対応していれば）
      try { if (navigator.storage && navigator.storage.persist) navigator.storage.persisted().then((p) => p || navigator.storage.persist()).catch(() => {}); } catch (e) {}
    }
    ["settings", "staff"].forEach(ensureSub);
    Object.keys(watchers).forEach(ensureSub);
    renderHeader();
    memoInit();
    myInit();

    let start = null;
    try { start = localStorage.getItem("kitchen-ledger-tab"); } catch (e) {}
    const hash = (location.hash || "").replace("#", "");
    if (modules.find((m) => m.key === hash)) start = hash;
    K.go(modules.find((m) => m.key === start) ? start : modules[0].key);
    // 独立アプリの初回起動：データが空なら「サンプルで試す／最初から」を選んでもらう
    if (K.standalone) {
      let seen = null; try { seen = localStorage.getItem("kitchen-ledger-welcome"); } catch (e) {}
      const empty = !Object.keys(localAll || {}).some((c) => Object.keys(localAll[c] || {}).length);
      if (empty && !seen) setTimeout(() => {
        const done = () => { try { localStorage.setItem("kitchen-ledger-welcome", "1"); } catch (e) {} };
        K.sheet({
          title: "BRIGADE へようこそ",
          body: h("div", { class: "stack" },
            h("p", { text: "在庫・発注・レシピ・仕込み・シフト・衛生記録・売上を、この端末ひとつで管理できる厨房アプリです。" }),
            h("p", { class: "muted small", text: "データはすべてこの端末の中に保存され、外部には送信されません。機種変更や予備のために、店舗設定（右上の歯車）からバックアップを書き出せます。" }),
            h("p", { class: "muted small", text: "まずはサンプルデータで操作を試すこともできます（あとで「すべてのデータを消す」で空に戻せます）。" })),
          actions: [
            { label: "最初から始める", kind: "ghost", onClick: () => { done(); } },
            { label: "サンプルで試す", kind: "primary", onClick: () => { done(); loadSample(); } },
          ],
          onClose: done,
        });
      }, 400);
    }
    // ホーム画面アイコンの長押しメニュー（ショートカット）から開いたとき
    try {
      const q = new URLSearchParams(location.search);
      if (q.has("today")) setTimeout(() => K.openToday(), 50);
      else if (q.has("memo")) setTimeout(() => K.openMemos(), 50);
      if (q.has("today") || q.has("memo")) history.replaceState(null, "", location.pathname);
    } catch (e) {}
  };

  /* ---------- 自分専用データ（K.my）：アカウント × いまの担当者 ごとに分けて保存 ----------
     共有モード：data/users/<自分のid>/space-<担当者id>/<kind>/<docId>（本人のアカウントだけが読める）
     それ以外：この端末の localStorage。担当者を切り替えると自動で切り替わる。 */
  const myWatch = {}; // kind -> {cbs:Set, rows:[], unsub}
  const myScope = () => K.currentStaffId() || "me";
  let myMode = "local";
  function myLsKey(kind) { return "kitchen-ledger-my-" + myScope() + "-" + kind; }
  function myLsLoad(kind) { try { return JSON.parse(KV.get(myLsKey(kind)) || "{}"); } catch (e) { return {}; } }
  function myLsSave(kind, obj) { try { KV.set(myLsKey(kind), JSON.stringify(obj)); } catch (e) { K.toast("この端末に保存できませんでした（容量不足の可能性）", "bad"); throw e; } }
  function myColl(kind) { return backend.db.doc("data/users/" + memoUid + "/space-" + myScope()).collection(kind); }
  function myPublish(kind, rows) {
    const w = myWatch[kind]; if (!w) return;
    w.rows = rows.sort((a, b) => (a.id < b.id ? -1 : 1));
    w.cbs.forEach((cb) => { try { cb(w.rows); } catch (e) { console.error(e); } });
  }
  function mySub(kind) {
    const w = myWatch[kind]; if (!w || !backend) return;
    if (w.unsub) { try { w.unsub(); } catch (e) {} w.unsub = null; }
    if (myMode === "db") {
      w.unsub = myColl(kind).onSnapshot((snap) => myPublish(kind, snap.docs.map((d) => Object.assign({ id: d.id }, clone(d.data())))), (e) => console.warn("my snapshot", kind, e));
    } else {
      const o = myLsLoad(kind); myPublish(kind, Object.keys(o).map((id) => Object.assign({ id }, o[id])));
    }
  }
  function myInit() {
    myMode = backend && backend.mode === "db" && memoUid && !readOnly ? "db" : "local";
    Object.keys(myWatch).forEach(mySub);
  }
  K.on("staff", () => { if (backend) Object.keys(myWatch).forEach(mySub); });
  async function myWrite(op, kind, id, data) {
    if (myMode === "db") {
      const ref = myColl(kind).doc(id);
      try {
        if (op === "set") await ref.set(strip(data)); else if (op === "update") await ref.update(strip(data)); else await ref.delete();
      } catch (e) { K.toast("保存できませんでした。通信状態を確認してください", "bad"); throw e; }
      return id;
    }
    const o = myLsLoad(kind);
    if (op === "update" && !o[id]) { const e = new Error("存在しない記録は更新できません"); e.code = "invalid_argument"; throw e; }
    if (op === "set") o[id] = strip(data); else if (op === "update") o[id] = Object.assign({}, o[id], strip(data)); else delete o[id];
    myLsSave(kind, o); myPublish(kind, Object.keys(o).map((k) => Object.assign({ id: k }, o[k])));
    return id;
  }
  K.my = {
    watch: (kind, cb) => {
      if (!/^[a-zA-Z][\w-]{0,40}$/.test(kind)) throw new Error("K.my: kind が不正です");
      let w = myWatch[kind];
      if (!w) { w = myWatch[kind] = { cbs: new Set(), rows: [], unsub: null }; if (backend) mySub(kind); }
      w.cbs.add(cb);
      if (backend) { try { cb(w.rows); } catch (e) { console.error(e); } }
      return () => w.cbs.delete(cb);
    },
    list: (kind) => (myWatch[kind] ? myWatch[kind].rows : []),
    get: (kind, id) => (myWatch[kind] ? myWatch[kind].rows.find((r) => r.id === id) || null : null),
    add: (kind, data) => myWrite("set", kind, newId(), data),
    put: (kind, id, data) => myWrite("set", kind, id, data),
    patch: (kind, id, data) => myWrite("update", kind, id, data),
    del: (kind, id) => myWrite("delete", kind, id),
    mode: () => myMode,
    owner: () => (K.currentStaffId() ? K.staffName(K.currentStaffId()) : "この端末の利用者"),
    note: () => (myMode === "db" ? K.my.owner() + "さん専用（あなたのアカウントだけが見られます）" : K.my.owner() + "さん専用（この端末に保存）"),
  };

  /* ---------- 今日モード（統括の枠＋各担当の欄）：ピーク時用に大きな文字で今日必要なものだけ ---------- */
  const todaySecs = [];
  K.todaySection = (def) => { todaySecs.push(Object.assign({ order: 50, span: 1 }, def)); };
  K.openToday = () => {
    if (document.getElementById("today-mode")) return;
    const unsubs = [];
    const grid = h("div", { class: "tm-grid" });
    const clock = h("span", { class: "tm-clock num" });
    const tick = () => { const d = new Date(); clock.textContent = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
    tick(); const iv = setInterval(tick, 15000);
    const close = () => { clearInterval(iv); unsubs.forEach((u) => { try { u(); } catch (e) {} }); wrap.remove(); document.removeEventListener("keydown", onKey); document.body.classList.remove("has-today"); try { if (prevFocus && prevFocus.focus) prevFocus.focus(); } catch (e) {} };
    const prevFocus = document.activeElement;
    const onKey = (e) => {
      if (document.querySelector("#sheets .sheet-wrap")) return;
      if (e.key === "Escape") { close(); return; }
      if (e.key === "Tab") { // 今日モードの中でフォーカスを循環（aria-modal）
        const f = [...wrap.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")].filter((x) => !x.disabled && x.offsetParent !== null);
        if (!f.length) return;
        const i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && (i === -1 || i === f.length - 1)) { e.preventDefault(); f[0].focus(); }
      }
    };
    const wrap = h("div", { id: "today-mode", class: "tm-wrap", role: "dialog", "aria-modal": "true", "aria-label": "今日モード" },
      h("div", { class: "tm-head" },
        h("div", { class: "tm-title" }, h("span", { text: "今日モード" }), h("span", { class: "tm-date num", text: K.fmt.date(K.today()) }), clock),
        h("button", { class: "btn tm-close", onClick: close }, K.icon("x"), "閉じる")),
      grid);
    todaySecs.slice().sort((a, b) => a.order - b.order).forEach((sct) => {
      const body = h("div", { class: "tm-body" });
      grid.appendChild(h("section", { class: "tm-card" + (sct.span > 1 ? " is-wide" : "") }, h("h2", { class: "tm-sec" }, K.icon(sct.icon || "box"), sct.title), body));
      try { const u = sct.mount(body, { close }); if (typeof u === "function") unsubs.push(u); } catch (e) { console.error(e); body.appendChild(h("p", { class: "muted", text: "表示できませんでした" })); }
    });
    if (!todaySecs.length) grid.appendChild(K.empty("表示する項目がありません", "各画面の準備ができると、ここに今日必要なものが並びます。"));
    document.body.appendChild(wrap); document.body.classList.add("has-today");
    document.addEventListener("keydown", onKey);
    const cb = wrap.querySelector(".tm-close"); if (cb) cb.focus();
    return close;
  };

  /* ---------- マイページの欄（各モジュールが自分の欄を差し込む） ---------- */
  const mySections = [];
  K.mypageSection = (def) => { mySections.push(Object.assign({ order: 50 }, def)); K.emit("mypage-sections"); };
  K.mypageSections = () => mySections.slice().sort((a, b) => a.order - b.order);

  /* ---------- クイックメモ（統括）：書いた本人だけが見られる走り書き。あとで各モジュールの窓口へ回す ----------
     保存先：共有モード＝data/users/<自分のid>/<memoId>（本人のみ）／それ以外＝この端末（localStorage） */
  let memoUid = null;
  let memoMode = "local";
  let memos = [];
  const MEMO_LS = "kitchen-ledger-memos-v1";
  const MEMO_DRAFT = "kitchen-ledger-memo-draft";
  const MEMO_TAGS = ["品切れ", "追加仕込み", "発注に追加", "温度記録", "要確認"];
  const TAG_SUGGEST = { "品切れ": "stock.fix", "発注に追加": "order.add", "追加仕込み": "note.post", "温度記録": "note.post", "要確認": "note.post" };
  let memoCol = null;
  let allMemos = [];
  function memoPublish(list) {
    allMemos = list.slice();
    // 自分専用：いまの担当者が書いたメモだけ（未選択時は担当者なしのメモ）
    const me = K.currentStaffId() || null;
    memos = allMemos.filter((m) => (m.staffId || null) === me).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const open = memos.filter((m) => !m.done).length;
    const bd = document.getElementById("memo-badge");
    if (bd) { bd.hidden = !open; bd.textContent = open > 99 ? "99+" : String(open); }
    K.emit("memos", open);
    if (memoRender) memoRender();
  }
  function memoLsLoad() { try { return JSON.parse(KV.get(MEMO_LS) || "[]"); } catch (e) { return []; } }
  function memoLsSave(list) { try { KV.set(MEMO_LS, JSON.stringify(list)); } catch (e) { K.toast("この端末に保存できませんでした", "bad"); } }
  function memoInit() {
    if (backend && backend.mode === "db" && memoUid && !readOnly) {
      try {
        memoCol = backend.db.collection("data/users/" + memoUid);
        memoMode = "db";
        memoCol.onSnapshot((snap) => memoPublish(snap.docs.map((d) => Object.assign({ id: d.id }, clone(d.data())))),
          () => { memoMode = "local"; memoPublish(memoLsLoad()); });
        return;
      } catch (e) { memoCol = null; }
    }
    memoMode = "local";
    memoPublish(memoLsLoad());
  }
  async function memoPut(m) {
    const body = Object.assign({}, m); delete body.id;
    if (memoMode === "db") {
      try { await memoCol.doc(m.id).set(body); return; }
      catch (e) { K.toast("メモを保存できませんでした。通信状態を確認してください", "bad"); throw e; }
    }
    const list = memoLsLoad().filter((x) => x.id !== m.id); list.push(Object.assign({ id: m.id }, body)); memoLsSave(list); memoPublish(list);
  }
  async function memoDel(m) {
    if (memoMode === "db") { await memoCol.doc(m.id).delete(); }
    else { const list = memoLsLoad().filter((x) => x.id !== m.id); memoLsSave(list); memoPublish(list); }
    // 行き先へ回したメモの写真は、回した先（業務連絡・改訂メモ等）でも使われているので消さない
    if (m.photo && !m.routedTo) K.photos.remove(m.photo);
  }
  K.memos = () => memos.slice();
  K.on("staff", () => memoPublish(allMemos));
  K.routeMemo = (m) => routeMemo(m);

  const relTime = (iso) => {
    const d = new Date(iso); const diff = (Date.now() - d.getTime()) / 60000;
    if (diff < 1) return "いま"; if (diff < 60) return Math.floor(diff) + "分前"; if (diff < 60 * 24) return Math.floor(diff / 60) + "時間前";
    return (d.getMonth() + 1) + "/" + d.getDate() + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  };

  // 行き先を選ぶ
  async function routeMemo(m) {
    const list = K.services();
    if (!list.length) { K.toast("回せる行き先がまだありません", "bad"); return; }
    const sug = TAG_SUGGEST[m.tag];
    const ordered = list.slice().sort((a, b) => (a.key === sug ? -1 : b.key === sug ? 1 : 0));
    const pick = await new Promise((res) => {
      let chosen = null;
      const body = h("div", { class: "stack" },
        h("div", { class: "memo-quote" }, m.tag ? h("span", { class: "chip", text: m.tag }) : null, h("span", { text: (m.text || "（本文なし）") + (m.qty ? " ×" + m.qty : "") })),
        h("div", { class: "list" }, ordered.map((sv) => h("button", { class: "li memo-route", onClick: () => { chosen = sv.key; close(); } },
          h("span", { class: "memo-route-ico" }, K.icon(sv.icon || "send")),
          h("span", { class: "memo-route-txt" }, h("b", { text: sv.label }), sv.key === sug ? h("span", { class: "chip info", text: "おすすめ" }) : null),
          K.icon("chev")))));
      const close = K.sheet({ title: "行き先へ回す", body, actions: [{ label: "やめる", kind: "ghost" }], onClose: () => res(chosen) });
    });
    if (!pick) return;
    const ok = await K.callService(pick, m);
    if (ok) {
      const sv = list.find((x) => x.key === pick);
      await memoPut(Object.assign({}, m, { done: true, routedTo: sv ? sv.label : pick, routedAt: new Date().toISOString() }));
      K.toast("「" + (sv ? sv.label : pick) + "」に回しました", "ok");
    }
  }

  let memoRender = null;
  K.openMemos = () => {
    if (document.querySelector("#sheets .memo-sheet")) return;
    let draft = {};
    try { draft = JSON.parse(localStorage.getItem(MEMO_DRAFT) || "{}"); } catch (e) {}
    let tag = draft.tag || "", qty = draft.qty || "", photo = null, showDone = false, busy = false;
    const saveDraft = () => { try { localStorage.setItem(MEMO_DRAFT, JSON.stringify({ text: ta.value, tag, qty })); } catch (e) {} };
    const ta = h("textarea", { class: "inp memo-ta", id: "memo-text", rows: "3", placeholder: "例：キャベツ残り2玉／唐揚げの漬け時間を40分に", "aria-label": "メモ" });
    ta.value = draft.text || "";
    ta.addEventListener("input", saveDraft);
    const chips = h("div", { class: "fchips memo-tags", role: "group", "aria-label": "定型" }, MEMO_TAGS.map((t) => {
      const b = h("button", { class: "fchip", text: t, attrs: { "aria-pressed": String(tag === t) }, onClick: () => { tag = tag === t ? "" : t; chips.querySelectorAll(".fchip").forEach((x) => x.setAttribute("aria-pressed", String(x.textContent === tag))); saveDraft(); } });
      return b;
    }));
    const qtyIn = h("input", { class: "inp num memo-qty", id: "memo-qty", type: "number", inputmode: "decimal", min: "0", placeholder: "数量", value: qty, "aria-label": "数量（任意）" });
    qtyIn.addEventListener("input", () => { qty = qtyIn.value; saveDraft(); });
    const step = (d) => { const v = Math.max(0, (Number(qtyIn.value) || 0) + d); qtyIn.value = v || ""; qty = qtyIn.value; saveDraft(); };
    const photoBox = h("div", { class: "memo-photo-box" });
    const fileIn = h("input", { type: "file", accept: "image/*", class: "sr-only", id: "memo-file" });
    const photoBtn = h("label", { class: "btn sm memo-photo-btn", for: "memo-file" }, K.icon("plus"), "写真");
    fileIn.addEventListener("change", async () => {
      const f = fileIn.files && fileIn.files[0]; fileIn.value = ""; if (!f) return;
      photoBtn.classList.add("is-busy"); photoBtn.lastChild.textContent = "追加中…";
      try { if (photo) K.photos.remove(photo); photo = await K.photos.upload(f); } catch (e) { } finally { photoBtn.classList.remove("is-busy"); photoBtn.lastChild.textContent = "写真"; }
      renderPhoto();
    });
    function renderPhoto() {
      photoBox.textContent = "";
      if (!photo) return;
      photoBox.appendChild(h("span", { class: "memo-thumb" }, h("img", { src: K.photos.src(photo), alt: "メモの写真" }),
        h("button", { class: "icon-btn danger memo-thumb-x", "aria-label": "写真を外す", onClick: () => { K.photos.remove(photo); photo = null; renderPhoto(); } }, K.icon("x"))));
    }
    const canPhoto = K.photos.canUpload();
    const where = h("div", { class: "memo-where", text: memoMode === "db" ? "あなただけが見られるメモです" : "この端末だけに保存されます（あなた専用）" });
    const listHost = h("div", { class: "memo-list-host" });

    async function save() {
      const text = ta.value.trim();
      if (!text && !tag && !photo) { ta.setAttribute("aria-invalid", "true"); ta.focus(); K.toast("メモを入力してください", "bad"); return false; }
      if (busy) return false; busy = true;
      // 数量欄が空なら、本文の最後に出てくる「数字＋単位」を数量として拾う（例：キャベツ 2玉 → 2）
      let q = qty === "" ? null : Number(qty);
      if (q == null) { const mm = text.match(/(\d+(?:\.\d+)?)\s*(kg|ｋｇ|g|ｇ|L|ｌ|ml|個|玉|本|枚|切|丁|パック|袋|箱|束|株|尾|杯|缶|樽|ケース|cs)(?!.*\d)/i); if (mm) q = Number(mm[1]); }
      const m = { id: "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), text, tag, qty: q, photo: photo || null,
        staffId: K.currentStaffId(), createdAt: new Date().toISOString(), done: false, routedTo: null, routedAt: null };
      try { await memoPut(m); } catch (e) { busy = false; return false; }
      try { localStorage.removeItem(MEMO_DRAFT); } catch (e) {}
      photo = null; saved = true;
      K.toast("メモしました", "ok", { action: { label: "行き先へ回す", onClick: () => routeMemo(m) } });
      return true;
    }
    let saved = false;

    memoRender = () => {
      listHost.textContent = "";
      const open = memos.filter((m) => !m.done), done = memos.filter((m) => m.done);
      const shown = showDone ? done : open;
      listHost.appendChild(h("div", { class: "row memo-list-head" },
        h("span", { class: "sec-title", text: showDone ? "処理済みのメモ" : "未処理のメモ" }),
        h("span", { class: "muted small num", text: (showDone ? done.length : open.length) + "件" }), h("span", { class: "spacer" }),
        h("button", { class: "btn ghost sm", text: showDone ? "未処理を表示" : "処理済みを表示（" + done.length + "）", onClick: () => { showDone = !showDone; memoRender(); } })));
      if (!shown.length) { listHost.appendChild(h("p", { class: "muted small memo-empty", text: showDone ? "処理済みのメモはまだありません。" : "未処理のメモはありません。書いたメモはここに並び、あとで業務連絡・発注・在庫・レシピ・改善ボードへ回せます。" })); return; }
      listHost.appendChild(h("div", { class: "list" }, shown.slice(0, 50).map((m) => h("div", { class: "li memo-item" + (m.done ? " is-done" : "") },
        m.photo ? h("img", { class: "memo-item-img", src: K.photos.src(m.photo), alt: "", onError: (e) => { e.target.style.visibility = "hidden"; } }) : null,
        h("div", { class: "memo-item-body" },
          h("div", { class: "memo-item-text" }, m.tag ? h("span", { class: "chip", text: m.tag }) : null, " ", m.text || "（写真のみ）", m.qty ? h("b", { class: "num", text: " ×" + m.qty }) : null),
          h("div", { class: "muted small" }, relTime(m.createdAt) + (m.staffId ? "・" + K.staffName(m.staffId) : "") + (m.done && m.routedTo ? "・→ " + m.routedTo : m.done ? "・完了" : ""))),
        h("div", { class: "memo-item-acts" },
          m.done ? h("button", { class: "btn sm", text: "戻す", onClick: () => memoPut(Object.assign({}, m, { done: false, routedTo: null, routedAt: null })) })
            : h("button", { class: "btn sm", text: "行き先へ", onClick: () => routeMemo(m) }),
          !m.done ? h("button", { class: "icon-btn", "aria-label": "完了にする", title: "完了にする", onClick: () => memoPut(Object.assign({}, m, { done: true, routedAt: new Date().toISOString() })) }, K.icon("check")) : null,
          h("button", { class: "icon-btn danger", "aria-label": "削除", title: "削除", onClick: async () => { if (await K.confirm("このメモを削除しますか？", "削除する")) memoDel(m); } }, K.icon("trash")))))));
    };

    const body = h("div", { class: "stack memo-body" },
      ta,
      chips,
      h("div", { class: "row memo-row" },
        h("div", { class: "memo-stepper" },
          h("button", { class: "btn memo-step", "aria-label": "数量を1減らす", onClick: () => step(-1) }, "−"), qtyIn,
          h("button", { class: "btn memo-step", "aria-label": "数量を1増やす", onClick: () => step(1) }, "＋")),
        h("span", { class: "spacer" }),
        canPhoto ? photoBtn : null, canPhoto ? fileIn : null),
      photoBox,
      where,
      listHost);
    memoRender();
    K.sheet({
      title: "クイックメモ", className: "memo-sheet", body, guard: false,
      onClose: () => { memoRender = null; if (!saved && photo) { K.photos.remove(photo); } },
      actions: [
        { label: "閉じる", kind: "ghost" },
        { label: "保存", kind: "primary", onClick: save },
      ],
    });
    // 料理中にすぐ書けるよう、メモだけはスマホでも入力欄にフォーカス
    setTimeout(() => { try { ta.focus({ preventScroll: true }); } catch (e) {} }, 60);
    ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); document.querySelector("#sheets .memo-sheet .sheet-actions .btn.primary").click(); } });
  };

  /* ---------- 写真（全モジュール共通） ----------
     保存形式：photo = { id } （共有モード：アプリの保存領域） / { id, local: dataURL }（この端末のみ）
     表示：K.photos.src(photo) ／ 追加：await K.photos.upload(file) → photo（そのまま db に保存）／ 削除：K.photos.remove(photo) */
  let assetsApi = null;
  function loadImage(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); res(img); };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("画像を読み込めませんでした")); };
      img.src = url;
    });
  }
  async function shrink(file, maxSide, quality) {
    const img = await loadImage(file);
    const r = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * r); c.height = Math.round(img.naturalHeight * r);
    const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
    g.drawImage(img, 0, 0, c.width, c.height);
    return { canvas: c, toBlob: () => new Promise((res) => c.toBlob(res, "image/jpeg", quality)) };
  }
  K.photos = {
    canUpload: () => !readOnly && (backend && backend.mode === "local" ? true : !!assetsApi),
    src: (p) => (!p ? "" : p.local ? p.local : p.id ? "/_blob/" + p.id : ""),
    upload: async (file) => {
      if (!file || !/^image\//.test(file.type || "")) { K.toast("画像ファイルを選んでください", "bad"); throw new Error("not image"); }
      if (!K.photos.canUpload()) { K.toast("この画面では写真を追加できません（編集権限が必要です）", "bad"); throw new Error("no upload"); }
      try {
        if (backend.mode === "local") {
          const s = await shrink(file, 900, 0.72);
          const local = s.canvas.toDataURL("image/jpeg", 0.72);
          return { id: "l" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), local };
        }
        const s = await shrink(file, 1600, 0.82);
        const blob = await s.toBlob();
        let r;
        try { r = await assetsApi.upload(blob, { type: "image/jpeg" }); }
        catch (e) { if (e && e.code === "store_unavailable") { await new Promise((x) => setTimeout(x, 800)); r = await assetsApi.upload(blob, { type: "image/jpeg" }); } else throw e; }
        return { id: r.id };
      } catch (e) {
        const code = e && e.code;
        K.toast(code === "too_large" ? "写真が大きすぎます" : code === "quota_or_state" ? "写真の保存容量がいっぱいです。不要な写真を削除してください" : code === "rate_limited" ? "続けて追加しすぎました。少し待ってから追加してください" : "写真を保存できませんでした", "bad");
        throw e;
      }
    },
    remove: async (p) => {
      if (!p || p.local || !p.id || !assetsApi) return;
      try { await assetsApi.delete(p.id); } catch (e) { /* 他の人が追加した写真などは記録から外すだけ */ }
    },
  };

  // テスト用：ローカルモードに一括投入（ブラウザ検証専用。db モードでは何もしない）
  K.__seedLocal = (all) => {
    if (!backend || backend.mode !== "local") return false;
    localAll = all; lsSave(localAll);
    Object.keys(all).forEach((c) => { if (subscribed[c]) localPublish(c); });
    return true;
  };
})();
