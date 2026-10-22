/* 厨房帳 mod-sales.js — 担当D：売上・業務改善（ホーム「今日」含む）
   書き込み：sales, kaizen のみ。その他は読み取り専用。 */
(function () {
  "use strict";
  const K = window.K;
  const W = K.scope("sales");
  const h = K.h;

  K.css("sal", `
/* 担当D：白基調。色はトークンのみ、影は共通の --shadow-sm だけ */
.sal-head { display:flex; align-items:baseline; gap:12px; flex-wrap:wrap; }
.sal-date { font-family: var(--f-num); font-variant-numeric: tabular-nums; font-size: 15px; color: var(--muted); font-weight: 400; }
.sal-sec { display:flex; flex-direction:column; gap:10px; min-width:0; }
.sal-sec-head { display:flex; align-items:center; gap:8px; min-height: 36px; flex-wrap:wrap; }
.sal-sec-head .sec-title { margin-right:auto; }
.sal-pane-head { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
.sal-pane-head .sec-title { margin-right:auto; }
.sal-meta { font-size: 13px; color: var(--muted); }

/* HOME 見出し・カレンダー */
.sal-home-title { letter-spacing: .06em; }
.sal-home-head { align-items:center; }
.sal-home-head .sal-cal-add { margin-left:auto; }
.sal-calwrap { display:flex; flex-direction:column; gap:12px; min-width:0; }
.sal-o0 { order:0; }
/* 日パネル（1行ずつ） */
.sal-dp { gap:8px; padding: 12px 12px 8px; }
@media (min-width: 900px) { .sal-dp { padding: 16px 20px 12px; } }
.sal-dl-list { border:0; box-shadow:none; border-radius:0; background:transparent; }
.sal-dl-list > .li { padding: 6px 4px; min-height: 48px; gap:10px; }
.sal-dl-list > .li + .li, .sal-dl-list > .sal-dl-body + .li, .sal-dl-list > .li + .sal-dl-body { border-top:1px solid var(--line); }
.sal-dl-ico { color: var(--muted); display:grid; place-items:center; flex:none; }
.sal-dl-ico .ico { width:18px; height:18px; }
.sal-dl-lbl { font-size:13px; font-weight:700; color: var(--ink-2); flex:none; min-width: 4.6em; }
.sal-dl-val { flex:1 1 auto; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color: var(--ink); }
.sal-dl-sub { color: var(--muted); font-size:13px; }
.sal-dl-strong { font-weight:600; }
.sal-dl .btn.sm { flex:none; min-height:40px; }
.sal-dl-chev .ico { transition: transform .15s; }
.sal-dl-chev.open .ico { transform: rotate(90deg); }
.sal-dl-body { padding: 4px 0 10px; display:flex; flex-direction:column; gap:8px; align-items:flex-start; }
.sal-dl-body > .list { width:100%; }
.sal-cal { display:flex; flex-direction:column; gap:10px; padding: 12px; }
@media (min-width: 900px) { .sal-cal { padding: 16px 20px 18px; } }
.sal-cal-head { display:flex; align-items:center; gap:4px; flex-wrap:wrap; }
.sal-cal-label { font-weight:700; font-size:16px; color: var(--ink); min-width: 7.5em; text-align:center; }
.sal-cal-head .btn.sm { min-height: 40px; margin-left: 6px; }
.sal-cal-head .seg-btn { min-height: 40px; padding: 0 16px; }
.sal-cal-grid { display:grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; touch-action: pan-y; }
.sal-cal-dow { text-align:center; font-size:12px; font-weight:700; color: var(--muted); padding: 2px 0 4px; }
.sal-cal-dow.sat, .sal-cal-dow.sun { color: var(--info); }
.sal-cal-day { display:flex; flex-direction:column; align-items:stretch; gap:3px; min-width:0; min-height: 64px; padding: 6px 4px; border:1px solid var(--line); border-radius: var(--r-sm); background: var(--surface); color: var(--ink); cursor:pointer; text-align:left; font: inherit; overflow:hidden; }
.sal-cal-grid.is-week .sal-cal-day { min-height: 62px; }
@media (min-width: 900px) { .sal-cal-day { min-height: 86px; padding: 6px 8px; } }
.sal-cal-day:hover { background: var(--surface-2); }
.sal-cal-day.out { background: transparent; border-color: transparent; }
.sal-cal-day.out .sal-cal-num, .sal-cal-day.out .sal-cal-marks { opacity: .45; }
.sal-cal-day.sat .sal-cal-num, .sal-cal-day.sun .sal-cal-num { color: var(--info); }
.sal-cal-day.today { border: 2px solid var(--accent); padding: 5px 3px; }
@media (min-width: 900px) { .sal-cal-day.today { padding: 5px 7px; } }
.sal-cal-day[aria-pressed="true"] { background: var(--accent-soft); border-color: var(--accent); }
.sal-cal-day.today .sal-cal-num { color: var(--accent); }
.sal-cal-num { font-size: 14px; font-weight: 600; line-height: 1.2; }
.sal-cal-marks { display:flex; flex-wrap:wrap; gap: 2px 6px; align-items:center; min-width:0; }
.sal-cm { display:inline-flex; align-items:center; gap:2px; font-size: 12px; line-height: 1; color: var(--ink-2); white-space:nowrap; }
.sal-cm .ico { width: 12px; height: 12px; }
.sal-cm.ok { color: var(--ok); } .sal-cm.info { color: var(--info); } .sal-cm.warn { color: var(--warn); font-weight:700; }
.sal-dotw { display:inline-block; width:7px; height:7px; border-radius:50%; background: var(--warn); }
@media (max-width: 559px) { .sal-cal-grid.is-month .sal-cm .num { display:none; } .sal-cal-grid.is-month .sal-cm.warn span { display:none; } }
.sal-cal-head .sal-cal-add { margin-left: 6px; }
.sal-cal-top { display:flex; align-items:center; gap:4px; }
.sal-cal-closed { display:inline-grid; place-items:center; min-width:18px; height:18px; padding: 0 3px; border-radius:4px; font-size:12px; font-weight:700; background: var(--surface-3); color: var(--ink-2); }
.sal-cal-day.closed { background: var(--surface-2); }
.sal-cal-day.closed .sal-cal-num { color: var(--muted); }
.sal-cal-ev { display:flex; align-items:center; gap:3px; min-width:0; font-size:12px; line-height:1.2; color: var(--ink-2); }
.sal-evdots { display:inline-flex; gap:2px; flex:none; }
.sal-evdot { display:inline-block; width:8px; height:8px; border-radius:50%; flex:none; background: var(--muted); }
.sal-evdot.accent { background: var(--accent); } .sal-evdot.info { background: var(--info); } .sal-evdot.muted { background: var(--muted); }
.sal-evn { font-weight:700; flex:none; }
.sal-evt { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:none; }
@media (min-width: 1200px) { .sal-cal-grid.is-month .sal-evt { display:inline; } }
.sal-mine { display:inline-grid; place-items:center; color: var(--accent); flex:none; margin-right:2px; }
.sal-mine .ico { width:12px; height:12px; }
.sal-li-title .sal-mine .ico { width:14px; height:14px; vertical-align:-2px; }
.sal-evchip { gap:5px; }
.sal-time.sal-evtime { min-width: 4.2em; }
.sal-evkinds { flex-wrap: wrap; overflow: visible; }
.sal-evkinds .fchip { min-height: 44px; }
.sal-evkinds .fchip .sal-evdot { width:8px; height:8px; }
.sal-dp-ev .sal-dp-h .btn { margin-left:auto; min-height: 40px; }
.sal-cal-legend { display:flex; flex-wrap:wrap; gap: 6px 16px; font-size:12px; color: var(--muted); padding-top: 2px; }
.sal-cal-legend > span { display:inline-flex; align-items:center; gap:4px; }
.sal-dp { display:flex; flex-direction:column; gap:12px; }
.sal-dp-title { display:flex; align-items:center; gap:8px; }
.sal-dp-grid { display:grid; gap:16px; grid-template-columns: 1fr; }
@media (min-width: 700px) { .sal-dp-grid { grid-template-columns: repeat(2, minmax(0,1fr)); } }
.sal-dp-block { display:flex; flex-direction:column; gap:8px; min-width:0; }
.sal-dp-h { display:flex; align-items:center; gap:6px; font-size:13px; font-weight:700; color: var(--ink-2); }
.sal-dp-h .ico { width:16px; height:16px; color: var(--muted); }
.sal-dp-row { display:flex; align-items:center; gap:10px; flex-wrap:wrap; min-height: 40px; }
.sal-dp-row .btn { margin-left:auto; }
.sal-dp-val { font-size: 20px; font-weight: 600; color: var(--ink); }

/* ホーム：スマホ＝要対応→数字→出勤→連絡→改善、PC＝2列 */
.sal-dash { display:flex; flex-direction:column; gap:20px; min-width:0; }
.sal-dcol { display: contents; }
.sal-o1 { order:1; } .sal-o2 { order:2; } .sal-o3 { order:3; } .sal-o4 { order:4; } .sal-o5 { order:5; }
@media (min-width: 900px) {
  .sal-dash { display:grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 24px; align-items:start; }
  .sal-dcol { display:flex; flex-direction:column; gap:24px; min-width:0; }
}

/* 押せる行（button.li）の中身 */
.sal-ico { width:36px; height:36px; border-radius: var(--r-sm); display:grid; place-items:center; flex:none; background: var(--surface-2); color: var(--ink-2); }
.sal-ico .ico { width:20px; height:20px; }
.sal-ico.bad { background: var(--bad-soft); color: var(--bad); }
.sal-ico.warn { background: var(--warn-soft); color: var(--warn); }
.sal-ico.info { background: var(--info-soft); color: var(--info); }
.sal-ico.accent { background: var(--accent-soft); color: var(--accent); }
.sal-li-main { flex:1 1 auto; min-width:0; display:flex; flex-direction:column; gap:2px; }
.sal-li-title { font-weight:700; color: var(--ink); line-height:1.45; overflow-wrap:anywhere; }
.sal-li-sub { font-size:13px; color: var(--muted); line-height:1.5; }
.sal-chev { color: var(--muted); flex:none; display:grid; place-items:center; }
.sal-chev .ico { width:18px; height:18px; }
.sal-allclear { display:flex; align-items:center; gap:12px; padding:14px 16px; border:1px solid var(--line); border-radius: var(--r); background: var(--surface); box-shadow: var(--shadow-sm); color: var(--ink-2); font-weight:700; }
.sal-allclear .sal-ico { background: var(--ok-soft); color: var(--ok); }

/* KPI（高さを揃え、説明は1行） */
.sal-kpis { display:grid; gap:10px; grid-template-columns: repeat(2, minmax(0,1fr)); }
.sal-kpis.wide { gap:12px; }
@media (min-width: 900px) { .sal-kpis.wide { grid-template-columns: repeat(3, minmax(0,1fr)); } }
.sal-kpis .kpi { justify-content:flex-start; }
.sal-kpi-top { display:flex; align-items:center; gap:6px; min-height:22px; }
.sal-kpi-top .kpi-label { flex:1 1 auto; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sal-kpis .kpi-val { font-size: clamp(20px, 5.4vw, 26px); }
.sal-kpis .kpi-val.dash { color: var(--line-strong); }
.sal-kpis .kpi-sub { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sal-kpis.wide .kpi-sub { white-space:normal; overflow:visible; line-height:1.5; }
.sal-only-sm { display:none; }
@media (max-width: 559px) {
  .sal-kpis.wide .sal-kpi-extra { display:none; }
  .sal-only-sm { display:grid; }
}
.sal-kpis .chip { padding: 3px 6px; font-size: 12.5px; }
@media (max-width: 559px) {
  .sal-kpis:not(.wide) .kpi { padding: 12px; }
  .sal-kpis:not(.wide) .kpi-val { font-size: 20px; }
  .sal-kpi-top { flex-wrap: wrap; row-gap: 4px; }
  .sal-kpi-top .kpi-label { white-space: normal; flex-basis: auto; }
}

/* 出勤・連絡・改善 */
.sal-time { font-family: var(--f-num); font-variant-numeric: tabular-nums; font-weight:600; white-space:nowrap; color: var(--ink); min-width: 7.6em; }
.sal-carry { font-size:12px; color: var(--muted); display:block; font-family: var(--f-body); font-weight:400; }
.sal-note-text { color: var(--ink); overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
.sal-chips { display:flex; gap:6px; flex-wrap:wrap; }

/* 日報 */
.sal-subtools { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.sal-pick { display:flex; align-items:center; gap:8px; margin-left:auto; }
.sal-pick .inp { width: 172px; }
.sal-missing td { color: var(--muted); background: var(--surface-2); white-space: normal !important; font-size: 13px; }
.tbl tr.click.sal-missing:hover td { background: var(--surface-3); }
.sal-miss { display:inline-flex; align-items:center; gap:4px; }
.sal-pickbtn { margin-left:auto; }
.sal-td-sum { grid-auto-flow: row; grid-template-columns: repeat(3, minmax(0,1fr)); }
@media (max-width: 559px) { .sal-td-sum { grid-template-columns: 1fr; } .sal-td-sum > .cell + .cell { border-left: 0; border-top: 1px solid var(--line); } }
.sal-td-h { display:flex; align-items:center; gap:6px; font-weight:700; color: var(--ink-2); margin: 14px 0 6px; }
.sal-td-h .ico { width:18px; height:18px; color: var(--muted); }
.sal-err { border:1px solid var(--bad); background: var(--bad-soft); color: var(--bad); border-radius: var(--r-sm); padding:10px 12px; font-size:14px; }
.sal-err ul { margin:4px 0 0; padding-left: 1.2em; }
.sal-unit { font-size: 12px; color: var(--muted); margin-left: 1px; }
@media (max-width: 559px) {
  .sal-hide-sm { display:none; }
  .sal-tbl th, .sal-tbl td { padding-left: 8px; padding-right: 8px; }
  .sal-tbl th:first-child, .sal-tbl td:first-child { padding-left: 12px; }
  .sal-tbl th:last-child, .sal-tbl td:last-child { padding-right: 12px; }
  .sal-pick { flex: 1 1 100%; margin-left: 0; }
  .sal-pick .inp { flex: 1 1 auto; width: auto; min-width: 0; }
}
.sal-tbl td { white-space: nowrap; }
.tbl td.sal-date-cell { white-space:nowrap; }

/* 入力シート */
.sal-wx { display:flex; width:100%; }
.sal-wx .seg-btn { flex: 1 1 0; min-height: 44px; }
.sal-r { text-align: right; font-family: var(--f-num); font-variant-numeric: tabular-nums; }
.sal-qtys { display:flex; flex-direction:column; border:1px solid var(--line); border-radius: var(--r-sm); overflow:hidden; }
.sal-qty { display:grid; grid-template-columns: minmax(0,1fr) 96px; gap:10px; align-items:center; padding:6px 12px; min-height:56px; background: var(--surface); }
.sal-qty + .sal-qty { border-top:1px solid var(--line); }
.sal-qty-name { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.sal-qty .inp { text-align:right; font-family: var(--f-num); }
.sal-cat { font-size:12px; font-weight:700; color: var(--muted); background: var(--surface-2); padding:6px 12px; border-top:1px solid var(--line); }
.sal-cat:first-child { border-top:0; }

/* 分析 */
.sal-chart { width:100%; height:auto; display:block; }
.sal-chart .ax { fill: var(--muted); font-size: 12px; font-family: var(--f-num); }
.sal-chart .vl { fill: var(--ink); font-size: 12px; font-family: var(--f-num); font-weight:600; }
.sal-chart .gl { stroke: var(--line); stroke-width: 1; }
.sal-chart .base { stroke: var(--line-strong); stroke-width: 1; }
.sal-chart .bs { fill: var(--accent); }
.sal-chart .bs.lo { fill: var(--warn); }
.sal-chart .avg { stroke: var(--ink-2); stroke-width: 1; stroke-dasharray: 4 4; fill:none; }
.sal-chart .avgt { fill: var(--ink-2); font-size: 12px; font-family: var(--f-num); font-weight:600; }
.sal-chart.sm .ax, .sal-chart.sm .vl, .sal-chart.sm .avgt { font-size: 15px; }
.sal-legend { display:flex; gap:14px; flex-wrap:wrap; font-size:12px; color: var(--muted); }
.sal-legend i { display:inline-block; width:10px; height:10px; border-radius:2px; margin-right:5px; vertical-align:-1px; background: var(--accent); }
.sal-legend i.lo { background: var(--warn); }
.sal-legend i.avg { height:0; border-top:1px dashed var(--ink-2); border-radius:0; width:14px; vertical-align:3px; background: none; }
.sal-dow { display:flex; flex-direction:column; gap:10px; }
.sal-dow-row { display:grid; grid-template-columns: 1.6em minmax(0,1fr) auto; gap:10px; align-items:center; }
.sal-dow-row .bar { height:8px; }
.sal-dow-val { text-align:right; font-size:13px; min-width: 7.5em; color: var(--ink-2); }
.sal-two { display:grid; gap:20px; grid-template-columns: 1fr; }
@media (min-width: 1000px) { .sal-two { grid-template-columns: minmax(0, 1fr) minmax(0, 1.6fr); align-items:start; } }
.sal-hints { display:grid; gap:12px; grid-template-columns: 1fr; }
@media (min-width: 700px) { .sal-hints { grid-template-columns: repeat(2, minmax(0,1fr)); } }
.sal-hint { display:flex; flex-direction:column; gap:8px; }
.sal-hint-title { font-weight:700; display:flex; gap:8px; align-items:flex-start; color: var(--ink); line-height:1.5; }
.sal-hint-title .ico { flex:none; margin-top:1px; width:18px; height:18px; color: var(--accent); }
.sal-hint.bad .sal-hint-title .ico { color: var(--bad); }
.sal-hint.warn .sal-hint-title .ico { color: var(--warn); }
.sal-hint-detail { font-size:14px; color: var(--ink-2); margin:0; flex:1 1 auto; }
.sal-hint-foot { display:flex; align-items:center; gap:8px; margin-top:4px; }
.sal-hint-foot .btn { margin-left:auto; }
.sal-rank-bar { height:4px; margin-top:6px; max-width: 160px; }
.sal-stale { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }

/* 改善ボード */
.sal-board { display:grid; gap:16px; grid-template-columns: 1fr; align-items:start; }
@media (min-width: 640px) { .sal-board { grid-template-columns: repeat(2, minmax(0,1fr)); } }
@media (min-width: 1200px) { .sal-board { grid-template-columns: repeat(4, minmax(0,1fr)); gap:14px; } }
.sal-col { background: var(--surface-2); border:1px solid var(--line); border-radius: var(--r); padding:10px; display:flex; flex-direction:column; gap:10px; min-width:0; }
.sal-col-head { display:flex; align-items:center; gap:8px; font-weight:700; padding: 4px 4px 2px; color: var(--ink); }
.sal-col-head .ico { width:16px; height:16px; color: var(--muted); }
.sal-count { margin-left:auto; min-width:24px; height:22px; padding:0 7px; border-radius:11px; display:inline-grid; place-items:center; font: 600 12px/22px var(--f-num); background: var(--surface); color: var(--ink-2); border:1px solid var(--line); }
.sal-count.on { background: var(--accent-soft); color: var(--accent); border-color: transparent; }
.sal-col-empty { font-size:13px; color: var(--muted); padding: 10px 6px 12px; text-align:center; border:1px dashed var(--line-strong); border-radius: var(--r-sm); }
.sal-kc { background: var(--surface); border:1px solid var(--line); border-radius: var(--r-sm); padding:14px; display:flex; flex-direction:column; gap:6px; min-width:0; box-shadow: var(--shadow-sm); }
.sal-kc-title { font-weight:700; overflow-wrap:anywhere; color: var(--ink); line-height:1.5; }
.sal-kc-detail { font-size:14px; margin:0; white-space:pre-wrap; overflow-wrap:anywhere; color: var(--ink-2); }
.sal-kc-effect { font-size:13px; color: var(--ink-2); }
.sal-kc-meta { font-size:12px; color: var(--muted); }
.sal-kc-acts { display:flex; gap:6px; flex-wrap:wrap; align-items:center; padding-top:8px; margin-top:4px; border-top:1px solid var(--line); }
.sal-kc-acts .btn { min-height:44px; }
.sal-kc-acts .icon-only { width:44px; flex:none; }
.sal-kc-acts .sal-fwd { flex:1 1 auto; }
.sal-kc-top { display:flex; align-items:center; gap:4px; margin: -6px -8px 0 0; }
.sal-kc-top .chip { margin-right:auto; }
.sal-kc-top .icon-btn { margin: -4px -6px -4px 0; }
.sal-flip { transform: scaleX(-1); }
`);
  /* ---------- 共通ヘルパー ---------- */
  const STATUSES = ["提案", "検討中", "実施中", "完了"];
  const AREAS = ["在庫", "仕込み", "衛生", "オペレーション", "原価", "その他"];
  const WEATHER = ["晴", "曇", "雨", "雪"];
  const pad = (n) => String(n).padStart(2, "0");
  const n0 = (v) => { const x = Number(v); return isFinite(x) ? x : 0; };
  const numOrNull = (v) => { if (v === "" || v == null) return null; const x = Number(v); return isFinite(x) ? x : null; };
  const div = (a, b) => (b > 0 && a != null && isFinite(a) ? a / b : null);
  const localIso = (s) => {
    if (!s) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(s);
    if (isNaN(d)) return String(s).slice(0, 10);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  };
  const hhmm = (s) => { const d = new Date(s); return isNaN(d) ? "" : pad(d.getHours()) + ":" + pad(d.getMinutes()); };
  const monthStart = (iso) => iso.slice(0, 8) + "01";
  const inRange = (d, from, to) => !!d && d >= from && d <= to;
  const datesIn = (from, to) => { const out = []; for (let d = from; d <= to; d = K.addDays(d, 1)) out.push(d); return out; };
  const ro = () => K.readOnly();
  /* 記録の担当者名：名簿にない id は「（削除済み）」、退職は「名前（退職）」 */
  const nm = (id) => {
    if (!id) return "未選択";
    const st = K.getDoc("staff", id);
    if (!st) return "（削除済み）";
    return st.active === false ? (st.name || "") + "（退職）" : st.name || "（名前なし）";
  };
  const writeAttrs = { "data-write": "" };
  const yenShort = (n) => (n >= 10000 ? (n / 10000).toFixed(n % 10000 === 0 ? 0 : 1).replace(/\.0$/, "") + "万" : K.fmt.num(n));

  function salesRec(iso) { return K.getDoc("sales", "d-" + iso); }
  function saleTotal(r) {
    if (!r) return null;
    const t = numOrNull(r.total);
    if (t != null) return t;
    if (r.lunch != null || r.dinner != null) return n0(r.lunch) + n0(r.dinner);
    return null;
  }
  function recvDate(o) { return localIso(o.receivedAt) || o.deliveryDate || o.date; }
  function recvTotal(from, to) {
    return K.list("orders").filter((o) => o.status === "received" && inRange(recvDate(o), from, to)).reduce((s, o) => s + n0(o.total), 0);
  }
  function salesSum(from, to) {
    let t = 0, n = 0;
    K.list("sales").forEach((r) => { const v = saleTotal(r); if (v != null && inRange(r.date, from, to)) { t += v; n++; } });
    return { total: t, days: n };
  }

  /* 原価率：期首・期末の確定棚卸し（counts done:true）で区切れれば実際原価率、区切れなければ仕入率（参考値）
     棚卸しは「その日の営業終了時点の在庫」とみなす。期首＝期間開始前日以前7日以内の最新、期末＝期間内の最新。 */
  function foodCost(from, to) {
    const done = K.list("counts").filter((c) => c.done && c.date && c.total != null).sort((a, b) => (a.date < b.date ? -1 : 1));
    const open = done.filter((c) => c.date <= K.addDays(from, -1) && c.date >= K.addDays(from, -7)).pop();
    const close = open ? done.filter((c) => c.date > open.date && c.date >= from && c.date <= to).pop() : null;
    if (open && close) {
      const a = K.addDays(open.date, 1), b = close.date;
      const buy = recvTotal(a, b);
      const sl = salesSum(a, b);
      const used = n0(open.total) + buy - n0(close.total);
      return {
        actual: true, rate: sl.days ? div(used, sl.total) : null, used, buy, from: a, to: b,
        note: "（期首棚卸 " + K.fmt.yen(open.total) + "＋仕入 " + K.fmt.yen(buy) + "−期末棚卸 " + K.fmt.yen(close.total) + "）÷売上" +
          (a !== from || b !== to ? "・" + K.fmt.md(a) + "〜" + K.fmt.md(b) + "で計算" : ""),
      };
    }
    const buy = recvTotal(from, to);
    const sl = salesSum(from, to);
    const has = K.list("orders").some((o) => o.status === "received" && inRange(recvDate(o), from, to));
    return {
      actual: false, rate: has && sl.days ? div(buy, sl.total) : null, used: buy, buy, from, to,
      note: "納品済み仕入÷売上。棚卸しで区切れないため在庫増減を含まない参考値",
    };
  }
  function costKpi(pl, fc, salesDays, target) {
    const lbl = fc.actual ? pl + "の原価率" : "仕入率（参考・" + pl + "）";
    const sub = fc.rate != null ? (fc.actual ? "（期首＋仕入−期末）÷売上・目標 " + K.fmt.pct(target) : "仕入÷売上（在庫増減を含まない）")
      : !salesDays ? "売上を入力すると表示" : "納品済みの発注があると表示";
    const full = fc.rate != null ? fc.note : "期首・期末の棚卸しがそろうと実際原価率を表示します";
    const chip = fc.rate == null ? null : fc.actual ? rateChip(fc.rate, target) : h("span", { class: "chip", text: "参考" });
    return kpi(lbl, K.fmt.pct(fc.rate), sub, chip, full);
  }
  /* 原価が古いレシピ：材料の保存単価と現在の items.cost の不一致（比較のみ・再計算しない） */
  function staleRecipes() {
    return K.list("recipes").filter((r) => (r.lines || []).some((l) => {
      const it = l.itemId && K.getDoc("items", l.itemId);
      return it && n0(it.cost) !== n0(l.unitCost);
    }));
  }
  /* 重ねたシートからの確認。確認シートが×で閉じられた場合も false で解決する */
  function confirmOver(msg, okLabel) {
    const host = document.getElementById("sheets");
    const p = K.confirm(msg, okLabel);
    const wrap = host && host.lastElementChild;
    if (!wrap) return p;
    const gone = new Promise((res) => {
      const obs = new MutationObserver(() => { if (!wrap.isConnected) { obs.disconnect(); res(false); } });
      obs.observe(host, { childList: true });
    });
    return Promise.race([p, gone]);
  }
  /* 日またぎ勤務を含む「その日の出勤」 */
  function shiftsOn(iso) {
    const prev = K.addDays(iso, -1);
    const out = [];
    K.list("shifts").forEach((doc) => (doc.entries || []).forEach((e) => {
      if (e.date === iso) out.push({ e, carry: false });
      else if (e.date === prev && e.start && e.end && e.end < e.start) out.push({ e, carry: true });
    }));
    out.sort((a, b) => (a.carry !== b.carry ? (a.carry ? -1 : 1) : String(a.e.start || "").localeCompare(String(b.e.start || ""))));
    return out;
  }

  /* 人件費（売上入力済みの日に限定できる） */
  function labor(from, to, onlyDates) {
    let cost = 0, hours = 0, entries = 0;
    const missing = new Set();
    K.list("shifts").forEach((doc) => (doc.entries || []).forEach((e) => {
      if (!inRange(e.date, from, to)) return;
      if (onlyDates && !onlyDates.has(e.date)) return;
      const hr = K.hours(e.start, e.end, e.breakMin);
      const st = K.getDoc("staff", e.staffId);
      const wage = st ? n0(st.wage) : 0;
      if (!wage) missing.add(e.staffId || "?");
      hours += hr; cost += hr * wage; entries++;
    }));
    return { cost, hours, entries, missingWage: missing.size };
  }

  /* 期間集計 */
  function stats(from, to) {
    const rows = K.list("sales").filter((r) => inRange(r.date, from, to));
    let total = 0, covers = 0, coverSales = 0, itemSales = 0, itemDays = 0;
    const dateSet = new Set();
    const saleByDate = {};
    const menu = {};
    let hasItems = false;
    rows.forEach((r) => {
      const t = saleTotal(r);
      if (t == null) return;
      total += t; dateSet.add(r.date); saleByDate[r.date] = t;
      const c = n0(r.covers);
      if (c > 0) { covers += c; coverSales += t; }
      let dayHas = false;
      (r.items || []).forEach((it) => {
        const q = n0(it.qty);
        if (!it.recipeId || q <= 0) return;
        hasItems = true; dayHas = true;
        menu[it.recipeId] = (menu[it.recipeId] || 0) + q;
      });
      if (dayHas) { itemSales += t; itemDays++; }
    });
    const fc = foodCost(from, to);
    let theo = 0, rev = 0;
    const ranking = Object.keys(menu).map((id) => {
      const r = K.getDoc("recipes", id);
      const qty = menu[id];
      const cost = r ? n0(r.cost) : 0;
      const price = r ? n0(r.price) : 0;
      theo += qty * cost; rev += qty * price;
      return { id, name: r ? r.name : "（削除されたメニュー）", qty, revenue: qty * price, costRate: r && r.costRate != null ? r.costRate : div(cost, price) };
    }).sort((a, b) => b.qty - a.qty || b.revenue - a.revenue);
    /* 人件費率：売上とシフトの両方がある日だけを対象（分子・分母とも） */
    const shiftDates = new Set();
    K.list("shifts").forEach((doc) => (doc.entries || []).forEach((e) => { if (inRange(e.date, from, to)) shiftDates.add(e.date); }));
    const laborDates = new Set([...dateSet].filter((d) => shiftDates.has(d)));
    const laborSales = [...laborDates].reduce((a, d) => a + saleByDate[d], 0);
    const lab = labor(from, to, laborDates);
    lab.days = laborDates.size; lab.noShiftDays = dateSet.size - laborDates.size; lab.sales = laborSales;
    const foodRate = fc.rate;
    /* 理論原価率：出数を入力した日の売上だけを分母に */
    const theoRate = hasItems ? div(theo, itemSales) : null;
    const laborRate = lab.entries ? div(lab.cost, laborSales) : null;
    return {
      from, to, rows, days: dateSet.size, dateSet, total, covers,
      avgTicket: div(coverSales, covers), fc, foodRate, foodActual: fc.actual, theo, theoRate, itemDays, itemSales,
      labor: lab, laborRate, fl: fc.actual && foodRate != null && laborRate != null ? foodRate + laborRate : null,
      ranking, menuRevenue: rev, hasItems,
    };
  }

  /* 人件費率の対象の注記：売上とシフトの両方がある日 */
  function laborNote(st) {
    const L = st.labor;
    return "売上とシフトがある " + L.days + "日分" + (L.noShiftDays ? "・シフト未入力 " + L.noShiftDays + "日" : "") + (L.missingWage ? "・時給未設定 " + L.missingWage + "名" : "");
  }

  /* ---------- 描画スケジューラ（rAF でまとめる） ---------- */
  function scheduler(fn) {
    let pending = false;
    return () => {
      if (pending) return;
      pending = true;
      const run = () => { pending = false; try { fn(); } catch (e) { console.error(e); } };
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(run); else setTimeout(run, 16);
    };
  }

  /* ---------- 部品 ---------- */
  function kpi(label, val, sub, chip, full) {
    const dash = val == null || val === "—";
    return h("div", { class: "kpi", title: full || sub || null },
      h("div", { class: "sal-kpi-top" }, h("span", { class: "kpi-label", text: label }), chip || null),
      h("span", { class: "kpi-val num" + (dash ? " dash" : ""), text: dash ? "—" : val }),
      sub ? h("span", { class: "kpi-sub", text: sub }) : null);
  }
  function rateChip(rate, target) {
    if (rate == null || target == null) return null;
    if (rate <= target) return h("span", { class: "chip ok", text: "目標内" });
    return h("span", { class: "chip bad", text: "目標+" + ((rate - target) * 100).toFixed(1) + "pt" });
  }
  function secHead(title, ...extra) {
    return h("div", { class: "sal-sec-head" }, h("h2", { class: "sec-title", text: title }), extra);
  }

  /* ---------- 売上入力シート ---------- */
  function openSalesSheet(dateIso, opts) {
    if (ro()) { K.toast("閲覧のみのため入力できません", "bad"); return; }
    let date = dateIso || K.today();
    let weather = "";
    let totalTouched = false;
    let syncMenu = () => {};
    const dateIn = K.input({ type: "date", value: date, max: K.today() });
    const lunch = K.input({ type: "number", min: 0, step: 1, inputmode: "numeric", placeholder: "0" });
    const dinner = K.input({ type: "number", min: 0, step: 1, inputmode: "numeric", placeholder: "0" });
    const total = K.input({ type: "number", min: 0, step: 1, inputmode: "numeric", placeholder: "0" });
    const covers = K.input({ type: "number", min: 0, step: 1, inputmode: "numeric", placeholder: "0" });
    [lunch, dinner, total, covers].forEach((x) => x.classList.add("sal-r"));
    const memo = h("textarea", { class: "inp", rows: 2, placeholder: "例：団体予約12名、雨で夜が弱い" });
    const status = h("p", { class: "muted small", style: { margin: 0 } });
    const wxBtns = WEATHER.map((w) => h("button", {
      class: "seg-btn", type: "button", text: w, attrs: { "aria-pressed": "false" },
      onClick: () => { weather = weather === w ? "" : w; syncWx(); },
    }));
    const syncWx = () => wxBtns.forEach((b, i) => b.setAttribute("aria-pressed", String(WEATHER[i] === weather)));

    const recipes = K.list("recipes").slice().sort((a, b) => String(a.category || "").localeCompare(String(b.category || ""), "ja") || String(a.name).localeCompare(String(b.name), "ja"));
    const qtyIn = {};
    let qtyBox;
    if (!recipes.length) {
      qtyBox = h("p", { class: "muted small", style: { margin: 0 }, text: "レシピ画面でメニューを登録すると、ここでメニュー別の出数を入力できます。" });
    } else {
      qtyBox = h("div", { class: "sal-qtys" });
      let cat = null;
      recipes.forEach((r) => {
        const c = r.category || "未分類";
        if (c !== cat) { cat = c; qtyBox.appendChild(h("div", { class: "sal-cat", text: c })); }
        const inp = K.input({ type: "number", min: 0, step: 1, inputmode: "numeric", placeholder: "0", "aria-label": r.name + " の出数" });
        inp.classList.add("sal-r");
        qtyIn[r.id] = inp;
        qtyBox.appendChild(h("label", { class: "sal-qty" }, h("span", { class: "sal-qty-name", text: r.name }), inp));
      });
    }

    const autoSum = () => {
      if (totalTouched) return;
      const l = numOrNull(lunch.value), d = numOrNull(dinner.value);
      total.value = l == null && d == null ? "" : String(n0(l) + n0(d));
    };
    lunch.addEventListener("input", autoSum);
    dinner.addEventListener("input", autoSum);
    total.addEventListener("input", () => { totalTouched = total.value !== ""; if (!totalTouched) autoSum(); });

    function fill(iso) {
      const r = salesRec(iso);
      lunch.value = r && r.lunch != null ? r.lunch : "";
      dinner.value = r && r.dinner != null ? r.dinner : "";
      total.value = r && r.total != null ? r.total : "";
      covers.value = r && r.covers != null ? r.covers : "";
      memo.value = (r && r.memo) || "";
      weather = (r && r.weather) || "";
      syncWx();
      totalTouched = !!(r && r.total != null && n0(r.total) !== n0(r.lunch) + n0(r.dinner));
      Object.keys(qtyIn).forEach((id) => { qtyIn[id].value = ""; });
      ((r && r.items) || []).forEach((it) => { if (qtyIn[it.recipeId]) qtyIn[it.recipeId].value = it.qty; });
      status.textContent = r ? K.fmt.date(iso) + " の記録を編集しています（記録者：" + nm(r.staffId) + "）" : K.fmt.date(iso) + " の新しい記録です";
      syncMenu();
    }
    const snap = () => JSON.stringify([lunch.value, dinner.value, total.value, covers.value, memo.value, weather,
      Object.keys(qtyIn).map((id) => qtyIn[id].value)]);
    let base = "";
    let switching = false;
    dateIn.addEventListener("change", async () => {
      const next = dateIn.value || K.today();
      if (switching || next === date) return;
      if (snap() !== base) {
        switching = true;
        dateIn.value = date;
        const ok = await confirmOver(K.fmt.date(date) + " の入力途中の内容は保存されていません。破棄して " + K.fmt.date(next) + " を開きますか？", "破棄して切り替え");
        switching = false;
        if (!ok) return;
        dateIn.value = next;
      }
      date = next; fill(date); base = snap(); clearErr();
      if (sheetApi && sheetApi.markClean) sheetApi.markClean();
    });
    fill(date);
    base = snap();

    /* 入力チェック（負数・小数の出数は保存不可） */
    let sheetApi = null;
    const clearErr = () => { if (typeof K.clearErrors === "function") K.clearErrors(body); };
    const fieldErr = (inp, msg) => { if (typeof K.fieldError === "function") K.fieldError(inp, msg); else inp.setAttribute("aria-invalid", "true"); };
    function check(inp, label, intOnly) {
      if (inp.validity && inp.validity.badInput) return label + "：数字で入力してください";
      const raw = inp.value.trim();
      if (raw === "") return null;
      const v = Number(raw);
      if (!isFinite(v)) return label + "：数字で入力してください";
      if (v < 0) return label + "：0以上で入力してください";
      if (intOnly && !Number.isInteger(v)) return label + "：整数で入力してください（" + raw + "）";
      return null;
    }

    const body = h("div", { class: "stack" },
      K.field("日付", dateIn), status,
      h("div", { class: "grid2" }, K.field("ランチ売上（円）", lunch), K.field("ディナー売上（円）", dinner)),
      h("div", { class: "grid2" },
        K.field("総売上（円）", total, "ランチ＋ディナーを入れると自動で合計。手入力で上書きできます"),
        K.field("客数（人）", covers)),
      h("div", { class: "field" }, h("span", { class: "field-label", text: "天気" }), h("div", { class: "seg sal-wx", role: "group", "aria-label": "天気" }, wxBtns)),
      K.field("メモ", memo),
      h("div", { class: "field" }, h("span", { class: "field-label", text: "メニュー別の出数" }), qtyBox));

    const close = sheetApi = K.sheet({
      title: "売上を入力",
      body,
      menu: [{
        label: "この日の記録を削除", icon: "trash", danger: true,
        get hidden() { return !salesRec(dateIn.value); },
        onClick: async () => {
          const d = dateIn.value;
          if (!salesRec(d)) return;
          if (!(await K.confirm(K.fmt.date(d) + " の売上記録を削除します。元に戻せません。", "削除する", { danger: true }))) return;
          await W.del("sales", "d-" + d);
          K.toast("削除しました", "ok");
          return "close";
        },
      }],
      actions: [
        { label: "キャンセル", kind: "ghost" },
        {
          label: "保存", kind: "primary", disabled: ro(),
          onClick: async () => {
            const d = dateIn.value;
            clearErr();
            if (!d || d > K.today()) {
              fieldErr(dateIn, !d ? "日付を選んでください" : "未来の日付の売上は保存できません");
              if (typeof K.focusFirstError === "function") K.focusFirstError(body);
              return false;
            }
            let nErr = 0;
            const mark = (inp, msg) => { if (msg) { nErr++; fieldErr(inp, msg.replace(/^.*?：/, "")); } };
            mark(lunch, check(lunch, "ランチ売上", true));
            mark(dinner, check(dinner, "ディナー売上", true));
            mark(total, check(total, "総売上", true));
            mark(covers, check(covers, "客数", true));
            recipes.forEach((r) => mark(qtyIn[r.id], check(qtyIn[r.id], r.name + " の出数", true)));
            const l = numOrNull(lunch.value), dn = numOrNull(dinner.value);
            let t = numOrNull(total.value);
            if (t == null && (l != null || dn != null)) t = n0(l) + n0(dn);
            if (!nErr && t == null) { nErr++; fieldErr(total, "総売上（またはランチ・ディナー）を入力してください"); }
            if (nErr) {
              if (typeof K.focusFirstError === "function") K.focusFirstError(body);
              K.toast("入力を確認してください（" + nErr + "件）", "bad");
              return false;
            }
            const prev = salesRec(d);
            /* 入力欄にないレシピ（削除済みなど）の出数は元の値のまま残す */
            const kept = ((prev && prev.items) || []).filter((it) => it && it.recipeId && !qtyIn[it.recipeId]);
            const items = kept.concat(Object.keys(qtyIn).map((id) => ({ recipeId: id, qty: n0(qtyIn[id].value) })).filter((x) => x.qty > 0));
            /* 桁違いの疑い：直近30日の中央値の10倍超 or 1/10未満 */
            const hist = K.list("sales").filter((r) => r.date !== d && inRange(r.date, K.addDays(d, -30), K.addDays(d, 30))).map(saleTotal).filter((v) => v > 0).sort((a, b) => a - b);
            if (hist.length >= 3 && t > 0) {
              const med = hist[Math.floor(hist.length / 2)];
              if (t > med * 10 || t < med / 10) {
                const ok = await confirmOver("総売上 " + K.fmt.yen(t) + " は、直近の1日あたり売上（中央値 " + K.fmt.yen(med) + "）と桁が違う可能性があります。このまま保存しますか？", "このまま保存");
                if (!ok) return false;
              }
            }
            await W.put("sales", "d-" + d, {
              date: d, total: Math.round(t), lunch: l == null ? null : Math.round(l), dinner: dn == null ? null : Math.round(dn),
              covers: numOrNull(covers.value) == null ? null : Math.max(0, Math.round(n0(covers.value))),
              items, weather: weather || null, memo: memo.value.trim(),
              staffId: K.currentStaffId() || (prev && prev.staffId) || null,
            });
            K.toast(K.fmt.date(d) + " の売上を保存しました", "ok");
          },
        },
      ],
    });
    /* 削除メニュー（…）は記録がある日だけ表示。日付を切り替えたら表示を更新 */
    const menuEl = (() => { const w = document.querySelector("#sheets .sheet-wrap:last-child"); return w && w.querySelector(".sheet-menu-btn"); })();
    syncMenu = () => { if (menuEl) menuEl.hidden = !salesRec(dateIn.value); };
    syncMenu();
    if (opts && opts.pickDate) setTimeout(() => { try { dateIn.focus(); if (dateIn.showPicker) dateIn.showPicker(); } catch (e) {} }, 60);
    void close;
  }

  /* ---------- 改善提案シート ---------- */
  /* 改善提案シート。保存したら true、閉じたら false で解決する Promise を返す */
  function openKaizenSheet(existing, preset) {
    if (ro()) { K.toast("閲覧のみのため編集できません", "bad"); return Promise.resolve(false); }
    let saved = false, resolve;
    const result = new Promise((r) => { resolve = r; });
    const src = existing || preset || {};
    const proposer = (!existing && preset && preset.staffId) || null;
    const title = K.input({ value: src.title || "", placeholder: "例：冷蔵庫の定位置ラベルを貼る", maxlength: 80 });
    const detail = h("textarea", { class: "inp", rows: 3, placeholder: "何を・どう変えるか" });
    detail.value = src.detail || "";
    const area = K.select(AREAS, src.area || "オペレーション");
    const effect = K.input({ value: src.effect || "", placeholder: "例：探す時間 1日10分削減" });
    K.sheet({
      title: existing ? "改善提案を編集" : "改善提案を追加",
      onClose: () => resolve(saved),
      body: h("div", { class: "stack" },
        preset && preset.fromMemo ? h("p", { class: "sal-meta", style: { margin: 0 }, text: "クイックメモから下書きしました（提案者：" + nm(proposer || K.currentStaffId()) + "）" }) : null,
        K.field("タイトル", title), K.field("内容", detail),
        h("div", { class: "grid2" }, K.field("領域", area), K.field("期待効果", effect))),
      menu: existing ? [{
        label: "この提案を削除", icon: "trash", danger: true, disabled: ro(),
        onClick: async () => {
          if (!(await K.confirm("「" + (existing.title || "無題") + "」を削除します。元に戻せません。", "削除する", { danger: true }))) return;
          await W.del("kaizen", existing.id);
          saved = true;
          K.toast("削除しました", "ok");
          return "close";
        },
      }] : null,
      actions: [
        { label: "キャンセル", kind: "ghost" },
        {
          label: existing ? "保存" : "追加", kind: "primary", disabled: ro(),
          onClick: async () => {
            const t = title.value.trim();
            if (!t) {
              if (typeof K.fieldError === "function") { K.fieldError(title, "タイトルを入力してください"); if (K.focusFirstError) K.focusFirstError(); }
              else K.toast("タイトルを入力してください", "bad");
              return false;
            }
            const data = { title: t, detail: detail.value.trim(), area: area.value, effect: effect.value.trim() };
            if (existing && !K.getDoc("kaizen", existing.id)) { K.toast("この提案は削除されています", "bad"); return; }
            if (existing) await W.patch("kaizen", existing.id, data);
            else await W.add("kaizen", Object.assign(data, { status: "提案", staffId: proposer || K.currentStaffId(), createdAt: new Date().toISOString() }));
            saved = true;
            K.toast(existing ? "保存しました" : "改善ボードに追加しました", "ok");
          },
        },
      ].filter(Boolean),
    });
    return result;
  }

  /* ---------- 窓口：クイックメモ → 改善ボードに提案（v2.4） ---------- */
  function guessArea(memo) {
    const t = (memo.tag || "") + " " + (memo.text || "");
    if (/品切れ|欠品|発注|在庫|足りな|切らし/.test(t)) return "在庫";
    if (/温度|衛生|清掃|掃除|消毒|冷蔵|冷凍|手洗/.test(t)) return "衛生";
    if (/仕込/.test(t)) return "仕込み";
    if (/原価|仕入|単価|値上/.test(t)) return "原価";
    return "オペレーション";
  }
  if (typeof K.provide === "function") {
    K.provide("kaizen.add", {
      label: "改善ボードに提案", icon: "bulb", order: 60,
      handle: (memo) => {
        const text = String((memo && memo.text) || "").trim();
        const first = (text.split(/\r?\n/).find((l) => l.trim()) || "").trim();
        return openKaizenSheet(null, {
          fromMemo: true,
          title: first.length > 40 ? first.slice(0, 40) : first,
          detail: text,
          area: guessArea(memo || {}),
          effect: "",
          staffId: (memo && memo.staffId) || K.currentStaffId() || null,
        });
      },
    });
  }

  /* =========================================================
     タブ「今日」（ホーム）
     ========================================================= */
  function alertRow(kind, icon, title, sub, onClick) {
    return h("button", { class: "li", type: "button", onClick },
      h("span", { class: "sal-ico " + kind }, K.icon(icon)),
      h("span", { class: "sal-li-main" }, h("span", { class: "sal-li-title", text: title }), sub ? h("span", { class: "sal-li-sub", text: sub }) : null),
      h("span", { class: "sal-chev" }, K.icon("chev")));
  }

  /* ---------- HOME カレンダー（読むだけ：shifts, orders, counts, sales, staff, suppliers） ---------- */
  const CAL_KEY = "kitchen-ledger-sal-cal";
  const cal = { sel: null, anchor: null, mode: "week", today: null };
  /* 0時を越えたら：今日を選んでいたら新しい今日へ移し、ホームを描き直す */
  K.on("day", (d) => {
    const nd = d || K.today();
    if (!cal.sel || cal.sel === cal.today) { cal.sel = nd; cal.anchor = nd; }
    cal.today = nd;
    dpOpen.day = null;
    if (homeDraw) homeDraw();
  });
  try { const m = localStorage.getItem(CAL_KEY); if (m === "month" || m === "week") cal.mode = m; } catch (e) {}
  const isWide = () => (window.innerWidth || 0) >= 900;
  const DOW_MON = ["月", "火", "水", "木", "金", "土", "日"];

  function shiftRows(list) {
    return h("div", { class: "list" }, list.map(({ e, carry }) =>
      h("div", { class: "li" },
        carry ? h("span", { class: "sal-time num" }, "〜" + e.end, h("span", { class: "sal-carry", text: "前日" + e.start + "から" }))
          : h("span", { class: "sal-time num", text: (e.start || "--:--") + "–" + (e.end || "--:--") + (e.start && e.end && e.end < e.start ? "（翌）" : "") }),
        h("span", { class: "sal-li-main" }, h("span", { class: "sal-li-title", text: nm(e.staffId) }),
          e.breakMin ? h("span", { class: "sal-li-sub num", text: "休憩 " + e.breakMin + "分" }) : null),
        e.station ? h("span", { class: "chip", text: e.station }) : null)));
  }

  /* 表示範囲の日ごとの印をまとめて作る */
  /* ---------- 予定（events：全員 ／ K.my "events"：自分だけ） ---------- */
  const EV_KINDS = ["予約", "団体・貸切", "イベント", "定休日・臨時休業", "業者・点検", "仕込み", "その他"];
  const EV_CLOSED = "定休日・臨時休業";
  const evTone = (k) => (k === "予約" || k === "団体・貸切" ? "accent" : k === "業者・点検" ? "info" : "muted");
  const hasMy = () => !!(K.my && typeof K.my.list === "function");
  function allEvents() {
    const sh = K.list("events").map((e) => Object.assign({}, e, { _mine: false }));
    const my = hasMy() ? K.my.list("events").map((e) => Object.assign({}, e, { _mine: true })) : [];
    return sh.concat(my);
  }
  const evSort = (a, b) => (a.allDay === b.allDay ? String(a.start || "").localeCompare(String(b.start || "")) || String(a.title || "").localeCompare(String(b.title || ""), "ja") : a.allDay ? -1 : 1);
  /* from〜to の日付 → その日に掛かる予定の配列 */
  function eventsByDay(from, to) {
    const m = {};
    allEvents().forEach((e) => {
      if (!e.date) return;
      const end = e.endDate && e.endDate >= e.date ? e.endDate : e.date;
      if (end < from || e.date > to) return;
      let d = e.date < from ? from : e.date;
      const last = end > to ? to : end;
      for (let i = 0; d <= last && i < 400; d = K.addDays(d, 1), i++) (m[d] = m[d] || []).push(e);
    });
    Object.keys(m).forEach((d) => m[d].sort(evSort));
    return (d) => m[d] || [];
  }
  /* 全員共有の予定で定休日・臨時休業の日か（自分だけの予定は売上未入力の判定に使わない） */
  function sharedClosed(d) {
    return K.list("events").some((e) => e.kind === EV_CLOSED && e.date && e.date <= d && d <= (e.endDate && e.endDate >= e.date ? e.endDate : e.date));
  }
  const evTime = (e) => (e.allDay ? "終日" : (e.start || "") + (e.end ? "–" + e.end : ""));
  function evRow(e) {
    return h("button", { class: "li", type: "button", onClick: () => openEventSheet(e) },
      h("span", { class: "sal-time sal-evtime num", text: evTime(e) }),
      h("span", { class: "sal-li-main" },
        h("span", { class: "sal-li-title" }, e._mine ? h("span", { class: "sal-mine", title: "自分だけの予定" }, K.icon("pin")) : null, e.title || "（無題）"),
        h("span", { class: "sal-li-sub" },
          h("span", { class: "chip sal-evchip " + evTone(e.kind) }, h("i", { class: "sal-evdot " + evTone(e.kind) }), e.kind || "その他"),
          " " + [e.covers ? e.covers + "名" : null, nm(e.staffId), e._mine ? "自分だけ" : null,
            e.endDate && e.endDate !== e.date ? K.fmt.md(e.date) + "〜" + K.fmt.md(e.endDate) : null].filter(Boolean).join("・"))),
      h("span", { class: "sal-chev" }, K.icon("chev")));
  }

  /* 予定シート。保存・削除で true、閉じたら false */
  function openEventSheet(existing, preset) {
    if (ro()) { K.toast("閲覧のみのため編集できません", "bad"); return Promise.resolve(false); }
    let saved = false, resolve;
    const result = new Promise((r) => { resolve = r; });
    const src = existing || preset || {};
    let kind = EV_KINDS.includes(src.kind) ? src.kind : "予約";
    const TIMED = ["予約", "団体・貸切", "業者・点検"];
    const adTouchedInit = !!existing || src.allDay != null || !!src.start;
    let adTouched = adTouchedInit;
    let allDay = adTouchedInit ? (src.allDay != null ? !!src.allDay : !src.start) : !TIMED.includes(kind);
    let scope = existing ? (existing._mine ? "my" : "all") : (src.scope || "all");
    const title = K.input({ value: src.title || "", placeholder: "例：山田様 送別会", maxlength: 60 });
    const date = K.input({ type: "date", value: src.date || cal.sel || K.today() });
    const endDate = K.input({ type: "date", value: src.endDate && src.endDate !== src.date ? src.endDate : "" });
    const start = K.input({ type: "time", value: src.start || "", step: 300 });
    const end = K.input({ type: "time", value: src.end || "", step: 300 });
    const covers = K.input({ type: "number", min: 0, step: 1, inputmode: "numeric", placeholder: "0", value: src.covers != null ? src.covers : "" });
    covers.classList.add("sal-r");
    const memo = h("textarea", { class: "inp", rows: 2, placeholder: "例：コース8,000円・アレルギー1名（えび）" });
    memo.value = src.memo || "";

    const kindBtns = EV_KINDS.map((k) => h("button", { class: "fchip", type: "button", attrs: { "aria-pressed": "false" }, onClick: () => { kind = k; if (!adTouched) allDay = !TIMED.includes(k); sync(); } },
      h("i", { class: "sal-evdot " + evTone(k) }), k));
    const adBtns = [["終日", true], ["時間を指定", false]].map(([l, v]) => h("button", { class: "seg-btn", type: "button", attrs: { "aria-pressed": "false" }, onClick: () => { allDay = v; adTouched = true; sync(); } }, l));
    const scBtns = [["全員に共有", "all"], ["自分だけ", "my"]].map(([l, v]) => h("button", { class: "seg-btn", type: "button", attrs: { "aria-pressed": "false" }, disabled: v === "my" && !hasMy(), onClick: () => { scope = v; sync(); } }, l));
    const timeRow = h("div", { class: "grid2" }, K.field("開始", start), K.field("終了", end));
    const coversField = K.field("人数（名）", covers);
    const scopeNote = h("span", { class: "field-hint" });
    function sync() {
      kindBtns.forEach((b, i) => b.setAttribute("aria-pressed", String(EV_KINDS[i] === kind)));
      adBtns.forEach((b, i) => b.setAttribute("aria-pressed", String((i === 0) === allDay)));
      scBtns.forEach((b, i) => b.setAttribute("aria-pressed", String((i === 0 ? "all" : "my") === scope)));
      timeRow.hidden = allDay;
      coversField.hidden = !(kind === "予約" || kind === "団体・貸切");
      scopeNote.textContent = scope === "my" ? (hasMy() ? K.my.note() : "") : "スタッフ全員のカレンダーに表示されます";
    }
    sync();

    const body = h("div", { class: "stack" },
      existing ? h("p", { class: "sal-meta", style: { margin: 0 }, text: "記入：" + nm(existing.staffId) + (existing._mine ? "・自分だけの予定" : "") }) : (preset && preset.fromMemo ? h("p", { class: "sal-meta", style: { margin: 0 }, text: "クイックメモから下書きしました。日付・時刻を確認してください" }) : null),
      K.field("タイトル", title),
      h("div", { class: "field" }, h("span", { class: "field-label", text: "種類" }), h("div", { class: "fchips sal-evkinds", role: "group", "aria-label": "種類" }, kindBtns)),
      h("div", { class: "grid2" }, K.field("日付", date), K.field("終了日（複数日のとき）", endDate)),
      h("div", { class: "field" }, h("span", { class: "field-label", text: "時間" }), h("div", { class: "seg sal-wx", role: "group", "aria-label": "時間" }, adBtns)),
      timeRow, coversField,
      K.field("メモ", memo),
      h("div", { class: "field" }, h("span", { class: "field-label", text: "公開範囲" }), h("div", { class: "seg sal-wx", role: "group", "aria-label": "公開範囲" }, scBtns), scopeNote));

    const writeTo = async (sc, id, data) => {
      if (sc === "my") return id ? K.my.put("events", id, data) : K.my.add("events", data);
      return id ? W.put("events", id, data) : W.add("events", data);
    };
    const delFrom = (e) => (e._mine ? K.my.del("events", e.id) : W.del("events", e.id));

    K.sheet({
      title: existing ? "予定を編集" : "予定を追加",
      onClose: () => resolve(saved),
      body,
      menu: existing ? [{
        label: "この予定を削除", icon: "trash", danger: true, disabled: ro(),
        onClick: async () => {
          if (!(await K.confirm("予定「" + (existing.title || "無題") + "」を削除します。元に戻せません。", "削除する", { danger: true }))) return;
          await delFrom(existing);
          saved = true;
          K.toast("予定を削除しました", "ok");
          if (homeDraw) homeDraw();
          return "close";
        },
      }] : null,
      actions: [
        { label: "キャンセル", kind: "ghost" },
        {
          label: existing ? "保存" : "追加", kind: "primary", disabled: ro(),
          onClick: async () => {
            if (typeof K.clearErrors === "function") K.clearErrors(body);
            const errs = [];
            const bad = (inp, m) => { errs.push(m); if (typeof K.fieldError === "function") K.fieldError(inp, m); else inp.setAttribute("aria-invalid", "true"); };
            const t = title.value.trim();
            if (!t) bad(title, "タイトルを入力してください");
            if (!date.value) bad(date, "日付を選んでください");
            if (endDate.value && date.value && endDate.value < date.value) bad(endDate, "終了日は日付より後にしてください");
            if (!allDay && !start.value) bad(start, "開始時刻を入れるか「終日」にしてください");
            const showCovers = kind === "予約" || kind === "団体・貸切";
            let cv = null;
            if (showCovers && covers.value.trim() !== "") {
              const v = Number(covers.value);
              if (covers.validity && covers.validity.badInput || !isFinite(v)) bad(covers, "人数は数字で入力してください");
              else if (v < 0) bad(covers, "人数は0以上で入力してください");
              else if (!Number.isInteger(v)) bad(covers, "人数は整数で入力してください");
              else cv = v;
            }
            if (errs.length) {
              if (typeof K.focusFirstError === "function") K.focusFirstError(body);
              return false;
            }
            const now = new Date().toISOString();
            const data = {
              date: date.value, endDate: endDate.value && endDate.value !== date.value ? endDate.value : null,
              allDay, start: allDay ? "" : start.value, end: allDay ? "" : end.value,
              title: t, kind, covers: showCovers ? cv : null, memo: memo.value.trim(),
              staffId: existing ? existing.staffId || null : K.currentStaffId() || null,
              createdAt: existing ? existing.createdAt || now : now, updatedAt: now,
            };
            if (existing) {
              const wasMine = !!existing._mine;
              if ((scope === "my") === wasMine) await writeTo(scope, existing.id, data);
              else { await writeTo(scope, null, data); await delFrom(existing); }
            } else await writeTo(scope, null, data);
            saved = true;
            cal.sel = data.date; cal.anchor = data.date;
            K.toast(existing ? "予定を保存しました" : "予定を追加しました", "ok");
            if (homeDraw) homeDraw();
          },
        },
      ].filter(Boolean),
    });
    return result;
  }

  /* クイックメモ → 予定の推測 */
  function guessEvent(memo) {
    const text = String((memo && memo.text) || "").trim();
    const first = (text.split(/\r?\n/).find((l) => l.trim()) || "").trim();
    const today = K.today();
    let date = today;
    const z = text.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
    let m;
    if (/明後日|あさって/.test(z)) date = K.addDays(today, 2);
    else if (/明日|あした/.test(z)) date = K.addDays(today, 1);
    else if ((m = z.match(/(\d{1,2})\s*[\/月]\s*(\d{1,2})\s*日?/))) {
      const y = Number(today.slice(0, 4)), mo = Number(m[1]), dd = Number(m[2]);
      if (mo >= 1 && mo <= 12 && dd >= 1 && dd <= 31) {
        let cand = y + "-" + pad(mo) + "-" + pad(dd);
        if (K.daysBetween(today, cand) < -180) cand = (y + 1) + "-" + pad(mo) + "-" + pad(dd);
        date = cand;
      }
    } else if ((m = z.match(/(^|[^\d\/])(\d{1,2})\s*日/))) {
      const dd = Number(m[2]);
      if (dd >= 1 && dd <= 31) {
        let cand = today.slice(0, 8) + pad(dd);
        if (cand < today) cand = monthStart(K.addDays(monthStart(today), 32)).slice(0, 8) + pad(dd);
        date = cand;
      }
    }
    let start = "";
    if ((m = z.match(/(\d{1,2})\s*[:：]\s*(\d{2})/))) start = pad(Number(m[1]) % 24) + ":" + m[2];
    else if ((m = z.match(/(\d{1,2})\s*時\s*(半|(\d{1,2})\s*分)?/))) start = pad(Number(m[1]) % 24) + ":" + (m[2] === "半" ? "30" : m[3] ? pad(Number(m[3])) : "00");
    let covers = null;
    if ((m = z.match(/(\d{1,3})\s*(名|人)/))) covers = Number(m[1]);
    const t = (memo && memo.tag ? memo.tag + " " : "") + z;
    const kind = /団体|貸切|宴会/.test(t) ? "団体・貸切" : /予約/.test(t) ? "予約" : /定休|休業|休み|臨休/.test(t) ? EV_CLOSED
      : /業者|点検|修理|メンテ|検査|工事|清掃業者/.test(t) ? "業者・点検" : /仕込/.test(t) ? "仕込み" : /イベント|フェア|祭/.test(t) ? "イベント" : "その他";
    return { fromMemo: true, title: first.slice(0, 60), memo: text !== first ? text : "", date, allDay: !start, start, end: "", kind, covers, scope: "all" };
  }
  if (typeof K.provide === "function") {
    K.provide("event.add", {
      label: "カレンダーに予定を追加", icon: "calendar", order: 40,
      handle: (memo) => openEventSheet(null, guessEvent(memo || {})),
    });
  }

  function dayMarks(from, to) {
    const today = K.today();
    const firstEver = K.list("sales").map((r) => r.date).filter(Boolean).sort()[0] || null;
    const m = {};
    const get = (d) => (m[d] = m[d] || { staff: new Set(), deliv: [], count: null });
    /* 出勤人数は shiftsOn と同じ数え方：その日の勤務＋前日からの日またぎ勤務 */
    K.list("shifts").forEach((doc) => (doc.entries || []).forEach((e) => {
      if (inRange(e.date, from, to)) get(e.date).staff.add(e.staffId || e.id);
      if (e.date && e.start && e.end && e.end < e.start) { const nx = K.addDays(e.date, 1); if (inRange(nx, from, to)) get(nx).staff.add(e.staffId || e.id); }
    }));
    K.list("orders").forEach((o) => { if (o.status === "sent" && inRange(o.deliveryDate, from, to)) get(o.deliveryDate).deliv.push(o); });
    K.list("counts").forEach((c) => { if (inRange(c.date, from, to)) get(c.date).count = c; });
    const evs = eventsByDay(from, to);
    return (d) => {
      const x = m[d] || { staff: new Set(), deliv: [], count: null };
      const rec = salesRec(d);
      const ev = evs(d);
      const closed = ev.some((e) => e.kind === EV_CLOSED);
      const missing = !rec && d < today && !!firstEver && d >= firstEver && !sharedClosed(d);
      return { staff: x.staff.size, deliv: x.deliv, count: x.count, sale: rec, missing, ev, closed };
    };
  }

  function calMark(icon, n, cls, label) {
    return h("span", { class: "sal-cm " + (cls || ""), title: label, attrs: { "aria-hidden": "true" } }, K.icon(icon), n != null ? h("span", { class: "num", text: String(n) }) : null);
  }

  function renderCalendar(host) {
    host.textContent = "";
    const today = K.today();
    if (!cal.sel) cal.sel = today;
    if (!cal.today) cal.today = today;
    const wide = isWide();
    const mode = wide ? "month" : cal.mode;
    if (!cal.anchor) cal.anchor = cal.sel;
    let from, to, label;
    if (mode === "month") {
      const ms = monthStart(cal.anchor);
      from = K.weekStart(ms);
      const nextM = monthStart(K.addDays(ms, 32));
      to = K.addDays(K.weekStart(K.addDays(nextM, -1)), 6);
      const [y, mo] = ms.split("-");
      label = y + "年" + Number(mo) + "月";
    } else {
      from = K.weekStart(cal.anchor); to = K.addDays(from, 6);
      label = K.fmt.md(from) + " 〜 " + K.fmt.md(to);
    }
    const marks = dayMarks(from, to);
    const curMonth = monthStart(cal.anchor).slice(0, 7);
    const redraw = () => renderCalendar(host);
    const move = (dir) => {
      cal.anchor = mode === "month" ? K.addDays(monthStart(cal.anchor), dir > 0 ? 32 : -1) : K.addDays(cal.anchor, dir * 7);
      if (mode === "month") cal.anchor = monthStart(cal.anchor);
      redraw();
    };
    const setMode = (m) => { cal.mode = m; try { localStorage.setItem(CAL_KEY, m); } catch (e) {} cal.anchor = cal.sel; redraw(); };

    const head = h("div", { class: "sal-cal-head" },
      h("button", { class: "icon-btn", type: "button", "aria-label": mode === "month" ? "前の月" : "前の週", onClick: () => move(-1) }, h("span", { class: "sal-flip" }, K.icon("chev"))),
      h("span", { class: "sal-cal-label num", attrs: { "aria-live": "polite" }, text: label }),
      h("button", { class: "icon-btn", type: "button", "aria-label": mode === "month" ? "次の月" : "次の週", onClick: () => move(1) }, K.icon("chev")),
      h("button", { class: "btn sm", type: "button", disabled: cal.sel === today && from <= today && today <= to, onClick: () => { cal.sel = today; cal.anchor = today; redraw(); } }, "今日"),
      h("span", { class: "spacer" }),
      wide ? null : h("div", { class: "seg", role: "group", "aria-label": "表示の切替" },
        h("button", { class: "seg-btn", type: "button", attrs: { "aria-pressed": String(mode === "week") }, onClick: () => setMode("week") }, "週"),
        h("button", { class: "seg-btn", type: "button", attrs: { "aria-pressed": String(mode === "month") }, onClick: () => setMode("month") }, "月")));

    const grid = h("div", { class: "sal-cal-grid " + (mode === "month" ? "is-month" : "is-week"), role: "grid", "aria-label": label + " のカレンダー" },
      DOW_MON.map((w, i) => h("div", { class: "sal-cal-dow" + (i === 5 ? " sat" : i === 6 ? " sun" : ""), role: "columnheader", text: w })));
    for (let d = from; d <= to; d = K.addDays(d, 1)) {
      const mk = marks(d);
      const dow = (K.daysBetween(K.weekStart(d), d));
      const out = mode === "month" && d.slice(0, 7) !== curMonth;
      const parts = [];
      if (mk.staff) parts.push("出勤" + mk.staff + "名");
      if (mk.deliv.length) parts.push("納品予定" + mk.deliv.length + "件");
      if (mk.count) parts.push("棚卸し" + (mk.count.done ? "済み" : "途中"));
      if (mk.sale) parts.push("売上入力済み"); else if (mk.missing) parts.push("売上未入力");
      if (mk.closed) parts.unshift("休業");
      if (mk.ev.length) parts.push("予定" + mk.ev.length + "件（" + mk.ev.slice(0, 3).map((e) => e.title).join("、") + "）");
      const evShown = mk.ev.filter((e) => e.kind !== EV_CLOSED);
      const tones = [...new Set(evShown.map((e) => evTone(e.kind)))];
      const mine = mk.ev.some((e) => e._mine);
      const dd = d;
      grid.appendChild(h("button", {
        class: "sal-cal-day" + (out ? " out" : "") + (mk.closed ? " closed" : "") + (dow === 5 ? " sat" : dow === 6 ? " sun" : "") + (d === today ? " today" : ""),
        type: "button", role: "gridcell",
        attrs: Object.assign({ "aria-pressed": String(d === cal.sel), "aria-label": K.fmt.date(d) + (d === today ? "（今日）" : "") + (parts.length ? "：" + parts.join("、") : "") }, d === today ? { "aria-current": "date" } : {}),
        onClick: () => { cal.sel = dd; redraw(); },
      },
        h("span", { class: "sal-cal-top" }, h("span", { class: "sal-cal-num num", text: String(Number(d.slice(8))) }),
          mk.closed ? h("span", { class: "sal-cal-closed", attrs: { "aria-hidden": "true" }, text: "休" }) : null),
        evShown.length ? h("span", { class: "sal-cal-ev", attrs: { "aria-hidden": "true" } },
          h("span", { class: "sal-evdots" }, tones.map((tn) => h("i", { class: "sal-evdot " + tn }))),
          mine ? h("span", { class: "sal-mine" }, K.icon("pin")) : null,
          h("span", { class: "num sal-evn", text: String(evShown.length) }),
          h("span", { class: "sal-evt", text: evShown[0].title || "" })) : (mine ? h("span", { class: "sal-cal-ev", attrs: { "aria-hidden": "true" } }, h("span", { class: "sal-mine" }, K.icon("pin"))) : null),
        h("span", { class: "sal-cal-marks" },
          mk.staff ? calMark("user", mk.staff, "", "出勤") : null,
          mk.deliv.length ? calMark("cart", mk.deliv.length, "info", "納品予定") : null,
          mk.count ? calMark("clip", null, "", "棚卸し") : null,
          mk.sale ? calMark("check", null, "ok", "売上入力済み") : mk.missing ? h("span", { class: "sal-cm warn", title: "売上未入力", attrs: { "aria-hidden": "true" } }, h("i", { class: "sal-dotw" }), h("span", { text: "未" })) : null)));
    }
    // スワイプで移動（週・月とも）
    let sx = null;
    grid.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true });
    grid.addEventListener("touchend", (e) => {
      if (sx == null) return;
      const dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) > 50) move(dx < 0 ? 1 : -1);
    });

    const legend = h("div", { class: "sal-cal-legend" },
      h("span", {}, calMark("user", null), "出勤"), h("span", {}, calMark("cart", null, "info"), "納品予定"),
      h("span", {}, calMark("clip", null), "棚卸し"), h("span", {}, calMark("check", null, "ok"), "売上入力済み"),
      h("span", {}, h("span", { class: "sal-cm warn" }, h("i", { class: "sal-dotw" })), "売上未入力"),
      h("span", {}, h("i", { class: "sal-evdot accent" }), "予約・団体"), h("span", {}, h("i", { class: "sal-evdot info" }), "業者・点検"),
      h("span", {}, h("i", { class: "sal-evdot muted" }), "その他の予定"), h("span", {}, h("span", { class: "sal-cal-closed" , text: "休" }), "定休日・臨時休業"),
      h("span", {}, h("span", { class: "sal-mine" }, K.icon("pin")), "自分だけ"));

    host.appendChild(h("section", { class: "card sal-cal", "aria-label": "カレンダー" }, head, grid, wide ? legend : null));
    host.appendChild(dayPanel(cal.sel, host));
  }

  /* 日パネル（コンパクト）：各項目1行。予定・出勤・納品は ▸ で展開 */
  const dpOpen = { day: null, ev: null, shift: null, deliv: null };
  function dayPanel(d, host) {
    const today = K.today();
    const wide = isWide();
    if (dpOpen.day !== d) { dpOpen.day = d; dpOpen.ev = wide; dpOpen.shift = wide; dpOpen.deliv = false; }
    const mk2 = dayMarks(d, d)(d);
    const shifts = shiftsOn(d);
    const rec = salesRec(d);
    const t = saleTotal(rec);
    const sups = (id) => (K.getDoc("suppliers", id) || {}).name || "仕入先未設定";
    const redraw = () => { const np = dayPanel(d, host); panel.replaceWith(np); };

    /* 1行：アイコン・ラベル・値・右端（ボタン or ▸） */
    const line = (icon, label, value, opts) => {
      const o = opts || {};
      const inner = [
        h("span", { class: "sal-dl-ico" }, K.icon(icon)),
        h("span", { class: "sal-dl-lbl", text: label }),
        h("span", { class: "sal-dl-val" }, value),
      ];
      if (o.toggle) {
        return h("button", { class: "li sal-dl", type: "button", attrs: { "aria-expanded": String(!!o.open) }, onClick: o.toggle },
          inner, h("span", { class: "sal-chev sal-dl-chev" + (o.open ? " open" : "") }, K.icon("chev")));
      }
      return h("div", { class: "li sal-dl" }, inner, o.action || null);
    };

    const rows = [];
    // 予定
    const ev = mk2.ev;
    rows.push(line("calendar", "予定",
      ev.length ? [h("span", { class: "num", text: ev.length + "件 " }), h("span", { class: "sal-dl-sub", text: ev.slice(0, 2).map((e) => (e.allDay ? "" : e.start + " ") + e.title).join("、") + (ev.length > 2 ? " ほか" : "") })]
        : h("span", { class: "sal-dl-sub", text: "なし" }),
      ev.length ? { toggle: () => { dpOpen.ev = !dpOpen.ev; redraw(); }, open: dpOpen.ev }
        : { action: h("button", { class: "btn sm", type: "button", disabled: ro(), attrs: writeAttrs, onClick: () => openEventSheet(null, { date: d }) }, K.icon("plus"), "追加") }));
    if (ev.length && dpOpen.ev) rows.push(h("div", { class: "sal-dl-body" }, h("div", { class: "list" }, ev.map(evRow)),
      h("button", { class: "btn sm ghost", type: "button", disabled: ro(), attrs: writeAttrs, onClick: () => openEventSheet(null, { date: d }) }, K.icon("plus"), "この日に予定を追加")));
    // 売上
    let saleVal, saleAct = null;
    if (rec) {
      saleVal = [h("span", { class: "num sal-dl-strong", text: t == null ? "—" : K.fmt.yen(t) }),
        h("span", { class: "sal-dl-sub num", text: rec.covers ? " " + rec.covers + "人" : "" })];
      saleAct = h("button", { class: "btn sm", type: "button", disabled: ro(), attrs: writeAttrs, onClick: () => openSalesSheet(d) }, "編集");
    } else if (d > today) saleVal = h("span", { class: "sal-dl-sub", text: "営業後に入力" });
    else {
      saleVal = mk2.missing ? h("span", { class: "chip warn", text: "未入力" }) : h("span", { class: "sal-dl-sub", text: mk2.closed ? "休業日" : d === today ? "まだ入力されていません" : "記録なし" });
      saleAct = h("button", { class: "btn sm", type: "button", disabled: ro(), attrs: writeAttrs, onClick: () => openSalesSheet(d) }, K.icon("plus"), "入力");
    }
    rows.push(line("chart", "売上", saleVal, { action: saleAct }));
    if (d >= today) {
      const fc = salesForecast({ date: d });
      if (fc.covers) rows.push(line("user", "予測客数", [h("span", { class: "num", text: fc.covers + "名" }),
        h("span", { class: "sal-dl-sub", text: fc.reserved ? "（うち予約" + fc.reserved + "名）" : "（" + fc.basis + "）" })]));
    }
    // 出勤
    const ppl = new Set(shifts.map((x) => x.e.staffId || x.e.id)).size;
    rows.push(line("user", "出勤",
      shifts.length ? h("span", { class: "num", text: ppl + "名" + (ppl !== shifts.length ? "・" + shifts.length + "枠" : "") }) : h("span", { class: "sal-dl-sub", text: "予定なし" }),
      shifts.length ? { toggle: () => { dpOpen.shift = !dpOpen.shift; redraw(); }, open: dpOpen.shift } : {}));
    if (shifts.length && dpOpen.shift) rows.push(h("div", { class: "sal-dl-body" }, shiftRows(shifts)));
    // 納品予定
    const dl = mk2.deliv;
    rows.push(line("cart", "納品予定",
      dl.length ? h("span", { class: "num", text: dl.length + "件・" + K.fmt.yen(dl.reduce((a, o) => a + n0(o.total), 0)) }) : h("span", { class: "sal-dl-sub", text: "なし" }),
      dl.length ? { toggle: () => { dpOpen.deliv = !dpOpen.deliv; redraw(); }, open: dpOpen.deliv } : {}));
    if (dl.length && dpOpen.deliv) rows.push(h("div", { class: "sal-dl-body" }, h("div", { class: "list" }, dl.map((o) =>
      h("button", { class: "li", type: "button", onClick: () => K.go("inventory", "order") },
        h("span", { class: "sal-li-main" }, h("span", { class: "sal-li-title", text: sups(o.supplierId) }),
          h("span", { class: "sal-li-sub", text: (o.lines || []).length + "品目" })),
        h("span", { class: "num", text: K.fmt.yen(o.total) }),
        h("span", { class: "sal-chev" }, K.icon("chev")))))));
    // 棚卸し（ある日だけ）
    const cnt = mk2.count;
    if (cnt) rows.push(line("clip", "棚卸し", [h("span", { class: "chip " + (cnt.done ? "ok" : "warn"), text: cnt.done ? "確定済み" : "途中" }),
      cnt.total != null ? h("span", { class: "sal-dl-sub num", text: " " + K.fmt.yen(cnt.total) }) : null]));

    const panel = h("section", { class: "card sal-dp", "aria-label": K.fmt.date(d) + " の詳細" },
      h("div", { class: "sal-dp-title" }, h("span", { class: "sec-title num", text: K.fmt.date(d) }),
        d === today ? h("span", { class: "chip info", text: "今日" }) : null,
        mk2.closed ? h("span", { class: "chip", text: "休業" }) : null),
      h("div", { class: "list sal-dl-list" }, rows));
    return panel;
  }

  /* 要対応の中身（ホームと今日モードで共用）。優先度順 */
  function alertDefs() {
    const today = K.today();
    const yday = K.addDays(today, -1);
    const cur = K.currentStaffId();
    const out = [];
    const add = (kind, icon, title, sub, go) => out.push({ kind, icon, title, sub, go });
    const notes = K.list("notes");
    /* 担当者を選んでいるとき：その人が未確認／未選択のとき：誰も確認していない緊急（連絡画面と同じ定義） */
    const urgent = notes.filter((n) => n.priority === "urgent" && (cur ? !(n.readBy || []).includes(cur) : !(n.readBy || []).length));
    if (urgent.length) add("bad", "bell", "未確認の緊急連絡 " + urgent.length + "件",
      cur ? nm(cur) + " さんがまだ確認していません" : "まだ誰も確認していません", () => K.go("shift", "notes", { filter: "unread" }));
    /* 衛生記録（担当C の hygiene.status。未登録なら何も出さない） */
    const hs = typeof K.ask === "function" ? K.ask("hygiene.status", { date: today }) : null;
    if (hs) {
      const ab = hs.abnormal || [], ms = hs.missing || [];
      if (ab.length) add("bad", "alert", "温度の異常 " + ab.length + "件",
        ab.slice(0, 3).map((x) => (x.name || "") + (x.slot ? "（" + x.slot + "）" : "") + " " + (x.temp != null ? x.temp + "℃" : "")).join("・") + (ab.length > 3 ? " ほか" : ""), () => K.go("shift", "hygiene"));
      if (ms.length) add("warn", "clip", "衛生記録の未記録 " + ms.length + "件",
        ms.slice(0, 3).map((x) => (x.name || "") + (x.slot ? "（" + x.slot + "）" : "")).join("・") + (ms.length > 3 ? " ほか" : ""), () => K.go("shift", "hygiene"));
    }
    const items = K.list("items");
    const low = items.filter((it) => n0(it.par) > 0 && n0(it.stock) < n0(it.par) * 0.5);
    if (low.length) add("bad", "box", "在庫不足 " + low.length + "品目",
      low.slice(0, 3).map((x) => x.name).join("・") + (low.length > 3 ? " ほか" : "") + "（適正在庫の半分未満）", () => K.go("inventory", "stock", { filter: "bad" }));
    /* 仕込みの残り（担当B の prep.status）。半分以上・3件以上残っているときだけ */
    const ps = typeof K.ask === "function" ? K.ask("prep.status", { date: today }) : null;
    if (ps && n0(ps.total) > 0) {
      const left = n0(ps.total) - n0(ps.done);
      if (left >= 3 && left / n0(ps.total) >= 0.5) add("warn", "knife", "仕込みの残り " + left + " / " + ps.total + "件",
        (ps.lines || []).filter((l) => !l.done).slice(0, 3).map((l) => l.name).join("・") + (left > 3 ? " ほか" : ""), () => K.go("recipe", "prep"));
    }
    const drafts = K.list("orders").filter((o) => o.status === "draft");
    if (drafts.length) add("warn", "cart", "下書きのままの発注書 " + drafts.length + "件", "送信しないと仕入先に届きません", () => K.go("inventory", "order", { filter: "draft" }));
    if (!salesRec(yday) && !sharedClosed(yday)) add("warn", "chart", "昨日（" + K.fmt.date(yday) + "）の売上が未入力", "定休日でなければ入力してください", () => openSalesSheet(yday));
    if (items.length) {
      const doneDates = K.list("counts").filter((c) => c.done && c.date).map((c) => c.date).sort();
      const last = doneDates[doneDates.length - 1];
      if (!last) add("info", "clip", "棚卸しの記録がまだありません", "棚卸しをすると原価と在庫金額が正確になります", () => K.go("inventory", "count"));
      else {
        const gap = K.daysBetween(last, today);
        if (gap >= 7) add("info", "clip", "棚卸しから " + gap + "日経過", "最終：" + K.fmt.date(last), () => K.go("inventory", "count"));
      }
    }
    if (memoCount > 0 && (typeof K.routeMemo === "function" || typeof K.openMemos === "function")) {
      const openMemos = typeof K.memos === "function" ? K.memos().filter((m) => !m.done).sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || ""))) : [];
      const oldest = openMemos[0];
      const snip = oldest ? String(oldest.text || oldest.tag || "").split(/\r?\n/)[0].slice(0, 24) : "";
      add("info", "edit", "未処理のクイックメモ " + memoCount + "件",
        oldest ? "いちばん古いメモ「" + snip + "」を行き先へ回す" : "行き先（発注・連絡・改善など）へ回してください",
        () => { if (oldest && typeof K.routeMemo === "function") K.routeMemo(oldest); else if (typeof K.openMemos === "function") K.openMemos(); });
    }
    return out;
  }

  let memoCount = 0, homeDraw = null;
  /* 未処理クイックメモ件数（core が通知。未対応の core では何もしない） */
  K.on("memos", (n) => { const v = Number(n) || 0; if (v !== memoCount) { memoCount = v; if (homeDraw) homeDraw(); } });
  function renderHome(root) {
    root.textContent = "";
    const today = K.today();
    const yday = K.addDays(today, -1);
    const set = K.settings();
    const cur = K.currentStaffId();

    root.appendChild(h("div", { class: "sal-head sal-home-head" },
      h("h1", { class: "page-title sal-home-title", text: "HOME" }),
      h("span", { class: "sal-date", text: K.fmt.date(today) }),
      h("button", { class: "btn primary sal-cal-add", type: "button", disabled: ro(), attrs: writeAttrs, onClick: () => openEventSheet(null, { date: cal.sel || today }) }, K.icon("plus"), "予定")));
    const calHost = h("div", { class: "sal-calwrap sal-o0", "aria-label": "カレンダー" });
    renderCalendar(calHost);

    /* 要対応 */
    const alerts = alertDefs().map((x) => alertRow(x.kind, x.icon, x.title, x.sub, x.go));
    const secA = h("section", { class: "sal-sec sal-o1", "aria-label": "要対応" },
      secHead("要対応", alerts.length ? h("span", { class: "chip bad num", text: alerts.length + "件" }) : null));
    if (alerts.length) secA.appendChild(h("div", { class: "list" }, alerts));
    else secA.appendChild(h("div", { class: "sal-allclear" }, h("span", { class: "sal-ico" }, K.icon("check")), "対応が必要なことはありません"));

    /* 数字 */
    const yRec = salesRec(yday), yTot = saleTotal(yRec);
    const lwTot = saleTotal(salesRec(K.addDays(yday, -7)));
    let ySub = "売上を入力すると表示";
    let yChip = null;
    if (yTot != null) {
      const r = div(yTot - n0(lwTot), lwTot);
      if (lwTot != null && r != null) {
        ySub = "前週同曜日 " + K.fmt.yen(lwTot);
        yChip = h("span", { class: "chip num " + (r >= 0 ? "ok" : "warn"), text: (r >= 0 ? "+" : "") + (r * 100).toFixed(1) + "%" });
      } else ySub = "前週同曜日の記録なし";
    }
    const mS = stats(monthStart(today), today);
    const wS = stats(K.weekStart(today), today);
    const secK = h("section", { class: "sal-sec sal-o2", "aria-label": "数字" }, secHead("数字", h("button", { class: "btn ghost sm", onClick: () => K.go("sales", "analysis") }, "分析を見る", K.icon("chev"))),
      h("div", { class: "sal-kpis" },
        kpi("昨日の売上", yTot == null ? null : K.fmt.yen(yTot), ySub, yChip),
        kpi("今月の累計売上", mS.days ? K.fmt.yen(mS.total) : null, mS.days ? mS.days + "日分入力済み" : "売上を入力すると表示"),
        costKpi("今月", mS.fc, mS.days, set.targetFoodCost),
        kpi("今週の人件費率", K.fmt.pct(wS.laborRate),
          wS.laborRate != null ? laborNote(wS) + "・目標 " + K.fmt.pct(set.targetLabor)
            : !wS.days ? "今週の売上を入力すると表示" : "シフトと時給を入力すると表示",
          rateChip(wS.laborRate, set.targetLabor))));

    /* 出勤はカレンダーの日パネルに統合（初期選択＝今日） */
    const latest = K.list("notes").slice().sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || String(b.createdAt || "").localeCompare(String(a.createdAt || ""))).slice(0, 3);
    const secN = h("section", { class: "sal-sec sal-o4", "aria-label": "最新の連絡" }, secHead("最新の連絡", h("button", { class: "btn ghost sm", onClick: () => K.go("shift", "notes") }, "連絡", K.icon("chev"))));
    if (!latest.length) secN.appendChild(K.empty("連絡はまだありません", "シフト・連絡画面で業務連絡や引き継ぎを書くと、最新3件がここに出ます。"));
    else secN.appendChild(h("div", { class: "list" }, latest.map((n) =>
      h("button", { class: "li", type: "button", onClick: () => K.go("shift", "notes") },
        h("span", { class: "sal-li-main" },
          h("span", { class: "sal-chips" },
            n.pinned ? h("span", { class: "chip info" }, K.icon("pin"), "固定") : null,
            n.priority === "urgent" ? h("span", { class: "chip bad", text: "緊急" }) : null,
            h("span", { class: "chip", text: n.kind || "連絡" })),
          h("span", { class: "sal-note-text", text: n.text || "" }),
          h("span", { class: "sal-li-sub", text: nm(n.staffId) + (n.createdAt ? "・" + K.fmt.md(localIso(n.createdAt)) + " " + hhmm(n.createdAt) : "") })),
        h("span", { class: "sal-chev" }, K.icon("chev"))))));

    /* 改善ボード */
    const doing = K.list("kaizen").filter((k) => k.status === "実施中");
    const secZ = h("section", { class: "sal-sec sal-o5", "aria-label": "改善ボード" }, secHead("改善ボード"),
      h("div", { class: "list" }, h("button", { class: "li", type: "button", onClick: () => K.go("sales", "kaizen") },
        h("span", { class: "sal-ico accent" }, K.icon("bulb")),
        h("span", { class: "sal-li-main" },
          h("span", { class: "sal-li-title" }, h("span", { class: "num", text: String(doing.length) }), " 件を実施中"),
          h("span", { class: "sal-li-sub", text: doing.length ? doing.slice(0, 2).map((k) => k.title).join("・") + (doing.length > 2 ? " ほか" : "") : "提案を「実施中」に進めるとここで数えます" })),
        h("span", { class: "sal-chev" }, K.icon("chev")))));

    root.appendChild(h("div", { class: "sal-dash" },
      h("div", { class: "sal-dcol" }, calHost),
      h("div", { class: "sal-dcol" }, secA, secK, secN, secZ)));
  }

  K.register({
    key: "home", label: "ホーム", icon: "home", order: 1,
    mount(root) {
      const draw = scheduler(() => renderHome(root));
      ["sales", "kaizen", "items", "counts", "orders", "recipes", "staff", "shifts", "notes", "settings", "events", "suppliers", "hygiene", "prep"].forEach((c) => { try { K.watch(c, draw); } catch (e) { /* 未定義のコレクションは無視 */ } });
      K.on("answers", draw);
      if (hasMy() && typeof K.my.watch === "function") K.my.watch("events", draw);
      K.on("staff", draw);
      K.on("readonly", draw);
      K.on("nav", (p) => { if (p && p.key === "home") draw(); });
      homeDraw = draw;
      /* 時刻に依存する要対応（衛生の夕など）のため、表示中は1分ごとに描き直す */
      setInterval(() => { if (!document.hidden && !root.hidden && !root.closest("[hidden]")) draw(); }, 60000);
      document.addEventListener("visibilitychange", () => { if (!document.hidden && !root.hidden) draw(); });
      // 900px をまたいだら週/月の型を切り替える
      try { const mq = window.matchMedia("(min-width: 900px)"); const f = () => draw(); mq.addEventListener ? mq.addEventListener("change", f) : mq.addListener(f); } catch (e) {}
      renderHome(root);
    },
  });

  /* =========================================================
     タブ「売上・改善」
     ========================================================= */
  const panes = {};
  let period = "month";
  try { const p = localStorage.getItem("kitchen-ledger-sal-period"); if (["week", "month", "prev"].includes(p)) period = p; } catch (e) {}

  /* --- 日報 --- */
  let dailyAll = false;
  function renderDaily(el) {
    el.textContent = "";
    const today = K.today();
    const from = K.addDays(today, -29);
    const recs = K.list("sales").filter((r) => inRange(r.date, from, today));
    const doneToday = !!salesRec(today);
    el.appendChild(h("div", { class: "sal-pane-head" },
      h("h2", { class: "sec-title", text: "日報" }),
      h("button", { class: "btn primary", disabled: ro(), attrs: writeAttrs, onClick: () => openSalesSheet(today) }, K.icon(doneToday ? "edit" : "plus"), doneToday ? "今日の売上を編集" : "今日の売上を入力")));

    /* 直近30日：記録のない日（今日を除く・最初の記録より前は除く）も「未入力」として並べる */
    const firstEver = K.list("sales").map((r) => r.date).filter(Boolean).sort()[0];
    const days = [];
    if (firstEver) for (let d = K.addDays(today, -1); d >= from && d >= firstEver; d = K.addDays(d, -1)) { if (salesRec(d) || !sharedClosed(d)) days.push(d); }
    if (doneToday) days.unshift(today);
    const missing = days.filter((d) => !salesRec(d)).length;

    el.appendChild(h("div", { class: "sal-subtools" },
      h("span", { class: "sal-meta" }, "直近30日・入力 " + recs.length + "日", missing ? h("span", { class: "chip warn", style: { marginLeft: "8px" }, text: "未入力 " + missing + "日" }) : null),
      h("button", { class: "btn ghost sm sal-pickbtn", type: "button", disabled: ro(), attrs: writeAttrs, onClick: () => openSalesSheet(K.addDays(today, -1), { pickDate: true }) }, K.icon("calendar"), "日付を指定")));
    if (missing) el.appendChild(h("p", { class: "sal-meta", style: { margin: 0 }, text: "「未入力」の行をタップすると、その日の売上を入力できます。定休日・臨時休業はカレンダーに予定として入れると一覧から外れます。" }));

    if (!recs.length && !days.length) {
      el.appendChild(K.empty("直近30日の売上記録がありません", "「今日の売上を入力」から総売上・客数・天気・メニュー別出数を入れると、ここに一覧と客単価が出ます。", "今日の売上を入力", () => openSalesSheet(today)));
      return;
    }
    const LIMIT = 10;
    const shown = dailyAll ? days : days.slice(0, LIMIT);
    const tbody = h("tbody");
    const open = (d) => { if (!ro()) openSalesSheet(d); };
    shown.forEach((d) => {
      const r = salesRec(d);
      const attrs = { class: "click" + (r ? "" : " sal-missing"), tabindex: "0", title: r ? "タップで編集" : "タップで入力",
        onClick: () => open(d), onKeydown: (e) => { if (e.key === "Enter") open(d); } };
      if (!r) {
        tbody.appendChild(h("tr", attrs,
          h("td", { class: "num sal-date-cell", text: K.fmt.date(d) }),
          h("td", { attrs: { colspan: "5" } }, h("span", { class: "sal-miss" }, h("span", { class: "chip warn", text: "未入力" }), h("span", { class: "sal-chev" }, K.icon("chev"))))));
        return;
      }
      const t = saleTotal(r);
      const c = n0(r.covers);
      const q = (r.items || []).reduce((a, x) => a + n0(x.qty), 0);
      tbody.appendChild(h("tr", attrs,
        h("td", { class: "num sal-date-cell", text: K.fmt.date(d) }),
        h("td", { class: "r num", text: t == null ? "—" : K.fmt.yen(t) }),
        h("td", { class: "r num" }, c ? K.fmt.num(c) : "—", c ? h("span", { class: "sal-unit", text: "人" }) : null),
        h("td", { class: "r num", text: c && t != null ? K.fmt.yen(t / c) : "—" }),
        h("td", {}, r.weather ? h("span", { class: "chip", text: r.weather }) : h("span", { class: "muted", text: "—" })),
        h("td", { class: "r num sal-hide-sm", text: q ? K.fmt.num(q) : "—" })));
    });
    el.appendChild(h("div", { class: "tblwrap" }, h("table", { class: "tbl sal-tbl" },
      h("thead", {}, h("tr", {}, h("th", { text: "日付" }), h("th", { class: "r", text: "売上" }), h("th", { class: "r", text: "客数" }),
        h("th", { class: "r", text: "客単価" }), h("th", { text: "天気" }), h("th", { class: "r sal-hide-sm", text: "出数" }))),
      tbody)));
    if (days.length > LIMIT) el.appendChild(h("div", { class: "row", style: { justifyContent: "center" } },
      h("button", { class: "btn ghost", onClick: () => { dailyAll = !dailyAll; renderDaily(el); } }, dailyAll ? "直近10日だけ表示" : "さらに表示（残り " + (days.length - LIMIT) + "日）")));
    if (ro()) el.appendChild(h("p", { class: "muted small", text: "閲覧のみのため編集はできません。" }));
  }

  /* --- 分析：SVG --- */
  const SVGNS = "http://www.w3.org/2000/svg";
  function s(tag, attrs, text) {
    const e = document.createElementNS(SVGNS, tag);
    for (const k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  function niceStep(x) {
    if (!(x > 0)) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(x)));
    const m = x / p;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
  }
  function barChart(st) {
    const days = datesIn(st.from, st.to);
    const vals = days.map((d) => saleTotal(salesRec(d)));
    const present = vals.filter((v) => v != null);
    if (!present.length || Math.max.apply(null, present) <= 0) {
      return K.empty("この期間の売上記録がありません", "日報で売上を入力すると、日別の棒グラフが出ます。");
    }
    const max = Math.max.apply(null, present);
    const avg = present.reduce((a, b) => a + b, 0) / present.length;
    const step = niceStep(max / 4);
    const top = Math.ceil(max / step) * step;
    const wide = (window.innerWidth || 0) >= 900;
    const VW = wide ? 1000 : 400, VH = wide ? 280 : 230, L = wide ? 56 : 44, R = 12, T = 22, B = 34;
    const cw = VW - L - R, ch = VH - T - B;
    const y = (v) => T + ch - (v / top) * ch;
    const svg = s("svg", { viewBox: "0 0 " + VW + " " + VH, class: "sal-chart" + (wide ? "" : " sm"), role: "img",
      "aria-label": "日別売上。最大 " + K.fmt.yen(max) + "、平均 " + K.fmt.yen(avg) + "、" + present.length + "日分" });
    for (let v = 0; v <= top + 0.5; v += step) {
      svg.appendChild(s("line", { x1: L, x2: VW - R, y1: y(v), y2: y(v), class: v === 0 ? "base" : "gl" }));
      svg.appendChild(s("text", { x: L - 6, y: y(v) + 4, "text-anchor": "end", class: "ax" }, yenShort(v)));
    }
    const n = days.length, slot = cw / n, bw = Math.max(3, slot * 0.68);
    const every = n <= 8 ? 1 : (wide ? (n <= 16 ? 1 : 3) : (n <= 16 ? 2 : 5));
    let lastLbl = -99;
    const maxIdx = vals.indexOf(max);
    days.forEach((d, i) => {
      const cx = L + slot * i + slot / 2;
      const v = vals[i];
      if (v != null && v > 0) {
        const r = s("rect", { x: cx - bw / 2, y: y(v), width: bw, height: Math.max(1, T + ch - y(v)), rx: Math.min(3, bw / 3), class: "bs" + (v < avg * 0.7 ? " lo" : "") });
        r.appendChild(s("title", {}, K.fmt.date(d) + " " + K.fmt.yen(v)));
        svg.appendChild(r);
        if (n <= 8 || i === maxIdx) svg.appendChild(s("text", { x: cx, y: y(v) - 6, "text-anchor": "middle", class: "vl" }, yenShort(v)));
      }
      if ((i % every === 0 || i === n - 1) && i - lastLbl >= Math.max(1, every * 0.6) && (i === n - 1 || i - lastLbl >= every)) {
        lastLbl = i;
        svg.appendChild(s("text", { x: cx, y: VH - B + 16, "text-anchor": "middle", class: "ax" }, K.fmt.md(d)));
        if (n <= 8) svg.appendChild(s("text", { x: cx, y: VH - B + 30, "text-anchor": "middle", class: "ax" }, K.fmt.dow(d)));
      }
    });
    svg.appendChild(s("line", { x1: L, x2: VW - R, y1: y(avg), y2: y(avg), class: "avg" }));
    svg.appendChild(s("text", { x: VW - R, y: y(avg) - 5, "text-anchor": "end", class: "avgt" }, "平均 " + yenShort(Math.round(avg))));
    return svg;
  }

  /* 曜日別（直近8週） */
  function dowStats() {
    const to = K.today(), from = K.addDays(to, -55);
    const by = {};
    const order = ["月", "火", "水", "木", "金", "土", "日"];
    order.forEach((d) => { by[d] = { sum: 0, n: 0, hours: 0, shiftDays: 0, dates: new Set() }; });
    K.list("sales").forEach((r) => {
      const t = saleTotal(r);
      if (t == null || !inRange(r.date, from, to)) return;
      const b = by[K.fmt.dow(r.date)]; b.sum += t; b.n++; b.dates.add(r.date);
    });
    K.list("shifts").forEach((doc) => (doc.entries || []).forEach((e) => {
      if (!inRange(e.date, from, to)) return;
      const b = by[K.fmt.dow(e.date)];
      if (!b.dates.has(e.date)) return;
      b.hours += K.hours(e.start, e.end, e.breakMin);
    }));
    return order.map((d) => ({ dow: d, avg: by[d].n ? by[d].sum / by[d].n : null, n: by[d].n, hoursAvg: by[d].n ? by[d].hours / by[d].n : 0 }));
  }

  /* ロス（waste・担当A）の集計：品目ごとの金額・数量・理由の内訳 */
  function wasteRank(from, to) {
    const m = {};
    K.list("waste").forEach((w) => {
      if (!inRange(w.date, from, to)) return;
      const key = w.itemId || "n:" + (w.name || "");
      const it = w.itemId ? K.getDoc("items", w.itemId) : null;
      const x = (m[key] = m[key] || { key, name: (it && it.name) || w.name || "（名称なし）", amount: 0, qty: 0, unit: w.unit || (it && it.unit) || "", n: 0, reasons: {} });
      const amt = w.amount != null ? n0(w.amount) : Math.round(n0(w.qty) * n0(w.unitCost));
      x.amount += amt; x.qty += n0(w.qty); x.n++;
      const r = w.reason || "その他";
      x.reasons[r] = (x.reasons[r] || 0) + amt;
    });
    return Object.values(m).sort((a, b) => b.amount - a.amount || b.qty - a.qty);
  }
  let wastePeriod = "month";
  function wasteSection(paneEl) {
    const today = K.today();
    const ms = monthStart(today);
    const pe = K.addDays(ms, -1);
    const rg = wastePeriod === "prev" ? { from: monthStart(pe), to: pe, label: "先月" } : { from: ms, to: today, label: "今月" };
    const list = wasteRank(rg.from, rg.to);
    const total = list.reduce((a, x) => a + x.amount, 0);
    const seg = h("div", { class: "seg", role: "group", "aria-label": "ロスの期間" },
      [["month", "今月"], ["prev", "先月"]].map(([v, l]) => h("button", { class: "seg-btn", type: "button", attrs: { "aria-pressed": String(wastePeriod === v) }, onClick: () => { wastePeriod = v; renderAnalysis(paneEl); } }, l)));
    const sec = h("section", { class: "sal-sec", "aria-label": "ロスの多い品目" },
      secHead("ロスの多い品目", list.length ? h("span", { class: "sal-meta num", text: rg.label + "合計 " + K.fmt.yen(total) }) : null, seg));
    if (!list.length) {
      sec.appendChild(K.empty(rg.label + "のロス記録はありません", "在庫タブの「ロス」で廃棄を記録すると、金額の多い品目と理由の内訳がここに出ます。"));
      return sec;
    }
    const body = h("tbody");
    const max = list[0].amount || 1;
    list.slice(0, 10).forEach((x, i) => {
      const rs = Object.keys(x.reasons).sort((a, b) => x.reasons[b] - x.reasons[a]);
      body.appendChild(h("tr", {},
        h("td", { class: "num", text: String(i + 1) }),
        h("td", {}, h("div", { text: x.name }), h("div", { class: "bar sal-rank-bar" }, h("i", { style: { width: Math.max(2, (x.amount / max) * 100) + "%" } }))),
        h("td", { class: "r num" }, K.fmt.yen(x.amount), h("div", { class: "sal-unit", text: K.fmt.pct(div(x.amount, total)) })),
        h("td", { class: "r num sal-hide-sm" }, K.fmt.num(x.qty, x.qty % 1 ? 1 : 0), h("span", { class: "sal-unit", text: x.unit })),
        h("td", {}, h("div", { class: "sal-chips" }, rs.map((r) => h("span", { class: "chip" }, r + " ", h("span", { class: "num", text: K.fmt.yen(x.reasons[r]) })))))));
    });
    sec.appendChild(h("div", { class: "tblwrap" }, h("table", { class: "tbl sal-tbl sal-waste" },
      h("thead", {}, h("tr", {}, h("th", { text: "#" }), h("th", { text: "品目" }), h("th", { class: "r", text: "金額" }), h("th", { class: "r sal-hide-sm", text: "数量" }), h("th", { text: "理由の内訳" }))),
      body)));
    sec.appendChild(h("button", { class: "btn ghost sm", type: "button", style: { alignSelf: "flex-start" }, onClick: () => K.go("inventory", "waste") }, "ロスを記録・確認する", K.icon("chev")));
    return sec;
  }

  /* 改善ヒント（ルールベース） */
  function buildHints(st) {
    const set = K.settings();
    const hints = [];
    const recipes = K.list("recipes");
    // 1. 原価率
    const useActual = st.foodActual && st.foodRate != null;
    const rate = useActual ? st.foodRate : st.theoRate;
    const rateLabel = useActual ? "原価率" : "理論原価率";
    if (rate != null && rate > set.targetFoodCost) {
      const pool = (st.ranking.length ? st.ranking.map((x) => Object.assign({}, x, { r: K.getDoc("recipes", x.id) })) : recipes.map((r) => ({ name: r.name, costRate: r.costRate, r })))
        .filter((x) => x.costRate != null).sort((a, b) => b.costRate - a.costRate).slice(0, 3);
      hints.push({
        key: "food_over", kind: "bad", area: "原価",
        title: rateLabel + "が目標を " + ((rate - set.targetFoodCost) * 100).toFixed(1) + "pt 上回っています（" + K.fmt.pct(rate) + "）",
        detail: pool.length ? "原価率の高いメニュー：" + pool.map((x) => x.name + " " + K.fmt.pct(x.costRate)).join("、") + "。盛り付け量・売価・仕入先を見直す候補です。" : "レシピに原価を登録すると、原価率の高いメニューを挙げられます。",
        effect: "原価率 " + K.fmt.pct(set.targetFoodCost) + " 以内",
      });
    } else if (useActual && st.theoRate != null && st.foodRate - st.theoRate > 0.05) {
      hints.push({
        key: "food_gap", kind: "warn", area: "在庫",
        title: "実際の原価率が理論値より " + ((st.foodRate - st.theoRate) * 100).toFixed(1) + "pt 高いです",
        detail: "実際 " + K.fmt.pct(st.foodRate) + " / 理論 " + K.fmt.pct(st.theoRate) + "。廃棄・まかない・計量のブレ・出数の入力漏れを確認しましょう。",
        effect: "ロス削減",
      });
    }
    // 2. 人件費率
    if (st.laborRate != null && st.laborRate > set.targetLabor) {
      const dows = dowStats().filter((d) => d.avg != null);
      const low = dows.slice().sort((a, b) => a.avg - b.avg)[0];
      hints.push({
        key: "labor_over", kind: "bad", area: "オペレーション",
        title: "人件費率が目標を " + ((st.laborRate - set.targetLabor) * 100).toFixed(1) + "pt 上回っています（" + K.fmt.pct(st.laborRate) + "）",
        detail: low ? "売上が最も低いのは" + low.dow + "曜（平均 " + K.fmt.yen(low.avg) + "）で、平均シフトは " + K.fmt.num(low.hoursAvg, 1) + " 時間/日。この曜日のシフト時間を見直す候補です。" : "曜日別の売上がたまると、シフトを減らす候補の曜日を示せます。",
        effect: "人件費率 " + K.fmt.pct(set.targetLabor) + " 以内",
      });
    }
    // 3. 仕入先別発注金額
    const bySup = {};
    K.list("orders").forEach((o) => {
      if (o.status === "draft") return;
      const d = o.status === "received" ? recvDate(o) : o.date;
      if (!inRange(d, st.from, st.to)) return;
      bySup[o.supplierId || "?"] = (bySup[o.supplierId || "?"] || 0) + n0(o.total);
    });
    const sups = Object.keys(bySup).map((id) => ({ id, total: bySup[id], name: (K.getDoc("suppliers", id) || {}).name || "仕入先未設定" })).sort((a, b) => b.total - a.total);
    if (sups.length && sups[0].total > 0) {
      const sum = sups.reduce((a, b) => a + b.total, 0);
      hints.push({
        key: "supplier_top", kind: "info", area: "原価",
        title: "発注金額の多い仕入先：" + sups[0].name + "（" + K.fmt.pct(div(sups[0].total, sum)) + "）",
        detail: "上位：" + sups.slice(0, 3).map((x) => x.name + " " + K.fmt.yen(x.total)).join("、") + "。上位の仕入先から相見積もりや単価交渉をすると効果が大きいです。",
        effect: "仕入単価の引き下げ",
      });
    }
    // 3b. ロスの多い品目（期間内の waste）
    const wr = wasteRank(st.from, st.to);
    if (wr.length && wr[0].amount > 0) {
      const top = wr[0];
      const rTop = Object.keys(top.reasons).sort((a, b) => top.reasons[b] - top.reasons[a])[0];
      const wTotal = wr.reduce((a, x) => a + x.amount, 0);
      const tip = rTop === "期限切れ" ? "発注量・発注頻度を減らすか、先入れ先出しを徹底しましょう。" : rTop === "仕込み過多" ? "仕込み量を予測客数に合わせて減らしましょう。" : rTop === "調理ミス" ? "手順の見直しと声かけで防ぎましょう。" : rTop === "品質不良" ? "検品・保管方法を見直しましょう。" : "原因を記録して対策を決めましょう。";
      hints.push({
        key: "waste_top", kind: "warn", area: rTop === "仕込み過多" ? "仕込み" : "在庫",
        title: "ロスが最も多い品目：" + top.name + "（" + K.fmt.yen(top.amount) + "）",
        detail: "期間のロス合計 " + K.fmt.yen(wTotal) + "。" + top.name + " の主な理由は「" + rTop + "」です。" + tip + (wr[1] ? " 次点：" + wr.slice(1, 3).map((x) => x.name + " " + K.fmt.yen(x.amount)).join("、") + "。" : ""),
        effect: "ロス " + K.fmt.yen(Math.round(top.amount * 0.5)) + " 程度の削減（半減）",
      });
    }
    // 4. 出数ゼロのメニュー
    if (st.hasItems && recipes.length) {
      const sold = new Set(st.ranking.map((x) => x.id));
      const zero = recipes.filter((r) => !sold.has(r.id));
      if (zero.length) hints.push({
        key: "zero_menu", kind: "warn", area: "仕込み",
        title: "期間中に出数ゼロのメニューが " + zero.length + "品あります",
        detail: zero.slice(0, 5).map((r) => r.name).join("、") + (zero.length > 5 ? " ほか" : "") + "。仕込みロスにつながるため、メニュー整理や仕込み量の見直しを検討しましょう。",
        effect: "仕込みロス削減",
      });
    }
    // 5. 在庫金額 ÷ 1日あたり売上
    const stockVal = K.list("items").reduce((a, it) => a + Math.max(0, n0(it.stock)) * n0(it.cost), 0);
    const daily = div(st.total, st.days);
    if (stockVal > 0 && daily) {
      const dd = stockVal / daily;
      hints.push({
        key: "stock_days", kind: dd > 7 ? "warn" : "info", area: "在庫",
        title: "在庫金額 " + K.fmt.yen(stockVal) + " は売上の約 " + K.fmt.num(dd, 1) + " 日分です",
        detail: dd > 7 ? "在庫が多めです。動きの遅い品目の発注量を減らすと、資金と冷蔵庫のスペースが空きます。" : "在庫量は売上に対して適正な範囲です。この水準を保ちましょう。",
        effect: dd > 7 ? "在庫 " + K.fmt.yen(daily * 5) + " 程度（約5日分）" : "",
      });
    }
    // 補助：客数未入力
    if (hints.length < 3 && st.days && !st.covers) hints.push({
      key: "no_covers", kind: "info", area: "その他", title: "客数が入力されていません",
      detail: "日報に客数を入れると客単価が出せ、客単価アップの施策（おすすめ・追加注文）の効果が測れます。", effect: "客単価の把握",
    });
    if (hints.length < 3 && st.days && !st.hasItems) hints.push({
      key: "no_items", kind: "info", area: "原価", title: "メニュー別の出数が入力されていません",
      detail: "日報で出数を入れると、理論原価率・人気メニュー・出数ゼロのメニューが分かります。", effect: "メニュー分析",
    });
    return hints.slice(0, 5);
  }

  function renderAnalysis(el) {
    el.textContent = "";
    const set = K.settings();
    const today = K.today();
    const ranges = {
      week: { from: K.weekStart(today), to: today, label: "今週" },
      month: { from: monthStart(today), to: today, label: "今月" },
      prev: (() => { const end = K.addDays(monthStart(today), -1); return { from: monthStart(end), to: end, label: "先月" }; })(),
    };
    const seg = h("div", { class: "seg", role: "tablist", "aria-label": "期間" },
      ["week", "month", "prev"].map((p) => h("button", {
        class: "seg-btn", role: "tab", text: ranges[p].label, attrs: { "aria-selected": String(p === period) },
        onClick: () => { period = p; try { localStorage.setItem("kitchen-ledger-sal-period", p); } catch (e) {} renderAnalysis(el); },
      })));
    const rg = ranges[period];
    el.appendChild(h("div", { class: "sal-pane-head" }, h("h2", { class: "sec-title", text: "分析" }),
      h("span", { class: "sal-meta num", text: K.fmt.date(rg.from) + " 〜 " + K.fmt.date(rg.to) }), seg));

    const st = stats(rg.from, rg.to);
    const pl = rg.label;
    const flTarget = set.targetFoodCost + set.targetLabor;
    el.appendChild(h("div", { class: "sal-kpis wide" },
      kpi(pl + "の売上", st.days ? K.fmt.yen(st.total) : null, st.days ? st.days + "日分・1日平均 " + K.fmt.yen(st.total / st.days) : "売上を入力すると表示"),
      kpi(pl + "の平均客単価", st.avgTicket == null ? null : K.fmt.yen(st.avgTicket), st.avgTicket == null ? "客数を入力すると表示" : "客数 " + K.fmt.num(st.covers) + "人"),
      costKpi(pl, st.fc, st.days, set.targetFoodCost),
      kpi(pl + "の人件費率", K.fmt.pct(st.laborRate),
        st.laborRate != null ? laborNote(st) + "・" + K.fmt.yen(st.labor.cost) + "（" + K.fmt.num(st.labor.hours, 1) + "h）・目標 " + K.fmt.pct(set.targetLabor) : !st.days ? "売上を入力すると表示" : "シフトと時給を入力すると表示",
        rateChip(st.laborRate, set.targetLabor)),
      h("div", { class: "kpi sal-kpi-extra", title: "出数×レシピ原価" }, ...kpi("理論原価率（" + pl + "）", K.fmt.pct(st.theoRate),
        st.theoRate != null ? "出数入力 " + st.itemDays + "日分の売上で計算・出数×レシピ原価 " + K.fmt.yen(st.theo) + "・目標 " + K.fmt.pct(set.targetFoodCost) : "メニュー別の出数を入力すると表示",
        rateChip(st.theoRate, set.targetFoodCost)).childNodes),
      h("div", { class: "kpi sal-kpi-extra", title: "棚卸しで区切った実際原価率＋人件費率" }, ...kpi(pl + "のFL比率", K.fmt.pct(st.fl),
        st.fl != null ? "実際原価率＋人件費率（" + st.labor.days + "日分）・目標 " + K.fmt.pct(flTarget) : "実際原価率と人件費率がそろうと表示",
        rateChip(st.fl, flTarget)).childNodes)));
    /* スマホ：理論原価率・FL比率は小さな集計帯 */
    const cell = (lbl, r, target, sub) => h("div", { class: "cell" },
      h("span", { class: "lbl", text: lbl }),
      h("span", { class: "val num" + (r == null ? "" : r > target ? " bad" : " ok"), text: K.fmt.pct(r) }),
      h("span", { class: "sub", text: sub }));
    el.appendChild(h("div", { class: "sumbar sal-only-sm" },
      cell("理論原価率（" + pl + "）", st.theoRate, set.targetFoodCost, st.theoRate != null ? "出数入力 " + st.itemDays + "日分" : "出数の入力で表示"),
      cell(pl + "のFL比率", st.fl, flTarget, st.fl != null ? "目標 " + K.fmt.pct(flTarget) : "実際原価率で表示")));
    const stale = staleRecipes();
    if (stale.length) el.appendChild(h("div", { class: "card is-flag sal-stale" },
      h("span", { class: "sal-ico warn" }, K.icon("alert")),
      h("span", { class: "sal-li-main" },
        h("span", { class: "sal-li-title", text: "原価が古いレシピ " + stale.length + "件" }),
        h("span", { class: "sal-li-sub", text: "食材の単価が変わっています（" + stale.slice(0, 3).map((r) => r.name).join("・") + (stale.length > 3 ? " ほか" : "") + "）。理論原価率は更新前の原価で計算しています。" })),
      h("button", { class: "btn sm", onClick: () => K.go("recipe") }, "レシピ画面で更新")));
    if (st.labor.missingWage) el.appendChild(h("p", { class: "muted small", style: { margin: 0 }, text: "※時給が未設定のスタッフが " + st.labor.missingWage + "名います。人件費率は低めに出ています。" }));

    /* 改善ヒント */
    const hints = buildHints(st);
    const existing = new Set(K.list("kaizen").filter((k) => k.hintKey && k.status !== "完了").map((k) => k.hintKey));
    const hintSec = h("section", { class: "sal-sec" }, secHead("改善ヒント", h("span", { class: "sal-meta", text: "記録から自動で作成" })));
    if (!hints.length) {
      hintSec.appendChild(K.empty("まだヒントを出せるデータがありません", "売上・発注（納品済み）・シフト・レシピ原価・在庫がそろうほど、原価や人件費の改善ヒントが具体的になります。"));
    } else {
      hintSec.appendChild(h("div", { class: "sal-hints" }, hints.map((hn) => {
        const added = existing.has(hn.key);
        const btn = h("button", {
          class: "btn sm" + (added ? " ghost" : ""), disabled: added || ro(), attrs: writeAttrs,
          onClick: async () => {
            btn.disabled = true;
            try {
              await W.add("kaizen", { title: hn.title, detail: hn.detail, area: hn.area, status: "提案", staffId: K.currentStaffId(), createdAt: new Date().toISOString(), effect: hn.effect || "", hintKey: hn.key });
              K.toast("改善ボードに追加しました", "ok");
            } catch (e) { btn.disabled = false; }
          },
        }, K.icon(added ? "check" : "plus"), added ? "追加済み" : "改善ボードに追加");
        return h("div", { class: "card sal-hint " + hn.kind },
          h("div", { class: "sal-hint-title" }, K.icon(hn.kind === "info" ? "bulb" : "alert"), h("span", { text: hn.title })),
          h("p", { class: "sal-hint-detail", text: hn.detail }),
          h("div", { class: "sal-hint-foot" }, h("span", { class: "chip", text: hn.area }), btn));
      })));
    }

    /* 日別売上 */
    el.appendChild(h("section", { class: "sal-sec" }, secHead("日別売上",
      h("span", { class: "sal-legend" }, h("span", {}, h("i"), "売上"), h("span", {}, h("i", { class: "lo" }), "平均の7割未満"), h("span", {}, h("i", { class: "avg" }), "平均"))),
      h("div", { class: "card" }, barChart(st))));
    el.appendChild(hintSec);

    /* 曜日別 */
    const dows = dowStats();
    const dmax = Math.max.apply(null, dows.map((d) => d.avg || 0));
    const dowSec = h("section", { class: "sal-sec" }, secHead("曜日別の平均売上", h("span", { class: "sal-meta", text: "直近8週" })));
    if (!(dmax > 0)) dowSec.appendChild(K.empty("曜日別の傾向はまだ出せません", "日報で売上を入力すると、曜日ごとの平均売上が出ます。"));
    else dowSec.appendChild(h("div", { class: "card sal-dow" }, dows.map((d) =>
      h("div", { class: "sal-dow-row" },
        h("span", { style: { fontWeight: 700, color: d.dow === "土" || d.dow === "日" ? "var(--accent)" : "var(--ink-2)" }, text: d.dow }),
        h("div", { class: "bar", attrs: { "aria-hidden": "true" } }, h("i", { style: { width: d.avg ? Math.max(2, (d.avg / dmax) * 100) + "%" : "0%" } })),
        h("span", { class: "sal-dow-val num" }, d.avg == null ? "—" : K.fmt.yen(d.avg), d.avg == null ? null : h("span", { class: "sal-unit", text: "（" + d.n + "回）" }))))));

    /* メニュー別ランキング */
    const rankSec = h("section", { class: "sal-sec" }, secHead("メニュー別ランキング"));
    if (!st.ranking.length) {
      rankSec.appendChild(K.empty("メニュー別の出数がありません", "日報の「メニュー別の出数」に数量を入れると、人気順と売上への寄与、原価率が出ます。"));
    } else {
      const totQ = st.ranking.reduce((a, b) => a + b.qty, 0);
      const body = h("tbody");
      st.ranking.slice(0, 15).forEach((m, i) => {
        const cr = m.costRate;
        const cls = cr == null ? "" : cr <= set.targetFoodCost ? "ok" : cr <= set.targetFoodCost + 0.1 ? "warn" : "bad";
        body.appendChild(h("tr", {},
          h("td", { class: "num", text: String(i + 1) }),
          h("td", {}, h("div", { text: m.name }), h("div", { class: "bar sal-rank-bar" }, h("i", { style: { width: Math.max(2, (m.qty / st.ranking[0].qty) * 100) + "%" } }))),
          h("td", { class: "r num", text: K.fmt.num(m.qty) }),
          h("td", { class: "r num" }, h("div", { text: K.fmt.yen(m.revenue) }), h("div", { class: "muted small", text: K.fmt.pct(div(m.revenue, st.total)) })),
          h("td", { class: "r" }, h("span", { class: "chip " + cls, text: K.fmt.pct(cr) }))));
      });
      rankSec.appendChild(h("div", { class: "tblwrap" }, h("table", { class: "tbl" },
        h("thead", {}, h("tr", {}, h("th", { text: "#" }), h("th", { text: "メニュー" }), h("th", { class: "r", text: "出数" }), h("th", { class: "r", text: "売上寄与" }), h("th", { class: "r", text: "原価率" }))),
        body)));
      rankSec.appendChild(h("p", { class: "sal-meta", style: { margin: 0 }, text: "出数合計 " + K.fmt.num(totQ) + "・売上寄与＝出数×売価（売上合計に対する割合）。原価率はレシピ画面の登録値。" }));
    }
    el.appendChild(h("div", { class: "sal-two" }, dowSec, rankSec));
    el.appendChild(wasteSection(el));
  }

  /* --- 改善ボード --- */
  function renderKaizen(el) {
    el.textContent = "";
    const all = K.list("kaizen").slice().sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    el.appendChild(h("div", { class: "sal-pane-head" },
      h("h2", { class: "sec-title", text: "改善ボード" }),
      h("span", { class: "sal-meta num", text: "全 " + all.length + "件" }),
      h("button", { class: "btn primary", disabled: ro(), attrs: writeAttrs, onClick: () => openKaizenSheet(null) }, K.icon("plus"), "提案を追加")));
    if (!all.length) {
      el.appendChild(K.empty("改善提案はまだありません", "「提案を追加」で現場の困りごとや改善アイデアを書くか、「分析」の改善ヒントから追加すると、提案→検討中→実施中→完了で進捗を管理できます。", "提案を追加", () => openKaizenSheet(null)));
      return;
    }
    const move = async (k, dir) => {
      const i = STATUSES.indexOf(k.status);
      const ni = Math.min(STATUSES.length - 1, Math.max(0, (i < 0 ? 0 : i) + dir));
      const prevStatus = k.status || "提案";
      if (STATUSES[ni] === prevStatus) return;
      await W.patch("kaizen", k.id, { status: STATUSES[ni] });
      K.toast("「" + STATUSES[ni] + "」に移動しました", "ok", { action: { label: "元に戻す", onClick: async () => {
        if (!K.getDoc("kaizen", k.id)) return;
        await W.patch("kaizen", k.id, { status: prevStatus });
        K.toast("「" + prevStatus + "」に戻しました", "ok");
      } } });
    };
    const board = h("div", { class: "sal-board" });
    STATUSES.forEach((stName, si) => {
      const list = all.filter((k) => (STATUSES.includes(k.status) ? k.status : "提案") === stName);
      const col = h("section", { class: "sal-col", "aria-label": stName + " " + list.length + "件" },
        h("div", { class: "sal-col-head" }, K.icon(["bulb", "clip", "knife", "check"][si]), h("span", { text: stName }),
          h("span", { class: "sal-count" + (list.length ? " on" : ""), text: String(list.length) })));
      if (!list.length) col.appendChild(h("div", { class: "sal-col-empty", text: si === 0 ? "新しい提案はここに入ります" : "まだありません" }));
      list.forEach((k) => {
        const created = localIso(k.createdAt);
        col.appendChild(h("article", { class: "sal-kc" },
          h("div", { class: "sal-kc-top" }, h("span", { class: "chip", text: k.area || "その他" }),
            h("button", { class: "icon-btn", type: "button", title: "編集・削除", disabled: ro(), attrs: Object.assign({ "aria-label": "「" + (k.title || "無題") + "」を編集・削除" }, writeAttrs), onClick: () => openKaizenSheet(k) }, K.icon("edit"))),
          h("div", { class: "sal-kc-title", text: k.title || "（無題）" }),
          k.detail ? h("p", { class: "sal-kc-detail", text: k.detail }) : null,
          k.effect ? h("div", { class: "sal-kc-effect" }, h("span", { class: "muted", text: "期待効果：" }), k.effect) : null,
          h("div", { class: "sal-kc-meta", text: "提案：" + nm(k.staffId) + (created ? "・" + K.fmt.date(created) : "") }),
          h("div", { class: "sal-kc-acts" },
            si > 0 ? h("button", { class: "btn sm icon-only", title: STATUSES[si - 1] + "に戻す", disabled: ro(), attrs: Object.assign({ "aria-label": STATUSES[si - 1] + "に戻す" }, writeAttrs), onClick: () => move(k, -1) }, h("span", { class: "sal-flip" }, K.icon("chev"))) : null,
            si < STATUSES.length - 1 ? h("button", { class: "btn sm sal-fwd", disabled: ro(), attrs: Object.assign({ "aria-label": STATUSES[si + 1] + "に進める" }, writeAttrs), onClick: () => move(k, 1) }, K.icon(si === 2 ? "check" : "chev"), STATUSES[si + 1] + "へ") : null,
          )));
      });
      board.appendChild(col);
    });
    el.appendChild(board);
  }

  K.register({
    key: "sales", label: "売上・改善", icon: "chart", order: 5,
    mount(root) {
      root.appendChild(h("h1", { class: "page-title", text: "売上・改善" }));
      const renderers = { daily: renderDaily, analysis: renderAnalysis, kaizen: renderKaizen };
      const draw = scheduler(() => Object.keys(panes).forEach((id) => renderers[id](panes[id])));
      K.subtabs(root, "sales", [
        { id: "daily", label: "日報", render: (el) => { panes.daily = el; renderDaily(el); } },
        { id: "analysis", label: "分析", render: (el) => { panes.analysis = el; renderAnalysis(el); } },
        { id: "kaizen", label: "改善ボード", render: (el) => { panes.kaizen = el; renderKaizen(el); } },
      ]);
      ["sales", "kaizen", "recipes", "orders", "suppliers", "items", "shifts", "staff", "settings", "events", "counts", "waste"].forEach((c) => { try { K.watch(c, draw); } catch (e) {} });
      if (hasMy() && typeof K.my.watch === "function") K.my.watch("events", draw);
      K.on("day", draw);
      K.on("readonly", draw);
    },
  });
  /* =========================================================
     v3.0：売上予測（sales.forecast）・今日モードの欄
     ========================================================= */
  /* 予約（全員共有の events の covers 合計）を優先、なければ過去8週の同曜日平均。K.list の同期キャッシュだけで計算 */
  function salesForecast(args) {
    const d = (args && args.date) || K.today();
    const RES = ["予約", "団体・貸切"];
    const resCovers = K.list("events").filter((e) => RES.includes(e.kind) && e.date && e.date <= d && d <= (e.endDate && e.endDate >= e.date ? e.endDate : e.date))
      .reduce((a, e) => a + Math.max(0, n0(e.covers)), 0);
    const hist = [];
    for (let k = 1; k <= 8; k++) { const r = salesRec(K.addDays(d, -7 * k)); if (r) hist.push(r); }
    const cvDays = hist.filter((r) => n0(r.covers) > 0);
    const avgCovers = cvDays.length ? cvDays.reduce((a, r) => a + n0(r.covers), 0) / cvDays.length : 0;
    /* v3.1：予約は来店客の一部。covers = max(同曜日平均, 予約合計) */
    let covers = 0, basis = "なし";
    const avgR = Math.round(avgCovers);
    if (avgCovers > 0 && resCovers > avgR) { covers = resCovers; basis = "曜日平均＋予約"; }
    else if (avgCovers > 0) { covers = avgR; basis = "曜日平均"; }
    else if (resCovers > 0) { covers = resCovers; basis = "予約"; }
    const byRecipe = {};
    const itemDays = hist.filter((r) => (r.items || []).some((it) => it && it.recipeId && n0(it.qty) > 0));
    if (covers > 0 && itemDays.length && avgCovers > 0) {
      const sum = {};
      itemDays.forEach((r) => (r.items || []).forEach((it) => { if (it && it.recipeId && n0(it.qty) > 0) sum[it.recipeId] = (sum[it.recipeId] || 0) + n0(it.qty); }));
      const ratio = covers / avgCovers;
      Object.keys(sum).forEach((id) => { const v = Math.round((sum[id] / itemDays.length) * ratio); if (v > 0) byRecipe[id] = v; });
    }
    return { date: d, covers, reserved: resCovers, basis, byRecipe };
  }
  /* キャッシュを温めておく（読み込み時に購読） */
  ["sales", "events"].forEach((c) => { try { K.watch(c, () => {}); } catch (e) {} });
  if (typeof K.answer === "function") K.answer("sales.forecast", salesForecast);

  /* 予測の説明（「うち予約12名」など） */
  function fcNote(fc) {
    if (!fc || fc.basis === "なし") return "売上・予約の記録で表示";
    const res = fc.reserved ? "うち予約 " + fc.reserved + "名" : "予約なし";
    if (fc.basis === "予約") return "予約の人数から（曜日平均のデータなし）";
    if (fc.basis === "曜日平均＋予約") return res + "・予約が同曜日平均を上回るため予約数";
    return "過去8週の同じ曜日の平均・" + res;
  }
  /* 今日の売上の目安：予測客数 × 過去8週同曜日の平均客単価 */
  function todayTarget(d) {
    const fc = salesForecast({ date: d });
    let s = 0, c = 0;
    for (let k = 1; k <= 8; k++) { const r = salesRec(K.addDays(d, -7 * k)); const t = saleTotal(r); if (r && t != null && n0(r.covers) > 0) { s += t; c += n0(r.covers); } }
    const ticket = c ? s / c : null;
    return { fc, ticket, target: fc.covers && ticket ? Math.round(fc.covers * ticket) : null };
  }

  if (typeof K.todaySection === "function") {
    K.todaySection({
      key: "today-plan", title: "予定と要対応", icon: "calendar", order: 40,
      mount(el, ctx) {
        const close = (ctx && ctx.close) || (() => {});
        const go = (fn) => () => { try { close(); } catch (e) {} fn(); };
        const draw = scheduler(() => {
          el.textContent = "";
          const d = K.today();
          const tg = todayTarget(d);
          const rec = salesRec(d);
          const t = saleTotal(rec);
          /* 数字：予測客数・売上の目安・今日の売上 */
          el.appendChild(h("div", { class: "sumbar sal-td-sum" },
            h("div", { class: "cell" }, h("span", { class: "lbl", text: "今日の予測客数" }),
              h("span", { class: "val num" }, tg.fc.covers ? String(tg.fc.covers) : "—", tg.fc.covers ? h("small", { text: "名" }) : null),
              h("span", { class: "sub", text: fcNote(tg.fc) })),
            h("div", { class: "cell" }, h("span", { class: "lbl", text: "今日の売上の目安" }),
              h("span", { class: "val num", text: tg.target != null ? K.fmt.yen(tg.target) : "—" }),
              h("span", { class: "sub", text: tg.target != null ? "予測客数×客単価 " + K.fmt.yen(tg.ticket) : "客数の記録で表示" })),
            h("div", { class: "cell" }, h("span", { class: "lbl", text: "今日の売上" }),
              h("span", { class: "val num" + (t != null && tg.target ? (t >= tg.target ? " ok" : "") : ""), text: t != null ? K.fmt.yen(t) : "未入力" }),
              h("span", { class: "sub", text: t != null && tg.target ? "目安の " + K.fmt.pct(t / tg.target) : "営業後に入力" }))));
          /* 今日の予定 */
          const ev = eventsByDay(d, d)(d);
          el.appendChild(h("div", { class: "sal-td-h" }, K.icon("calendar"), "今日の予定", h("span", { class: "sal-meta num", text: ev.length ? ev.length + "件" : "" })));
          el.appendChild(ev.length ? h("div", { class: "list" }, ev.map((e) => h("div", { class: "li" },
            h("span", { class: "sal-time sal-evtime num", text: evTime(e) }),
            h("span", { class: "sal-li-main" }, h("span", { class: "sal-li-title" }, e._mine ? h("span", { class: "sal-mine" }, K.icon("pin")) : null, e.title || "（無題）"),
              h("span", { class: "sal-li-sub", text: [e.kind, e.covers ? e.covers + "名" : null].filter(Boolean).join("・") })))))
            : h("p", { class: "sal-meta", style: { margin: 0 }, text: "今日の予定はありません" }));
          /* 要対応（上位4件） */
          const al = alertDefs();
          el.appendChild(h("div", { class: "sal-td-h" }, K.icon("alert"), "要対応", al.length ? h("span", { class: "chip bad num", text: al.length + "件" }) : null));
          el.appendChild(al.length ? h("div", { class: "list" }, al.slice(0, 4).map((x) => alertRow(x.kind, x.icon, x.title, x.sub, go(x.go))),
            al.length > 4 ? h("button", { class: "li", type: "button", onClick: go(() => K.go("home")) }, h("span", { class: "sal-li-main" }, h("span", { class: "sal-li-sub", text: "ほか " + (al.length - 4) + "件をホームで見る" })), h("span", { class: "sal-chev" }, K.icon("chev"))) : null)
            : h("div", { class: "sal-allclear" }, h("span", { class: "sal-ico" }, K.icon("check")), "対応が必要なことはありません"));
        });
        const offs = [];
        ["sales", "events", "notes", "items", "orders", "counts", "hygiene", "prep", "staff"].forEach((c) => { try { offs.push(K.watch(c, draw)); } catch (e) {} });
        if (hasMy() && typeof K.my.watch === "function") offs.push(K.my.watch("events", draw));
        ["answers", "memos", "day", "staff"].forEach((ev) => { const off = K.on(ev, draw); if (typeof off === "function") offs.push(off); });
        draw();
        return () => offs.forEach((f) => { try { f(); } catch (e) {} });
      },
    });
  }
})();
