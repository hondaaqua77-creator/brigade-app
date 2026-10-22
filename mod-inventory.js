/* 厨房帳 mod-inventory.js — 担当A：在庫・棚卸し・発注（items / suppliers / counts / orders） v1.1 */
(function () {
  "use strict";
  const K = window.K;
  const W = K.scope("inventory");
  const h = K.h;

  const CATS = ["肉", "魚", "野菜", "乾物", "調味料", "乳製品", "酒類", "消耗品", "その他"];
  const LOCS = ["冷蔵", "冷凍", "常温"];
  const STATUS = {
    draft: { label: "下書き", kind: "" },
    sent: { label: "発注済み", kind: "info" },
    received: { label: "納品済み", kind: "ok" },
  };
  const WA = { "data-write": "" };
  const MAXV = 10000000; // 数量・単価の上限（桁の打ち間違い防止）
  const DEC_UNITS = ["kg", "l", "ℓ", "キロ", "リットル"]; // 小数刻みを使う単位
  const STEP_KEY = "kitchen-ledger-inv-step";

  K.css("inv", `
/* v2：白基調・トークンのみ。独自の濃い影なし */
.inv-head { display: flex; align-items: center; gap: 10px; min-height: 44px; flex-wrap: wrap; }
.inv-head .sec-title { flex: 1 1 auto; }
.inv-cq { container-type: inline-size; min-width: 0; }
.inv-u { font-size: 12px; color: var(--muted); font-weight: 400; margin-left: 2px; }

/* 共通 .fchips/.fchip と .sumbar を使用 */
.inv-sumbar button.cell[aria-pressed="true"] { background: var(--accent-soft); }
.inv-sumbar button.cell { min-height: 60px; }

/* 検索・絞り込み */
.inv-filters { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.inv-frow { display: flex; gap: 8px; min-width: 0; }
.inv-frow .inp { min-width: 0; flex: 1 1 auto; }
.inv-frow .btn { flex: none; }
.inv-fbtn[aria-expanded="true"] { background: var(--accent-soft); border-color: var(--accent); color: var(--accent); }
.inv-fbtn .inv-dot { min-width: 20px; height: 20px; line-height: 20px; padding: 0 5px; border-radius: 9px; background: var(--accent); color: #fff; font: 700 12px/18px var(--f-num); text-align: center; }
.inv-fpanel { display: flex; flex-direction: column; gap: 12px; padding: 14px 16px; background: var(--surface); border: 1px solid var(--line); border-radius: var(--r); }
.inv-frowl { display: flex; align-items: center; gap: 8px 12px; flex-wrap: wrap; }
.inv-frowl > .inv-fl { font-size: 13px; font-weight: 700; color: var(--ink-2); min-width: 6.5em; }
.inv-fpanel .seg-btn { min-height: 40px; font-family: inherit; }

/* 在庫一覧：〜599px＝行カード（右に±）、600〜899px＝5列表、900px〜＝7列表（一覧の幅で判定） */
.inv-items { background: var(--surface); border: 1px solid var(--line); border-radius: var(--r); box-shadow: var(--shadow-sm); overflow: hidden; }
.inv-it { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) auto auto; grid-template-areas: "name name step" "stock st step"; gap: 0 10px; padding: 8px 12px 8px 16px; align-items: center; min-width: 0; min-height: 72px; }
.inv-it + .inv-it { border-top: 1px solid var(--line); }
.inv-it:not(.inv-th):hover { background: var(--surface-2); }
.inv-it.inv-th { display: none; }
.inv-c-name { grid-area: name; min-width: 0; }
.inv-c-stock { grid-area: stock; min-width: 0; white-space: nowrap; }
.inv-c-st { grid-area: st; justify-self: end; }
.inv-c-step { grid-area: step; position: relative; z-index: 1; display: flex; gap: 6px; margin-left: 2px; padding-left: 12px; border-left: 1px solid var(--line); align-self: stretch; align-items: center; }
.inv-c-cat, .inv-c-par, .inv-c-cost { display: none; }
.inv-name { display: flex; align-items: baseline; gap: 8px; border: 0; background: transparent; padding: 0; text-align: left; cursor: pointer; color: var(--ink); min-width: 0; max-width: 100%; font: inherit; }
.inv-name::after { content: ""; position: absolute; inset: 0; }
.inv-name .inv-nm { font-weight: 700; font-size: 16px; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.inv-name small { flex: none; font-family: var(--f-num); font-size: 12px; color: var(--muted); white-space: nowrap; }
.inv-name:hover .inv-nm { color: var(--accent); }
.inv-big { font-family: var(--f-num); font-variant-numeric: tabular-nums; font-size: 22px; font-weight: 600; line-height: 1.25; }
.inv-big.bad { color: var(--bad); } .inv-big.warn { color: var(--warn); }
.inv-mpar { font-size: 12px; color: var(--muted); margin-left: 8px; }
.inv-sb { min-width: 52px; min-height: 48px; padding: 0 8px; font-family: var(--f-num); font-size: 15px; font-variant-numeric: tabular-nums; }
.inv-sb.inv-plus { color: var(--accent); }
@container (min-width: 600px) {
  .inv-it, .inv-it.inv-th { display: grid; grid-template-columns: minmax(140px, 1fr) 110px 84px 76px 124px; grid-template-areas: none; gap: 0 12px; padding: 6px 12px 6px 16px; min-height: 60px; }
  .inv-it > * { grid-area: auto; }
  .inv-it.inv-th { min-height: 0; padding-top: 10px; padding-bottom: 10px; background: var(--surface-2); border-bottom: 1px solid var(--line); font-size: 12px; font-weight: 700; color: var(--muted); letter-spacing: .03em; }
  .inv-th + .inv-it { border-top: 0; }
  .inv-it.inv-th .inv-h-cat, .inv-it.inv-th .inv-h-cost { display: none; }
  .inv-c-par { display: block; }
  .inv-c-stock, .inv-c-par, .inv-c-cost { text-align: right; }
  .inv-c-st { justify-self: start; }
  .inv-c-step { justify-content: flex-end; border-left: 0; padding-left: 0; align-self: center; }
  .inv-name small, .inv-mpar { display: none; }
  .inv-name .inv-nm { font-size: 15px; }
  .inv-big { font-size: 18px; }
  .inv-sb { min-width: 56px; min-height: 44px; }
}
@container (min-width: 900px) {
  .inv-it, .inv-it.inv-th { grid-template-columns: minmax(150px, 2fr) minmax(110px, 1.3fr) 120px 90px 96px 76px 124px; }
  .inv-it.inv-th .inv-h-cat, .inv-it.inv-th .inv-h-cost { display: block; }
  .inv-c-cat, .inv-c-cost { display: block; }
  .inv-c-cat { font-size: 13px; color: var(--ink-2); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
}

/* 棚卸し */
.inv-group-title { display: flex; gap: 8px; align-items: center; font-size: 13px; font-weight: 700; color: var(--ink-2); margin: 6px 0 -6px; }
.inv-crow { display: grid; grid-template-columns: minmax(0, 1fr) auto 128px; gap: 12px; align-items: center; width: 100%; }
.inv-crow .inv-cname { min-width: 0; display: flex; flex-direction: column; }
.inv-crow .inv-cname b { font-size: 15.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: flex; align-items: center; }
.inv-crow .inv-cname b > span:last-child { overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.inv-crow .inv-book { font-size: 12px; color: var(--muted); text-align: right; white-space: nowrap; line-height: 1.35; }
.inv-crow .inv-book .num { font-size: 15px; color: var(--ink-2); font-weight: 600; }
.inv-msg { display: block; font-size: 12px; font-weight: 700; color: var(--bad); }
.inv-msg:empty { display: none; }
.inv-cinp { font-family: var(--f-num); font-variant-numeric: tabular-nums; font-size: 22px; font-weight: 600; min-height: 54px; text-align: right; padding: 6px 12px; }
.inv-cinp.inv-filled { border-color: var(--ok); background: var(--ok-soft); }
.inv-cinp { scroll-margin-bottom: calc(var(--inv-barh, 120px) + 80px); scroll-margin-top: 120px; }
.inv-cinp::placeholder { color: var(--line-strong); }
.inv-ck { display: inline-grid; place-items: center; width: 18px; height: 18px; border-radius: 50%; margin-right: 6px; vertical-align: -3px; border: 1.5px solid var(--line-strong); color: transparent; flex: none; }
.inv-ck .ico { width: 12px; height: 12px; }
.inv-ck.on { background: var(--ok); border-color: var(--ok); color: #fff; }
.inv-sticky .inv-sline .inv-todo, .inv-sticky .inv-sline .inv-todo b { color: var(--warn); }
.inv-only-m { display: flex; flex-direction: column; }
.inv-only-d { display: none; }
@media (min-width: 560px) { .inv-only-m { display: none; } .inv-only-d { display: block; } }
.inv-hli { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 2px 10px; }
.inv-hli .inv-hd { font-weight: 700; }
.inv-hli .inv-hm { grid-column: 1 / -1; font-size: 12px; color: var(--muted); }
.inv-hli .inv-ha { text-align: right; font-family: var(--f-num); font-variant-numeric: tabular-nums; font-weight: 600; }
.inv-hli.inv-cur { background: var(--accent-soft); }
.inv-more { align-self: center; }
.inv-unit-row { display: flex; gap: 8px; }
.inv-unit-row .inp { min-width: 0; flex: 1 1 0; }
.inv-sheet-sub { display: flex; gap: 8px; flex-wrap: wrap; border-top: 1px solid var(--line); padding-top: 12px; }
.inv-crow-out { background: var(--bad-soft); }
.inv-inp-err, .inv-cinp.inv-inp-err { border-color: var(--bad) !important; background: var(--bad-soft) !important; }
@media (min-width: 900px) { .inv-crow { grid-template-columns: minmax(0, 1fr) 120px 180px; } }
.inv-note { border-radius: var(--r-sm); padding: 12px 16px; font-size: 14px; font-weight: 700; border: 1px solid transparent; }
.inv-note.warn { background: var(--warn-soft); color: var(--warn); }
.inv-note.ok { background: var(--ok-soft); color: var(--ok); }
.inv-sticky { position: sticky; z-index: 6; bottom: calc(66px + env(safe-area-inset-bottom, 0px)); margin-inline: -16px; padding: 8px 12px 8px 16px; background: var(--surface); border-top: 1px solid var(--line); display: flex; align-items: center; gap: 10px; }
.inv-sticky .inv-sline { flex: 1 1 auto; min-width: 0; display: flex; flex-wrap: wrap; gap: 2px 12px; align-items: baseline; font-size: 13px; color: var(--muted); }
.inv-sticky .inv-sline b { font-family: var(--f-num); font-variant-numeric: tabular-nums; font-size: 17px; font-weight: 600; color: var(--ink); margin-left: 4px; white-space: nowrap; }
.inv-sticky .inv-sline .chip { font-size: 12.5px; }
.inv-sticky .btn { flex: none; }
.inv-sticky .inv-savebtn { padding: 0; width: 44px; }
.inv-hide-m { display: none; }
@media (min-width: 560px) {
  .inv-hide-m { display: inline; }
  .inv-sticky .inv-savebtn { width: auto; padding: 0 14px; }
}
@media (min-width: 900px) {
  .inv-sticky { bottom: 0; margin-inline: 0; border: 1px solid var(--line); border-radius: var(--r) var(--r) 0 0; padding: 12px 20px; }
  .inv-sticky .inv-savebtn { order: 2; }
  .inv-sticky .btn.primary { order: 3; }
}
.inv-cwrap { position: relative; }
.inv-cwrap .inv-cinp { padding-right: 40px; }
.inv-cu { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-size: 13px; font-weight: 700; color: var(--muted); pointer-events: none; }
.inv-telrow { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.inv-filters .fchip .ico { width: 14px; height: 14px; }
.inv-hist-cur td { background: var(--accent-soft); }
.inv-hist-cur td:first-child { box-shadow: inset 3px 0 0 var(--accent); }

/* 発注 */
.inv-otools { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.inv-otools .seg { flex: 0 1 auto; }
.inv-olist { display: flex; flex-direction: column; background: var(--surface); border: 1px solid var(--line); border-radius: var(--r); box-shadow: var(--shadow-sm); overflow: hidden; }
.inv-orow { display: grid; grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: "sup total" "meta act"; gap: 4px 12px; align-items: center; padding: 12px 16px; min-height: 64px; cursor: pointer; color: var(--ink); }
.inv-orow + .inv-orow { border-top: 1px solid var(--line); }
.inv-orow:hover { background: var(--surface-2); }
.inv-orow:focus-visible { outline-offset: -2px; }
.inv-o-sup { grid-area: sup; display: flex; align-items: center; gap: 8px; min-width: 0; }
.inv-o-sup b { font-size: 15.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.inv-o-total { grid-area: total; text-align: right; font-family: var(--f-num); font-variant-numeric: tabular-nums; font-size: 17px; font-weight: 600; }
.inv-o-meta { grid-area: meta; display: flex; gap: 6px 10px; flex-wrap: wrap; align-items: center; font-size: 13px; color: var(--ink-2); min-width: 0; }
.inv-o-meta .inv-dd { font-weight: 700; }
.inv-o-meta .inv-dd .num { font-size: 14px; }
.inv-o-meta .muted { font-size: 12px; }
.inv-o-act { grid-area: act; justify-self: end; }
.inv-o-act:empty { display: none; }
.inv-o-act .btn { min-height: 40px; }
@container (min-width: 720px) {
  .inv-orow { grid-template-columns: minmax(0, 1fr) minmax(220px, 1.2fr) 110px 168px; grid-template-areas: "sup meta total act"; min-height: 64px; }
}
.inv-ofoot { display: flex; justify-content: flex-end; gap: 8px; font-size: 13px; color: var(--muted); }
.inv-ofoot .num { color: var(--ink); font-weight: 600; }

/* 発注書シート：明細 */
.inv-ol { display: grid; grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: "name del" "q sub"; gap: 6px 10px; padding: 12px 14px; align-items: center; }
.inv-ol + .inv-ol { border-top: 1px solid var(--line); }
.inv-ol > .inv-oname { grid-area: name; min-width: 0; }
.inv-ol > .inv-qs { grid-area: q; }
.inv-ol > .inv-osub { grid-area: sub; text-align: right; font-weight: 600; font-size: 15px; }
.inv-ol > .inv-odel { grid-area: del; justify-self: end; }
.inv-qs { display: flex; align-items: center; gap: 6px; }
.inv-qs .btn { width: 48px; min-height: 48px; padding: 0; font-size: 20px; }
.inv-qs .inp { width: 84px; min-height: 48px; text-align: right; font-family: var(--f-num); font-variant-numeric: tabular-nums; font-size: 18px; padding: 6px 10px; }
.inv-qs .inv-unit { font-size: 12px; color: var(--muted); }
.inv-totrow { display: flex; align-items: baseline; justify-content: flex-end; gap: 10px; padding-top: 4px; border-top: 1px solid var(--line); }
.inv-total { font-family: var(--f-num); font-variant-numeric: tabular-nums; font-size: 22px; font-weight: 600; }
.inv-copybox { min-height: 220px; }
.inv-dlinfo { font-size: 13px; }

/* 仕入先 */
.inv-tel { user-select: all; -webkit-user-select: all; font-family: var(--f-num); font-variant-numeric: tabular-nums; font-weight: 600; font-size: 16px; color: var(--ink); }
.inv-sup { display: flex; flex-direction: column; gap: 8px; }
.inv-sup-head { display: flex; gap: 8px; align-items: center; }
.inv-sup-head b { font-size: 16px; flex: 1 1 auto; min-width: 0; overflow-wrap: anywhere; }
.inv-sup-memo { font-size: 13px; color: var(--muted); white-space: pre-wrap; overflow-wrap: anywhere; border-top: 1px solid var(--line); padding-top: 8px; }
/* クイックメモの窓口（order.add / stock.fix） */
.inv-memo { font-size: 13px; color: var(--muted); background: var(--surface-2); border-radius: var(--r-sm); padding: 8px 12px; white-space: pre-wrap; overflow-wrap: anywhere; }
.inv-memo b { color: var(--ink-2); margin-right: 6px; }
.inv-pick { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.inv-pick-list { max-height: 248px; overflow-y: auto; border: 1px solid var(--line); border-radius: var(--r-sm); background: var(--surface); }
.inv-pick-list .li { min-height: 48px; padding: 8px 12px; gap: 10px; }
.inv-pick-list .li[aria-pressed="true"] { background: var(--accent-soft); color: var(--accent); }
.inv-pick-list .li[aria-pressed="true"] .inv-pk-n { color: var(--accent); }
.inv-pk-n { font-weight: 700; flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.inv-pk-m { font-size: 12px; color: var(--muted); white-space: nowrap; }
.inv-pk-ck { width: 20px; flex: none; color: var(--accent); visibility: hidden; }
.li[aria-pressed="true"] .inv-pk-ck { visibility: visible; }
.inv-svc-q { display: flex; align-items: center; gap: 8px; }
.inv-svc-q .inp { max-width: 160px; text-align: right; font-family: var(--f-num); font-variant-numeric: tabular-nums; font-size: 20px; font-weight: 600; min-height: 52px; }
.inv-svc-dest { font-size: 13px; color: var(--ink-2); }
/* 検品シート */
.inv-insp-row { flex-direction: column; align-items: stretch; gap: 8px; }
.inv-insp-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.inv-insp-head b { font-size: 15.5px; }
.inv-insp-in { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.inv-insp-in .inp { text-align: right; font-family: var(--f-num); font-variant-numeric: tabular-nums; font-size: 18px; }
.inv-insp-chips .fchip { min-height: 44px; font-size: 13px; }
.inv-insp-sum { display: flex; flex-wrap: wrap; gap: 6px 12px; align-items: center; font-size: 13px; color: var(--muted); }
.inv-insp-sum b { font-size: 18px; color: var(--ink); }
/* ロス・廃棄 */
.inv-wlist .li { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 2px 10px; align-items: center; }
.inv-w-name { font-weight: 700; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.inv-w-meta { grid-column: 1; display: flex; gap: 6px; flex-wrap: wrap; align-items: center; font-size: 12px; color: var(--muted); }
.inv-w-amt { grid-row: 1 / span 2; grid-column: 2; font-family: var(--f-num); font-variant-numeric: tabular-nums; font-weight: 600; text-align: right; }
.inv-w-del { grid-row: 1 / span 2; grid-column: 3; }
.inv-reasons { flex-wrap: wrap; overflow: visible; }
.inv-reasons .fchip, .inv-insp-chips .fchip { min-height: 44px; }
.inv-insp-chips { flex-wrap: wrap; overflow: visible; }
.inv-free { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr); gap: 8px; }
`);

  /* ---------- 共通ユーティリティ ---------- */
  const ro = () => K.readOnly();
  const num = (v) => { const n = Number(v); return isFinite(n) ? n : 0; };
  const r2 = (n) => Math.round(num(n) * 100) / 100;
  const nowIso = () => new Date().toISOString();
  const localDay = (iso) => { const d = new Date(iso); return isNaN(d) ? String(iso).slice(0, 10) : d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  const items = () => K.list("items");
  const itemById = (id) => (id ? K.getDoc("items", id) : null);
  const supName = (id) => { if (!id) return "仕入先未設定"; const s = K.getDoc("suppliers", id); return s ? s.name || "（名称なし）" : "（削除済みの仕入先）"; };
  // 処理中フラグ（二重実行防止）：発注書IDごと＋発注案作成
  const busy = new Set();
  // 下書きの間は品目の最新単価で計算（発注済み以降は発注時の単価で固定）
  const liveLines = (o) => (o.lines || []).map((l) => { if (o.status !== "draft") return l; const it = itemById(l.itemId); return it ? Object.assign({}, l, { cost: Math.round(num(it.cost)) }) : l; });
  const roAttr = (extra) => Object.assign({}, extra || {}, ro() ? { disabled: "" } : {});
  const signYen = (d) => (d > 0 ? "+" : d < 0 ? "−" : "±") + K.fmt.yen(Math.abs(d));
  const hm = (d) => d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0");

  function itemState(it) {
    const s = num(it.stock), p = num(it.par);
    if (s < p * 0.5) return { kind: "bad", label: "不足" };
    if (s < p) return { kind: "warn", label: "少なめ" };
    return { kind: "ok", label: "適正" };
  }
  const order = (arr, v) => { const i = arr.indexOf(v); return i < 0 ? arr.length : i; };
  function sortItems(list) {
    return list.slice().sort((a, b) =>
      order(LOCS, a.location) - order(LOCS, b.location) ||
      order(CATS, a.category) - order(CATS, b.category) ||
      String(a.name || "").localeCompare(String(b.name || ""), "ja"));
  }
  const fmtQty = (n) => { const v = r2(n); return Number.isInteger(v) ? K.fmt.num(v) : K.fmt.num(v, 2).replace(/0$/, ""); };

  /* 数値の検証：負数・非数・桁違いはエラー（黙って0にしない） */
  function parseQty(raw) {
    const s = String(raw == null ? "" : raw).trim();
    if (!s) return { empty: true };
    const n = Number(s);
    if (!isFinite(n)) return { err: "数値で入力してください" };
    if (n < 0) return { err: "マイナスは入力できません" };
    if (n > MAXV) return { err: "大きすぎます（桁を確認）" };
    return { v: r2(n) };
  }
  function markErr(inp, msg) {
    inp.classList.toggle("inv-inp-err", !!msg);
    if (msg) inp.setAttribute("aria-invalid", "true"); else inp.removeAttribute("aria-invalid");
  }
  // シート内の数値欄を読む。エラーなら赤表示＋toast し null
  function readNum(inp, label, int) {
    const bad = inp.validity && inp.validity.badInput;
    const p = bad ? { err: "数値で入力してください" } : parseQty(inp.value);
    if (p.err) { markErr(inp, p.err); K.fieldError(inp, p.err); inp.focus(); return null; }
    markErr(inp, null);
    const v = p.empty ? 0 : p.v;
    return int ? Math.round(v) : v;
  }

  /* 刻み幅（kg・L など小数単位のみ）。端末ごとの好みなので localStorage */
  let decStep = 1;
  try { const s = Number(localStorage.getItem(STEP_KEY)); if ([0.1, 0.5, 1].includes(s)) decStep = s; } catch (e) {}
  const isDecUnit = (u) => DEC_UNITS.includes(String(u || "").trim().toLowerCase());
  const stepFor = (it) => (isDecUnit(it && it.unit) ? decStep : 1);

  /* 仕入先の締め時間：「前日15時」「当日6時」「2日前」「前々日17:30」などを解釈。解釈不能は null */
  function parseDeadline(str) {
    const s = String(str || "").replace(/\s+/g, "")
      .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/：/g, ":");
    if (!s) return null;
    let days = null;
    if (/前々日/.test(s)) days = 2;
    else if (/前日/.test(s)) days = 1;
    else if (/当日/.test(s)) days = 0;
    else { const m = s.match(/(\d+)日前/); if (m) days = Number(m[1]); }
    if (days == null || days > 14) return null;
    const t = s.match(/(午前|午後)?(\d{1,2})(?:時(?:(\d{1,2})分|半)?|:(\d{2}))/);
    let hh = 24, mm = 0;
    if (t) {
      hh = Number(t[2]);
      mm = t[3] ? Number(t[3]) : t[4] ? Number(t[4]) : /半/.test(t[0]) ? 30 : 0;
      if (t[1] === "午後" && hh < 12) hh += 12;
      if (hh > 24 || mm > 59) return null;
    }
    return { days, hh, mm };
  }
  function deadlineFor(deliveryIso, sup) {
    const p = sup && parseDeadline(sup.deadline);
    if (!p || !deliveryIso) return null;
    const [y, m, d] = K.addDays(deliveryIso, -p.days).split("-").map(Number);
    return new Date(y, m - 1, d, p.hh, p.mm);
  }
  const leadOf = (s) => { const n = Math.round(num(s && s.leadDays)); return n > 0 ? n : 1; };
  // 締めを過ぎていれば納品予定日を後ろへ。{date, shifted}
  function fitDelivery(iso, sup) {
    let d = iso, shifted = false;
    const now = new Date();
    for (let i = 0; i < 14; i++) {
      const dl = deadlineFor(d, sup);
      if (!dl || dl > now) break;
      d = K.addDays(d, 1); shifted = true;
    }
    return { date: d, shifted };
  }
  // 下書きの締め状態：past=この納品日の締めは過ぎた／shifted=本来の最短納品日の締めを過ぎて後ろ倒し中
  function deadlineState(o) {
    if (!o || o.status === "received" || o.status === "sent") return null;
    const s = o.supplierId ? K.getDoc("suppliers", o.supplierId) : null;
    if (!s || !parseDeadline(s.deadline)) return null;
    const now = new Date();
    const dl = deadlineFor(o.deliveryDate, s);
    if (dl && dl <= now) return { kind: "bad", label: "締め切り過ぎ", title: "この納品日の発注締め（" + s.deadline + "）を過ぎています。納品日を変更してください" };
    const base = K.addDays(K.today(), leadOf(s));
    const bdl = deadlineFor(base, s);
    if (bdl && bdl <= now && o.deliveryDate === fitDelivery(base, s).date)
      return { kind: "warn", label: "締め切り過ぎ・納品日後ろ倒し", title: "最短の納品日（" + K.fmt.date(base) + "）は締め（" + s.deadline + "）を過ぎたため後ろ倒ししています" };
    return null;
  }

  /* ---------- 再描画（購読は mount で1回、各ペインの動的部だけ描き直す） ---------- */
  const live = new Set();
  let queued = false;
  function refreshAll() {
    if (queued) return;
    queued = true;
    Promise.resolve().then(() => { queued = false; live.forEach((fn) => fn()); });
  }
  // 入力中（フォーカスが入力欄にある）は描き直しを保留し、外れたら描き直す
  function makeLive(container, draw) {
    let pending = false;
    const onOut = () => setTimeout(() => { if (!pending) return; pending = false; container.removeEventListener("focusout", onOut); run(); }, 0);
    function run() {
      const a = document.activeElement;
      if (a && container.contains(a) && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)) {
        if (!pending) { pending = true; container.addEventListener("focusout", onOut); }
        return;
      }
      container.textContent = "";
      draw(container);
    }
    live.add(run);
    run();
    return run;
  }
  function forceRun(container, draw) { container.textContent = ""; draw(container); }

  /* =========================================================
   * 1. 在庫
   * ========================================================= */
  // state：""=すべて／"bad"=不足のみ／"warn"=少なめのみ／"short"=不足・少なめ（選択状態はこの1か所だけ）
  const stockUI = { cat: "", loc: "", q: "", state: "", open: false };
  const STATE_LABEL = { bad: "不足のみ", warn: "少なめのみ", short: "不足・少なめ" };
  const stateMatch = (x) => { const k = itemState(x).kind; const s = stockUI.state; return !s || (s === "short" ? k !== "ok" : k === s); };

  async function bump(id, dir) {
    const it = itemById(id);
    if (!it) return;
    const old = r2(it.stock);
    const next = Math.max(0, r2(old + dir * stepFor(it)));
    if (next === old) return;
    await W.patch("items", id, { stock: next, updatedAt: nowIso() });
    const u = it.unit || "";
    K.toast(it.name + " " + fmtQty(old) + "→" + fmtQty(next) + u, null, {
      action: {
        label: "元に戻す",
        onClick: async () => {
          const cur = itemById(id);
          if (!cur) return;
          // 他端末の変更を潰さないよう、差分だけ戻す
          const back = Math.max(0, r2(num(cur.stock) - (next - old)));
          try {
            await W.patch("items", id, { stock: back, updatedAt: nowIso() });
            K.toast(it.name + " を " + fmtQty(back) + u + " に戻しました", "ok");
          } catch (e) { /* core が toast 済み */ }
        },
      },
    });
  }

  function openItem(it) {
    const isNew = !it;
    const d = it || { name: "", category: "野菜", unit: "", par: 0, stock: 0, cost: 0, supplierId: "", location: "冷蔵" };
    const name = K.input({ value: d.name, placeholder: "例：玉ねぎ", maxlength: 60 });
    const cat = K.select(CATS, d.category || "その他");
    // 単位：よく使う単位は select、それ以外は「その他」で自由入力（datalist の▼は使わない）
    const UNITS = ["kg", "g", "L", "ml", "個", "本", "玉", "切", "尾", "束", "枚", "袋", "パック", "箱", "瓶", "缶", "丁"];
    const curU = String(d.unit || "").trim();
    const unitSel = K.select([{ value: "", label: "選ぶ" }].concat(UNITS.map((u) => ({ value: u, label: u }))).concat([{ value: "__other", label: "その他…" }]),
      !curU ? "" : UNITS.includes(curU) ? curU : "__other", { "aria-label": "単位" });
    const unitOther = K.input({ value: UNITS.includes(curU) ? "" : curU, placeholder: "単位を入力", maxlength: 12, "aria-label": "その他の単位" });
    unitOther.hidden = unitSel.value !== "__other";
    unitSel.addEventListener("change", () => { unitOther.hidden = unitSel.value !== "__other"; if (!unitOther.hidden) unitOther.focus(); });
    const unit = { get value() { return unitSel.value === "__other" ? unitOther.value : unitSel.value; } };
    const unitBox = h("div", { class: "inv-unit-row" }, unitSel, unitOther);
    const par = K.input({ type: "number", value: num(d.par), min: 0, max: MAXV, step: "any" });
    const stock = K.input({ type: "number", value: num(d.stock), min: 0, max: MAXV, step: "any" });
    const cost = K.input({ type: "number", value: num(d.cost), min: 0, max: MAXV, step: 1 });
    [par, stock, cost].forEach((x) => x.addEventListener("input", () => markErr(x, null)));
    const sup = K.select([{ value: "", label: "未設定" }].concat(K.list("suppliers").map((s) => ({ value: s.id, label: s.name || "（名称なし）" }))), d.supplierId || "");
    const loc = K.select(LOCS, d.location || "冷蔵");
    const body = h("div", { class: "stack" },
      K.field("品目名", name),
      h("div", { class: "grid2" }, K.field("カテゴリ", cat), K.field("保管場所", loc)),
      h("div", { class: "grid2" }, K.field("単位", unitBox, "棚卸し・発注・レシピで共通の単位"), K.field("仕入単価（円／1単位）", cost, isNew ? null : "前回 " + K.fmt.yen(d.cost))),
      h("div", { class: "grid2" }, K.field("適正在庫", par, "これを下回ると「少なめ」"), K.field("現在庫", stock)),
      K.field("仕入先", sup, K.list("suppliers").length ? null : "仕入先タブで登録すると選べます"),
      null);
    const actions = [{ label: "キャンセル", kind: "ghost" }];
    const menu = isNew ? null : [{
      label: "この品目を削除", icon: "trash", danger: true, disabled: ro(),
      onClick: async () => {
        if (!(await K.confirm("「" + d.name + "」を削除します。レシピや過去の発注書に残っている名前は表示できなくなります。", "削除する"))) return;
        await W.del("items", it.id);
        K.toast("削除しました", "ok");
        return "close";
      },
    }];
    actions.push({
      label: isNew ? "追加する" : "保存", kind: "primary", disabled: ro(),
      onClick: async () => {
        const nm = name.value.trim();
        if (!nm) { K.fieldError(name, "品目名を入力してください"); name.focus(); return false; }
        const vCost = readNum(cost, "仕入単価", true); if (vCost == null) return false;
        const vPar = readNum(par, "適正在庫"); if (vPar == null) return false;
        const vStock = readNum(stock, "現在庫"); if (vStock == null) return false;
        // 桁違いの疑いは保存前に確認
        const checks = [];
        const oc = num(d.cost), op = num(d.par), os = num(d.stock);
        if (!isNew && oc > 0 && vCost > 0 && (vCost > oc * 10 || vCost < oc / 10))
          checks.push("単価 " + K.fmt.yen(oc) + " → " + K.fmt.yen(vCost) + "（前回の" + (vCost > oc ? "10倍超" : "1/10未満") + "）");
        else if ((isNew || oc === 0) && vCost > 100000) checks.push("単価 " + K.fmt.yen(vCost) + "（1単位10万円超）");
        if (!isNew && op > 0 && vPar > op * 10) checks.push("適正在庫 " + fmtQty(op) + " → " + fmtQty(vPar) + "（前回の10倍超）");
        if (!isNew && os > 0 && vStock > os * 10 && vStock !== os) checks.push("現在庫 " + fmtQty(os) + " → " + fmtQty(vStock) + "（前回の10倍超）");
        else if (vPar > 0 && vStock > vPar * 5 && vStock !== os) checks.push("現在庫 " + fmtQty(vStock) + "（適正在庫 " + fmtQty(vPar) + " の5倍超）");
        if (checks.length && !(await K.confirm("桁の打ち間違いがないか確認してください：" + checks.join("／") + "。このまま保存しますか？", "このまま保存"))) return false;
        const data = {
          name: nm, category: cat.value, unit: unit.value.trim(),
          par: vPar, stock: vStock, cost: vCost,
          supplierId: sup.value || null, location: loc.value, updatedAt: nowIso(),
        };
        if (isNew) await W.add("items", data); else await W.patch("items", it.id, data);
        K.toast(isNew ? "品目を追加しました" : "保存しました", "ok");
      },
    });
    K.sheet({ title: isNew ? "品目を追加" : "品目を編集", body, actions, menu });
  }

  function renderStock(el) {
    const sum = h("div", { class: "sumbar inv-sumbar", role: "group", "aria-label": "在庫の集計" });
    const chips = h("div", { class: "fchips", role: "group", "aria-label": "カテゴリで絞り込み" });
    const search = K.input({ type: "search", placeholder: "品目を検索", class: "inp inv-search", "aria-label": "品目を検索", value: stockUI.q });
    const fbtn = h("button", { class: "btn inv-fbtn", attrs: { "aria-expanded": String(!!stockUI.open), "aria-controls": "inv-fpanel" } });
    const panel = h("div", { class: "inv-fpanel", id: "inv-fpanel", hidden: !stockUI.open });
    const addBtn = h("button", { class: "btn primary", attrs: WA, onClick: () => openItem(null) }, K.icon("plus"), "品目を追加");
    const listBox = h("div", { class: "stack inv-cq" });

    el.appendChild(h("div", { class: "inv-head" }, h("h2", { class: "sec-title", text: "在庫一覧" }), addBtn));
    el.appendChild(sum);
    el.appendChild(h("div", { class: "inv-filters" }, chips, h("div", { class: "inv-frow" }, search, fbtn), panel));
    el.appendChild(listBox);

    search.addEventListener("input", () => { stockUI.q = search.value.trim(); drawList(); });
    fbtn.addEventListener("click", () => { stockUI.open = !stockUI.open; panel.hidden = !stockUI.open; fbtn.setAttribute("aria-expanded", String(stockUI.open)); });

    const activeCount = () => (stockUI.loc ? 1 : 0) + (stockUI.state ? 1 : 0);
    const setState = (v) => { stockUI.state = v; drawPanel(); drawFbtn(); drawSum(); drawChips(); drawList(); };
    function drawFbtn() {
      fbtn.textContent = "";
      const n = activeCount();
      fbtn.append(K.icon("gear"), "絞り込み");
      if (n) fbtn.appendChild(h("span", { class: "inv-dot", text: String(n) }));
    }
    const segRow = (label, opts, cur, onPick) => h("div", { class: "inv-frowl" },
      h("span", { class: "inv-fl", text: label }),
      h("div", { class: "seg", role: "group", "aria-label": label }, opts.map((o) => h("button", {
        class: "seg-btn", text: o.l, attrs: { "aria-pressed": String(cur === o.v) }, onClick: () => onPick(o.v),
      }))));
    function drawPanel() {
      panel.textContent = "";
      panel.appendChild(segRow("保管場所", [{ v: "", l: "すべて" }].concat(LOCS.map((l) => ({ v: l, l }))), stockUI.loc,
        (v) => { stockUI.loc = v; drawPanel(); drawFbtn(); drawList(); }));
      panel.appendChild(segRow("表示", [{ v: "", l: "すべて" }, { v: "short", l: "不足・少なめ" }, { v: "bad", l: "不足" }, { v: "warn", l: "少なめ" }], stockUI.state, setState));
      if (items().some((x) => isDecUnit(x.unit))) {
        panel.appendChild(segRow("kg・Lの刻み", [0.1, 0.5, 1].map((s) => ({ v: s, l: String(s) })), decStep,
          (v) => { decStep = v; try { localStorage.setItem(STEP_KEY, String(v)); } catch (e) {} drawPanel(); drawList(); }));
      }
    }
    function drawSum() {
      const all = items();
      sum.textContent = "";
      const bad = all.filter((x) => itemState(x).kind === "bad").length;
      const warn = all.filter((x) => itemState(x).kind === "warn").length;
      const val = all.reduce((s, x) => s + num(x.stock) * num(x.cost), 0);
      sum.append(
        h("button", { class: "cell", attrs: { "aria-pressed": String(stockUI.state === "bad"), "aria-label": "現在の不足 " + bad + "品。押すと不足だけ表示" }, onClick: () => setState(stockUI.state === "bad" ? "" : "bad") },
          h("span", { class: "lbl", text: "いま不足" }), h("span", { class: "val" + (bad ? " bad" : " ok") }, String(bad), h("small", { text: "品" }))),
        h("button", { class: "cell", attrs: { "aria-pressed": String(stockUI.state === "warn"), "aria-label": "現在の少なめ " + warn + "品。押すと少なめだけ表示" }, onClick: () => setState(stockUI.state === "warn" ? "" : "warn") },
          h("span", { class: "lbl", text: "いま少なめ" }), h("span", { class: "val" + (warn ? " warn" : "") }, String(warn), h("small", { text: "品" }))),
        h("div", { class: "cell" }, h("span", { class: "lbl", text: "現在の在庫金額" }), h("span", { class: "val", text: K.fmt.yen(val) }), h("span", { class: "sub", text: all.length + "品目" })));
    }
    function drawChips() {
      const all = items();
      chips.textContent = "";
      const counts = {};
      all.forEach((x) => { counts[x.category] = (counts[x.category] || 0) + 1; });
      const used = CATS.filter((c) => counts[c]).concat(Object.keys(counts).filter((c) => !CATS.includes(c)));
      if (stockUI.cat && !counts[stockUI.cat]) stockUI.cat = "";
      // 「すべて」は絞り込みが何も無いときだけ選択表示。状態の絞り込み中はその解除チップを先頭に出す
      chips.appendChild(h("button", { class: "fchip", attrs: { "aria-pressed": String(!stockUI.cat && !stockUI.state) },
        onClick: () => { stockUI.cat = ""; setState(""); } }, "すべて", h("span", { class: "n", text: String(all.length) })));
      if (stockUI.state) chips.appendChild(h("button", { class: "fchip", attrs: { "aria-pressed": "true", "aria-label": STATE_LABEL[stockUI.state] + "の絞り込みを解除" },
        onClick: () => setState("") }, STATE_LABEL[stockUI.state], h("span", { class: "n", text: String(all.filter(stateMatch).length) }), K.icon("x")));
      used.map((c) => ({ v: c, l: c, n: counts[c] })).forEach((c) => {
        chips.appendChild(h("button", {
          class: "fchip", attrs: { "aria-pressed": String(stockUI.cat === c.v) },
          onClick: () => { stockUI.cat = stockUI.cat === c.v ? "" : c.v; drawChips(); drawList(); },
        }, c.l, h("span", { class: "n", text: String(c.n) })));
      });
    }
    function drawList() {
      listBox.textContent = "";
      const all = items();
      if (!all.length) {
        listBox.appendChild(K.empty("品目がまだありません", "食材・消耗品を登録すると、ここに現在庫と適正在庫、不足の目印が並びます。まず1品、よく使う食材から追加してください。", "品目を追加", () => openItem(null)));
        return;
      }
      const q = stockUI.q.toLowerCase();
      const rows = sortItems(all).filter((x) =>
        (!stockUI.cat || x.category === stockUI.cat) &&
        (!stockUI.loc || x.location === stockUI.loc) &&
        (!q || String(x.name || "").toLowerCase().includes(q)) &&
        stateMatch(x));
      if (!rows.length) {
        listBox.appendChild(K.empty("条件に合う品目がありません", "検索語や絞り込みを変えてください。"));
        return;
      }
      const box = h("div", { class: "inv-items", role: "table", "aria-label": "在庫一覧" });
      box.appendChild(h("div", { class: "inv-it inv-th", role: "row" },
        h("span", { role: "columnheader", text: "品目" }), h("span", { class: "inv-h-cat", role: "columnheader", text: "カテゴリ・場所" }),
        h("span", { role: "columnheader", style: "text-align:right", text: "現在庫" }), h("span", { role: "columnheader", style: "text-align:right", text: "適正" }),
        h("span", { class: "inv-h-cost", role: "columnheader", style: "text-align:right", text: "単価" }), h("span", { role: "columnheader", text: "状態" }),
        h("span", { role: "columnheader", style: "text-align:right", text: "使用・追加" })));
      rows.forEach((x) => {
        const st = itemState(x);
        const u = x.unit || "";
        const step = stepFor(x);
        box.appendChild(h("div", { class: "inv-it", role: "row" },
          h("div", { class: "inv-c-name", role: "cell" }, h("button", { class: "inv-name", onClick: () => openItem(x), "aria-label": (x.name || "品目") + " を編集" },
            h("span", { class: "inv-nm", text: x.name || "（名称なし）" }),
            h("small", { text: K.fmt.yen(num(x.cost)) + (u ? "/" + u : "") }))),
          h("div", { class: "inv-c-cat", role: "cell", text: [x.category, x.location].filter(Boolean).join("・"), title: x.supplierId ? supName(x.supplierId) : "" }),
          h("div", { class: "inv-c-stock", role: "cell" },
            h("span", { class: "inv-big" + (st.kind === "ok" ? "" : " " + st.kind), text: fmtQty(x.stock) }), h("span", { class: "inv-u", text: u }),
            h("span", { class: "inv-mpar" }, "適正 ", h("span", { class: "num", text: fmtQty(x.par) }), u)),
          h("div", { class: "inv-c-par num", role: "cell" }, fmtQty(x.par), h("span", { class: "inv-u", text: u })),
          h("div", { class: "inv-c-cost num", role: "cell", text: K.fmt.yen(num(x.cost)) }),
          h("div", { class: "inv-c-st", role: "cell" }, h("span", { class: "chip " + st.kind, text: st.label })),
          h("div", { class: "inv-c-step", role: "cell" },
            h("button", { class: "btn inv-sb", text: "−" + fmtQty(step), attrs: roAttr({ "aria-label": x.name + " を" + fmtQty(step) + u + "減らす" }), onClick: () => bump(x.id, -1) }),
            h("button", { class: "btn inv-sb inv-plus", text: "＋" + fmtQty(step), attrs: roAttr({ "aria-label": x.name + " を" + fmtQty(step) + u + "増やす" }), onClick: () => bump(x.id, 1) }))));
      });
      listBox.appendChild(box);
      listBox.appendChild(h("p", { class: "muted small", style: "margin:0", text: "±はその場で保存されます（使用・ロス分の調整に）。直後の通知の「元に戻す」で取り消せます。品目名をタップすると編集できます。" }));
    }
    const allDraw = () => { if (search.value.trim() !== stockUI.q) search.value = stockUI.q; drawSum(); drawChips(); drawPanel(); drawFbtn(); drawList(); };
    live.add(allDraw);
    allDraw();
  }

  /* =========================================================
   * 2. 棚卸し
   * ========================================================= */
  const cnt = { date: K.today(), vals: {}, dirty: false, loadedFor: null };
  const countId = (d) => "c-" + d;
  // 端末への自動下書き（未保存の入力を再読み込みで失わない）。日付ごと、途中保存・確定・記録で消す
  const LD_KEY = "kitchen-ledger-inv-count-draft";
  const ldAll = () => { try { return JSON.parse(localStorage.getItem(LD_KEY) || "{}") || {}; } catch (e) { return {}; } };
  const ldPut = (date, vals) => { try { const a = ldAll(); if (vals && Object.keys(vals).length) a[date] = vals; else delete a[date]; localStorage.setItem(LD_KEY, JSON.stringify(a)); } catch (e) {} };
  function loadDraft() {
    const doc = K.getDoc("counts", countId(cnt.date));
    cnt.vals = {};
    if (doc && Array.isArray(doc.lines)) doc.lines.forEach((l) => { if (l && l.itemId) cnt.vals[l.itemId] = String(l.qty); });
    const local = !(doc && doc.done) && ldAll()[cnt.date];
    if (local) { Object.assign(cnt.vals, local); cnt.dirty = true; }
    cnt.loadedFor = cnt.date;
  }
  const qOf = (id) => parseQty(cnt.vals[id]);
  const entered = (id) => qOf(id).v !== undefined;
  // 未来日の確定記録（旧版の不具合で作られたもの）は基準にしない
  const latestDone = () => { const t = K.today(); return K.list("counts").filter((r) => r.done && r.date <= t).reduce((m, r) => (r.date > m ? r.date : m), ""); };
  const isOutlier = (x, v) => (num(x.stock) > 0 && v > num(x.stock) * 10) || (num(x.par) > 0 && v > num(x.par) * 5);

  function renderCount(el) {
    const dateInp = K.input({ type: "date", value: cnt.date, max: K.today(), "aria-label": "棚卸し日" });
    const openDate = (d) => { cnt.date = d; dateInp.value = d; cnt.dirty = false; loadDraft(); forceRun(box, draw); forceRun(hist, drawHist); };
    dateInp.addEventListener("change", () => {
      if (!dateInp.value) return;
      if (dateInp.value > K.today()) { K.fieldError(dateInp, "未来の日付は選べません"); dateInp.value = cnt.date; return; }
      openDate(dateInp.value);
    });
    el.appendChild(h("div", { class: "inv-head" }, h("h2", { class: "sec-title", text: "棚卸し" }),
      h("label", { class: "row", style: "gap:8px;flex-wrap:nowrap" }, h("span", { class: "muted small", style: "white-space:nowrap", text: "実施日" }), dateInp)));
    const box = h("div", { class: "stack" });
    const hist = h("div", { class: "stack" });
    el.appendChild(box);
    el.appendChild(h("h2", { class: "sec-title", text: "棚卸し履歴" }));
    el.appendChild(hist);

    function draw(c) {
      if (!cnt.dirty || cnt.loadedFor !== cnt.date) loadDraft();
      const list = sortItems(items());
      const doc = K.getDoc("counts", countId(cnt.date));
      if (!list.length) {
        c.appendChild(K.empty("棚卸しする品目がありません", "在庫タブで品目を登録すると、保管場所ごとに実数を入力できるようになります。", "品目を登録する", () => { K.go("inventory", "stock"); openItem(null); }));
        return;
      }
      const latest = latestDone();
      dateInp.max = K.today();
      if (dateInp.value !== cnt.date) dateInp.value = cnt.date;
      if (cnt.date > K.today()) {
        c.appendChild(h("div", { class: "inv-note warn", text: K.fmt.date(cnt.date) + " は未来の日付です。棚卸しは今日以前の日付で行ってください。" }));
        c.appendChild(h("button", { class: "btn", text: "今日の棚卸しを開く", onClick: () => openDate(K.today()) }));
        return;
      }
      const mode = doc && doc.done ? "done" : latest && cnt.date < latest ? "old" : "normal";
      if (mode === "done") c.appendChild(h("div", { class: "inv-note ok", text: K.fmt.date(cnt.date) + " の棚卸しは確定済みです（閲覧のみ）。数え直す場合は新しい日付で入力してください。" }));
      if (mode === "old") c.appendChild(h("div", { class: "inv-note warn", text: K.fmt.date(latest) + " に確定した棚卸しがあるため、それより前の日付は在庫に反映できません。「記録のみ保存」で履歴として残せます。" }));
      const locked = mode === "done" || ro();

      const sumEl = h("div", { class: "inv-sline", attrs: { "aria-live": "polite" } });
      const errCount = () => list.filter((x) => qOf(x.id).err).length;
      const updateSum = () => {
        sumEl.textContent = "";
        let n = 0, amt = 0, book = 0;
        list.forEach((x) => {
          const e = entered(x.id);
          const q = e ? qOf(x.id).v : num(x.stock);
          if (e) n++;
          amt += q * num(x.cost);
          book += num(x.stock) * num(x.cost);
        });
        const errs = errCount();
        const outs = list.filter((x) => entered(x.id) && isOutlier(x, qOf(x.id).v)).length;
        sumEl.append(...[
          h("span", { class: n < list.length ? "inv-todo" : "" }, "入力", h("b", { text: n + "/" + list.length })),
          h("span", { class: "inv-hide-m" }, "実数金額", h("b", { text: K.fmt.yen(amt) })),
          h("span", null, h("span", { class: "inv-hide-m" }, "帳簿との"), "差", h("b", { text: signYen(Math.round(amt) - Math.round(book)) })),
          errs ? h("span", { class: "chip bad", text: "入力エラー " + errs }) : null,
          outs ? h("span", { class: "chip bad", text: "差が大きい " + outs }) : null,
          doc ? h("span", { class: "chip " + (doc.done ? "ok" : doc.recordOnly ? "info" : "warn"), text: doc.done ? "確定済み" : doc.recordOnly ? "記録のみ" : "途中保存あり" }) : null].filter(Boolean));
      };

      const inputs = [];
      const groups = {};
      list.forEach((x) => { const g = LOCS.includes(x.location) ? x.location : "その他"; (groups[g] = groups[g] || []).push(x); });
      LOCS.concat(["その他"]).forEach((g) => {
        if (!groups[g]) return;
        c.appendChild(h("div", { class: "inv-group-title" }, h("span", { text: g }), h("span", { class: "chip", text: groups[g].length + "品" })));
        const ul = h("div", { class: "list" });
        groups[g].forEach((x) => {
          const inp = K.input({ type: "number", min: 0, max: MAXV, step: "any", class: "inp inv-cinp", value: cnt.vals[x.id] != null ? cnt.vals[x.id] : "", placeholder: "—", enterkeyhint: "next", "aria-label": x.name + " の実数（" + (x.unit || "") + "）" });
          if (locked) inp.disabled = true;
          const msg = h("span", { class: "inv-msg", attrs: { "aria-live": "polite" } });
          const ck = h("span", { class: "inv-ck", attrs: { "aria-hidden": "true" } }, K.icon("check"));
          const row = h("div", { class: "li" });
          const paint = () => {
            const bad = inp.validity && inp.validity.badInput;
            const p = bad ? { err: "数値で入力してください" } : qOf(x.id);
            const out = p.v !== undefined && isOutlier(x, p.v);
            markErr(inp, p.err || null);
            inp.classList.toggle("inv-filled", p.v !== undefined && !out);
            ck.classList.toggle("on", p.v !== undefined && !p.err);
            row.classList.toggle("inv-crow-out", !!out);
            msg.textContent = p.err ? p.err : out ? "帳簿・適正在庫と比べて多すぎます。桁を確認" : "";
          };
          inp.addEventListener("input", () => {
            cnt.vals[x.id] = inp.validity && inp.validity.badInput ? "x" : inp.value;
            ldPut(cnt.date, Object.fromEntries(Object.entries(cnt.vals).filter(([, v]) => String(v).trim() !== "")));
            cnt.dirty = true; cnt.loadedFor = cnt.date;
            paint(); updateSum();
          });
          inp.addEventListener("keydown", (e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            const i = inputs.indexOf(inp);
            if (inputs[i + 1]) { const nx = inputs[i + 1]; nx.focus({ preventScroll: true }); nx.scrollIntoView({ block: "center" }); nx.select(); } else inp.blur();
          });
          inputs.push(inp);
          row.appendChild(h("div", { class: "inv-crow" },
            h("div", { class: "inv-cname" }, h("b", null, ck, h("span", { text: x.name || "（名称なし）" })), h("span", { class: "muted small", text: (x.category || "") + "・単位 " + (x.unit || "—") }), msg),
            h("div", { class: "inv-book" }, "帳簿", h("br"), h("span", { class: "num", text: fmtQty(x.stock) })),
            h("div", { class: "inv-cwrap" }, inp, x.unit ? h("span", { class: "inv-cu", attrs: { "aria-hidden": "true" }, text: x.unit }) : null)));
          paint();
          ul.appendChild(row);
        });
        c.appendChild(ul);
      });

      const lines = (fillAll) => list.filter((x) => fillAll || entered(x.id)).map((x) => ({
        itemId: x.id, qty: entered(x.id) ? qOf(x.id).v : r2(x.stock), cost: Math.round(num(x.cost)),
      }));
      const totalOf = (ls) => Math.round(ls.reduce((s, l) => s + l.qty * l.cost, 0));
      const guardErr = () => {
        const bad = list.find((x) => qOf(x.id).err);
        if (!bad) return false;
        K.toast("入力エラーがあります：" + bad.name + "（" + qOf(bad.id).err + "）", "bad");
        const i = list.indexOf(bad);
        const target = inputs.find((el) => el.getAttribute("aria-label").startsWith(bad.name + " "));
        (target || inputs[i]).focus();
        return true;
      };
      const outlierText = () => {
        const outs = list.filter((x) => entered(x.id) && isOutlier(x, qOf(x.id).v));
        if (!outs.length) return "";
        const head = outs.slice(0, 8).map((x) => "【" + x.name + "　帳簿 " + fmtQty(x.stock) + (x.unit || "") + " → 実数 " + fmtQty(qOf(x.id).v) + (x.unit || "") + "】").join(" ");
        return "差の大きい品目が" + outs.length + "品あります：" + head + (outs.length > 8 ? " ほか" + (outs.length - 8) + "品" : "") + "　桁の打ち間違いがないか確認してください。";
      };

      if (mode === "done") return;
      const btns = [];
      if (mode === "normal") {
        btns.push(h("button", { class: "btn inv-savebtn", title: "途中保存", attrs: roAttr(Object.assign({ "aria-label": "途中保存" }, WA)), onClick: async () => {
          if (guardErr()) return;
          const ls = lines(false);
          await W.put("counts", countId(cnt.date), { date: cnt.date, staffId: K.currentStaffId(), lines: ls, total: totalOf(ls), done: false });
          cnt.dirty = false; ldPut(cnt.date, null);
          K.toast("途中保存しました（" + ls.length + "品）", "ok");
        } }, K.icon("clip"), h("span", { class: "inv-hide-m", text: "途中保存" })));
        btns.push(h("button", { class: "btn primary", attrs: roAttr(WA), onClick: async () => {
          if (guardErr()) return;
          if (cnt.date > K.today()) { K.fieldError(dateInp, "未来の日付では確定できません"); dateInp.focus(); return; }
          const lt = latestDone();
          if (lt && cnt.date < lt) { K.toast(K.fmt.date(lt) + " より前の日付は在庫に反映できません", "bad"); forceRun(box, draw); return; }
          const n = list.filter((x) => entered(x.id)).length;
          if (!n) { K.toast("実数を1品以上入力してください", "bad"); if (inputs[0]) inputs[0].focus(); return; }
          const msg = outlierText() + K.fmt.date(cnt.date) + " の棚卸しを確定し、" + n + "品の在庫を実数で上書きします。" +
            (list.length - n ? "未入力の " + (list.length - n) + "品は現在の在庫のまま記録します。" : "");
          if (!(await K.confirm(msg, "確定して反映", { danger: false }))) return;
          const ls = lines(true);
          const t = nowIso();
          await Promise.all(ls.map((l) => W.patch("items", l.itemId, { stock: l.qty, updatedAt: t })));
          await W.put("counts", countId(cnt.date), { date: cnt.date, staffId: K.currentStaffId(), lines: ls, total: totalOf(ls), done: true });
          cnt.dirty = false; ldPut(cnt.date, null);
          K.toast("棚卸しを確定し、在庫に反映しました", "ok");
        } }, K.icon("check"), h("span", null, "確定", h("span", { class: "inv-hide-m", text: "して在庫に反映" }))));
      } else {
        btns.push(h("button", { class: "btn primary", attrs: roAttr(WA), onClick: async () => {
          if (guardErr()) return;
          const ls = lines(false);
          if (!ls.length) { K.toast("実数を1品以上入力してください", "bad"); return; }
          const o = outlierText();
          if (o && !(await K.confirm(o + "このまま記録しますか？（在庫には反映しません）", "記録する", { danger: false }))) return;
          await W.put("counts", countId(cnt.date), { date: cnt.date, staffId: K.currentStaffId(), lines: ls, total: totalOf(ls), done: false, recordOnly: true });
          cnt.dirty = false; ldPut(cnt.date, null);
          K.toast("記録のみ保存しました（在庫は変わりません）", "ok");
        } }, h("span", null, "記録", h("span", { class: "inv-hide-m", text: "のみ保存" }))));
      }
      const bar = h("div", { class: "inv-sticky", attrs: { "data-fixed-bottom": "" } }, btns.length > 1 ? btns[0] : null, sumEl, btns[btns.length - 1]);
      c.appendChild(bar);
      // 固定バーの実高さを入力欄の scroll-margin に反映（Enter で次へ移ったとき欄がバーに隠れないように）
      const setH = () => c.style.setProperty("--inv-barh", bar.offsetHeight + "px");
      requestAnimationFrame(setH);
      if (window.ResizeObserver) new ResizeObserver(setH).observe(bar);
      updateSum();
    }

    let histLimit = 10;
    function drawHist(c) {
      const all = K.list("counts").slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
      if (!all.length) {
        c.appendChild(K.empty("棚卸しの記録はまだありません", "上で実数を入力して「確定して在庫に反映」を押すと、日付・金額・担当者がここに残り、前回との差額を比べられます。"));
        return;
      }
      const done = all.filter((r) => r.done);
      const rows = all.slice(0, histLimit);
      const info = (r) => {
        const prev = r.done ? done[done.indexOf(r) + 1] : null;
        return {
          diff: prev ? num(r.total) - num(prev.total) : null,
          chip: h("span", { class: "chip " + (r.done ? "ok" : r.recordOnly ? "info" : "warn"), text: r.done ? "確定" : r.recordOnly ? "記録のみ" : "途中" }),
          go: () => { openDate(r.date); window.scrollTo(0, 0); },
        };
      };
      // スマホ：リスト
      const ul = h("div", { class: "list inv-only-m" });
      rows.forEach((r) => {
        const f = info(r);
        ul.appendChild(h("button", { class: "li inv-hli" + (r.date === cnt.date ? " inv-cur" : ""), onClick: f.go, "aria-label": K.fmt.date(r.date) + " の棚卸しを開く" },
          h("span", { class: "row", style: "gap:8px" }, h("span", { class: "inv-hd num", text: K.fmt.date(r.date) }), f.chip),
          h("span", { class: "inv-ha", text: K.fmt.yen(r.total) }),
          h("span", { class: "inv-hm", text: "前回比 " + (f.diff == null ? "—" : signYen(f.diff)) + "・担当 " + (r.staffId ? K.staffName(r.staffId) : "—") })));
      });
      // 560px〜：表
      const tb = h("tbody");
      rows.forEach((r) => {
        const f = info(r);
        tb.appendChild(h("tr", {
          class: "click" + (r.date === cnt.date ? " inv-hist-cur" : ""), tabindex: "0",
          onClick: f.go,
          onKeydown: (e) => { if (e.key === "Enter") f.go(); },
        },
          h("td", { class: "num", text: K.fmt.date(r.date) }),
          h("td", null, f.chip),
          h("td", { class: "r num", text: K.fmt.yen(r.total) }),
          h("td", { class: "r num", text: f.diff == null ? "—" : signYen(f.diff) }),
          h("td", { text: r.staffId ? K.staffName(r.staffId) : "—" })));
      });
      c.appendChild(ul);
      c.appendChild(h("div", { class: "tblwrap inv-only-d" }, h("table", { class: "tbl" },
        h("thead", null, h("tr", null, h("th", { text: "日付" }), h("th", { text: "状態" }), h("th", { class: "r", text: "在庫金額" }), h("th", { class: "r", text: "前回比" }), h("th", { text: "担当" }))),
        tb)));
      if (all.length > histLimit) c.appendChild(h("button", { class: "btn ghost inv-more", text: "さらに表示（残り " + (all.length - histLimit) + "件）", onClick: () => { histLimit += 10; forceRun(c, drawHist); } }));
    }
    makeLive(box, draw);
    makeLive(hist, drawHist);
  }

  /* =========================================================
   * 3. 発注
   * ========================================================= */
  const ordUI = { status: "open", recLimit: 10 };
  const lineTotal = (ls) => Math.round((ls || []).reduce((s, l) => s + num(l.qty) * num(l.cost), 0));

  async function genFromShortage() {
    if (busy.has("gen")) return;
    busy.add("gen"); refreshAll();
    try { await genFromShortageRun(); } finally { busy.delete("gen"); refreshAll(); }
  }
  async function genFromShortageRun() {
    const all = items();
    // 発注済み（未納品）の数量は差し引いて二重発注を防ぐ
    const onOrder = {};
    K.list("orders").filter((o) => o.status === "sent").forEach((o) => (o.lines || []).forEach((l) => { onOrder[l.itemId] = (onOrder[l.itemId] || 0) + num(l.qty); }));
    const need = all.map((x) => ({ x, q: Math.ceil(num(x.par) - num(x.stock) - (onOrder[x.id] || 0) - 1e-9) })).filter((r) => r.q > 0);
    if (!need.length) { K.toast("不足している品目はありません（発注済み分を含む）", "ok"); return; }
    const bySup = {};
    need.forEach((r) => { const k = r.x.supplierId && K.getDoc("suppliers", r.x.supplierId) ? r.x.supplierId : ""; (bySup[k] = bySup[k] || []).push(r); });
    const today = K.today();
    let made = 0, merged = 0, late = 0;
    for (const sid of Object.keys(bySup)) {
      const rows = bySup[sid];
      const s = sid ? K.getDoc("suppliers", sid) : null;
      const existing = K.list("orders").find((o) => o.status === "draft" && (o.supplierId || "") === sid);
      if (existing) {
        const ls = liveLines(existing).map((l) => Object.assign({}, l));
        rows.forEach((r) => {
          const cur = ls.find((l) => l.itemId === r.x.id);
          if (cur) cur.qty = Math.max(num(cur.qty), r.q);
          else ls.push({ itemId: r.x.id, qty: r.q, cost: Math.round(num(r.x.cost)) });
        });
        const patch = { lines: ls, total: lineTotal(ls) };
        const fit = fitDelivery(existing.deliveryDate || K.addDays(today, leadOf(s)), s);
        if (fit.shifted) { patch.deliveryDate = fit.date; late++; }
        await W.patch("orders", existing.id, patch);
        merged++;
      } else {
        const ls = rows.map((r) => ({ itemId: r.x.id, qty: r.q, cost: Math.round(num(r.x.cost)) }));
        const fit = fitDelivery(K.addDays(today, leadOf(s)), s);
        if (fit.shifted) late++;
        await W.add("orders", {
          date: today, supplierId: sid || null, status: "draft", lines: ls, total: lineTotal(ls),
          deliveryDate: fit.date, staffId: K.currentStaffId(), receivedAt: null,
        });
        made++;
      }
    }
    K.toast("発注案を作成しました（新規 " + made + "件" + (merged ? "・既存の下書きを更新 " + merged + "件" : "") + "）" + (late ? "　締め切り過ぎ " + late + "件は納品日を後ろ倒し" : ""), "ok");
  }

  function orderText(o) {
    const s = o.supplierId ? K.getDoc("suppliers", o.supplierId) : null;
    const store = K.settings().storeName;
    const ls = (o.lines || []).map((l) => {
      const it = itemById(l.itemId);
      return "・" + (it ? it.name : "（削除された品目）") + "　" + fmtQty(l.qty) + (it && it.unit ? it.unit : "");
    });
    return [
      (s ? s.name : "ご担当者") + "様",
      "",
      "いつもお世話になっております。" + (store ? store + "です。" : ""),
      "下記の通り発注いたします。",
      "",
      ...ls,
      "",
      o.deliveryDate ? "納品希望日：" + K.fmt.date(o.deliveryDate) : null,
      "",
      "お手数ですが、ご確認のほどよろしくお願いいたします。",
    ].filter((x) => x !== null).join("\n");
  }
  // クリップボードへ。失敗時は全文選択のシートを出す。成功で true
  async function copyText(text, what) {
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error("no clipboard");
      await navigator.clipboard.writeText(text);
      K.toast(what + "をコピーしました", "ok");
      return true;
    } catch (e) {
      const ta = h("textarea", { class: "inp inv-copybox", value: text, attrs: { readonly: "" } });
      K.sheet({ title: what, guard: false, body: h("div", { class: "stack" }, h("p", { class: "muted small", style: "margin:0", text: "自動でコピーできませんでした。選択された文字を長押し（またはCtrl+C）でコピーしてください。" }), ta), actions: [{ label: "閉じる", kind: "ghost" }] });
      setTimeout(() => { ta.focus(); ta.select(); }, 60);
      return false;
    }
  }
  const copyOrder = (o) => copyText(orderText(o), "発注文面");
  async function revertDraft(o) {
    const cur = K.getDoc("orders", o.id);
    if (!cur || cur.status !== "sent") { K.toast(cur && cur.status === "received" ? "納品済みのため下書きに戻せません" : "この発注書は発注済みではありません", "bad"); return; }
    try { await W.patch("orders", o.id, { status: "draft" }); K.toast(supName(o.supplierId) + "：下書きに戻しました", "ok"); } catch (e) { /* core が toast 済み */ }
  }


  // 納品の受け取り＝検品シート。行ごとに実受数量・実単価・問題（欠品/破損/品違い/その他）を記録
  const ISSUES = ["欠品", "破損", "品違い", "その他"];
  function receiveOrder(o) {
    if (busy.has(o.id)) return Promise.resolve(false);
    const pre = K.getDoc("orders", o.id);
    if (!pre || pre.status !== "sent") { K.toast(pre && pre.status === "received" ? "この発注書はすでに納品済みです" : "この発注書は発注済みではありません", "bad"); return Promise.resolve(false); }
    busy.add(o.id); refreshAll();
    const rows = (pre.lines || []).map((l) => {
      const it = itemById(l.itemId);
      const r = { l, it, issue: null };
      r.qty = K.input({ type: "number", min: 0, max: MAXV, step: "any", value: String(num(l.qty)), class: "inp inv-iq", "aria-label": (it ? it.name : "品目") + " の実際の数量" });
      r.cost = K.input({ type: "number", min: 0, max: MAXV, step: 1, value: String(Math.round(num(l.cost))), class: "inp inv-ic", "aria-label": (it ? it.name : "品目") + " の実単価" });
      return r;
    });
    const summary = h("div", { class: "inv-insp-sum", attrs: { "aria-live": "polite" } });
    const updSum = () => {
      let tot = 0, changed = 0, short = 0;
      rows.forEach((r) => {
        const q = parseQty(r.qty.value).v, c = parseQty(r.cost.value).v;
        if (q !== undefined && c !== undefined) tot += q * Math.round(c);
        if (r.it && c !== undefined && Math.round(c) !== Math.round(num(r.it.cost))) changed++;
        if (r.issue || (q !== undefined && q < num(r.l.qty))) short++;
      });
      summary.textContent = "";
      // Element.append は null を "null" の文字として入れるため、除いてから渡す
      summary.append(...[h("span", null, "受取金額 ", h("b", { class: "num", text: K.fmt.yen(tot) })),
        changed ? h("span", { class: "chip warn", text: "単価が変わった品目：" + changed + "件（レシピ原価に反映されます）" }) : null,
        short ? h("span", { class: "chip bad", text: "問題・不足あり " + short + "件" }) : null].filter(Boolean));
    };
    const list = h("div", { class: "list inv-insp" }, rows.map((r) => {
      const chips = h("div", { class: "fchips inv-insp-chips", role: "group", "aria-label": "問題" });
      const drawChips = () => {
        chips.textContent = "";
        ISSUES.forEach((t) => chips.appendChild(h("button", { type: "button", class: "fchip", attrs: { "aria-pressed": String(r.issue === t) }, onClick: () => {
          r.issue = r.issue === t ? null : t;
          if (r.issue === "欠品" && num(r.qty.value) === num(r.l.qty)) { r.qty.value = "0"; }
          r.qty.dispatchEvent(new Event("input", { bubbles: true }));
          drawChips();
        } }, t)));
      };
      drawChips();
      [r.qty, r.cost].forEach((x) => x.addEventListener("input", () => { markErr(x, null); updSum(); }));
      const u = r.it ? r.it.unit || "" : "";
      return h("div", { class: "li inv-insp-row" },
        h("div", { class: "inv-insp-head" }, h("b", { text: r.it ? r.it.name : "（削除された品目）" }), h("span", { class: "muted small num", text: "発注 " + fmtQty(r.l.qty) + u + "・@" + K.fmt.yen(r.l.cost) })),
        h("div", { class: "inv-insp-in" },
          K.field("実際の数量" + (u ? "（" + u + "）" : ""), r.qty),
          K.field("実単価（円）", r.cost, r.it && Math.round(num(r.it.cost)) !== Math.round(num(r.l.cost)) ? "品目の現単価 " + K.fmt.yen(r.it.cost) : null)),
        chips);
    }));
    updSum();
    const body = h("div", { class: "stack" },
      h("p", { class: "muted small", style: "margin:0", text: "届いた数量と納品書の単価を確認してください。違いがあれば直してから確定します。" }),
      list, summary);
    return new Promise((resolve) => {
      let saved = false;
      K.sheet({
        title: "検品：" + supName(pre.supplierId), body,
        actions: [{ label: "キャンセル", kind: "ghost" }, { label: "受け取りを確定", kind: "primary", disabled: ro(), onClick: async () => {
          const vals = [];
          for (const r of rows) {
            const q = readNum(r.qty, "実際の数量"); if (q == null) return false;
            const c = readNum(r.cost, "実単価", true); if (c == null) return false;
            if (!String(r.qty.value).trim()) { K.fieldError(r.qty, "数量を入力してください"); r.qty.focus(); return false; }
            vals.push({ r, q, c });
          }
          // 書き込み直前に最新を確認（二重受け取り防止）
          const cur = K.getDoc("orders", o.id);
          if (!cur || cur.status !== "sent") { K.toast("この発注書はすでに納品済みです", "bad"); return; }
          const t = nowIso();
          const lines = vals.map(({ r, q, c }) => Object.assign({ itemId: r.l.itemId, qty: q, qtyOrdered: num(r.l.qty), cost: c, costBefore: Math.round(num(r.l.cost)) }, r.issue ? { issue: r.issue } : {}));
          await W.patch("orders", o.id, { status: "received", receivedAt: t, inspected: true, lines, total: lineTotal(lines) });
          let changed = 0;
          for (const { r, q, c } of vals) {
            const it = itemById(r.l.itemId);
            if (!it) continue;
            const patch = { stock: r2(num(it.stock) + q), updatedAt: t };
            if (c !== Math.round(num(it.cost))) { patch.cost = c; changed++; }
            await W.patch("items", it.id, patch);
          }
          saved = true;
          K.toast("納品を受け取りました" + (changed ? "。単価が変わった品目：" + changed + "件（レシピ原価に反映されます）" : ""), "ok");
        } }],
        onClose: () => { busy.delete(o.id); refreshAll(); resolve(saved); },
      });
    });
  }



  function openOrder(src) {
    const isNew = !src;
    const o = JSON.parse(JSON.stringify(src || {
      date: K.today(), supplierId: null, status: "draft", lines: [], total: 0,
      deliveryDate: K.addDays(K.today(), 1), staffId: K.currentStaffId(), receivedAt: null,
    }));
    o.lines = liveLines(o).map((l) => Object.assign({ raw: String(l.qty) }, l));
    const locked = o.status === "received" || ro();
    const supGone = !!(o.supplierId && !K.getDoc("suppliers", o.supplierId));
    const sup = K.select([{ value: "", label: "仕入先未設定" }].concat(supGone ? [{ value: o.supplierId, label: "（削除済みの仕入先）" }] : [])
      .concat(K.list("suppliers").map((s) => ({ value: s.id, label: s.name || "（名称なし）" }))), o.supplierId || "", locked ? { disabled: "" } : null);
    if (supGone && !locked) setTimeout(() => K.fieldError(sup, "この仕入先は削除されています。仕入先を選び直してください"), 0);
    const del = K.input({ type: "date", value: o.deliveryDate || "" });
    if (locked) del.disabled = true;
    const dlInfo = h("div", { class: "row inv-dlinfo", style: "gap:6px" });
    const drawDl = () => {
      dlInfo.textContent = "";
      const s = K.getDoc("suppliers", sup.value);
      if (!s || !s.deadline) return;
      const dl = deadlineFor(del.value, s);
      dlInfo.append(h("span", { class: "muted", text: "発注締め：" + s.deadline + (dl ? "（" + K.fmt.date(localDay(dl.toISOString())) + " " + hm(dl) + "まで）" : "") }));
      const ds = deadlineState({ status: o.status, supplierId: sup.value, deliveryDate: del.value, date: o.date });
      if (ds) dlInfo.append(h("span", { class: "chip " + ds.kind, text: ds.label, title: ds.title }));
    };
    sup.addEventListener("change", () => {
      const s = K.getDoc("suppliers", sup.value);
      if (s && o.status === "draft") del.value = fitDelivery(K.addDays(K.today(), leadOf(s)), s).date;
      drawDl();
    });
    del.addEventListener("change", drawDl);
    // 仕入先の電話：選択できる文字＋「番号をコピー」（tel: リンクは使わない）
    const telRow = h("div", { class: "inv-telrow" });
    const drawTel = () => {
      telRow.textContent = "";
      const s = K.getDoc("suppliers", sup.value);
      telRow.hidden = !(s && s.tel);
      if (!s || !s.tel) return;
      telRow.append(h("span", { class: "muted small", text: "電話" }), h("span", { class: "inv-tel", text: s.tel }),
        h("button", { class: "btn sm", type: "button", onClick: () => copyText(s.tel, "電話番号") }, K.icon("clip"), "番号をコピー"));
    };
    drawTel();
    sup.addEventListener("change", drawTel);
    const totalEl = h("span", { class: "inv-total" });
    const linesBox = h("div", { class: "inv-cq" });
    const validLines = () => o.lines.filter((l) => !l.err);
    const updTotal = () => { totalEl.textContent = K.fmt.yen(lineTotal(validLines())); };
    const addSel = K.select([], "", { "aria-label": "追加する品目" });
    const addRow = h("div", { class: "inv-frow" }, addSel, h("button", { class: "btn", attrs: locked ? { disabled: "" } : null, onClick: () => {
      const it = itemById(addSel.value);
      if (!it) return;
      const q = Math.max(1, Math.ceil(num(it.par) - num(it.stock)));
      o.lines.push({ itemId: it.id, qty: q, raw: String(q), cost: Math.round(num(it.cost)) });
      drawLines();
    } }, K.icon("plus"), "行を追加"));

    function drawLines() {
      linesBox.textContent = "";
      if (!o.lines.length) {
        linesBox.appendChild(K.empty("明細がありません", "下の「行を追加」から品目を選んで数量を入れてください。"));
      } else {
        const wrap = h("div", { class: "inv-olist" });
        o.lines.forEach((l, i) => {
          const it = itemById(l.itemId);
          const step = stepFor(it);
          const q = K.input({ type: "number", min: 0, max: MAXV, step: "any", value: l.raw != null ? l.raw : num(l.qty), "aria-label": (it ? it.name : "品目") + " の数量" });
          if (locked) q.disabled = true;
          const sub = h("span", { class: "inv-osub num" });
          const apply = () => {
            const bad = q.validity && q.validity.badInput;
            const p = bad ? { err: "数値で入力してください" } : parseQty(q.value);
            l.raw = q.value;
            l.err = p.err || null;
            if (!p.err) l.qty = p.empty ? 0 : p.v;
            markErr(q, l.err);
            sub.textContent = l.err ? "—" : K.fmt.yen(num(l.qty) * num(l.cost));
            updTotal();
          };
          q.addEventListener("input", apply);
          const stepBtn = (dir) => h("button", { class: "btn", text: dir < 0 ? "−" : "＋", attrs: Object.assign({ "aria-label": (it ? it.name : "品目") + " を" + fmtQty(step) + (dir < 0 ? "減らす" : "増やす") }, locked ? { disabled: "" } : {}),
            onClick: () => { const base = l.err ? 0 : num(l.qty); q.value = String(Math.max(0, r2(base + dir * step))); apply(); } });
          wrap.appendChild(h("div", { class: "inv-ol" },
            h("div", { class: "inv-oname" }, h("b", { text: it ? it.name : "（削除された品目）" }), h("div", { class: "muted small num", text: "@" + K.fmt.yen(l.cost) + (it && it.unit ? "/" + it.unit : "") })),
            h("div", { class: "inv-qs" }, stepBtn(-1), q, stepBtn(1), h("span", { class: "inv-unit", text: it ? it.unit || "" : "" })),
            sub,
            locked ? h("span", { class: "inv-odel" }) : h("button", { class: "icon-btn danger inv-odel", attrs: { "aria-label": "この行を削除" }, onClick: () => { o.lines.splice(i, 1); drawLines(); } }, K.icon("trash"))));
          apply();
        });
        linesBox.appendChild(wrap);
      }
      addSel.textContent = "";
      const used = new Set(o.lines.map((l) => l.itemId));
      const cand = sortItems(items()).filter((x) => !used.has(x.id));
      const pref = cand.filter((x) => (x.supplierId || "") === (sup.value || ""));
      const rest = cand.filter((x) => (x.supplierId || "") !== (sup.value || ""));
      addSel.appendChild(h("option", { value: "", text: cand.length ? "品目を選ぶ…" : "追加できる品目がありません" }));
      pref.concat(rest).forEach((x) => addSel.appendChild(h("option", { value: x.id, text: x.name + "（在庫 " + fmtQty(x.stock) + (x.unit || "") + "）" })));
      addSel.disabled = locked || !cand.length;
      updTotal();
    }
    sup.addEventListener("change", drawLines);
    drawLines();
    drawDl();

    const st = STATUS[o.status] || STATUS.draft;
    const body = h("div", { class: "stack" },
      h("div", { class: "row" }, h("span", { class: "chip " + st.kind, text: st.label }), h("span", { class: "muted small", text: "作成 " + K.fmt.date(o.date) + (o.staffId ? "・" + K.staffName(o.staffId) : "") }),
        o.receivedAt ? h("span", { class: "muted small", text: "受取 " + K.fmt.date(localDay(o.receivedAt)) }) : null),
      h("div", { class: "grid2" }, K.field("仕入先", sup), K.field("納品予定日", del)),
      dlInfo,
      telRow,
      linesBox,
      locked ? null : addRow,
      h("div", { class: "inv-totrow" }, h("span", { class: "muted", text: "合計" }), totalEl));

    const collect = () => {
      const ls = validLines().filter((l) => num(l.qty) > 0).map((l) => ({ itemId: l.itemId, qty: r2(l.qty), cost: Math.round(num(l.cost)) }));
      return { date: o.date, supplierId: sup.value || null, status: o.status, lines: ls, total: lineTotal(ls), deliveryDate: del.value || null, staffId: o.staffId || K.currentStaffId(), receivedAt: o.receivedAt || null };
    };
    const save = async (extra) => {
      // 他の端末・別の操作で状態が変わっていたら上書きしない（受取済みを発注済みに戻して二重加算になるのを防ぐ）
      if (!isNew) {
        if (busy.has(src.id)) { K.toast("この発注書は処理中です。少し待ってから開き直してください", "bad"); return null; }
        const cur = K.getDoc("orders", src.id);
        if (!cur) { K.toast("この発注書は削除されています", "bad"); return null; }
        if (cur.status !== o.status) { K.toast("この発注書の状態が変わりました（" + (STATUS[cur.status] || {}).label + "）。開き直してください", "bad"); return null; }
      }
      if (sup.value && !K.getDoc("suppliers", sup.value)) { K.fieldError(sup, "この仕入先は削除されています。仕入先を選び直してください"); sup.focus(); return null; }
      const bad = o.lines.find((l) => l.err);
      if (bad) { const it = itemById(bad.itemId); K.toast("数量の入力エラー：" + (it ? it.name : "品目") + "（" + bad.err + "）", "bad"); return null; }
      const data = Object.assign(collect(), extra || {});
      if (!data.lines.length) { K.toast("数量が1以上の明細を1行以上入れてください", "bad"); return null; }
      if (isNew && o.id) { await W.put("orders", o.id, data); }
      else if (isNew) { o.id = await W.add("orders", data); }
      else await W.put("orders", src.id, data);
      return Object.assign({ id: isNew ? o.id : src.id }, data);
    };

    // フッターは「キャンセル｜保存｜主操作」。文面だけコピー・下書きに戻す・整理・削除は … メニュー
    const validate = () => {
      const bad = o.lines.find((l) => l.err);
      if (bad) { const it = itemById(bad.itemId); K.toast("数量の入力エラー：" + (it ? it.name : "品目") + "（" + bad.err + "）", "bad"); return false; }
      if (!collect().lines.length) { K.toast("数量が1以上の明細を1行以上入れてください", "bad"); return false; }
      return true;
    };
    const actions = [];
    if (o.status === "received") {
      actions.push({ label: "閉じる", kind: "ghost" });
    } else {
      actions.push({ label: "キャンセル", kind: "ghost" });
      actions.push({ label: "保存", kind: "", disabled: ro(), onClick: async () => { const r = await save(); if (!r) return false; K.toast("発注書を保存しました", "ok"); } });
      if (o.status === "draft") {
        actions.push({ label: "文面をコピーして発注済みにする", kind: "primary", disabled: ro(), onClick: async () => {
          if (!validate()) return false;
          const ok = await copyOrder(Object.assign({}, o, collect()), true);
          const r = await save({ status: "sent" }); if (!r) return false;
          K.toast((ok ? "文面をコピーし、" : "") + "発注済みにしました", "ok", { action: { label: "元に戻す", onClick: () => revertDraft(r) } });
        } });
      } else if (o.status === "sent") {
        actions.push({ label: "納品を受け取る", kind: "primary", disabled: ro(), onClick: async () => {
          const r = await save(); if (!r) return false;
          close();
          await receiveOrder(r);
          return false;
        } });
      }
    }
    const menu = [
      { label: "文面だけコピー", icon: "clip", onClick: () => copyOrder(Object.assign({}, o, collect())) },
      { label: "下書きに戻す", icon: "edit", hidden: o.status !== "sent" || isNew, disabled: ro(), onClick: async () => { await revertDraft(src); return "close"; } },
      { label: "数量0の明細を整理", icon: "check", hidden: locked || !o.lines.some((l) => !l.err && !(num(l.qty) > 0)), onClick: () => {
        o.lines = o.lines.filter((l) => l.err || num(l.qty) > 0); drawLines(); K.toast("数量0の明細を外しました（保存で確定）", "ok"); } },
      { label: "この発注書を削除", icon: "trash", danger: true, hidden: isNew, disabled: ro(), onClick: async () => {
        if (!(await K.confirm("この発注書を削除します。在庫は変わりません。", "削除する"))) return;
        await W.del("orders", src.id); K.toast("発注書を削除しました", "ok");
        return "close";
      } },
    ];
    const close = K.sheet({ title: isNew ? "発注書を作成" : "発注書：" + supName(o.supplierId), body, actions, menu });
    // スマホでフッターを1段に収めるため、主操作の表示だけ短縮（読み上げは正式名）
    const pb = body.closest(".sheet") && body.closest(".sheet").querySelector(".sheet-actions .btn.primary");
    if (pb && o.status === "draft") {
      pb.setAttribute("aria-label", "文面をコピーして発注済みにする");
      pb.textContent = "";
      pb.append(h("span", null, h("span", { class: "inv-hide-m", text: "文面を" }), "コピーして発注", h("span", { class: "inv-hide-m", text: "済みにする" })));
    }
  }

  async function markSent(o) {
    if (!(o.lines || []).length) { openOrder(o); return; }
    if (busy.has(o.id)) return;
    const cur = K.getDoc("orders", o.id);
    if (!cur || cur.status !== "draft") { K.toast("この発注書はすでに下書きではありません", "bad"); return; }
    busy.add(o.id); refreshAll();
    try {
      const ls = liveLines(cur);
      await W.patch("orders", o.id, { status: "sent", lines: ls, total: lineTotal(ls) });
    } finally { busy.delete(o.id); refreshAll(); }
    K.toast(supName(o.supplierId) + "：発注済みにしました", "ok", { action: { label: "元に戻す", onClick: () => revertDraft(o) } });
  }

  function renderOrder(el) {
    const genBtn = h("button", { class: "btn primary", attrs: WA, onClick: genFromShortage }, K.icon("cart"), "不足から発注案");
    const newBtn = h("button", { class: "btn ghost", attrs: WA, onClick: () => openOrder(null) }, K.icon("plus"), "空の発注書");
    el.appendChild(h("div", { class: "inv-head" }, h("h2", { class: "sec-title", text: "発注書" }), genBtn));
    const seg = h("div", { class: "seg", role: "group", "aria-label": "状態で絞り込み" });
    el.appendChild(h("div", { class: "inv-otools" }, seg, h("span", { class: "spacer" }), newBtn));
    const box = h("div", { class: "stack inv-cq" });
    el.appendChild(box);

    function draw() {
      const all = K.list("orders");
      genBtn.disabled = busy.has("gen") || ro();
      seg.textContent = "";
      const match = (o, v) => (v === "open" ? o.status === "draft" || o.status === "sent" : o.status === v);
      [{ v: "open", l: "未完了" }, { v: "draft", l: "下書き" }, { v: "sent", l: "発注済み" }, { v: "received", l: "納品済み" }].forEach((c) => {
        const n = all.filter((o) => match(o, c.v)).length;
        seg.appendChild(h("button", { class: "seg-btn", attrs: { "aria-pressed": String(ordUI.status === c.v) }, onClick: () => { ordUI.status = c.v; ordUI.recLimit = 10; draw(); } },
          c.l, c.v !== "received" && n ? h("span", { class: "num", style: "margin-left:4px;font-size:12px", text: String(n) }) : null));
      });
      box.textContent = "";
      if (!all.length) {
        box.appendChild(K.empty("発注書はまだありません", "「不足から発注案」を押すと、適正在庫に足りない分を仕入先ごとの下書きにまとめます。数量を直して「発注済みにする」→ 届いたら「納品を受け取る」で在庫に加算されます。", "不足から発注案を作る", genFromShortage));
        return;
      }
      const rank = { draft: 0, sent: 1, received: 2 };
      const rowsAll = all.filter((o) => match(o, ordUI.status)).sort((a, b) =>
        (rank[a.status] ?? 3) - (rank[b.status] ?? 3) ||
        (a.status === "received" ? String(b.receivedAt || b.date).localeCompare(String(a.receivedAt || a.date)) : String(a.deliveryDate || a.date).localeCompare(String(b.deliveryDate || b.date))));
      if (!rowsAll.length) {
        box.appendChild(ordUI.status === "open"
          ? K.empty("未完了の発注書はありません", "下書き・納品待ちの発注書はすべて片付いています。不足が出たら「不足から発注案を作る」で下書きを作れます。", "不足から発注案を作る", genFromShortage)
          : K.empty("この状態の発注書はありません", "上の切り替えで「未完了」や「納品済み」を選んでください。"));
        return;
      }
      const rows = ordUI.status === "received" ? rowsAll.slice(0, ordUI.recLimit) : rowsAll;
      const today = K.today();
      const list = h("div", { class: "inv-olist" });
      rows.forEach((o) => {
        const st = STATUS[o.status] || STATUS.draft;
        const late = o.status === "sent" && o.deliveryDate && o.deliveryDate < today;
        const ds = deadlineState(o);
        let act = null;
        if (!ro() && o.status === "draft") act = h("button", { class: "btn sm", text: "発注済みにする", disabled: busy.has(o.id), onClick: (e) => { e.stopPropagation(); e.currentTarget.disabled = true; markSent(o); } });
        else if (!ro() && o.status === "sent") act = h("button", { class: "btn sm", text: busy.has(o.id) ? "処理中…" : "納品を受け取る", disabled: busy.has(o.id), onClick: (e) => { e.stopPropagation(); e.currentTarget.disabled = true; receiveOrder(o); } });
        const open = () => openOrder(o);
        list.appendChild(h("div", { class: "inv-orow", tabindex: "0", role: "button", "aria-label": supName(o.supplierId) + " の発注書（" + st.label + "）を開く",
          onClick: open, onKeydown: (e) => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); open(); } } },
          h("div", { class: "inv-o-sup" }, h("span", { class: "chip " + st.kind, text: st.label }), h("b", { text: supName(o.supplierId) })),
          h("div", { class: "inv-o-meta" },
            o.status === "received"
              ? h("span", { class: "inv-dd" }, "受取 ", h("span", { class: "num", text: o.receivedAt ? K.fmt.date(localDay(o.receivedAt)) : "—" }))
              : h("span", { class: "inv-dd" }, "納品 ", h("span", { class: "num", text: o.deliveryDate ? K.fmt.date(o.deliveryDate) : "—" })),
            late ? h("span", { class: "chip bad", text: "遅れ" }) : null,
            ds ? h("span", { class: "chip " + ds.kind, text: ds.label, title: ds.title }) : null,
            h("span", { class: "muted", text: (o.lines || []).length + "品・作成 " + K.fmt.md(o.date) })),
          h("div", { class: "inv-o-total", text: K.fmt.yen(o.status === "draft" ? lineTotal(liveLines(o)) : o.total) }),
          h("div", { class: "inv-o-act" }, act)));
      });
      box.appendChild(list);
      if (rows.length < rowsAll.length) box.appendChild(h("button", { class: "btn ghost inv-more", text: "さらに表示（残り " + (rowsAll.length - rows.length) + "件）", onClick: () => { ordUI.recLimit += 10; draw(); } }));
      if (ordUI.status === "open") {
        const rec = all.filter((o) => o.status === "received").length;
        if (rec) box.appendChild(h("button", { class: "btn ghost inv-more", text: "納品済みの発注書を見る（" + rec + "件）", onClick: () => { ordUI.status = "received"; ordUI.recLimit = 10; draw(); } }));
      }
      const sentTotal = all.filter((o) => o.status === "sent").reduce((s, o) => s + num(o.total), 0);
      if (sentTotal) box.appendChild(h("div", { class: "inv-ofoot" }, "納品待ちの発注額", h("span", { class: "num", text: K.fmt.yen(sentTotal) })));
    }
    live.add(draw);
    draw();
  }

  /* =========================================================
   * 4. 仕入先
   * ========================================================= */
  function openSupplier(s) {
    const isNew = !s;
    const d = s || { name: "", tel: "", leadDays: 1, deadline: "", memo: "" };
    const name = K.input({ value: d.name, placeholder: "例：〇〇青果", maxlength: 60 });
    const tel = K.input({ type: "tel", value: d.tel, placeholder: "例：03-1234-5678", inputmode: "tel", maxlength: 30 });
    const lead = K.input({ type: "number", value: num(d.leadDays), min: 0, step: 1 });
    const dl = K.input({ value: d.deadline, placeholder: "例：前日15時", maxlength: 30 });
    const memo = h("textarea", { class: "inp", value: d.memo || "", placeholder: "例：日曜休み。LINEでも発注可。", attrs: { maxlength: "500" } });
    const actions = [{ label: "キャンセル", kind: "ghost" }];
    const menu = isNew ? null : [{ label: "この仕入先を削除", icon: "trash", danger: true, disabled: ro(), onClick: async () => {
      const n = items().filter((x) => x.supplierId === s.id).length;
      if (!(await K.confirm("「" + d.name + "」を削除します。" + (n ? "この仕入先の品目 " + n + "品は「仕入先未設定」になります。" : ""), "削除する"))) return;
      await W.del("suppliers", s.id);
      K.toast("仕入先を削除しました", "ok");
      return "close";
    } }];
    actions.push({ label: isNew ? "追加する" : "保存", kind: "primary", disabled: ro(), onClick: async () => {
      const nm = name.value.trim();
      if (!nm) { K.fieldError(name, "仕入先名を入力してください"); name.focus(); return false; }
      const data = { name: nm, tel: tel.value.trim(), leadDays: Math.max(0, Math.round(num(lead.value))), deadline: dl.value.trim(), memo: memo.value.trim() };
      if (isNew) await W.add("suppliers", data); else await W.put("suppliers", s.id, data);
      K.toast(isNew ? "仕入先を追加しました" : "保存しました", "ok");
    } });
    K.sheet({
      title: isNew ? "仕入先を追加" : "仕入先を編集", menu,
      body: h("div", { class: "stack" }, K.field("仕入先名", name), K.field("電話番号", tel),
        h("div", { class: "grid2" }, K.field("リードタイム（日）", lead, "発注から納品までの日数"), K.field("発注締め", dl)),
        K.field("メモ", memo)),
      actions,
    });
  }

  function renderSupplier(el) {
    el.appendChild(h("div", { class: "inv-head" }, h("h2", { class: "sec-title", text: "仕入先" }),
      h("button", { class: "btn primary", attrs: WA, onClick: () => openSupplier(null) }, K.icon("plus"), "仕入先を追加")));
    const box = h("div", { class: "grid2" });
    el.appendChild(box);
    function draw() {
      box.textContent = "";
      const list = K.list("suppliers").slice().sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "ja"));
      if (!list.length) {
        box.style.display = "block";
        box.appendChild(K.empty("仕入先がまだありません", "八百屋・精肉店・酒屋などを登録すると、品目に紐づけて仕入先ごとの発注書を自動で作れます。電話番号・締め時間・リードタイムも控えておけます。", "仕入先を追加", () => openSupplier(null)));
        return;
      }
      box.style.display = "";
      list.forEach((s) => {
        const n = items().filter((x) => x.supplierId === s.id).length;
        box.appendChild(h("div", { class: "card inv-sup" },
          h("div", { class: "inv-sup-head" }, h("b", { text: s.name || "（名称なし）" }),
            h("button", { class: "btn sm", attrs: WA, onClick: () => openSupplier(s) }, K.icon("edit"), "編集")),
          h("div", { class: "inv-telrow" }, h("span", { class: "muted small", text: "電話" }), s.tel ? h("span", { class: "inv-tel", text: s.tel }) : h("span", { class: "muted", text: "未登録" }),
            s.tel ? h("button", { class: "btn sm", onClick: () => copyText(s.tel, "電話番号") }, K.icon("clip"), "番号をコピー") : null),
          h("div", { class: "row", style: "gap:6px" },
            h("span", { class: "chip info", text: "リードタイム " + num(s.leadDays) + "日" }),
            s.deadline ? h("span", { class: "chip warn", text: "締め " + s.deadline }) : null,
            h("span", { class: "chip", text: "品目 " + n })),
          s.memo ? h("div", { class: "inv-sup-memo", text: s.memo }) : null));
      });
    }
    live.add(draw);
    draw();
  }

  /* ---------- 登録 ---------- */
  K.register({
    key: "inventory", label: "在庫・発注", icon: "box", order: 2,
    mount(root) {
      root.appendChild(h("h1", { class: "page-title", text: "在庫・発注" }));
      K.subtabs(root, "inventory", [
        { id: "stock", label: "在庫", render: renderStock },
        { id: "count", label: "棚卸し", render: renderCount },
        { id: "order", label: "発注", render: renderOrder },
        { id: "supplier", label: "仕入先", render: renderSupplier },
        { id: "waste", label: "ロス", render: renderWaste },
      ]);
      K.on("readonly", refreshAll);
    },
  });

  /* =========================================================
   * クイックメモの窓口（v2.4）：order.add / stock.fix
   * ========================================================= */
  // メモ本文から品目を推測（品目名が本文に含まれる＞本文の語が品目名に含まれる、長い一致を優先）
  function guessItem(text) {
    const t = String(text || "").replace(/\s+/g, " ").trim();
    if (!t) return null;
    const toks = t.split(/[\s、。，,・\/]+/).filter((w) => w && !/^\d+(\.\d+)?[a-zA-Zぁ-んァ-ン個本kgLg]*$/.test(w));
    let best = null, bestScore = 0;
    items().forEach((x) => {
      const nm = String(x.name || "");
      const core = nm.replace(/[（(].*?[)）]/g, "").trim();
      let sc = 0;
      if (nm && t.includes(nm)) sc = 100 + nm.length;
      else if (core && t.includes(core)) sc = 80 + core.length;
      else toks.forEach((w) => { if (w.length >= 1 && core.includes(w)) sc = Math.max(sc, 10 + w.length * 5 - (core.length - w.length)); });
      if (sc > bestScore) { bestScore = sc; best = x; }
    });
    return best;
  }
  // 検索できる品目選択（選択中は藍の淡色）
  function itemPicker(initial, onChange) {
    let sel = initial ? initial.id : null;
    const q = K.input({ type: "search", placeholder: "品目名で絞り込み", "aria-label": "品目を検索" });
    const list = h("div", { class: "inv-pick-list", role: "listbox", "aria-label": "品目" });
    function draw() {
      list.textContent = "";
      const w = q.value.trim().toLowerCase();
      let rows = sortItems(items()).filter((x) => !w || String(x.name || "").toLowerCase().includes(w));
      const cur = rows.find((x) => x.id === sel);
      if (cur) rows = [cur].concat(rows.filter((x) => x !== cur));
      if (!rows.length) { list.appendChild(h("div", { class: "li muted small", text: items().length ? "該当する品目がありません" : "品目が未登録です（在庫タブで追加）" })); return; }
      rows.forEach((x) => list.appendChild(h("button", {
        class: "li", type: "button", attrs: { "aria-pressed": String(x.id === sel), role: "option", "aria-selected": String(x.id === sel) },
        onClick: () => { sel = x.id; draw(); onChange && onChange(itemById(sel)); },
      }, h("span", { class: "inv-pk-ck" }, K.icon("check")), h("span", { class: "inv-pk-n", text: x.name || "（名称なし）" }),
        h("span", { class: "inv-pk-m num", text: "在庫 " + fmtQty(x.stock) + (x.unit || "") }))));
    }
    q.addEventListener("input", draw);
    draw();
    return { el: h("div", { class: "inv-pick" }, q, list), get: () => itemById(sel) };
  }
  const memoBox = (memo) => h("div", { class: "inv-memo" }, h("b", { text: "メモ" + (memo.tag ? "（" + memo.tag + "）" : "") }), String(memo.text || "（本文なし）"));
  // 品目の仕入先の下書きへ明細を追加（同じ品目があれば加算、下書きがなければ作成）
  async function addToDraft(it, qty) {
    const sid = it.supplierId && K.getDoc("suppliers", it.supplierId) ? it.supplierId : "";
    const s = sid ? K.getDoc("suppliers", sid) : null;
    const ex = K.list("orders").find((o) => o.status === "draft" && (o.supplierId || "") === sid);
    if (ex) {
      const ls = liveLines(ex).map((l) => Object.assign({}, l));
      const cur = ls.find((l) => l.itemId === it.id);
      if (cur) cur.qty = r2(num(cur.qty) + qty); else ls.push({ itemId: it.id, qty, cost: Math.round(num(it.cost)) });
      await W.patch("orders", ex.id, { lines: ls, total: lineTotal(ls) });
      return { created: false, sup: supName(sid) };
    }
    const today = K.today();
    const ls = [{ itemId: it.id, qty, cost: Math.round(num(it.cost)) }];
    await W.add("orders", { date: today, supplierId: sid || null, status: "draft", lines: ls, total: lineTotal(ls),
      deliveryDate: fitDelivery(K.addDays(today, leadOf(s)), s).date, staffId: K.currentStaffId(), receivedAt: null });
    return { created: true, sup: supName(sid) };
  }
  const draftDest = (it) => {
    if (!it) return "品目を選ぶと追加先が表示されます";
    const sid = it.supplierId && K.getDoc("suppliers", it.supplierId) ? it.supplierId : "";
    const ex = K.list("orders").find((o) => o.status === "draft" && (o.supplierId || "") === sid);
    const line = ex && (ex.lines || []).find((l) => l.itemId === it.id);
    return "追加先：" + supName(sid) + " の下書き" + (ex ? (line ? "（同じ品目 " + fmtQty(line.qty) + (it.unit || "") + " に加算）" : "（既存の下書きに追加）") : "（新しく作成）");
  };
  const svcSheet = (title, body, saveLabel, onSave) => new Promise((resolve) => {
    let saved = false;
    K.sheet({
      title, body,
      actions: [{ label: "キャンセル", kind: "ghost" }, { label: saveLabel, kind: "primary", disabled: ro(), onClick: async () => { const ok = await onSave(); if (ok === false) return false; saved = true; } }],
      onClose: () => resolve(saved),
    });
  });

  K.provide("order.add", {
    label: "発注書の下書きに追加", icon: "cart", order: 10,
    handle: (memo) => {
      const qty = K.input({ type: "number", min: 0, max: MAXV, step: "any", value: memo.qty != null && memo.qty !== "" ? String(memo.qty) : "", placeholder: "数量", "aria-label": "数量" });
      const unitEl = h("span", { class: "muted" });
      const dest = h("div", { class: "inv-svc-dest" });
      const upd = (it) => { unitEl.textContent = it ? it.unit || "" : ""; dest.textContent = draftDest(it); };
      const pick = itemPicker(guessItem(memo.text), upd);
      upd(pick.get());
      qty.addEventListener("input", () => markErr(qty, null));
      const body = h("div", { class: "stack" }, memoBox(memo), K.field("品目", pick.el), K.field("数量", h("div", { class: "inv-svc-q" }, qty, unitEl)), dest);
      return svcSheet("発注書の下書きに追加", body, "下書きに追加", async () => {
        const it = pick.get();
        if (!it) { K.toast("品目を選んでください", "bad"); return false; }
        const v = readNum(qty, "数量"); if (v == null) return false;
        if (!(v > 0)) { markErr(qty, "1以上"); K.toast("数量を入力してください（0より大きい数）", "bad"); qty.focus(); return false; }
        if (num(it.par) > 0 && v > num(it.par) * 10 && !(await K.confirm("数量 " + fmtQty(v) + (it.unit || "") + " は適正在庫（" + fmtQty(it.par) + "）の10倍超です。このまま追加しますか？", "このまま追加"))) return false;
        const r = await addToDraft(it, v);
        K.toast(r.sup + " の下書きに「" + it.name + " " + fmtQty(v) + (it.unit || "") + "」を追加しました", "ok");
        return true;
      });
    },
  });

  K.provide("stock.fix", {
    label: "在庫の数量を直す", icon: "box", order: 11,
    handle: (memo) => {
      const soldOut = memo.tag === "品切れ";
      const val = K.input({ type: "number", min: 0, max: MAXV, step: "any", value: soldOut ? "0" : "", placeholder: "現在庫", "aria-label": "現在庫" });
      const unitEl = h("span", { class: "muted" });
      const cur = h("div", { class: "inv-svc-dest" });
      const upd = (it) => { unitEl.textContent = it ? it.unit || "" : ""; cur.textContent = it ? "いまの在庫：" + fmtQty(it.stock) + (it.unit || "") + "（適正 " + fmtQty(it.par) + "）" : "品目を選んでください"; };
      const pick = itemPicker(guessItem(memo.text), upd);
      upd(pick.get());
      val.addEventListener("input", () => markErr(val, null));
      const body = h("div", { class: "stack" }, memoBox(memo), K.field("品目", pick.el), K.field("現在庫", h("div", { class: "inv-svc-q" }, val, unitEl), soldOut ? "品切れのメモなので 0 を入れています" : null), cur);
      return svcSheet("在庫の数量を直す", body, "在庫を更新", async () => {
        const it = pick.get();
        if (!it) { K.toast("品目を選んでください", "bad"); return false; }
        if (!String(val.value).trim()) { markErr(val, "未入力"); K.toast("現在庫を入力してください", "bad"); val.focus(); return false; }
        const v = readNum(val, "現在庫"); if (v == null) return false;
        if (isOutlier(it, v) && !(await K.confirm("「" + it.name + "」帳簿 " + fmtQty(it.stock) + (it.unit || "") + " → " + fmtQty(v) + (it.unit || "") + "。桁の打ち間違いがないか確認してください。このまま更新しますか？", "このまま更新"))) return false;
        const old = r2(it.stock), id = it.id;
        await W.patch("items", id, { stock: v, updatedAt: nowIso() });
        K.toast(it.name + " " + fmtQty(old) + "→" + fmtQty(v) + (it.unit || ""), null, { action: { label: "元に戻す", onClick: async () => {
          const c = itemById(id); if (!c) return;
          const back = Math.max(0, r2(num(c.stock) - (v - old)));
          try { await W.patch("items", id, { stock: back, updatedAt: nowIso() }); K.toast(it.name + " を " + fmtQty(back) + (it.unit || "") + " に戻しました", "ok"); } catch (e) { /* core が toast 済み */ }
        } } });
        return true;
      });
    },
  });


  /* =========================================================
   * 5. ロス・廃棄（v3.0）：waste/{id}
   * ========================================================= */
  const REASONS = ["期限切れ", "仕込み過多", "調理ミス", "品質不良", "その他"];
  const wUI = { limit: 20 };
  // 記録シート。prefill: {text, qty, memo}。保存で true（Promise）
  function openWaste(prefill) {
    const pf = prefill || {};
    let reason = REASONS.find((r) => String(pf.text || "").includes(r)) || (/期限/.test(pf.text || "") ? "期限切れ" : /焦|ミス|落と/.test(pf.text || "") ? "調理ミス" : /傷|腐|変色|品質/.test(pf.text || "") ? "品質不良" : "");
    const qty = K.input({ type: "number", min: 0, max: MAXV, step: "any", value: pf.qty != null && pf.qty !== "" ? String(pf.qty) : "", placeholder: "数量", "aria-label": "数量" });
    const unitEl = h("span", { class: "muted" });
    const freeName = K.input({ value: "", placeholder: "登録外の品目名", maxlength: 40, "aria-label": "登録外の品目名" });
    const freeUnit = K.input({ value: "", placeholder: "単位", maxlength: 12, "aria-label": "単位" });
    const freeCost = K.input({ type: "number", min: 0, max: MAXV, step: 1, value: "", placeholder: "単価（円）", "aria-label": "単価" });
    const freeBox = h("div", { class: "inv-free" }, freeName, freeUnit, freeCost);
    const info = h("div", { class: "inv-svc-dest" });
    const upd = (it) => {
      unitEl.textContent = it ? it.unit || "" : freeUnit.value;
      freeBox.hidden = !!it;
      info.textContent = it ? "在庫 " + fmtQty(it.stock) + (it.unit || "") + " から差し引きます・単価 " + K.fmt.yen(it.cost) : "登録外の品目は在庫を変えずに金額だけ記録します";
    };
    const guess = pf.text ? guessItem(pf.text) : null;
    const pick = itemPicker(guess, upd);
    const chips = h("div", { class: "fchips inv-reasons", role: "group", "aria-label": "理由" });
    const drawR = () => { chips.textContent = ""; REASONS.forEach((t) => chips.appendChild(h("button", { type: "button", class: "fchip", attrs: { "aria-pressed": String(reason === t) }, onClick: () => { reason = t; chips.removeAttribute("aria-invalid"); const fe = chips.parentElement && chips.parentElement.querySelector(":scope > .field-error"); if (fe) fe.remove(); drawR(); } }, t))); };
    drawR();
    const memo = K.input({ value: pf.memo || "", placeholder: "メモ（任意）", maxlength: 200, "aria-label": "メモ" });
    freeUnit.addEventListener("input", () => upd(pick.get()));
    qty.addEventListener("input", () => markErr(qty, null));
    upd(pick.get());
    const reasonField = K.field("理由", chips);
    const body = h("div", { class: "stack" },
      pf.text ? memoBox({ text: pf.text, tag: pf.tag }) : null,
      K.field("品目", pick.el), freeBox,
      K.field("数量", h("div", { class: "inv-svc-q" }, qty, unitEl)),
      reasonField, K.field("メモ", memo), info);
    return svcSheet("ロス・廃棄を記録", body, "記録する", async () => {
      if (busy.has("waste")) return false;
      const it = pick.get();
      const nm = it ? it.name : freeName.value.trim();
      if (!nm) { K.fieldError(freeName, "品目を選ぶか、品目名を入力してください"); freeName.focus(); return false; }
      if (!String(qty.value).trim()) { K.fieldError(qty, "数量を入力してください"); qty.focus(); return false; }
      const v = readNum(qty, "数量"); if (v == null) return false;
      if (!(v > 0)) { K.fieldError(qty, "0より大きい数を入力してください"); qty.focus(); return false; }
      if (!reason) { K.fieldError(chips, "理由を選んでください"); return false; }
      let unitCost = it ? Math.round(num(it.cost)) : 0;
      if (!it && String(freeCost.value).trim()) { const c = readNum(freeCost, "単価", true); if (c == null) return false; unitCost = c; }
      if (it && num(it.stock) > 0 && v > num(it.stock) && !(await K.confirm("ロス " + fmtQty(v) + (it.unit || "") + " は在庫 " + fmtQty(it.stock) + (it.unit || "") + " より多いです。在庫は0になります。このまま記録しますか？", "このまま記録", { danger: false }))) return false;
      busy.add("waste");
      try {
        const data = { date: K.today(), itemId: it ? it.id : null, name: nm, qty: v, unit: it ? it.unit || "" : freeUnit.value.trim(), unitCost, amount: Math.round(v * unitCost), reason, memo: memo.value.trim(), staffId: K.currentStaffId(), createdAt: nowIso() };
        // 実際に在庫から差し引いた量（在庫を超える分は差し引けない）を deducted として残す（v3.1）
        const cur = it ? itemById(it.id) : null;
        data.deducted = cur ? r2(Math.min(v, Math.max(0, num(cur.stock)))) : 0;
        await W.add("waste", data);
        if (cur && data.deducted > 0) await W.patch("items", cur.id, { stock: Math.max(0, r2(num(cur.stock) - data.deducted)), updatedAt: nowIso() });
        K.toast("ロスを記録しました：" + nm + " " + fmtQty(v) + data.unit + "（" + K.fmt.yen(data.amount) + "）", "ok");
      } finally { busy.delete("waste"); }
      return true;
    });
  }
  // 削除（在庫を戻す）。元に戻す＝記録と在庫の差し引きをやり直す
  // 削除＝実際に差し引いた量（deducted、古い記録は qty）だけ在庫を戻す。元に戻すは差し引けた量を新しい deducted にする
  const deductedOf = (w) => (w.deducted != null ? num(w.deducted) : num(w.qty));
  async function delWaste(w) {
    const back = w.itemId && itemById(w.itemId) ? deductedOf(w) : 0;
    if (!(await K.confirm("「" + w.name + " " + fmtQty(w.qty) + (w.unit || "") + "」のロス記録を削除します。" + (back > 0 ? "在庫に " + fmtQty(back) + (w.unit || "") + " を戻します。" : ""), "削除する"))) return;
    const data = Object.assign({}, w); delete data.id;
    await W.del("waste", w.id);
    const it = w.itemId && itemById(w.itemId);
    if (it && back > 0) await W.patch("items", it.id, { stock: r2(num(it.stock) + back), updatedAt: nowIso() });
    K.toast("ロス記録を削除しました", "ok", { action: { label: "元に戻す", onClick: async () => {
      try {
        const c = w.itemId && itemById(w.itemId);
        const d = c ? r2(Math.min(back, Math.max(0, num(c.stock)))) : 0;
        await W.put("waste", w.id, Object.assign({}, data, { deducted: d }));
        if (c && d > 0) await W.patch("items", c.id, { stock: Math.max(0, r2(num(c.stock) - d)), updatedAt: nowIso() });
        K.toast("ロス記録を戻しました", "ok");
      } catch (e) { /* core が toast 済み */ }
    } } });
  }

  function renderWaste(el) {
    el.appendChild(h("div", { class: "inv-head" }, h("h2", { class: "sec-title", text: "ロス・廃棄" }),
      h("button", { class: "btn primary", attrs: WA, onClick: () => openWaste(null) }, K.icon("waste"), "ロスを記録")));
    const sum = h("div", { class: "sumbar" });
    const box = h("div", { class: "stack" });
    el.appendChild(sum); el.appendChild(box);
    function draw() {
      const all = K.list("waste").slice().sort((a, b) => String(b.createdAt || b.date).localeCompare(String(a.createdAt || a.date)));
      const t = K.today(), m = t.slice(0, 7);
      const today = all.filter((w) => w.date === t), month = all.filter((w) => String(w.date).slice(0, 7) === m);
      const amt = (ls) => ls.reduce((s, w) => s + num(w.amount), 0);
      sum.textContent = "";
      sum.append(
        h("div", { class: "cell" }, h("span", { class: "lbl", text: "今日のロス" }), h("span", { class: "val" + (amt(today) ? " bad" : "") , text: K.fmt.yen(amt(today)) }), h("span", { class: "sub", text: today.length + "件" })),
        h("div", { class: "cell" }, h("span", { class: "lbl", text: "今月のロス" }), h("span", { class: "val", text: K.fmt.yen(amt(month)) }), h("span", { class: "sub", text: month.length + "件" })));
      box.textContent = "";
      if (!all.length) {
        box.appendChild(K.empty("ロス・廃棄の記録はまだありません", "期限切れや調理ミスで捨てた食材を記録すると、在庫から差し引かれ、今日・今月のロス金額がここに出ます。クイックメモからも回せます。", "ロスを記録", () => openWaste(null)));
        return;
      }
      const ul = h("div", { class: "list inv-wlist" });
      all.slice(0, wUI.limit).forEach((w) => ul.appendChild(h("div", { class: "li" },
        h("span", { class: "inv-w-name", text: w.name + " " + fmtQty(w.qty) + (w.unit || "") }),
        h("span", { class: "inv-w-amt", text: K.fmt.yen(w.amount) }),
        ro() ? h("span", { class: "inv-w-del" }) : h("button", { class: "icon-btn danger inv-w-del", "aria-label": w.name + " のロス記録を削除", title: "削除", onClick: () => delWaste(w) }, K.icon("trash")),
        h("span", { class: "inv-w-meta" }, h("span", { class: "chip", text: w.reason || "その他" }), h("span", { class: "num", text: K.fmt.date(w.date) }),
          h("span", { text: w.staffId ? K.staffName(w.staffId) : "" }), w.memo ? h("span", { text: "・" + w.memo }) : null))));
      box.appendChild(ul);
      if (all.length > wUI.limit) box.appendChild(h("button", { class: "btn ghost inv-more", text: "さらに表示（残り " + (all.length - wUI.limit) + "件）", onClick: () => { wUI.limit += 20; draw(); } }));
    }
    live.add(draw);
    draw();
  }
  K.provide("waste.add", {
    label: "ロス・廃棄に記録", icon: "waste", order: 12,
    handle: (memo) => openWaste({ text: memo.text, qty: memo.qty, tag: memo.tag }),
  });

  // 購読は読み込み時に1回（タブ未表示でもクイックメモの窓口が仕入先・下書きを正しく引けるように）
  ["items", "suppliers", "counts", "orders", "staff", "waste"].forEach((c) => K.watch(c, refreshAll));
  // ホーム等からの絞り込み付き移動（v2.8）：stock:"short" → 不足・少なめのみ、order:"draft" → 下書き
  K.on("nav", (ev) => {
    if (!ev || ev.key !== "inventory" || !ev.filter) return;
    const f = ev.filter;
    const sf = typeof f === "string" ? f : f && f.stock;
    if (sf === "short" || sf === "bad") { stockUI.state = sf; stockUI.cat = ""; stockUI.q = ""; }
    if (f === "draft" || (f && typeof f === "object" && f.order === "draft")) { ordUI.status = "draft"; ordUI.recLimit = 10; }
    refreshAll();
  });
  // 0時を越えたら「今日」を更新（棚卸し日が前日の今日のままで未入力なら新しい今日へ）
  let lastToday = K.today();
  K.on("day", (d) => {
    if (cnt.date === lastToday && !cnt.dirty) { cnt.date = d; cnt.loadedFor = null; }
    lastToday = d;
    refreshAll();
  });
  // ナビのバッジ（不足品目数）。タブ未表示でも出すため mount 外で購読
  K.watch("items", (rows) => K.badge("inventory", rows.filter((x) => itemState(x).kind === "bad").length, "bad"));
})();
