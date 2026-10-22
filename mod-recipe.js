/* BRIGADE（旧称：厨房帳） mod-recipe.js — 担当B：レシピ・原価。書き込みは recipes のみ。items は読むだけ。 */
(function () {
  "use strict";
  const K = window.K;
  const W = K.scope("recipe");
  const h = K.h;

  const CATS = ["前菜", "主菜", "ご飯・麺", "汁物", "デザート", "ドリンク", "仕込み", "その他"];
  const ALLERGENS = ["卵", "乳", "小麦", "えび", "かに", "そば", "落花生", "くるみ"];
  const MY_CATS = ["賄い", "試作", "自分の料理", "家庭料理", "勉強・メモ"];

  /* ---------- 保存先（店のレシピ＝recipes ／ マイレシピ＝K.my "recipes"）。画面は共通で保存先だけ切り替える ---------- */
  let shopLoaded = false;
  const SHOP = {
    key: "shop", label: "店のレシピ", short: "店", cats: CATS,
    list: () => K.list("recipes"), get: (id) => K.getDoc("recipes", id),
    add: (d) => W.add("recipes", d), put: (id, d) => W.put("recipes", id, d), patch: (id, d) => W.patch("recipes", id, d), del: (id) => W.del("recipes", id),
    ro: () => K.readOnly(),
  };
  const MINE = {
    key: "mine", label: "マイレシピ", short: "マイ", cats: MY_CATS.concat(CATS),
    list: () => K.my.list("recipes"), get: (id) => K.my.get("recipes", id),
    add: (d) => K.my.add("recipes", d), put: (id, d) => K.my.put("recipes", id, d), patch: (id, d) => K.my.patch("recipes", id, d), del: (id) => K.my.del("recipes", id),
    ro: () => false,
  };
  const isFavShop = (id) => !!K.my.get("recipeFav", id);
  const myNoteOf = (id) => K.my.get("recipeNotes", id);
  const parseTags = (v) => Array.from(new Set(String(v || "").split(/[\s、,，]+/).map((x) => x.replace(/^[#＃]+/, "").trim()).filter(Boolean))).slice(0, 20);
  const fmtDay = (iso) => { if (!iso) return ""; const dt = new Date(iso); return isNaN(dt) ? "" : (dt.getMonth() + 1) + "/" + dt.getDate(); };

  /* v2 デザイン規約：白固定・トークンのみ・独自の濃い影なし。クラスは rcp- 接頭辞 */
  K.css("rcp", `
.rcp-head { display: flex; align-items: center; gap: 12px; min-width: 0; }
.rcp-head .sec-title { flex: 1 1 auto; min-width: 0; }

/* 集計帯（共通 .sumbar）：定義を書いたラベルは折り返して全文表示 */
.rcp-sumbar .lbl { white-space: normal; line-height: 1.35; }
.rcp-narrow { display: none; }
@media (max-width: 559px) { .rcp-wide { display: none; } .rcp-narrow { display: inline; } }

/* 注意の帯 */
.rcp-band { display: flex; gap: 10px; align-items: center; padding: 8px 8px 8px 14px; border-radius: var(--r-sm); background: var(--warn-soft); color: var(--warn); border: 1px solid var(--warn-soft); font-weight: 700; font-size: 14px; min-width: 0; }
.rcp-band .ico { flex: none; width: 18px; height: 18px; }
.rcp-band-t { flex: 1 1 auto; min-width: 0; }
.rcp-band .btn { flex: none; }

/* 絞り込み */
.rcp-filters { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.rcp-tools { display: flex; gap: 8px; align-items: center; min-width: 0; }
.rcp-tools .rcp-search { flex: 1 1 auto; min-width: 0; }
.rcp-tools .seg { flex: none; }
.rcp-tools .seg-btn { min-height: 38px; padding: 0 10px; font-size: 13px; }
.rcp-count { font-size: 13px; color: var(--muted); }

/* 一覧：スマホ＝カード1列 / PC＝表 */
.rcp-cards { display: grid; grid-template-columns: minmax(0,1fr); gap: 10px; }
@media (min-width: 560px) { .rcp-cards { grid-template-columns: repeat(2, minmax(0,1fr)); } }
.rcp-tbl-wrap { display: none; }
@media (min-width: 900px) { .rcp-cards { display: none; } .rcp-tbl-wrap { display: block; } }
.rcp-card { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 6px 12px; align-items: start; width: 100%; text-align: left; background: var(--surface); border: 1px solid var(--line); border-radius: var(--r); box-shadow: var(--shadow-sm); padding: 12px 14px; cursor: pointer; color: var(--ink); min-height: 44px; }
.rcp-card:hover { border-color: var(--line-strong); background: var(--surface); }
.rcp-card-name { font-weight: 700; font-size: 16px; line-height: 1.4; overflow-wrap: anywhere; }
.rcp-card-meta { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-top: 4px; }
.rcp-card-money { grid-column: 1 / -1; font-size: 13px; color: var(--muted); display: flex; gap: 12px; flex-wrap: wrap; }
.rcp-card-money b { color: var(--ink); font-weight: 600; font-size: 14px; }
.rcp-rate { text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.rcp-rate-v { font-size: 22px; font-weight: 600; line-height: 1.1; }
.rcp-rate-v.ok { color: var(--ok); } .rcp-rate-v.warn { color: var(--warn); } .rcp-rate-v.bad { color: var(--bad); } .rcp-rate-v.none { color: var(--muted); font-size: 14px; }
.rcp-rate-l { font-size: 12px; color: var(--muted); font-weight: 700; }
.rcp-card .rcp-gauge { grid-column: 1 / -1; }
.rcp-gauge { position: relative; height: 4px; border-radius: 99px; background: var(--surface-3); }
.rcp-gauge > i { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 99px; background: var(--ok); }
.rcp-gauge > i.warn { background: var(--warn); } .rcp-gauge > i.bad { background: var(--bad); }
.rcp-gauge > b { position: absolute; top: -3px; bottom: -3px; width: 2px; margin-left: -1px; background: var(--ink-2); border-radius: 1px; }
.rcp-tbl td { font-size: 14px; }
.rcp-tbl .rcp-tname { font-weight: 700; color: var(--ink); }
.rcp-tbl .rcp-trate { display: flex; align-items: center; gap: 10px; justify-content: flex-end; }
.rcp-tbl .rcp-trate .rcp-gauge { width: 72px; flex: none; }
.rcp-tbl .rcp-trate .num { min-width: 3.6em; text-align: right; font-weight: 600; }
.rcp-tbl tr.click:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }

/* 詳細（厨房で見る用） */
.rcp-scale { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 10px 12px; border: 1px solid var(--line); border-radius: var(--r-sm); background: var(--surface-2); }
.rcp-scale .inp { width: 5.5em; text-align: right; font-size: 20px; font-weight: 600; padding: 4px 10px; }
.rcp-scale-l { font-weight: 700; color: var(--ink-2); font-size: 14px; }
.rcp-scale .rcp-quick { display: flex; gap: 4px; margin-left: auto; }
.rcp-scale-base { font-size: 12.5px; color: var(--muted); order: 5; flex-basis: 100%; }
@media (max-width: 559px) { .rcp-scale { gap: 6px; padding: 10px; } .rcp-scale .inp { width: 4.4em; } .rcp-scale-l { font-size: 13px; } }
.rcp-scale .rcp-quick .btn { min-width: 44px; min-height: 44px; padding: 0 8px; }
.rcp-tags { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.rcp-figs { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); border: 1px solid var(--line); border-radius: var(--r-sm); }
.rcp-fig { padding: 8px 12px; min-width: 0; }
.rcp-fig + .rcp-fig { border-left: 1px solid var(--line); }
.rcp-k { font-size: 12px; color: var(--muted); font-weight: 700; display: block; white-space: nowrap; }
.rcp-fig .num { font-size: 18px; font-weight: 600; }
.rcp-sec { display: flex; flex-direction: column; gap: 8px; }
.rcp-h { font-family: var(--f-display); font-weight: 700; font-size: 15px; color: var(--ink); margin: 0; display: flex; align-items: baseline; gap: 8px; }
.rcp-h small { font-family: var(--f-body); font-size: 12.5px; color: var(--muted); font-weight: 400; }
.rcp-itbl td { font-size: 16px; padding: 10px 12px; }
.rcp-itbl .rcp-qty { white-space: nowrap; text-align: right; }
.rcp-itbl .rcp-qty .num { font-size: 18px; font-weight: 600; }
.rcp-itbl .rcp-u { font-size: 12.5px; color: var(--muted); margin-left: 3px; }
.rcp-itbl tfoot td { font-weight: 700; background: var(--surface-2); border-top: 1px solid var(--line); font-size: 14px; }
.rcp-steps { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; }
.rcp-steps li { display: grid; grid-template-columns: 34px minmax(0,1fr); gap: 12px; font-size: 18px; line-height: 1.65; padding: 10px 0; }
.rcp-steps li + li { border-top: 1px solid var(--line); }
.rcp-step-no { width: 30px; height: 30px; border-radius: 50%; background: var(--accent-soft); color: var(--accent); display: grid; place-items: center; font-size: 15px; font-weight: 700; margin-top: 2px; }
.rcp-steps li span:last-child { overflow-wrap: anywhere; white-space: pre-wrap; }
.rcp-notes { white-space: pre-wrap; margin: 0; font-size: 16px; overflow-wrap: anywhere; padding: 10px 12px; background: var(--surface-2); border-radius: var(--r-sm); }

/* 編集：上部固定の白い帯 */
.rcp-live { position: sticky; top: -20px; z-index: 2; margin: -20px -20px 0; padding: 8px 20px; background: var(--surface); border-bottom: 1px solid var(--line); display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 8px; }
.rcp-live > div { min-width: 0; }
.rcp-live .num { font-size: 17px; font-weight: 600; }
.rcp-live .rcp-live-rate.ok { color: var(--ok); } .rcp-live .rcp-live-rate.warn { color: var(--warn); } .rcp-live .rcp-live-rate.bad { color: var(--bad); }
.rcp-form-h { font-family: var(--f-display); font-weight: 700; font-size: 15px; margin: 8px 0 0; padding-top: 12px; border-top: 1px solid var(--line); }

/* 材料行：材料名 | 分量＋単位 | 単価 | 行原価 | 削除（狭い幅は2段） */
.rcp-lines { container-type: inline-size; display: flex; flex-direction: column; gap: 8px; }
.rcp-lhead { display: none; }
.rcp-line { display: grid; gap: 6px 8px; grid-template-columns: minmax(0,1.6fr) minmax(0,1fr) auto 44px; grid-template-areas: "name name name name" "qty uc cost del" "msg msg msg msg"; padding: 10px; border: 1px solid var(--line); border-radius: var(--r-sm); background: var(--surface); align-items: end; }
.rcp-line.is-over { border-color: var(--warn); background: var(--warn-soft); }
.rcp-c-name { grid-area: name; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.rcp-c-qty { grid-area: qty; min-width: 0; }
.rcp-c-uc { grid-area: uc; min-width: 0; }
.rcp-c-cost { grid-area: cost; min-width: 4.2em; text-align: right; padding-bottom: 10px; }
.rcp-c-cost .num { font-weight: 600; font-size: 15px; white-space: nowrap; }
.rcp-c-del { grid-area: del; }
.rcp-c-msg { grid-area: msg; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.rcp-c-msg:empty { display: none; }
.rcp-lbl { font-size: 12px; font-weight: 700; color: var(--muted); display: block; margin-bottom: 3px; white-space: nowrap; }
.rcp-qtyrow { display: flex; min-width: 0; }
.rcp-qtyrow .inp { min-width: 0; }
.rcp-qtyrow .rcp-q { flex: 1 1 auto; padding-inline: 8px; border-top-right-radius: 0; border-bottom-right-radius: 0; text-align: right; }
.rcp-qtyrow .rcp-uin { flex: 0 0 3.6em; border-top-left-radius: 0; border-bottom-left-radius: 0; margin-left: -1px; padding: 8px 6px; text-align: center; }
.rcp-unit { flex: 0 0 auto; min-width: 2.8em; display: inline-flex; align-items: center; justify-content: center; padding: 0 8px; margin-left: -1px; border: 1px solid var(--line-strong); border-radius: 0 var(--r-sm) var(--r-sm) 0; background: var(--surface-2); color: var(--ink-2); font-weight: 700; font-size: 14px; }
.rcp-c-uc .inp { text-align: right; padding-inline: 8px; }
.rcp-ro { background: var(--surface-2); color: var(--ink-2); }
.rcp-err { color: var(--bad); font-size: 12.5px; font-weight: 700; }
.rcp-err:empty { display: none; }
.rcp-conv .btn { white-space: normal; text-align: left; min-height: 44px; justify-content: flex-start; }
.rcp-conv .btn .ico { color: var(--warn); }
@container (min-width: 480px) {
  .rcp-lhead { display: grid; grid-template-columns: minmax(0,1.7fr) minmax(0,1.1fr) minmax(0,.7fr) 4.6em 44px; gap: 8px; padding: 0 11px; font-size: 12px; font-weight: 700; color: var(--muted); }
  .rcp-lhead .r { text-align: right; }
  .rcp-line { grid-template-columns: minmax(0,1.7fr) minmax(0,1.1fr) minmax(0,.7fr) 4.6em 44px; grid-template-areas: "name qty uc cost del" "msg msg msg msg msg"; align-items: start; }
  .rcp-line .rcp-lbl { display: none; }
  .rcp-c-cost { padding-bottom: 0; padding-top: 10px; }
}
.rcp-step { display: grid; grid-template-columns: 30px minmax(0,1fr) auto; gap: 8px; align-items: start; }
.rcp-step .rcp-step-no { margin-top: 7px; }
.rcp-step textarea.inp { min-height: 64px; }
.rcp-step-ops { display: flex; gap: 4px; }
.rcp-step-ops .btn { width: 44px; min-height: 44px; padding: 0; }
.rcp-alg-chip .ico { width: 13px; height: 13px; }
@media (max-width: 559px) { .rcp-step { grid-template-columns: 30px minmax(0,1fr); } .rcp-step-ops { grid-column: 2; justify-content: flex-end; } }
.rcp-add { align-self: flex-start; }
.rcp-algs { display: flex; gap: 6px; flex-wrap: wrap; }
.rcp-alg { min-height: 44px; min-width: 56px; padding: 0 14px; border-radius: 99px; border: 1px solid var(--line-strong); background: var(--surface); font-weight: 700; font-size: 14px; cursor: pointer; color: var(--ink-2); }
.rcp-alg[aria-pressed="true"] { background: var(--accent-soft); border-color: var(--accent); color: var(--accent); }

/* 写真 */
.rcp-ph { display: block; width: 100%; height: 100%; object-fit: cover; background: var(--surface-2); }
.rcp-ph-fail { display: grid; place-items: center; width: 100%; height: 100%; background: var(--surface-2); color: var(--muted); font-size: 12px; text-align: center; padding: 4px; border: 1px solid var(--line); }
.rcp-ph-none { display: grid; place-items: center; width: 100%; height: 100%; background: var(--surface-2); color: var(--muted); }
.rcp-ph-none .ico { width: 22px; height: 22px; }
.rcp-card.has-thumb { grid-template-columns: 60px minmax(0,1fr) auto; }
.rcp-card.has-thumb .rcp-card-money, .rcp-card.has-thumb .rcp-gauge { grid-column: 1 / -1; }
.rcp-thumb { width: 60px; height: 60px; border-radius: var(--r-sm); overflow: hidden; flex: none; }
.rcp-tthumb { display: inline-block; width: 36px; height: 36px; border-radius: 6px; overflow: hidden; vertical-align: middle; margin-right: 10px; flex: none; }
.rcp-tname-wrap { display: flex; align-items: center; min-width: 0; }
.rcp-hero { display: block; width: 100%; padding: 0; border: 0; border-radius: var(--r); overflow: hidden; aspect-ratio: 4 / 3; max-height: 360px; cursor: zoom-in; background: var(--surface-2); }
.rcp-cap { font-size: 13px; color: var(--ink-2); margin: 0; }
.rcp-strip { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; }
.rcp-strip::-webkit-scrollbar { display: none; }
.rcp-strip button { flex: none; width: 72px; height: 72px; padding: 0; border: 1px solid var(--line); border-radius: var(--r-sm); overflow: hidden; cursor: zoom-in; background: var(--surface-2); }
.rcp-strip button[aria-current="true"] { border: 2px solid var(--accent); }
.rcp-lb { position: fixed; inset: 0; z-index: 90; background: var(--ink); color: #fff; display: flex; flex-direction: column; touch-action: pan-y; }
.rcp-lb-top { display: flex; align-items: center; gap: 8px; padding: max(8px, env(safe-area-inset-top, 0px)) 8px 8px 16px; }
.rcp-lb-count { flex: 1 1 auto; font-size: 14px; font-weight: 700; }
.rcp-lb .icon-btn { color: #fff; }
.rcp-lb .icon-btn:hover:not(:disabled) { background: var(--ink-2); color: #fff; }
.rcp-lb-stage { flex: 1 1 auto; min-height: 0; display: grid; grid-template-columns: 56px minmax(0,1fr) 56px; align-items: center; }
.rcp-lb-img { width: 100%; height: 100%; min-height: 0; display: grid; place-items: center; }
.rcp-lb-img img { max-width: 100%; max-height: 100%; object-fit: contain; }
.rcp-lb-nav { justify-self: center; }
.rcp-lb-nav .ico { width: 26px; height: 26px; }
.rcp-lb-prev .ico { transform: scaleX(-1); }
.rcp-lb-cap { padding: 10px 16px max(16px, env(safe-area-inset-bottom, 0px)); font-size: 15px; text-align: center; min-height: 48px; }
@media (max-width: 559px) { .rcp-lb-stage { grid-template-columns: 0 minmax(0,1fr) 0; } .rcp-lb-nav { display: none; } }

/* 詳細：手順のポイント・タイマー、詳細情報、履歴 */
.rcp-steps li > div { min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.rcp-step-t { overflow-wrap: anywhere; white-space: pre-wrap; }
.rcp-point { font-size: 15px; line-height: 1.55; padding: 6px 10px; border: 1px solid var(--warn); background: var(--warn-soft); border-radius: var(--r-sm); color: var(--ink); overflow-wrap: anywhere; white-space: pre-wrap; }
.rcp-point b { color: var(--warn); margin-right: 6px; }
.rcp-step-meta { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.rcp-step-ph { width: 120px; height: 90px; padding: 0; border: 1px solid var(--line); border-radius: var(--r-sm); overflow: hidden; cursor: zoom-in; background: var(--surface-2); }
.rcp-dl { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); border: 1px solid var(--line); border-radius: var(--r-sm); margin: 0; overflow: hidden; }
.rcp-dl > div { padding: 8px 12px; min-width: 0; border-top: 1px solid var(--line); }
.rcp-dl > div:nth-child(-n+2) { border-top: 0; }
.rcp-dl > div:nth-child(even) { border-left: 1px solid var(--line); }
.rcp-dl dt { font-size: 12px; font-weight: 700; color: var(--muted); }
.rcp-dl dd { margin: 0; font-size: 15px; font-weight: 700; overflow-wrap: anywhere; }
.rcp-block { display: flex; flex-direction: column; gap: 4px; }
.rcp-block .rcp-k { white-space: normal; }
.rcp-block p { margin: 0; font-size: 16px; white-space: pre-wrap; overflow-wrap: anywhere; }
.rcp-log { display: flex; flex-direction: column; }
.rcp-log-i { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 2px 8px; padding: 10px 0; border-top: 1px solid var(--line); align-items: start; }
.rcp-log-i:first-child { border-top: 0; }
.rcp-log-m { font-size: 12px; color: var(--muted); }
.rcp-log-t { grid-column: 1 / 2; font-size: 15px; white-space: pre-wrap; overflow-wrap: anywhere; }
.rcp-log-i .icon-btn { grid-row: 1 / 3; grid-column: 2; }
.rcp-log-ph { grid-column: 1 / 2; width: 96px; height: 72px; padding: 0; border: 1px solid var(--line); border-radius: var(--r-sm); overflow: hidden; cursor: zoom-in; background: var(--surface-2); margin-top: 4px; }
.rcp-log-ph.is-static { cursor: default; }
/* クイックメモ → レシピ改訂メモ */
.rcp-pick { display: flex; flex-direction: column; max-height: 240px; overflow-y: auto; border: 1px solid var(--line); border-radius: var(--r-sm); }
.rcp-pick-i { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 48px; padding: 6px 12px; border: 0; border-top: 1px solid var(--line); background: var(--surface); text-align: left; cursor: pointer; color: var(--ink); font-weight: 700; font-size: 15px; }
.rcp-pick-i:first-child { border-top: 0; }
.rcp-pick-i:hover { background: var(--surface-2); }
.rcp-pick-i[aria-checked="true"] { background: var(--accent-soft); color: var(--accent); box-shadow: inset 3px 0 0 var(--accent); }
.rcp-pick-i .rcp-tthumb { margin-right: 0; }
.rcp-pick-n { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rcp-pick-i .chip { flex: none; }
.rcp-pick-empty { padding: 14px 12px; color: var(--muted); font-size: 14px; }
.rcp-chk { display: flex; align-items: center; gap: 12px; min-height: 44px; cursor: pointer; font-weight: 700; }
.rcp-chk input { width: 22px; height: 22px; accent-color: var(--accent); flex: none; }
.rcp-viewbar { display: flex; }
.rcp-viewbar .seg { flex: 0 1 auto; }
.rcp-viewbar .seg-btn { min-height: 44px; padding: 0 18px; font-size: 14.5px; }
@media (max-width: 559px) { .rcp-viewbar .seg { flex: 1 1 auto; } .rcp-viewbar .seg-btn { flex: 1 1 0; } }
.rcp-head-t { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.rcp-note { font-size: 12.5px; color: var(--muted); display: inline-flex; align-items: center; gap: 4px; }
.rcp-note .ico { width: 14px; height: 14px; }
.rcp-star { color: var(--accent); font-size: 15px; line-height: 1; }
.rcp-tag { color: var(--ink-2); }
.rcp-cards-mine { display: grid; }
@media (min-width: 900px) { .rcp-cards.rcp-cards-mine { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); } }
.rcp-mine-money { grid-column: 1 / -1; font-size: 13px; color: var(--muted); display: flex; gap: 10px; flex-wrap: wrap; align-items: baseline; }
.rcp-mine-money b { color: var(--ink); font-weight: 600; font-size: 15px; }
.rcp-cost-big { text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.rcp-cost-big .num { font-size: 20px; font-weight: 600; line-height: 1.1; color: var(--ink); }
.rcp-actbar { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.rcp-src { font-size: 12.5px; color: var(--muted); }
.rcp-mynote { border: 1px dashed var(--line-strong); border-radius: var(--r-sm); padding: 12px; display: flex; flex-direction: column; gap: 8px; background: var(--surface); }
.rcp-mynote .rcp-h small { display: inline-flex; align-items: center; gap: 4px; }
.rcp-mp-rows { display: flex; flex-direction: column; }
.rcp-mp-rows .li { min-height: 60px; }
.rcp-mp-rows .rcp-tthumb { width: 44px; height: 44px; margin-right: 0; }
.rcp-mp-main { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; }
.rcp-mp-name { font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rcp-mp-sub { font-size: 12.5px; color: var(--muted); }
/* v2.8 一覧の並び：スマホは「切替 → 検索・並べ替え → カテゴリ → 1行集計 → 一覧」 */
.rcp-titlerow { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 12px 12px; align-items: center; }
.rcp-titlerow > .rcp-head-t { grid-column: 1; grid-row: 1; }
.rcp-titlerow > .rcp-add-main { grid-column: 2; grid-row: 1; }
.rcp-titlerow > .rcp-viewbar { grid-column: 1 / -1; grid-row: 2; }
.rcp-sumline { display: none; margin: 0; font-size: 13px; color: var(--ink-2); }
.rcp-sumline b { font-weight: 700; }
.rcp-sumline .bad { color: var(--bad); } .rcp-sumline .warn { color: var(--warn); } .rcp-sumline .ok { color: var(--ok); }
.rcp-sumline .rcp-note { display: flex; margin-top: 2px; }
@media (max-width: 559px) {
  .rcp-titlerow > .rcp-head-t { display: none; }
  .rcp-titlerow > .rcp-viewbar { grid-column: 1; grid-row: 1; }
  .rcp-titlerow > .rcp-add-main { padding: 0 14px; }
  .rcp-o-title { order: 1; } .rcp-o-view { order: 2; } .rcp-o-tools { order: 3; } .rcp-o-cats { order: 4; }
  .rcp-o-sum { display: none !important; } .rcp-sumline { display: block; order: 5; } .rcp-o-band { order: 6; } .rcp-o-list { order: 7; }
  .rcp-o-cats .fchip { min-height: 40px; }
  .rcp-count { display: none; }
  .rcp-card { padding: 10px 12px; gap: 4px 10px; }
  .rcp-card.has-thumb { grid-template-columns: 52px minmax(0,1fr) auto; }
  .rcp-thumb { width: 52px; height: 52px; }
  .rcp-card-meta { margin-top: 2px; }
  .rcp-rate-v { font-size: 20px; }
}
/* v2.8 詳細：材料｜手順の切替（上部に固定） */
.rcp-dseg { position: sticky; top: -20px; z-index: 3; margin: -20px -20px 0; padding: 10px 20px; background: var(--surface); border-bottom: 1px solid var(--line); }
.rcp-dseg .seg { display: flex; width: 100%; }
.rcp-dseg .seg-btn { flex: 1 1 0; min-height: 44px; font-size: 15px; }
@media (min-width: 900px) { .rcp-dseg { top: -24px; margin: -24px -24px 0; padding: 12px 24px; } }
.rcp-dpane { display: flex; flex-direction: column; gap: 18px; }
/* v3.0 仕込みリスト */
.rcp-prep-top { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.rcp-prep-top .seg-btn { min-height: 44px; padding: 0 16px; }
.rcp-prep-date { font-size: 15px; font-weight: 700; color: var(--ink-2); }
.rcp-prep-basis { font-size: 13px; color: var(--muted); }
.rcp-prog { display: flex; flex-direction: column; gap: 6px; }
.rcp-prog-t { display: flex; justify-content: space-between; align-items: baseline; font-size: 14px; font-weight: 700; }
.rcp-prog .bar { height: 8px; }
.rcp-prog .bar > i.is-done { background: var(--ok); }
.rcp-pl { display: flex; flex-direction: column; }
.rcp-pl-i { display: grid; grid-template-columns: 48px minmax(0,1fr) auto 44px; gap: 8px; align-items: center; padding: 8px 12px; min-height: 60px; }
.rcp-pl-i + .rcp-pl-i { border-top: 1px solid var(--line); }
.rcp-chkbtn { width: 44px; height: 44px; border-radius: 10px; border: 2px solid var(--line-strong); background: var(--surface); display: grid; place-items: center; cursor: pointer; color: transparent; }
.rcp-chkbtn .ico { width: 24px; height: 24px; }
.rcp-chkbtn[aria-pressed="true"] { background: var(--ok); border-color: var(--ok); color: #fff; }
.rcp-pl-main { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.rcp-pl-name { font-weight: 700; font-size: 16px; overflow-wrap: anywhere; }
.rcp-pl-i.is-done .rcp-pl-name { color: var(--muted); text-decoration: line-through; }
.rcp-pl-sub { font-size: 12.5px; color: var(--muted); }
.rcp-pl-qty { display: flex; align-items: center; }
.rcp-pl-qty .inp { width: 5em; text-align: right; border-top-right-radius: 0; border-bottom-right-radius: 0; padding-inline: 8px; }
.rcp-pl-qty .rcp-unit { min-height: 44px; }
.rcp-padd { display: grid; grid-template-columns: minmax(0,1fr) 5.5em 5em auto; gap: 8px; align-items: end; }
@media (max-width: 559px) { .rcp-padd { grid-template-columns: minmax(0,1fr) 5em 4.5em; } .rcp-padd > .btn { grid-column: 1 / -1; } .rcp-pl-i { grid-template-columns: 44px minmax(0,1fr) auto 44px; padding: 8px 10px; gap: 6px; } .rcp-pl-qty .inp { width: 4.2em; } }
.rcp-mat summary { cursor: pointer; font-weight: 700; min-height: 44px; display: flex; align-items: center; gap: 8px; list-style: none; }
.rcp-mat summary::-webkit-details-marker { display: none; }
.rcp-mat summary .ico { transition: transform .15s; }
.rcp-mat[open] summary .ico { transform: rotate(90deg); }
.rcp-mat .tbl td { font-size: 15px; }
.rcp-info { padding: 12px 14px; border: 1px dashed var(--line-strong); border-radius: var(--r-sm); background: var(--surface); font-size: 14px; color: var(--ink-2); }
/* 今日モードの仕込み欄（大きな文字） */
.rcp-today { display: flex; flex-direction: column; gap: 10px; }
.rcp-today-h { display: flex; justify-content: space-between; align-items: baseline; font-size: 16px; font-weight: 700; }
.rcp-today-list { display: flex; flex-direction: column; gap: 8px; }
.rcp-today-i { display: flex; align-items: center; gap: 14px; width: 100%; min-height: 64px; padding: 10px 14px; border: 1px solid var(--line); border-radius: var(--r); background: var(--surface); text-align: left; cursor: pointer; color: var(--ink); font-size: 20px; font-weight: 700; }
.rcp-today-i .rcp-chkbtn { flex: none; pointer-events: none; }
.rcp-today-i .rcp-today-q { margin-left: auto; font-size: 18px; color: var(--ink-2); white-space: nowrap; }
.rcp-today-i.is-done { color: var(--muted); background: var(--surface-2); }
.rcp-today-i.is-done .rcp-today-n { text-decoration: line-through; }
.rcp-memo-ph { width: 120px; height: 90px; border-radius: var(--r-sm); overflow: hidden; border: 1px solid var(--line); flex: none; }

/* 編集：セクションと目次 */
.rcp-top { position: sticky; top: -20px; z-index: 3; margin: -20px -20px 0; background: var(--surface); border-bottom: 1px solid var(--line); }
.rcp-top .rcp-live { position: static; margin: 0; border-bottom: 0; padding: 8px 20px 4px; }
.rcp-toc { padding: 4px 20px 8px; }
.rcp-toc .fchip { min-height: 40px; padding: 0 12px; font-size: 13.5px; }
@media (min-width: 900px) {
  .rcp-top { top: -24px; margin: -24px -24px 0; }
  .rcp-top .rcp-live { padding: 10px 24px 4px; }
  .rcp-toc { padding: 4px 24px 10px; }
}
.rcp-fsec { display: flex; flex-direction: column; gap: 12px; scroll-margin-top: 128px; padding-top: 16px; border-top: 1px solid var(--line); }
.rcp-fsec:first-of-type { border-top: 0; padding-top: 4px; }
.rcp-fsec > h3 { font-family: var(--f-display); font-weight: 700; font-size: 16px; margin: 0; display: flex; align-items: baseline; gap: 8px; }
.rcp-fsec > h3 small { font-family: var(--f-body); font-weight: 400; font-size: 12.5px; color: var(--muted); }
.rcp-file { position: absolute; width: 1px; height: 1px; opacity: 0; overflow: hidden; }
label.btn.rcp-upload-disabled { opacity: .4; cursor: not-allowed; pointer-events: none; }
.rcp-phgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 150px), 1fr)); gap: 10px; }
.rcp-phtile { display: flex; flex-direction: column; gap: 6px; border: 1px solid var(--line); border-radius: var(--r-sm); padding: 6px; min-width: 0; }
.rcp-phtile-img { position: relative; aspect-ratio: 4 / 3; border-radius: 6px; overflow: hidden; }
.rcp-phtile-ops { display: flex; align-items: center; gap: 4px; }
.rcp-phtile-ops .chip { margin-right: auto; }
.rcp-phtile .inp { font-size: 16px; min-height: 40px; padding: 6px 8px; }
.rcp-upl { font-size: 13px; color: var(--muted); }
.rcp-upl:empty { display: none; }
.rcp-step-body { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.rcp-step-extra { display: grid; grid-template-columns: minmax(0,1fr) 7.5em; gap: 8px; }
.rcp-step-extra .rcp-lbl { margin-bottom: 2px; }
.rcp-step-phrow { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.rcp-step-phrow .rcp-mini { width: 64px; height: 48px; border-radius: 6px; overflow: hidden; border: 1px solid var(--line); }
.rcp-stepcard { border: 1px solid var(--line); border-radius: var(--r-sm); padding: 10px; }
.rcp-infogrid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 12px; }
.rcp-infogrid .field { min-width: 0; }
.rcp-sfx { display: flex; align-items: center; }
.rcp-sfx .inp { border-top-right-radius: 0; border-bottom-right-radius: 0; text-align: right; }
.rcp-sfx .rcp-unit { min-height: 44px; }
.rcp-hint { font-size: 12.5px; color: var(--muted); margin: 0; }
`);

  /* ---------- 計算 ---------- */
  const n = (v) => { const x = Number(v); return isFinite(x) ? x : 0; };
  const item = (id) => (id ? K.getDoc("items", id) : null);
  const liveUnitCost = (l) => { const it = item(l.itemId); return it ? n(it.cost) : n(l.unitCost); };
  function calc(lines, portions, price, useLive) {
    const total = (lines || []).reduce((s, l) => s + n(l.qty) * (useLive ? liveUnitCost(l) : n(l.unitCost)), 0);
    const p = Math.max(1, n(portions) || 1);
    const cost = Math.round(total / p);
    const pr = n(price);
    return { total, cost, costRate: pr > 0 ? cost / pr : null, profit: pr > 0 ? pr - cost : null };
  }
  const live = (r) => calc(r.lines, r.portions, r.price, true);
  function isStale(r) {
    const lineDiff = (r.lines || []).some((l) => { const it = item(l.itemId); return it && n(it.cost) !== n(l.unitCost); });
    return lineDiff || n(r.cost) !== live(r).cost || r.cost == null;
  }
  const target = () => n(K.settings().targetFoodCost) || 0.3;
  function rateClass(rate) {
    if (rate == null) return "";
    const t = target();
    if (rate <= t) return "ok";
    if (rate <= t + 0.05) return "warn";
    return "bad";
  }
  const rateChip = (rate) =>
    rate == null ? h("span", { class: "chip", text: "売価未設定" })
      : h("span", { class: "chip num " + rateClass(rate), text: "原価率 " + K.fmt.pct(rate) });
  // 目標との関係が分かる細いバー（目標値の線を中央より左に置き、目標の2倍で満杯）
  function gauge(rate) {
    const t = target();
    const max = t * 2;
    const w = rate == null ? 0 : Math.min(1, Math.max(0, rate / max)) * 100;
    return h("span", { class: "rcp-gauge", attrs: { "aria-hidden": "true" } },
      h("i", { class: rateClass(rate), style: { width: w + "%" } }),
      h("b", { style: { left: "50%" } }));
  }
  const fmtQty = (q) => { const x = Math.round(n(q) * 100) / 100; return String(x); };

  /* ---------- 後方互換：手順・詳細情報・写真 ---------- */
  // 旧形式 steps:[string] → [{text, point, timerMin, photo}]
  const normStep = (st) => (typeof st === "string" || st == null)
    ? { text: String(st || ""), point: "", timerMin: null, photo: null }
    : { text: String(st.text || ""), point: String(st.point || ""), timerMin: st.timerMin != null && st.timerMin !== "" && isFinite(Number(st.timerMin)) ? Number(st.timerMin) : null, photo: st.photo && (st.photo.id || st.photo.local) ? st.photo : null };
  const normSteps = (arr) => (Array.isArray(arr) ? arr : []).map(normStep).filter((x) => x.text.trim() || x.point.trim() || x.photo || x.timerMin != null);
  const recipePhotos = (r) => (Array.isArray(r && r.photos) ? r.photos : []).filter((p) => p && (p.id || p.local));
  const PHOTO_MAX = 10;
  const INFO = [
    { k: "prepMin", l: "仕込み時間", t: "num", u: "分" },
    { k: "cookMin", l: "調理時間", t: "num", u: "分" },
    { k: "station", l: "担当の持ち場", t: "text", list: ["揚げ場", "焼き場", "煮方", "板場", "盛り付け", "仕込み", "ドリンク"], ph: "例：揚げ場" },
    { k: "serveTemp", l: "提供温度", t: "select", opts: ["", "熱々（80℃以上）", "温かい", "常温", "冷たい"] },
    { k: "vessel", l: "器", t: "text", ph: "例：7寸丸皿（黒）" },
    { k: "storage", l: "保存方法", t: "select", opts: ["", "冷蔵", "冷凍", "常温"] },
    { k: "shelfDays", l: "保存期限", t: "num", u: "日" },
    { k: "batchUnit", l: "仕込み量の単位", t: "text", ph: "例：1バット・20人前" },
  ];
  const INFO_LONG = [
    { k: "plating", l: "盛り付けのポイント", ph: "例：大葉を敷いて右奥に高く盛る。レモンは手前" },
    { k: "taste", l: "味の基準", ph: "例：塩分は控えめ。タレは糖度高め、照りが出るまで" },
    { k: "pitfalls", l: "よくある失敗と対処", ph: "例：衣が剥がれる → 粉をはたいてから5分置く" },
  ];
  const infoOf = (r) => (r && r.info && typeof r.info === "object" ? r.info : {});
  const hasVal = (v) => v != null && String(v).trim() !== "";
  const fmtAt = (iso) => { if (!iso) return ""; const dt = new Date(iso); if (isNaN(dt)) return ""; const p2 = (x) => String(x).padStart(2, "0"); return dt.getFullYear() + "/" + (dt.getMonth() + 1) + "/" + dt.getDate() + " " + p2(dt.getHours()) + ":" + p2(dt.getMinutes()); };

  // 写真の表示（読み込み失敗時は代替表示）
  function photoImg(p, alt) {
    const src = K.photos && K.photos.src ? K.photos.src(p) : "";
    if (!src) return h("span", { class: "rcp-ph-fail", text: "写真を表示できません" });
    const img = h("img", { class: "rcp-ph", src, alt: alt || "", loading: "lazy", decoding: "async" });
    img.addEventListener("error", () => img.replaceWith(h("span", { class: "rcp-ph-fail", text: "写真を表示できません" })));
    return img;
  }
  // 他のレシピ（複製など）が同じ写真を使っていなければ保存領域から消す
  function releasePhoto(p, selfId) {
    if (!p || !p.id || !K.photos || !shopLoaded) return;
    const uses = (r) => recipePhotos(r).some((x) => x.id === p.id) || normSteps(r.steps).some((x) => x.photo && x.photo.id === p.id) ||
      (Array.isArray(r.notesLog) && r.notesLog.some((x) => x.photo && x.photo.id === p.id));
    const used = SHOP.list().some((r) => r.id !== selfId && uses(r)) || MINE.list().some((r) => r.id !== selfId && uses(r));
    if (!used) K.photos.remove(p);
  }

  // 全画面表示（左右で切替・閉じる）
  function openViewer(list, start) {
    if (!list.length) return;
    let i = Math.max(0, Math.min(list.length - 1, start || 0));
    const imgHost = h("div", { class: "rcp-lb-img" });
    const count = h("span", { class: "rcp-lb-count num" });
    const cap = h("div", { class: "rcp-lb-cap" });
    const prevBtn = h("button", { class: "icon-btn rcp-lb-nav rcp-lb-prev", type: "button", "aria-label": "前の写真", onClick: () => go(i - 1) }, K.icon("chev"));
    const nextBtn = h("button", { class: "icon-btn rcp-lb-nav", type: "button", "aria-label": "次の写真", onClick: () => go(i + 1) }, K.icon("chev"));
    const closeBtn = h("button", { class: "icon-btn", type: "button", "aria-label": "閉じる", onClick: () => close() }, K.icon("x"));
    const prevFocus = document.activeElement;
    const box = h("div", { class: "rcp-lb", role: "dialog", "aria-modal": "true", "aria-label": "写真" },
      h("div", { class: "rcp-lb-top" }, count, closeBtn),
      h("div", { class: "rcp-lb-stage" }, prevBtn, imgHost, nextBtn),
      cap);
    function go(k) {
      i = (k + list.length) % list.length;
      imgHost.textContent = "";
      imgHost.appendChild(photoImg(list[i].photo, list[i].caption || ""));
      count.textContent = (i + 1) + " / " + list.length;
      cap.textContent = list[i].caption || "";
      prevBtn.disabled = nextBtn.disabled = list.length < 2;
    }
    const onKey = (e) => {
      if (e.key === "Escape") { e.stopImmediatePropagation(); e.preventDefault(); close(); }
      else if (e.key === "ArrowLeft") { e.stopImmediatePropagation(); go(i - 1); }
      else if (e.key === "ArrowRight") { e.stopImmediatePropagation(); go(i + 1); }
    };
    let sx = null;
    box.addEventListener("pointerdown", (e) => { sx = e.clientX; });
    box.addEventListener("pointerup", (e) => { if (sx == null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 50 && list.length > 1) go(dx < 0 ? i + 1 : i - 1); });
    function close() {
      window.removeEventListener("keydown", onKey, true);
      box.remove();
      if (prevFocus && prevFocus.focus && document.contains(prevFocus)) prevFocus.focus({ preventScroll: true });
    }
    window.addEventListener("keydown", onKey, true);
    document.body.appendChild(box);
    go(i);
    closeBtn.focus();
  }

  async function refreshCost(r, store) {
    const lines = (r.lines || []).map((l) => {
      const it = item(l.itemId);
      return Object.assign({}, l, { unitCost: it ? n(it.cost) : n(l.unitCost) });
    });
    const c = calc(lines, r.portions, r.price, false);
    await (store || SHOP).patch(r.id, { lines, cost: c.cost, costRate: c.costRate, updatedAt: new Date().toISOString() });
  }

  /* ---------- 状態 ---------- */
  let recipes = [];
  let myRecipes = [];
  let view = (() => { try { return localStorage.getItem("kitchen-ledger-rcp-view") === "mine" ? "mine" : "shop"; } catch (e) { return "shop"; } })();
  let cat = "すべて";
  let tagSel = "";
  let query = "";
  const sorts = { shop: "rate", mine: "new" };
  let sumLine = null;
  let viewbarEl = null;
  let listHost = null, sumHost = null, bandHost = null, catHost = null, tagHost = null, sortHost = null, headHost = null, searchInp = null, viewBtns = [];
  const curStore = () => (view === "mine" ? MINE : SHOP);
  function setView(v) {
    view = v === "mine" ? "mine" : "shop";
    try { localStorage.setItem("kitchen-ledger-rcp-view", view); } catch (e) {}
    cat = "すべて"; tagSel = "";
    viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === view)));
    renderList();
  }

  /* ---------- カテゴリ・タグ絞り込み（共通 .fchips） ---------- */
  function drawCats(rowsAll) {
    if (!catHost) return;
    catHost.textContent = "";
    const cats = (view === "mine" ? MINE.cats : CATS).filter((c) => rowsAll.some((r) => (r.category || "その他") === c) || c === cat);
    ["すべて"].concat(cats).forEach((c) => {
      const cnt = c === "すべて" ? rowsAll.length : rowsAll.filter((r) => (r.category || "その他") === c).length;
      catHost.appendChild(h("button", { class: "fchip", type: "button", attrs: { "aria-pressed": String(c === cat) },
        onClick: () => { cat = c; renderList(); } }, c, h("span", { class: "n", text: String(cnt) })));
    });
    tagHost.textContent = "";
    const tags = view === "mine" ? Array.from(new Set([].concat(...rowsAll.map((r) => r.tags || [])))).sort() : [];
    tagHost.hidden = !tags.length;
    tags.forEach((t) => tagHost.appendChild(h("button", { class: "fchip", type: "button", attrs: { "aria-pressed": String(t === tagSel) },
      onClick: () => { tagSel = tagSel === t ? "" : t; renderList(); } }, "#" + t)));
  }
  function drawSort() {
    sortHost.textContent = "";
    const opts = view === "mine" ? [{ v: "new", l: "新しい順" }, { v: "name", l: "名前順" }, { v: "fav", l: "★" }] : [{ v: "rate", l: "原価率順" }, { v: "name", l: "名前順" }, { v: "fav", l: "★" }];
    opts.forEach((o) => sortHost.appendChild(h("button", { class: "seg-btn", type: "button", text: o.l, title: o.v === "fav" ? "お気に入りを先頭に" : null, "aria-label": o.v === "fav" ? "お気に入り順" : null,
      attrs: { "aria-pressed": String(sorts[view] === o.v) }, onClick: () => { sorts[view] = o.v; renderList(); } })));
  }
  function drawHead() {
    headHost.textContent = "";
    const mine = view === "mine";
    headHost.append(
      h("div", { class: "rcp-head-t" },
        h("h2", { class: "sec-title", text: mine ? "マイレシピ" : "店のメニュー" }),
        mine ? h("span", { class: "rcp-note" }, K.icon("user"), K.my.note()) : null),
      mine
        ? h("button", { class: "btn primary rcp-add-main", "aria-label": "マイレシピを書く", onClick: () => openEdit(null, MINE) }, K.icon("plus"), h("span", { class: "rcp-wide", text: "マイレシピを書く" }), h("span", { class: "rcp-narrow", text: "書く" }))
        : h("button", { class: "btn primary rcp-add-main", "aria-label": "レシピを追加", attrs: { "data-write": "" }, disabled: K.readOnly(), onClick: () => openEdit(null, SHOP) }, K.icon("plus"), h("span", { class: "rcp-wide", text: "レシピを追加" }), h("span", { class: "rcp-narrow", text: "追加" })),
      viewbarEl);
  }

  /* ---------- 一覧 ---------- */
  function renderList() {
    if (!listHost) return;
    const mine = view === "mine";
    const store = curStore();
    const all = mine ? myRecipes : recipes;
    listHost.textContent = "";
    sumHost.textContent = "";
    bandHost.textContent = "";
    if (sumLine) sumLine.textContent = "";
    const ro = store.ro();
    const t = target();
    drawHead(); drawSort();
    if (searchInp) searchInp.placeholder = mine ? "名前・#タグで検索" : "料理名で検索";

    const lv = all.map((r) => ({ r, c: live(r), stale: isStale(r), fav: mine ? !!r.fav : isFavShop(r.id) }));
    const stale = lv.filter((x) => x.stale);
    bandHost.hidden = !stale.length;
    drawCats(all);

    if (!all.length) {
      sumHost.hidden = true;
      sumLine.hidden = true;
      listHost.appendChild(mine
        ? K.empty("マイレシピはまだありません", "賄い・試作・自分の料理などを、自分だけのレシピとして残せます。店のレシピの詳細から「マイレシピにコピー」もできます。", "マイレシピを書く", () => openEdit(null, MINE))
        : K.empty("レシピがまだありません",
          "料理ごとに材料・分量・手順を登録すると、1人前原価と原価率が自動で出ます。食材マスタが空でも材料名と単価の手入力で作れます。",
          "最初のレシピを登録", () => openEdit(null, SHOP)));
      return;
    }
    sumHost.hidden = false;
    sumLine.hidden = false;

    const cell = (lbl, val, unit, sub, cls, title) => h("div", { class: "cell", title: title || null },
      h("span", { class: "lbl" }, lbl),
      h("span", { class: "val" + (cls ? " " + cls : "") }, val, unit ? h("small", { text: unit }) : null),
      sub ? h("span", { class: "sub" }, sub) : null);
    if (mine) {
      const favN0 = lv.filter((x) => x.fav).length;
      sumLine.append(h("span", null, "マイレシピ ", h("b", { class: "num", text: String(all.length) }), "品・お気に入り ", h("b", { class: "num", text: String(favN0) }), "品"),
        h("span", { class: "rcp-note" }, K.icon("user"), K.my.note()));
      const favN = favN0;
      const lastAt = all.map((r) => r.updatedAt || "").sort().pop();
      sumHost.append(
        cell("マイレシピ", String(all.length), "品", "自分専用"),
        cell("お気に入り", String(favN), "品", "★付き"),
        cell("最終更新", lastAt ? fmtDay(lastAt) : "—", null, lastAt ? fmtAt(lastAt).slice(-5) : null));
    } else {
      const rated = lv.filter((x) => x.c.costRate != null && x.c.costRate <= 3);
      const excluded = lv.length - rated.length;
      const avg = rated.length ? rated.reduce((s, x) => s + x.c.costRate, 0) / rated.length : null;
      const over = lv.filter((x) => x.c.costRate != null && x.c.costRate > t).length;
      sumLine.append(h("b", { class: "num", text: String(recipes.length) }), "品・平均原価率 ",
        h("b", { class: "num " + (avg == null ? "" : rateClass(avg)), text: K.fmt.pct(avg) }), "（目標 " + K.fmt.pct(t) + "）・目標超過 ",
        h("b", { class: "num " + (over ? "bad" : ""), text: String(over) }), "品");
      sumHost.append(
        cell("登録メニュー", String(recipes.length), "品", "レシピ登録数"),
        cell([h("span", { class: "rcp-wide", text: "メニュー平均原価率（単純平均）" }), h("span", { class: "rcp-narrow", text: "平均原価率" })], K.fmt.pct(avg), null,
          [h("span", { class: "rcp-wide", text: "目標 " + K.fmt.pct(t) + (excluded ? "・" + excluded + "件除外" : "") }),
            h("span", { class: "rcp-narrow", text: "単純平均" + (excluded ? "・" + excluded + "件除外" : "") })], avg == null ? "" : rateClass(avg),
          "売価のあるメニューの原価率を単純平均（売上数量は考慮しない）。売価未設定・原価率300%超は除外"),
        cell([h("span", { class: "rcp-wide", text: "目標超過メニュー" }), h("span", { class: "rcp-narrow", text: "目標超過" })], String(over), "品", "原価率 " + K.fmt.pct(t) + " 超", over ? "bad" : "ok"));
    }

    // 原価更新の帯
    if (stale.length) {
      bandHost.appendChild(h("div", { class: "rcp-band", role: "status" },
        K.icon("alert"),
        h("span", { class: "rcp-band-t" }, h("span", { class: "num", text: String(stale.length) }), "件で食材価格が変わり、原価がずれています"),
        h("button", { class: "btn sm", attrs: mine ? null : { "data-write": "" }, disabled: ro, text: "まとめて更新", onClick: async (e) => {
          e.currentTarget.disabled = true;
          for (const x of stale) await refreshCost(x.r, store);
          K.toast(stale.length + "件のレシピ原価を最新に更新しました", "ok");
        } })));
    }

    let rows = lv;
    if (cat !== "すべて") rows = rows.filter((x) => (x.r.category || "その他") === cat);
    if (mine && tagSel) rows = rows.filter((x) => (x.r.tags || []).includes(tagSel));
    const q = query.trim().toLowerCase().replace(/^[#＃]/, "");
    if (q) rows = rows.filter((x) => String(x.r.name || "").toLowerCase().includes(q) || (x.r.tags || []).some((tg) => String(tg).toLowerCase().includes(q)));
    const so = sorts[view];
    const byName = (a, b) => String(a.r.name || "").localeCompare(String(b.r.name || ""), "ja");
    const byNew = (a, b) => String(b.r.updatedAt || "").localeCompare(String(a.r.updatedAt || ""));
    const byRate = (a, b) => {
      const ar = a.c.costRate, br = b.c.costRate;
      if (ar == null && br == null) return 0;
      if (ar == null) return 1;
      if (br == null) return -1;
      return br - ar;
    };
    rows = rows.slice().sort((a, b) => {
      if (so === "fav" && a.fav !== b.fav) return a.fav ? -1 : 1;
      if (so === "name") return byName(a, b);
      if (mine) return so === "fav" ? byNew(a, b) : byNew(a, b);
      return so === "fav" ? byName(a, b) : byRate(a, b);
    });

    if (!rows.length) {
      listHost.appendChild(K.empty("該当するレシピがありません", "カテゴリ・タグや検索語を変えてみてください。"));
      return;
    }
    const thumbOf = (r) => { const ph0 = recipePhotos(r)[0]; return ph0 ? photoImg(ph0, "") : h("span", { class: "rcp-ph-none" }, K.icon("book")); };
    const nameLine = (r, fav) => h("div", { class: "rcp-card-name" }, fav ? h("span", { class: "rcp-star", "aria-label": "お気に入り", text: "★ " }) : null, r.name || "（名前なし）");

    if (mine) {
      const cards = h("div", { class: "rcp-cards rcp-cards-mine" });
      rows.forEach(({ r, c, stale: st, fav }) => {
        cards.appendChild(h("button", { class: "rcp-card has-thumb", type: "button", onClick: () => openDetail(r.id, MINE) },
          h("span", { class: "rcp-thumb" }, thumbOf(r)),
          h("div", { style: { minWidth: "0" } },
            nameLine(r, fav),
            h("div", { class: "rcp-card-meta" },
              h("span", { class: "chip", text: r.category || "その他" }),
              (r.tags || []).slice(0, 4).map((tg) => h("span", { class: "chip rcp-tag", text: "#" + tg })),
              st ? h("span", { class: "chip warn", text: "原価更新あり" }) : null)),
          h("div", { class: "rcp-cost-big" }, h("span", { class: "rcp-rate-l", text: "1人前原価" }), h("span", { class: "num", text: K.fmt.yen(c.cost) })),
          h("div", { class: "rcp-mine-money" },
            n(r.price) > 0 ? h("span", null, "売価 ", h("b", { class: "num", text: K.fmt.yen(r.price) }), c.costRate != null ? h("span", { class: "num", text: "（原価率 " + K.fmt.pct(c.costRate) + "）" }) : null) : h("span", { text: "売価なし" }),
            r.updatedAt ? h("span", null, "更新 ", h("span", { class: "num", text: fmtDay(r.updatedAt) })) : null)));
      });
      listHost.append(h("div", { class: "rcp-count" }, h("span", { class: "num", text: String(rows.length) }), "件を表示"), cards);
      return;
    }

    const rateNum = (c) => c.costRate == null
      ? h("span", { class: "rcp-rate-v none", text: "売価未設定" })
      : h("span", { class: "rcp-rate-v num " + rateClass(c.costRate), text: K.fmt.pct(c.costRate) });

    // スマホ：カード
    const cards = h("div", { class: "rcp-cards" });
    rows.forEach(({ r, c, stale: st, fav }) => {
      cards.appendChild(h("button", { class: "rcp-card has-thumb", type: "button", onClick: () => openDetail(r.id, SHOP) },
        h("span", { class: "rcp-thumb" }, thumbOf(r)),
        h("div", { style: { minWidth: "0" } },
          nameLine(r, fav),
          h("div", { class: "rcp-card-meta" },
            h("span", { class: "chip", text: r.category || "その他" }),
            st ? h("span", { class: "chip warn", text: "原価更新あり" }) : null)),
        h("div", { class: "rcp-rate" }, h("span", { class: "rcp-rate-l", text: "原価率" }), rateNum(c)),
        h("div", { class: "rcp-card-money" },
          h("span", null, "売価 ", h("b", { class: "num", text: n(r.price) > 0 ? K.fmt.yen(r.price) : "—" })),
          h("span", null, "原価 ", h("b", { class: "num", text: K.fmt.yen(c.cost) })),
          c.profit != null ? h("span", null, "粗利 ", h("b", { class: "num", text: K.fmt.yen(c.profit) })) : null),
        c.costRate != null ? gauge(c.costRate) : null));
    });

    // PC：表
    const tbody = h("tbody");
    rows.forEach(({ r, c, stale: st, fav }) => {
      tbody.appendChild(h("tr", { class: "click", tabindex: "0", onClick: () => openDetail(r.id, SHOP), onKeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDetail(r.id, SHOP); } } },
        h("td", null, h("span", { class: "rcp-tname-wrap" },
          h("span", { class: "rcp-tthumb" }, recipePhotos(r)[0] ? photoImg(recipePhotos(r)[0], "") : h("span", { class: "rcp-ph-none" })),
          fav ? h("span", { class: "rcp-star", "aria-label": "お気に入り", text: "★", style: { marginRight: "6px" } }) : null,
          h("span", { class: "rcp-tname", text: r.name || "（名前なし）" }), st ? h("span", { class: "chip warn", style: { marginLeft: "8px" }, text: "原価更新あり" }) : null)),
        h("td", null, h("span", { class: "chip", text: r.category || "その他" })),
        h("td", { class: "r num", text: n(r.price) > 0 ? K.fmt.yen(r.price) : "—" }),
        h("td", { class: "r num", text: K.fmt.yen(c.cost) }),
        h("td", { class: "r" }, c.costRate == null ? h("span", { class: "chip", text: "売価未設定" })
          : h("span", { class: "rcp-trate" }, gauge(c.costRate), h("span", { class: "num " + rateClass(c.costRate), style: { color: "var(--" + rateClass(c.costRate) + ")" }, text: K.fmt.pct(c.costRate) }))),
        h("td", { class: "r num", text: c.profit == null ? "—" : K.fmt.yen(c.profit) })));
    });
    const tbl = h("div", { class: "rcp-tbl-wrap tblwrap" },
      h("table", { class: "tbl rcp-tbl" },
        h("thead", null, h("tr", null,
          h("th", { text: "料理名" }), h("th", { text: "カテゴリ" }), h("th", { class: "r", text: "売価" }),
          h("th", { class: "r", text: "1人前原価" }), h("th", { class: "r", text: "原価率（目標 " + K.fmt.pct(t) + "）" }), h("th", { class: "r", text: "粗利" }))),
        tbody));

    listHost.append(h("div", { class: "rcp-count" }, h("span", { class: "num", text: String(rows.length) }), "件を表示"), cards, tbl);
  }

  /* ---------- 詳細（厨房で見る用） ---------- */
  function openDetail(id, store) {
    store = store || SHOP;
    const mine = store === MINE;
    const r = store.get(id);
    if (!r) return;
    const ro = store.ro();
    const c = live(r);
    const st = isStale(r);
    const base = Math.max(1, n(r.portions) || 1);
    const tblHost = h("div");
    let close = null;

    const scaleInp = K.input({ type: "number", value: base, min: 1, step: "1", inputmode: "decimal", "aria-label": "何人前で作るか", class: "inp num", onInput: () => drawTable() });
    const setScale = (v) => { scaleInp.value = v; drawTable(); };
    function drawTable() {
      const want = n(scaleInp.value) > 0 ? n(scaleInp.value) : base;
      const mult = want / base;
      tblHost.textContent = "";
      const lines = r.lines || [];
      if (!lines.length) { tblHost.appendChild(h("p", { class: "muted", text: "材料が登録されていません。" })); return; }
      let sum = 0;
      const body = lines.map((l) => {
        const uc = liveUnitCost(l);
        const lc = n(l.qty) * mult * uc;
        sum += lc;
        const it = item(l.itemId);
        return h("tr", null,
          h("td", null, l.name || (it && it.name) || "—", it && n(it.cost) !== n(l.unitCost) ? h("span", { class: "chip warn", style: { marginLeft: "6px" }, text: "単価変更" }) : null),
          h("td", { class: "rcp-qty" }, h("span", { class: "num", text: fmtQty(n(l.qty) * mult) }), h("span", { class: "rcp-u", text: l.unit || "" })),
          h("td", { class: "r num", text: K.fmt.yen(lc) }));
      });
      tblHost.appendChild(h("div", { class: "tblwrap" },
        h("table", { class: "tbl rcp-itbl" },
          h("thead", null, h("tr", null, h("th", { text: "材料" }), h("th", { class: "r", text: "分量" }), h("th", { class: "r", text: "原価" }))),
          h("tbody", null, body),
          h("tfoot", null, h("tr", null, h("td", { text: "合計（" + fmtQty(want) + "人前）" }), h("td"), h("td", { class: "r num", text: K.fmt.yen(sum) }))))));
    }
    drawTable();

    const steps = normSteps(r.steps);
    const algs = r.allergens || [];
    const info = infoOf(r);
    const photos = recipePhotos(r);
    // 全画面表示の対象：レシピ写真 → 手順写真
    const viewList = photos.map((p, k) => ({ photo: p, caption: p.caption || (k === 0 ? "完成写真" : "") }))
      .concat(steps.map((x, k) => x.photo ? { photo: x.photo, caption: "手順 " + (k + 1) + "：" + x.text.slice(0, 40) } : null).filter(Boolean));
    const stepView = (k) => viewList.findIndex((v) => v.photo === steps[k].photo);

    // 写真
    let photoSec = null;
    if (photos.length) {
      const hero = h("button", { class: "rcp-hero", type: "button", "aria-label": "写真を全画面で見る" });
      const capEl = h("p", { class: "rcp-cap" });
      let cur = 0;
      const strip = photos.length > 1 ? h("div", { class: "rcp-strip" }) : null;
      const showHero = (k) => {
        cur = k; hero.textContent = ""; hero.appendChild(photoImg(photos[k], photos[k].caption || ""));
        capEl.textContent = photos[k].caption || ""; capEl.hidden = !photos[k].caption;
        if (strip) Array.from(strip.children).forEach((b, x) => b.setAttribute("aria-current", String(x === k)));
      };
      hero.addEventListener("click", () => openViewer(viewList, cur));
      if (strip) photos.forEach((p, k) => strip.appendChild(h("button", { type: "button", "aria-label": "写真 " + (k + 1), onClick: () => showHero(k) }, photoImg(p, ""))));
      showHero(0);
      photoSec = h("div", { class: "rcp-sec" }, h("p", { class: "rcp-h" }, "写真", h("small", { text: "タップで全画面" })), hero, capEl, strip);
    }

    // 詳細情報
    const infoRows = INFO.filter((f) => hasVal(info[f.k])).map((f) => h("div", null, h("dt", { text: f.l }), h("dd", null, f.t === "num" ? [h("span", { class: "num", text: String(info[f.k]) }), " " + f.u] : String(info[f.k]))));
    const infoLong = INFO_LONG.filter((f) => hasVal(info[f.k])).map((f) => h("div", { class: "rcp-block" }, h("span", { class: "rcp-k", text: f.l }), h("p", { text: String(info[f.k]) })));
    if (infoRows.length % 2) infoRows.push(h("div", null, h("dt", { text: "\u00a0" }), h("dd", { text: "\u00a0" })));
    const infoSec = infoRows.length || infoLong.length
      ? h("div", { class: "rcp-sec" }, h("p", { class: "rcp-h", text: "詳細情報" }), infoRows.length ? h("dl", { class: "rcp-dl" }, infoRows) : null, infoLong) : null;

    // メモ（概要＋改訂履歴）
    const log = (Array.isArray(r.notesLog) ? r.notesLog : []).slice().sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
    const logHost = h("div", { class: "rcp-log" });
    const drawLog = (all) => {
      logHost.textContent = "";
      (all ? log : log.slice(0, 10)).forEach((x) => logHost.appendChild(h("div", { class: "rcp-log-i" },
        h("span", { class: "rcp-log-m" }, h("span", { class: "num", text: fmtAt(x.at) }), "　" + (x.staffId ? K.staffName(x.staffId) : "記入者なし")),
        h("span", { class: "rcp-log-t", text: x.text || "" }),
        x.photo && (x.photo.id || x.photo.local) ? h("button", { class: "rcp-log-ph", type: "button", "aria-label": "改訂メモの写真を全画面で見る", onClick: () => openViewer([{ photo: x.photo, caption: fmtAt(x.at) + "　" + (x.text || "").slice(0, 40) }], 0) }, photoImg(x.photo, "")) : null)));
      if (!all && log.length > 10) logHost.appendChild(h("button", { class: "btn sm", type: "button", text: "さらに表示（" + (log.length - 10) + "件）", onClick: () => drawLog(true) }));
    };
    drawLog(false);
    const memoSec = r.notes || log.length ? h("div", { class: "rcp-sec" }, h("p", { class: "rcp-h", text: "メモ" }),
      r.notes ? h("p", { class: "rcp-notes", text: r.notes }) : null,
      log.length ? h("div", { class: "rcp-block" }, h("span", { class: "rcp-k", text: "改訂メモ（新しい順）" }), logHost) : null) : null;

    // ★・コピー・店に登録（自分専用の操作）
    const favBtn = h("button", { class: "btn sm", type: "button", attrs: { "aria-pressed": "false" } });
    const drawFav = () => {
      const on = mine ? !!(store.get(id) || {}).fav : isFavShop(id);
      favBtn.textContent = on ? "★ お気に入り" : "☆ お気に入りに追加";
      favBtn.setAttribute("aria-pressed", String(on));
    };
    favBtn.addEventListener("click", async () => {
      if (favBtn.disabled) return;
      favBtn.disabled = true;
      try {
      if (mine) { const cur = store.get(id); await MINE.patch(id, { fav: !(cur && cur.fav) }); }
      else if (isFavShop(id)) await K.my.del("recipeFav", id);
      else await K.my.put("recipeFav", id, { recipeId: id, at: new Date().toISOString() });
      } finally { favBtn.disabled = false; }
      drawFav();
    });
    drawFav();
    const src0 = r.source && r.source.name ? r.source : null;
    const actBar = h("div", { class: "rcp-sec" },
      h("div", { class: "rcp-actbar" },
        favBtn,
        mine && r.shopId ? h("span", { class: "chip", text: "店のレシピに登録済み" }) : null),
      src0 ? h("span", { class: "rcp-src", text: "コピー元：" + (src0.type === "shop" ? "店のレシピ" : "マイレシピ") + "「" + src0.name + "」" + (src0.at ? "（" + fmtDay(src0.at) + "）" : "") }) : null,
      mine ? h("span", { class: "rcp-note" }, K.icon("user"), K.my.note()) : null);

    // 自分メモ（店のレシピに、自分だけ見えるメモ）
    let myNoteSec = null;
    let saveMyNoteIfChanged = null;
    if (!mine) {
      const cur = myNoteOf(id);
      let savedText = cur ? cur.text || "" : "";
      const ta = h("textarea", { class: "inp", value: cur ? cur.text || "" : "", placeholder: "例：自分は塩を少し控えめに。盛り付けは料理長に確認済み", "aria-label": "自分メモ" });
      const stamp = h("span", { class: "rcp-hint", text: cur && cur.updatedAt ? "最終更新 " + fmtAt(cur.updatedAt) : "" });
      myNoteSec = h("div", { class: "rcp-mynote" },
        h("p", { class: "rcp-h" }, "自分メモ", h("small", null, K.icon("user"), "自分だけ見える")),
        ta,
        h("div", { class: "row" },
          h("button", { class: "btn sm", type: "button", onClick: async (ev) => {
            const btn = ev.currentTarget;
            if (btn.disabled) return;
            btn.disabled = true;
            setTimeout(() => { btn.disabled = false; }, 600);
            const text = ta.value.trim();
            const at = new Date().toISOString();
            if (text) await K.my.put("recipeNotes", id, { recipeId: id, text, updatedAt: at });
            else if (myNoteOf(id)) await K.my.del("recipeNotes", id);
            stamp.textContent = text ? "最終更新 " + fmtAt(at) : "";
            savedText = text;
            K.toast(text ? "自分メモを保存しました" : "自分メモを消しました", "ok");
          } }, "自分メモを保存"),
          stamp),
        h("span", { class: "rcp-note", text: K.my.note() + "・閉じると自動で保存" }));
      // 閉じたときに未保存の自分メモを自動保存（閲覧シートは破棄確認なし）
      saveMyNoteIfChanged = () => {
        const text = ta.value.trim();
        if (text === savedText) return;
        const at = new Date().toISOString();
        (text ? K.my.put("recipeNotes", id, { recipeId: id, text, updatedAt: at }) : K.my.del("recipeNotes", id))
          .then(() => K.toast("自分メモを保存しました", "ok")).catch(() => {});
      };
    }

    // 材料｜手順の切替（調理中は手順へ1タップ）。選択は端末ごとに記憶
    let pane = (() => { try { return localStorage.getItem("kitchen-ledger-rcp-pane") === "steps" ? "steps" : "ingr"; } catch (e) { return "ingr"; } })();
    const paneIngr = h("div", { class: "rcp-dpane", role: "tabpanel", "aria-label": "材料" },
      h("div", { class: "rcp-tags" },
        h("span", { class: "chip", text: r.category || "その他" }),
        mine ? (c.costRate != null ? h("span", { class: "chip num", text: "原価率 " + K.fmt.pct(c.costRate) }) : null) : rateChip(c.costRate),
        st ? h("span", { class: "chip warn", text: "原価更新あり" }) : null,
        mine ? (r.tags || []).map((tg) => h("span", { class: "chip rcp-tag", text: "#" + tg })) : null,
        hasVal(info.prepMin) ? h("span", { class: "chip" }, "仕込み ", h("span", { class: "num", text: String(info.prepMin) }), "分") : null,
        hasVal(info.cookMin) ? h("span", { class: "chip" }, "調理 ", h("span", { class: "num", text: String(info.cookMin) }), "分") : null,
        hasVal(info.station) ? h("span", { class: "chip", text: String(info.station) }) : null,
        algs.map((a) => h("span", { class: "chip rcp-alg-chip", title: "アレルゲン" }, K.icon("alert"), a))),
      h("div", { class: "rcp-figs" },
        h("div", { class: "rcp-fig" }, h("span", { class: "rcp-k", text: "売価" }), h("span", { class: "num", text: n(r.price) > 0 ? K.fmt.yen(r.price) : "—" })),
        h("div", { class: "rcp-fig" }, h("span", { class: "rcp-k", text: "1人前原価" }), h("span", { class: "num", text: K.fmt.yen(c.cost) })),
        h("div", { class: "rcp-fig" }, h("span", { class: "rcp-k", text: "粗利" }), h("span", { class: "num", text: c.profit == null ? "—" : K.fmt.yen(c.profit) }))),
      st ? h("div", { class: "rcp-band" },
        K.icon("alert"),
        h("span", { class: "rcp-band-t" }, "保存時 ", h("span", { class: "num", text: K.fmt.yen(r.cost) }), " → 最新 ", h("span", { class: "num", text: K.fmt.yen(c.cost) })),
        h("button", { class: "btn sm", attrs: { "data-write": "" }, disabled: ro, text: "原価を最新に更新", onClick: async (ev) => {
          ev.currentTarget.disabled = true;
          await refreshCost(r, store);
          K.toast("原価を最新の食材単価で更新しました", "ok");
          if (close) close();
          setTimeout(() => openDetail(id, store), 0);
        } })) : null,
      actBar,
      photoSec,
      h("div", { class: "rcp-sec" }, h("p", { class: "rcp-h", text: "材料" }),
        h("div", { class: "rcp-scale" },
          h("span", { class: "rcp-scale-l", text: "人数換算" }), scaleInp, h("span", { class: "rcp-scale-l", text: "人前" }),
          h("span", { class: "rcp-scale-base" }, "基準 ", h("span", { class: "num", text: String(base) }), " 人前の分量を倍率で表示"),
          h("span", { class: "rcp-quick" },
            [1, 2, 3].map((m) => h("button", { class: "btn sm", type: "button", text: "×" + m, "aria-label": "基準の" + m + "倍", onClick: () => setScale(base * m) })))),
        tblHost),
      infoSec,
      memoSec,
      myNoteSec);
    const paneSteps = h("div", { class: "rcp-dpane", role: "tabpanel", "aria-label": "手順" },
      h("div", { class: "rcp-sec" }, h("p", { class: "rcp-h", text: "手順" }),
        steps.length ? h("ol", { class: "rcp-steps" }, steps.map((x, k) => h("li", null,
          h("span", { class: "rcp-step-no num", text: String(k + 1) }),
          h("div", null,
            x.text ? h("span", { class: "rcp-step-t", text: x.text }) : null,
            x.point ? h("div", { class: "rcp-point" }, h("b", { text: "ポイント" }), x.point) : null,
            x.timerMin != null || x.photo ? h("div", { class: "rcp-step-meta" },
              x.timerMin != null ? h("span", { class: "chip" }, "タイマー ", h("span", { class: "num", text: fmtQty(x.timerMin) }), " 分") : null,
              x.photo ? h("button", { class: "rcp-step-ph", type: "button", "aria-label": "手順 " + (k + 1) + " の写真を全画面で見る", onClick: () => openViewer(viewList, stepView(k)) }, photoImg(x.photo, "")) : null) : null))))
          : h("p", { class: "muted", text: "手順が登録されていません。" })),
      algs.length ? h("div", { class: "rcp-tags" }, h("span", { class: "rcp-k", text: "アレルゲン" }), algs.map((a) => h("span", { class: "chip rcp-alg-chip" }, K.icon("alert"), a))) : null);
    const segBtns = [{ v: "ingr", l: "材料" }, { v: "steps", l: "手順" + (steps.length ? "（" + steps.length + "）" : "") }].map((o) => h("button", {
      class: "seg-btn", type: "button", role: "tab", text: o.l, dataset: { v: o.v }, onClick: () => showPane(o.v) }));
    function showPane(v) {
      pane = v;
      try { localStorage.setItem("kitchen-ledger-rcp-pane", v); } catch (e) {}
      segBtns.forEach((b) => b.setAttribute("aria-selected", String(b.dataset.v === v)));
      paneIngr.hidden = v !== "ingr"; paneSteps.hidden = v !== "steps";
      const sb = body.closest(".sheet-body"); if (sb) sb.scrollTop = 0;
    }
    const body = h("div", { class: "stack", style: { gap: "18px" } },
      h("div", { class: "rcp-dseg" }, h("div", { class: "seg", role: "tablist", "aria-label": "表示の切替" }, segBtns)),
      paneIngr, paneSteps);
    showPane(pane);

    close = K.sheet({
      title: r.name || "レシピ",
      body,
      guard: false,
      onClose: () => { if (saveMyNoteIfChanged) saveMyNoteIfChanged(); },
      menu: [
        { label: "複製して編集", icon: "clip", disabled: ro, onClick: () => { setTimeout(() => duplicate(r, store), 0); return "close"; } },
        mine ? null : { label: "マイレシピにコピー", icon: "user", onClick: () => copyToMine(r) },
        mine ? { label: "店のレシピとして登録", icon: "send", hidden: K.readOnly() || !!r.shopId, onClick: () => { setTimeout(() => registerToShop(r), 0); return "close"; } } : null,
        { label: mine ? "このマイレシピを削除" : "このレシピを削除", icon: "trash", danger: true, disabled: ro, onClick: async () => ((await removeRecipe(r, store)) ? "close" : undefined) },
      ],
      actions: [
        { label: "閉じる", kind: "ghost" },
        { label: "編集", kind: "primary", disabled: ro, onClick: () => { setTimeout(() => openEdit(r.id, store), 0); } },
      ],
    });
  }

  async function removeRecipe(r, store) {
    store = store || SHOP;
    const msg = store === MINE ? "マイレシピ「" + (r.name || "レシピ") + "」を削除します。よろしいですか？"
      : "「" + (r.name || "レシピ") + "」を削除します。売上の記録からは名前が引けなくなります。よろしいですか？";
    const ok = await K.confirm(msg, "削除する");
    if (!ok) return false;
    await store.del(r.id);
    if (store === SHOP) { if (K.my.get("recipeFav", r.id)) K.my.del("recipeFav", r.id); }
    recipePhotos(r).concat(normSteps(r.steps).map((x) => x.photo).filter(Boolean)).forEach((p) => releasePhoto(p, r.id));
    K.toast("レシピを削除しました", "ok");
    return true;
  }
  async function duplicate(r, store) {
    store = store || SHOP;
    const data = JSON.parse(JSON.stringify(r));
    delete data.id;
    data.name = (r.name || "レシピ") + "（コピー）";
    data.updatedAt = new Date().toISOString();
    if (store === MINE) { delete data.shopId; data.fav = false; }
    const id = await store.add(data);
    K.toast("複製しました", "ok");
    setTimeout(() => openEdit(id, store), 0);
  }
  // 店 → マイ（写真は同じ参照を共有。コピー元を記録）
  async function copyToMine(r) {
    const data = JSON.parse(JSON.stringify(r));
    delete data.id;
    const now = new Date().toISOString();
    Object.assign(data, { notesLog: [], tags: [], fav: false, createdAt: now, updatedAt: now, source: { type: "shop", id: r.id, name: r.name || "", at: now } });
    delete data.shopId;
    const id = await MINE.add(data);
    K.toast("マイレシピにコピーしました", "ok", { action: { label: "開く", onClick: () => { setView("mine"); K.go("recipe"); setTimeout(() => openDetail(id, MINE), 50); } } });
  }
  // マイ → 店（編集権限がある人だけ。店の保存形式に合わせて新規追加）
  async function registerToShop(r) {
    if (K.readOnly()) { K.toast("店のレシピに登録するには編集権限が必要です", "bad"); return; }
    const ok = await K.confirm("マイレシピ「" + (r.name || "") + "」を店のレシピとして登録します。スタッフ全員が見られるようになります（自分のタグ・お気に入り・改訂メモは登録しません）。よろしいですか？", "店のレシピに登録");
    if (!ok) return;
    const latest = MINE.get(r.id);
    if (!latest) { K.toast("このマイレシピは見つかりません", "bad"); return; }
    if (latest.shopId && K.getDoc("recipes", latest.shopId)) { K.toast("すでに店のレシピに登録済みです", "bad"); return; }
    r = latest;
    const now = new Date().toISOString();
    const c = calc(r.lines, r.portions, r.price, true);
    const lines = (r.lines || []).map((l) => { const it = item(l.itemId); return Object.assign({}, l, { itemId: it ? it.id : null, unitCost: it ? n(it.cost) : n(l.unitCost) }); });
    const data = {
      name: r.name || "", category: CATS.includes(r.category) ? r.category : "その他",
      portions: Math.max(1, Math.round(n(r.portions)) || 1), price: Math.max(0, Math.round(n(r.price))), lines,
      cost: c.cost, costRate: c.costRate,
      steps: normSteps(r.steps), allergens: (r.allergens || []).slice(), notes: r.notes || "",
      photos: recipePhotos(r), info: Object.assign({}, infoOf(r)), notesLog: [],
      source: { type: "my", id: r.id, name: r.name || "", staffId: K.currentStaffId() || null, at: now },
      updatedAt: now,
    };
    const newId = await SHOP.add(data);
    await MINE.patch(r.id, { shopId: newId, updatedAt: now });
    K.toast("店のレシピに登録しました", "ok", { action: { label: "開く", onClick: () => { setView("shop"); K.go("recipe"); setTimeout(() => openDetail(newId, SHOP), 50); } } });
  }

  /* ---------- 編集 ---------- */
  const newLine = () => ({ itemId: null, name: "", qty: 0, unit: "", unitCost: 0, qtyRaw: "", ucRaw: "" });
  let uid = 0;
  function openEdit(id, store) {
    store = store || SHOP;
    const mine = store === MINE;
    const src = id ? store.get(id) : null;
    const ro = store.ro();
    const d = {
      name: src ? src.name || "" : "",
      category: src && store.cats.includes(src.category) ? src.category : (cat !== "すべて" && store.cats.includes(cat) ? cat : (mine ? "賄い" : "主菜")),
      tags: src && Array.isArray(src.tags) ? src.tags.slice() : [],
      portions: src ? Math.max(1, n(src.portions) || 1) : 1,
      price: src ? n(src.price) : 0,
      lines: src ? (src.lines || []).map((l) => ({
        itemId: l.itemId && item(l.itemId) ? l.itemId : null,
        name: l.name || "", qty: n(l.qty), unit: l.unit || "", unitCost: n(l.unitCost),
        qtyRaw: l.qty != null ? String(l.qty) : "", ucRaw: l.unitCost != null ? String(l.unitCost) : "",
      })) : [newLine()],
      steps: src ? normSteps(src.steps) : [],
      allergens: src ? (src.allergens || []).slice() : [],
      notes: src ? src.notes || "" : "",
      photos: src ? recipePhotos(src).map((p) => Object.assign({}, p, { caption: p.caption || "" })) : [],
      info: Object.assign({}, infoOf(src)),
      notesLog: src && Array.isArray(src.notesLog) ? src.notesLog.slice() : [],
    };
    if (!d.steps.length) d.steps.push(normStep(""));
    const newStep = () => normStep("");
    // 写真の出入り（保存時・キャンセル時に不要になった写真を片付ける）
    const origPhotos = src ? recipePhotos(src).concat(normSteps(src.steps).map((x) => x.photo).filter(Boolean)) : [];
    const uploaded = [];
    const allPhotos = () => d.photos.concat(d.steps.map((x) => x.photo).filter(Boolean));
    const canAddPhoto = () => K.photos && K.photos.canUpload() && !ro && allPhotos().length < PHOTO_MAX;
    const photoKey = (p) => p.id || p.local;
    async function uploadFiles(files, onEach, progEl) {
      const list = Array.from(files || []);
      let done = 0;
      for (const f of list) {
        if (allPhotos().length >= PHOTO_MAX) { K.toast("写真は1レシピ " + PHOTO_MAX + " 枚までです", "bad"); break; }
        if (progEl) progEl.textContent = "写真を追加中… " + (done + 1) + " / " + list.length;
        try {
          const ph = await K.photos.upload(f);
          uploaded.push(ph);
          onEach(ph);
        } catch (e) { /* エラー表示は core が行う */ }
        done++;
      }
      if (progEl) progEl.textContent = "";
    }
    function fileButton(label, multiple, onFiles) {
      const inp = h("input", { type: "file", class: "rcp-file", attrs: Object.assign({ accept: "image/*" }, multiple ? { multiple: "" } : {}) });
      const can = canAddPhoto();
      inp.disabled = !can;
      inp.addEventListener("change", async () => { const fs = inp.files; if (fs && fs.length) { lbl.classList.add("rcp-upload-disabled"); await onFiles(fs); } inp.value = ""; });
      const lbl = h("label", { class: "btn sm" + (can ? "" : " rcp-upload-disabled"), attrs: { "aria-disabled": String(!can) } }, K.icon("plus"), label, inp);
      return lbl;
    }
    const noUploadHint = () => (K.photos && K.photos.canUpload() && !ro) ? null : h("p", { class: "rcp-hint", text: "写真の追加には編集権限が必要です" });
    d.portionsRaw = String(d.portions);
    d.priceRaw = d.price ? String(d.price) : "";
    const items = K.list("items").slice().sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "ja"));

    // 入力検証（負数・人数の整数チェック）
    const isNum = (v) => String(v).trim() !== "" && isFinite(Number(v));
    function errPortions() {
      const v = String(d.portionsRaw).trim();
      if (!isNum(v)) return "人数を入力してください（1以上の整数）";
      const x = Number(v);
      if (x < 1 || !Number.isInteger(x)) return "人数は1以上の整数で入力してください";
      return "";
    }
    function errPrice() {
      const v = String(d.priceRaw).trim();
      if (v === "") return "";
      if (!isNum(v)) return "売価は数字で入力してください";
      if (Number(v) < 0) return "売価にマイナスは入力できません";
      return "";
    }
    function errQty(l) {
      const v = String(l.qtyRaw).trim();
      if (v === "") return "";
      if (!isNum(v)) return "分量は数字で入力してください";
      if (Number(v) < 0) return "分量にマイナスは入力できません";
      return "";
    }
    function errUc(l) {
      if (item(l.itemId)) return "";
      const v = String(l.ucRaw).trim();
      if (v === "") return "";
      if (!isNum(v)) return "単価は数字で入力してください";
      if (Number(v) < 0) return "単価にマイナスは入力できません";
      return "";
    }
    const setErr = (inp, out, msg) => { out.textContent = msg; inp.setAttribute("aria-invalid", msg ? "true" : "false"); };
    const portionsVal = () => (errPortions() ? Math.max(1, Math.round(n(d.portionsRaw)) || 1) : Number(d.portionsRaw));
    const unitKey = (u) => String(u || "").trim().toLowerCase().replace(/ｋｇ/g, "kg").replace(/[ｌℓ]/g, "l").replace(/^リットル$/, "l");
    const CONV = { kg: "g", l: "ml" };

    // リアルタイム原価（上部固定の白い帯）
    const liveCost = h("span", { class: "num" }), liveRate = h("span", { class: "num rcp-live-rate" }), liveProfit = h("span", { class: "num" });
    function updateCalc() {
      const c = calc(d.lines, portionsVal(), d.price, true);
      liveCost.textContent = K.fmt.yen(c.cost);
      liveRate.textContent = c.costRate == null ? "—" : K.fmt.pct(c.costRate);
      liveRate.className = "num rcp-live-rate " + rateClass(c.costRate);
      liveProfit.textContent = c.profit == null ? "—" : K.fmt.yen(c.profit);
      lineFoots.forEach((f) => f());
    }

    const nameInp = K.input({ value: d.name, placeholder: "例：鶏の唐揚げ定食", onInput: (e) => { d.name = e.target.value; } });
    const tagInp = mine ? K.input({ value: d.tags.map((x) => "#" + x).join(" "), placeholder: "例：#魚 #時短 #作り置き", "aria-label": "タグ" }) : null;
    const catSel = K.select(mine ? MY_CATS.concat(CATS) : CATS, d.category, { onChange: (e) => { d.category = e.target.value; } });
    const porInp = K.input({ type: "number", value: d.portionsRaw, min: 1, step: "1", inputmode: "numeric", class: "inp num", onInput: (e) => {
      d.portionsRaw = e.target.value; d.portions = portionsVal(); updateCalc(); } });
    const priceInp = K.input({ type: "number", value: d.priceRaw, min: 0, step: "1", inputmode: "numeric", placeholder: "例：980", class: "inp num", onInput: (e) => {
      d.priceRaw = e.target.value; d.price = Math.max(0, n(e.target.value)); updateCalc(); } });

    // 材料行：材料名 | 分量＋単位 | 単価 | 行原価 | 削除
    const linesHost = h("div", { class: "rcp-lines" });
    let lineFoots = [];
    function drawLines() {
      linesHost.textContent = "";
      lineFoots = [];
      if (d.lines.length) {
        linesHost.appendChild(h("div", { class: "rcp-lhead", attrs: { "aria-hidden": "true" } },
          h("span", { text: "材料名" }), h("span", { text: "分量・単位" }), h("span", { class: "r", text: "単価" }), h("span", { class: "r", text: "行原価" }), h("span")));
      }
      d.lines.forEach((l, i) => {
        const it = item(l.itemId);
        const k = "rcpl" + ++uid;
        const opts = [{ value: "", label: "（自由入力）" }].concat(items.map((x) => ({ value: x.id, label: (x.name || "") + "（" + K.fmt.yen(x.cost) + "/" + (x.unit || "単位") + "）" })));
        const pick = K.select(opts, l.itemId || "", { "aria-label": "材料 " + (i + 1) + "：食材マスタから選ぶ", onChange: (e) => {
          const x = item(e.target.value);
          if (x) { l.itemId = x.id; l.name = x.name || ""; l.unit = x.unit || ""; l.unitCost = n(x.cost); l.ucRaw = String(n(x.cost)); }
          else { l.itemId = null; }
          drawLines(); updateCalc();
        } });
        const nameI = it ? null : K.input({ value: l.name, placeholder: "材料名を入力", "aria-label": "材料 " + (i + 1) + "：材料名", onInput: (e) => { l.name = e.target.value; } });
        const qtyErr = h("span", { class: "rcp-err", role: "alert" });
        const ucErr = h("span", { class: "rcp-err", role: "alert" });
        const conv = h("div", { class: "rcp-conv" });
        const overChip = h("div");
        const msg = h("div", { class: "rcp-c-msg" });
        const lineEl = h("div", { class: "rcp-line" });
        const qtyI = K.input({ type: "number", value: l.qtyRaw, min: 0, step: "any", inputmode: "decimal", placeholder: "0", class: "inp num rcp-q", id: k + "q", onInput: (e) => {
          l.qtyRaw = e.target.value; l.qty = Math.max(0, n(e.target.value)); setErr(qtyI, qtyErr, errQty(l)); updateCalc(); } });
        const unitEl = it
          ? h("span", { class: "rcp-unit", text: l.unit || "単位" })
          : K.input({ value: l.unit, placeholder: "単位", class: "inp rcp-uin", "aria-label": "材料 " + (i + 1) + "：単位", onInput: (e) => { l.unit = e.target.value; updateCalc(); } });
        const ucI = K.input({ type: "number", value: it ? n(it.cost) : l.ucRaw, min: 0, step: "any", inputmode: "decimal", placeholder: "0", class: "inp num", id: k + "u", onInput: (e) => {
          l.ucRaw = e.target.value; l.unitCost = Math.max(0, n(e.target.value)); setErr(ucI, ucErr, errUc(l)); updateCalc(); } });
        if (it) { ucI.readOnly = true; ucI.classList.add("rcp-ro"); ucI.title = "食材マスタの仕入単価（" + (it.unit || "単位") + "あたり）"; }
        setErr(qtyI, qtyErr, errQty(l)); setErr(ucI, ucErr, errUc(l));
        const costOut = h("span", { class: "num" });
        const syncMsg = () => {
          msg.textContent = "";
          [qtyErr, ucErr, conv, overChip].forEach((x) => { if (x.textContent || x.childNodes.length) msg.appendChild(x); });
        };
        lineFoots.push(() => {
          const lc = n(l.qty) * liveUnitCost(l);
          costOut.textContent = K.fmt.yen(lc);
          const u = String(l.unit || "").trim();
          if (it) unitEl.textContent = u || "単位";
          qtyI.setAttribute("aria-label", "材料 " + (i + 1) + "：分量（" + (u || "単位未設定") + "）");
          ucI.setAttribute("aria-label", "材料 " + (i + 1) + "：単価（円/" + (u || "単位") + "）");
          // kg/L なのに 50 超 → g/ml で入れた疑い
          conv.textContent = "";
          const uk = unitKey(u);
          if (CONV[uk] && n(l.qty) > 50 && !errQty(l)) {
            const fixed = Math.round(n(l.qty) / 1000 * 10000) / 10000;
            conv.appendChild(h("button", { class: "btn sm", type: "button", onClick: () => { l.qty = fixed; l.qtyRaw = String(fixed); drawLines(); updateCalc(); } },
              K.icon("alert"), CONV[uk] + " で入力していませんか？ " + fmtQty(fixed) + u + " に換算"));
          }
          // 1人前あたりの行原価が売価超え
          overChip.textContent = "";
          const over = n(d.price) > 0 && lc / portionsVal() > n(d.price);
          lineEl.classList.toggle("is-over", over);
          if (over) overChip.appendChild(h("span", { class: "chip warn", text: "この行だけで売価超え" }));
          syncMsg();
        });
        lineEl.append(
          h("div", { class: "rcp-c-name" }, h("span", { class: "rcp-lbl", text: "材料 " + (i + 1) }), pick, nameI),
          h("div", { class: "rcp-c-qty" }, h("label", { class: "rcp-lbl", for: k + "q", text: "分量・単位" }), h("div", { class: "rcp-qtyrow" }, qtyI, unitEl)),
          h("div", { class: "rcp-c-uc" }, h("label", { class: "rcp-lbl", for: k + "u", text: it ? "単価（自動）" : "単価（円）" }), ucI),
          h("div", { class: "rcp-c-cost" }, h("span", { class: "rcp-lbl", text: "行原価" }), costOut),
          h("div", { class: "rcp-c-del" }, h("span", { class: "rcp-lbl", text: " " }),
            h("button", { class: "icon-btn danger", type: "button", "aria-label": "材料 " + (i + 1) + " を削除", title: "この材料行を削除", onClick: () => { d.lines.splice(i, 1); drawLines(); updateCalc(); } }, K.icon("trash"))),
          msg);
        linesHost.appendChild(lineEl);
      });
      if (!d.lines.length) linesHost.appendChild(h("p", { class: "muted small", text: "材料行がありません。「材料を追加」で追加してください。" }));
    }

    // 手順（本文・ポイント・タイマー・写真）
    const stepsHost = h("div", { class: "stack", style: { gap: "8px" } });
    function drawSteps() {
      stepsHost.textContent = "";
      d.steps.forEach((x, i) => {
        const ta = h("textarea", { class: "inp", "aria-label": "手順 " + (i + 1), placeholder: "例：鶏もも肉を一口大に切る", value: x.text, onInput: (e) => { x.text = e.target.value; } });
        const pt = K.input({ value: x.point, placeholder: "例：皮目から。触らずに焼き色を付ける", "aria-label": "手順 " + (i + 1) + " のポイント", onInput: (e) => { x.point = e.target.value; } });
        const tmErr = h("span", { class: "rcp-err", role: "alert" });
        const tm = K.input({ type: "number", value: x.timerRaw != null ? x.timerRaw : (x.timerMin != null ? x.timerMin : ""), min: 0, step: "any", inputmode: "decimal", placeholder: "—", class: "inp num", "aria-label": "手順 " + (i + 1) + " のタイマー（分）", onInput: (e) => {
          const v = e.target.value.trim();
          x.timerRaw = v;
          x.timerMin = v === "" ? null : Math.max(0, n(v));
          const bad = v !== "" && (!isFinite(Number(v)) || Number(v) < 0);
          tmErr.textContent = bad ? "タイマーは0以上の数字で入力してください" : ""; tm.setAttribute("aria-invalid", String(bad));
        } });
        if (x.timerRaw != null && x.timerRaw !== "" && (!isFinite(Number(x.timerRaw)) || Number(x.timerRaw) < 0)) { tmErr.textContent = "タイマーは0以上の数字で入力してください"; tm.setAttribute("aria-invalid", "true"); }
        const phRow = h("div", { class: "rcp-step-phrow" });
        if (x.photo) {
          phRow.append(
            h("span", { class: "rcp-mini" }, photoImg(x.photo, "")),
            h("span", { class: "muted small", text: "手順の写真" }),
            h("button", { class: "icon-btn danger", type: "button", "aria-label": "手順 " + (i + 1) + " の写真を外す", onClick: () => { x.photo = null; drawSteps(); drawPhotos(); } }, K.icon("trash")));
        } else {
          const prog = h("span", { class: "rcp-upl", role: "status" });
          phRow.append(fileButton("手順の写真", false, (fs) => uploadFiles([fs[0]], (ph) => { x.photo = ph; }, prog).then(() => { drawSteps(); drawPhotos(); })), prog);
        }
        const mv = (to) => { const [y] = d.steps.splice(i, 1); d.steps.splice(to, 0, y); drawSteps(); };
        stepsHost.appendChild(h("div", { class: "rcp-step rcp-stepcard" },
          h("span", { class: "rcp-step-no num", text: String(i + 1) }),
          h("div", { class: "rcp-step-body" }, ta,
            h("div", { class: "rcp-step-extra" },
              h("div", null, h("span", { class: "rcp-lbl", text: "ポイント（重要な注意）" }), pt),
              h("div", null, h("span", { class: "rcp-lbl", text: "タイマー（分）" }), tm)),
            tmErr, phRow),
          h("div", { class: "rcp-step-ops" },
            h("button", { class: "btn sm", type: "button", text: "↑", "aria-label": "手順 " + (i + 1) + " を上へ", disabled: i === 0, onClick: () => mv(i - 1) }),
            h("button", { class: "btn sm", type: "button", text: "↓", "aria-label": "手順 " + (i + 1) + " を下へ", disabled: i === d.steps.length - 1, onClick: () => mv(i + 1) }),
            h("button", { class: "icon-btn danger", type: "button", "aria-label": "手順 " + (i + 1) + " を削除", onClick: () => { d.steps.splice(i, 1); drawSteps(); drawPhotos(); } }, K.icon("trash")))));
      });
      if (!d.steps.length) stepsHost.appendChild(h("p", { class: "muted small", text: "手順がありません。「手順を追加」で追加してください。" }));
    }

    // 写真（レシピ全体：1枚目が一覧のサムネイル）
    const photosHost = h("div", { class: "stack", style: { gap: "10px" } });
    function drawPhotos() {
      photosHost.textContent = "";
      const total = allPhotos().length;
      const prog = h("span", { class: "rcp-upl", role: "status" });
      const grid = h("div", { class: "rcp-phgrid" });
      d.photos.forEach((p, k) => {
        grid.appendChild(h("div", { class: "rcp-phtile" },
          h("div", { class: "rcp-phtile-img" }, photoImg(p, p.caption || "")),
          K.input({ value: p.caption || "", placeholder: "説明（例：盛り付け見本）", "aria-label": "写真 " + (k + 1) + " の説明", onInput: (e) => { p.caption = e.target.value; } }),
          h("div", { class: "rcp-phtile-ops" },
            k === 0 ? h("span", { class: "chip", text: "表紙" }) : h("button", { class: "btn sm", type: "button", text: "表紙にする", onClick: () => { d.photos.splice(k, 1); d.photos.unshift(p); drawPhotos(); } }),
            h("button", { class: "icon-btn danger", type: "button", "aria-label": "写真 " + (k + 1) + " を外す", onClick: () => { d.photos.splice(k, 1); drawPhotos(); } }, K.icon("trash")))));
      });
      photosHost.append(
        d.photos.length ? grid : h("p", { class: "muted small", text: "完成写真や盛り付け見本を追加すると、一覧のサムネイルと詳細に表示されます。" }),
        h("div", { class: "row" },
          fileButton("写真を追加", true, (fs) => uploadFiles(fs, (ph) => { d.photos.push(Object.assign({}, ph, { caption: "" })); drawPhotos(); }, prog).then(() => { drawPhotos(); drawSteps(); })),
          prog,
          h("span", { class: "rcp-hint" }, h("span", { class: "num", text: String(total) }), " / " + PHOTO_MAX + " 枚（手順の写真を含む）")));
      const hint = noUploadHint();
      if (hint) photosHost.appendChild(hint);
    }

    // 詳細情報
    const infoErrs = {};
    const dlId = "rcpst" + ++uid;
    const infoCtl = INFO.map((f) => {
      let ctl;
      const v = d.info[f.k];
      if (f.t === "select") ctl = K.select(f.opts.map((o) => ({ value: o, label: o || "指定なし" })), hasVal(v) ? String(v) : "", { onChange: (e) => { d.info[f.k] = e.target.value; } });
      else if (f.t === "num") {
        const err = h("span", { class: "rcp-err", role: "alert" });
        ctl = K.input({ type: "number", value: hasVal(v) ? v : "", min: 0, step: "any", inputmode: "decimal", placeholder: "—", class: "inp num", onInput: (e) => {
          const raw = e.target.value.trim(); d.info[f.k] = raw;
          const bad = raw !== "" && (!isFinite(Number(raw)) || Number(raw) < 0);
          infoErrs[f.k] = bad ? f.l + "は0以上の数字で入力してください" : "";
          err.textContent = infoErrs[f.k]; ctl.setAttribute("aria-invalid", String(bad));
        } });
        return h("div", { class: "field" }, h("label", { class: "field-label", for: ctl.id || (ctl.id = "rcpi" + ++uid), text: f.l }),
          h("div", { class: "rcp-sfx" }, ctl, h("span", { class: "rcp-unit", text: f.u })), err);
      } else ctl = K.input({ value: hasVal(v) ? v : "", placeholder: f.ph || "", attrs: null, list: f.list ? dlId : null, onInput: (e) => { d.info[f.k] = e.target.value; } });
      return K.field(f.l, ctl);
    });
    const infoLongCtl = INFO_LONG.map((f) => K.field(f.l, h("textarea", { class: "inp", value: d.info[f.k] || "", placeholder: f.ph, onInput: (e) => { d.info[f.k] = e.target.value; } })));
    const stationList = h("datalist", { id: dlId }, INFO.find((f) => f.k === "station").list.map((o) => h("option", { value: o })));

    // 改訂メモ（最新が上）
    const logHost = h("div", { class: "rcp-log" });
    const logInp = h("textarea", { class: "inp", placeholder: "例：醤油を10ml減らした（塩分の苦情のため）", "aria-label": "改訂メモの本文", style: { minHeight: "64px" } });
    function drawLogEdit() {
      logHost.textContent = "";
      const arr = d.notesLog.map((x, k) => ({ x, k })).sort((a, b) => String(b.x.at || "").localeCompare(String(a.x.at || "")));
      arr.forEach(({ x, k }) => logHost.appendChild(h("div", { class: "rcp-log-i" },
        h("span", { class: "rcp-log-m" }, h("span", { class: "num", text: fmtAt(x.at) }), "　" + (x.staffId ? K.staffName(x.staffId) : "記入者なし"), x._new ? "（未保存）" : ""),
        h("span", { class: "rcp-log-t", text: x.text }),
        x.photo && (x.photo.id || x.photo.local) ? h("span", { class: "rcp-log-ph is-static" }, photoImg(x.photo, "")) : null,
        x._new ? h("button", { class: "icon-btn danger", type: "button", "aria-label": "この改訂メモを取り消す", onClick: () => { d.notesLog.splice(k, 1); drawLogEdit(); } }, K.icon("trash")) : null)));
      if (!arr.length) logHost.appendChild(h("p", { class: "muted small", text: "まだ改訂メモはありません。" }));
    }
    const addLog = () => {
      const t = logInp.value.trim();
      if (!t) { K.toast("改訂メモの本文を入力してください", "bad"); logInp.focus(); return; }
      d.notesLog.push({ at: new Date().toISOString(), staffId: K.currentStaffId() || null, text: t, _new: true });
      logInp.value = ""; drawLogEdit();
    };

    // アレルゲン
    const algBtns = ALLERGENS.map((a) => h("button", {
      class: "rcp-alg", type: "button", text: a, attrs: { "aria-pressed": String(d.allergens.includes(a)) },
      onClick: (e) => {
        const on = !d.allergens.includes(a);
        d.allergens = on ? d.allergens.concat(a) : d.allergens.filter((x) => x !== a);
        e.currentTarget.setAttribute("aria-pressed", String(on));
      },
    }));
    const extraAlg = K.input({ value: d.allergens.filter((a) => !ALLERGENS.includes(a)).join("、"), placeholder: "例：大豆、ごま（読点区切り）" });
    const notesInp = h("textarea", { class: "inp", value: d.notes, placeholder: "この料理の概要・大事なこと（例：看板メニュー。ランチは小鉢を付ける）", onInput: (e) => { d.notes = e.target.value; } });

    drawLines(); drawSteps(); drawPhotos(); drawLogEdit(); updateCalc();

    const SECS = [
      { id: "basic", l: "基本" }, { id: "cost", l: "材料と原価" }, { id: "steps", l: "手順" },
      { id: "photo", l: "写真" }, { id: "info", l: "詳細情報" }, { id: "memo", l: "メモ" },
    ];
    const secEls = {};
    const sec = (id, title, sub, ...kids) => (secEls[id] = h("section", { class: "rcp-fsec", "aria-label": title }, h("h3", null, title, sub ? h("small", { text: sub }) : null), kids));
    const tocBtns = SECS.map((x) => h("button", { class: "fchip", type: "button", text: x.l, attrs: { "aria-pressed": "false" },
      onClick: () => { tocLock = Date.now() + 700; secEls[x.id].scrollIntoView({ behavior: "smooth", block: "start" }); setToc(x.id); } }));
    let tocLock = 0;
    let tocCur = null;
    const setToc = (id) => {
      if (id === tocCur) return;
      tocCur = id;
      tocBtns.forEach((b, k) => {
        const on = SECS[k].id === id;
        b.setAttribute("aria-pressed", String(on));
        if (on && b.parentElement) { const bar = b.parentElement; const l = b.offsetLeft - bar.offsetLeft; if (l < bar.scrollLeft || l + b.offsetWidth > bar.scrollLeft + bar.clientWidth) bar.scrollLeft = l - 16; }
      });
    };
    setToc("basic");

    const body = h("div", { class: "stack", style: { gap: "16px" } },
      h("div", { class: "rcp-top" },
        h("div", { class: "rcp-live", "aria-live": "polite" },
          h("div", null, h("span", { class: "rcp-k", text: "1人前原価" }), liveCost),
          h("div", null, h("span", { class: "rcp-k", text: "原価率（目標 " + K.fmt.pct(target()) + "）" }), liveRate),
          h("div", null, h("span", { class: "rcp-k", text: "粗利" }), liveProfit)),
        h("nav", { class: "fchips rcp-toc", "aria-label": "編集セクションへ移動" }, tocBtns)),
      sec("basic", "基本", null,
        K.field("料理名", nameInp),
        h("div", { class: "grid2" }, K.field("カテゴリ", catSel), K.field("売価（税込・円）", priceInp)),
        K.field("仕込み単位の人数", porInp, "材料の分量は何人前分か（1以上の整数）"),
        mine ? K.field("タグ（自分用）", tagInp, "スペース区切り。一覧でタグごとに絞り込めます") : null,
        mine ? h("span", { class: "rcp-note" }, K.icon("user"), K.my.note()) : null),
      sec("cost", "材料と原価", "分量×単価で1人前原価を自動計算",
        items.length ? null : h("p", { class: "muted small", text: "食材マスタが空です。材料名と単価を手入力してください。" }),
        linesHost,
        h("button", { class: "btn sm rcp-add", type: "button", onClick: () => { d.lines.push(newLine()); drawLines(); updateCalc(); } }, K.icon("plus"), "材料を追加")),
      sec("steps", "手順", "ポイント・タイマー・写真は任意",
        stepsHost,
        h("button", { class: "btn sm rcp-add", type: "button", onClick: () => { d.steps.push(newStep()); drawSteps(); } }, K.icon("plus"), "手順を追加")),
      sec("photo", "写真", "1枚目が一覧のサムネイル", photosHost),
      sec("info", "詳細情報", "空欄は詳細に表示しません",
        h("div", { class: "rcp-infogrid" }, infoCtl), stationList, infoLongCtl,
        h("div", { class: "field" }, h("span", { class: "field-label", text: "アレルゲン" }), h("div", { class: "rcp-algs" }, algBtns)),
        K.field("その他のアレルゲン", extraAlg)),
      sec("memo", "メモ", null,
        K.field("概要メモ", notesInp),
        h("div", { class: "field" }, h("span", { class: "field-label", text: "改訂メモ（日付・記入者つきで残ります）" }), logInp,
          h("div", { class: "row" }, h("button", { class: "btn sm", type: "button", onClick: addLog }, K.icon("plus"), "改訂メモを追加"),
            h("span", { class: "rcp-hint", text: "記入者：" + K.staffName(K.currentStaffId()) }))),
        logHost));

    // スクロール位置に合わせて目次を切り替え
    setTimeout(() => {
      const sb = body.closest(".sheet-body");
      if (!sb) return;
      sb.addEventListener("scroll", () => {
        if (Date.now() < tocLock) return;
        const top = sb.getBoundingClientRect().top + 140;
        let curId = SECS[0].id;
        SECS.forEach((x) => { if (secEls[x.id].getBoundingClientRect().top <= top) curId = x.id; });
        if (sb.scrollTop + sb.clientHeight >= sb.scrollHeight - 4) curId = SECS[SECS.length - 1].id;
        setToc(curId);
      }, { passive: true });
    }, 0);
    const offPhotos = K.on("photos", () => { if (!body.isConnected) { offPhotos(); return; } drawPhotos(); drawSteps(); });

    let savedOk = false;
    const sheetApi = K.sheet({
      title: mine ? (src ? "マイレシピを編集" : "マイレシピを書く") : (src ? "レシピを編集" : "レシピを登録"),
      body,
      // 保存せずに閉じた（×・キャンセル・Esc・背景）→ この編集で追加した写真を片付ける。破棄の確認は core が1回だけ出す
      onClose: () => { if (!savedOk) uploaded.forEach((p) => releasePhoto(p, src ? src.id : null)); },
      actions: [
        { label: "キャンセル", kind: "ghost" },
        { label: "保存", kind: "primary", disabled: ro, onClick: async () => {
          const name = d.name.trim();
          drawLines(); updateCalc();
          if (!name) K.fieldError(nameInp, "料理名を入力してください");
          if (errPortions()) K.fieldError(porInp, errPortions());
          if (errPrice()) K.fieldError(priceInp, errPrice());
          const stepBad = d.steps.some((x) => x.timerRaw != null && x.timerRaw !== "" && (!isFinite(Number(x.timerRaw)) || Number(x.timerRaw) < 0)) ? "タイマーは0以上の数字で入力してください" : "";
          drawSteps();
          const bad = [name ? "" : "料理名を入力してください", errPortions(), errPrice()].concat(d.lines.map(errQty), d.lines.map(errUc), [stepBad], Object.values(infoErrs)).filter(Boolean);
          if (bad.length) {
            K.toast("入力を確認してください（" + bad.length + "か所）", "bad");
            K.focusFirstError(body);
            return false;
          }
          const lines = d.lines
            .filter((l) => String(l.name).trim() || n(l.qty) > 0)
            .map((l) => {
              const it = item(l.itemId);
              return { itemId: it ? it.id : null, name: String(l.name).trim() || (it ? it.name : ""), qty: n(l.qty), unit: String(l.unit || "").trim(), unitCost: it ? n(it.cost) : n(l.unitCost) };
            });
          const portions = Number(d.portionsRaw);
          const price = Math.round(n(d.priceRaw));
          const c = calc(lines, portions, price, false);
          if (!mine && c.costRate != null && c.costRate > 1) {
            const ok = await K.confirm("原価率が " + K.fmt.pct(c.costRate) + "（1人前原価 " + K.fmt.yen(c.cost) + " ／ 売価 " + K.fmt.yen(price) + "）で、売価を上回っています。分量・単位の入力間違いはありませんか？ このまま保存しますか？", "このまま保存");
            if (!ok) return false;
          }
          const extra = extraAlg.value.split(/[、,，\s]+/).map((x) => x.trim()).filter(Boolean);
          const allergens = Array.from(new Set(ALLERGENS.filter((a) => d.allergens.includes(a)).concat(extra)));
          const data = {
            name, category: d.category, portions, price, lines,
            cost: c.cost, costRate: c.costRate,
            steps: d.steps.map((x) => ({ text: x.text.trim(), point: x.point.trim(), timerMin: x.timerMin != null ? x.timerMin : null, photo: x.photo || null }))
              .filter((x) => x.text || x.point || x.photo || x.timerMin != null),
            allergens, notes: d.notes.trim(),
            photos: d.photos.map((p) => Object.assign({}, p, { caption: String(p.caption || "").trim() })),
            info: (() => {
              const o = {};
              INFO.concat(INFO_LONG).forEach((f) => {
                const v = d.info[f.k];
                if (!hasVal(v)) return;
                o[f.k] = f.t === "num" ? Math.max(0, n(v)) : String(v).trim();
              });
              return o;
            })(),
            notesLog: d.notesLog.map((x) => Object.assign({ at: x.at, staffId: x.staffId || null, text: String(x.text || "") }, x.photo ? { photo: x.photo } : {})),
            updatedAt: new Date().toISOString(),
          };
          if (src && src.source) data.source = src.source;
          if (mine) {
            data.tags = parseTags(tagInp.value);
            data.fav = !!(src && src.fav);
            if (src && src.shopId) data.shopId = src.shopId;
            data.createdAt = (src && src.createdAt) || data.updatedAt;
          }
          if (src) await store.put(src.id, data);
          else await store.add(data);
          savedOk = true;
          // 外した写真を片付ける（他のレシピが使っていなければ）
          const keep = new Set(data.photos.concat(data.steps.map((x) => x.photo).filter(Boolean)).map(photoKey));
          origPhotos.concat(uploaded).forEach((p) => { if (!keep.has(photoKey(p))) releasePhoto(p, src ? src.id : null); });
          K.toast(mine ? "マイレシピを保存しました" : "レシピを保存しました", "ok");
        } },
      ],
    });
    // 行の追加・削除・並べ替え・写真の追加など（ボタン操作）も「変更あり」として扱う
    body.addEventListener("click", (e) => {
      const b = e.target.closest("button, label.btn");
      if (b && !b.closest(".rcp-toc") && !b.closest(".rcp-phtile-img")) sheetApi.markDirty();
    });
  }

  /* ---------- 行き先窓口：クイックメモ → レシピの改訂メモ（v2.4） ---------- */
  // 本文とレシピ名の「共通する最長の文字列」でレシピを推測（2文字以上）
  function guessRecipe(text, list) {
    const t = String(text || "");
    let best = null, bestLen = 1;
    list.forEach((r) => {
      const nm = String(r.name || "");
      let L = 0;
      for (let i = 0; i < nm.length; i++) for (let j = i + bestLen + 1; j <= nm.length; j++) {
        if (t.includes(nm.slice(i, j))) { if (j - i > L) L = j - i; } else break;
      }
      if (L > bestLen) { bestLen = L; best = r; }
    });
    return best;
  }
  function handleRecipeLog(memo) {
    return new Promise((resolve) => {
      let saved = false;
      const entries = () => SHOP.list().map((r) => ({ store: SHOP, r, key: "shop:" + r.id }))
        .concat(MINE.list().map((r) => ({ store: MINE, r, key: "mine:" + r.id })));
      let selKey = null;
      const hasPhoto = !!(memo.photo && (memo.photo.id || memo.photo.local));
      const err = h("span", { class: "rcp-err", role: "alert" });
      const pickHost = h("div", { class: "rcp-pick", role: "radiogroup", "aria-label": "改訂メモを追加するレシピ" });
      const search = K.input({ type: "search", placeholder: "レシピ名で絞り込み", "aria-label": "レシピ名で絞り込み", onInput: () => drawPick() });
      const textInp = h("textarea", { class: "inp", value: String(memo.text || ""), "aria-label": "改訂メモの本文", placeholder: "例：漬け時間を40分に変更" });
      const photoChk = hasPhoto ? h("input", { type: "checkbox", checked: true }) : null;
      const hint = h("span", { class: "field-hint" });
      const doGuess = () => {
        if (selKey) return;
        const all = entries();
        const g = guessRecipe(memo.text, all.map((e) => e.r));
        if (g) { const e = all.find((x) => x.r === g); selKey = e.key; hint.textContent = "メモの本文から「" + (g.name || "") + "」（" + e.store.label + "）を選んでいます。違う場合は選び直してください。"; }
      };
      function drawPick() {
        pickHost.textContent = "";
        const all = entries();
        const q = search.value.trim().toLowerCase();
        const list = all.filter((e) => !q || String(e.r.name || "").toLowerCase().includes(q))
          .sort((a, b) => (a.key === selKey ? -1 : b.key === selKey ? 1 : a.store !== b.store ? (a.store === SHOP ? -1 : 1) : String(a.r.name || "").localeCompare(String(b.r.name || ""), "ja")));
        if (!all.length) { pickHost.appendChild(h("div", { class: "rcp-pick-empty", text: "レシピがまだありません。先にレシピタブで登録してください。" })); return; }
        if (!list.length) { pickHost.appendChild(h("div", { class: "rcp-pick-empty", text: "該当するレシピがありません" })); return; }
        list.forEach((e) => {
          const ph = recipePhotos(e.r)[0];
          pickHost.appendChild(h("button", { class: "rcp-pick-i", type: "button", role: "radio", attrs: { "aria-checked": String(e.key === selKey) },
            onClick: () => { selKey = e.key; err.textContent = ""; drawPick(); } },
            h("span", { class: "rcp-tthumb" }, ph ? photoImg(ph, "") : h("span", { class: "rcp-ph-none" })),
            h("span", { class: "rcp-pick-n", text: e.r.name || "（名前なし）" }),
            h("span", { class: "chip", text: e.store === SHOP ? "店" : "マイ" }),
            h("span", { class: "chip", text: e.r.category || "その他" })));
        });
      }
      // レシピタブを開いていなくても一覧が取れるよう、このシートの間だけ購読
      const off1 = K.watch("recipes", () => { shopLoaded = true; doGuess(); drawPick(); });
      const off2 = K.my.watch("recipes", () => { doGuess(); drawPick(); });
      doGuess(); drawPick();
      const body = h("div", { class: "stack", style: { gap: "14px" } },
        h("div", { class: "field" }, h("span", { class: "field-label", text: "レシピ（店のレシピ・マイレシピ）" }), search, pickHost, err, hint),
        K.field("改訂メモの本文", textInp, "記入者：" + K.staffName(memo.staffId || K.currentStaffId())),
        hasPhoto ? h("div", { class: "row" },
          h("span", { class: "rcp-memo-ph" }, photoImg(memo.photo, "")),
          h("label", { class: "rcp-chk" }, photoChk, "写真も残す")) : null);
      K.sheet({
        title: "レシピの改訂メモに追加",
        body,
        onClose: () => { off1(); off2(); resolve(saved); },
        actions: [
          { label: "閉じる", kind: "ghost" },
          { label: "改訂メモに追加", kind: "primary", onClick: async () => {
            const e = selKey && entries().find((x) => x.key === selKey);
            if (!e) { err.textContent = "レシピを選んでください"; K.toast("レシピを選んでください", "bad"); return false; }
            if (e.store.ro()) { err.textContent = "店のレシピに書き込むには編集権限が必要です"; K.toast("店のレシピに書き込むには編集権限が必要です", "bad"); return false; }
            const text = textInp.value.trim();
            if (!text) { K.toast("本文を入力してください", "bad"); textInp.focus(); return false; }
            const entry = { at: new Date().toISOString(), staffId: memo.staffId || K.currentStaffId() || null, text };
            if (hasPhoto && photoChk.checked) entry.photo = memo.photo;
            const logArr = (Array.isArray(e.r.notesLog) ? e.r.notesLog : []).concat(entry);
            await e.store.patch(e.r.id, { notesLog: logArr, updatedAt: new Date().toISOString() });
            saved = true;
            K.toast("「" + (e.r.name || "レシピ") + "」（" + e.store.label + "）の改訂メモに追加しました", "ok");
          } },
        ],
      });
    });
  }
  K.provide("recipe.log", { label: "レシピの改訂メモに追加", icon: "book", order: 30, handle: handleRecipeLog });

  /* ---------- 店のレシピ・食材の購読（読み込み時に1回だけ）→ ナビのバッジはタブを開かなくても更新 ---------- */
  const updateBadge = () => K.badge("recipe", recipes.filter((r) => isStale(r)).length, "warn");
  K.watch("recipes", (rows) => { recipes = rows; shopLoaded = true; updateBadge(); renderList(); });
  K.watch("items", () => { updateBadge(); renderList(); });

  /* ---------- 仕込みリスト（v3.0：prep/p-YYYY-MM-DD） ---------- */
  const prepId = (date) => "p-" + date;
  const prepDoc = (date) => K.getDoc("prep", prepId(date));
  const lineId = () => "l" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  let prepDate = K.today();
  let prepHost = null;
  const prepBusy = new Set();
  // 書き込み直前に最新を読み直してから更新（共有モードの取りこぼし防止）
  async function writePrep(date, fn) {
    if (K.readOnly()) { K.toast("閲覧のみのため保存できません", "bad"); return false; }
    const cur = prepDoc(date);
    const base = cur ? JSON.parse(JSON.stringify(cur)) : { date, covers: null, basis: "なし", lines: [], staffId: K.currentStaffId() || null, createdAt: new Date().toISOString() };
    delete base.id;
    const next = fn(base);
    if (next === false) return false;
    next.updatedAt = new Date().toISOString();
    await W.put("prep", prepId(date), next);
    return true;
  }
  async function togglePrepLine(date, id) {
    const key = date + "/" + id;
    if (prepBusy.has(key)) return;
    prepBusy.add(key);
    try {
      let nowDone = false;
      const ok = await writePrep(date, (d) => {
        const l = d.lines.find((x) => x.id === id); if (!l) return false;
        l.done = !l.done; nowDone = l.done;
        l.doneBy = l.done ? K.currentStaffId() || null : null; l.doneAt = l.done ? new Date().toISOString() : null;
        return d;
      });
      if (ok) {
        const l = (prepDoc(date) || { lines: [] }).lines.find((x) => x.id === id);
        K.toast((l ? l.name : "") + (nowDone ? " 完了" : " 未完了に戻しました"), "ok", { action: { label: "元に戻す", onClick: () => togglePrepLine(date, id) } });
      }
    } finally { prepBusy.delete(key); }
  }
  // 予測（D の sales.forecast）× レシピの仕込み単位で行を作る。計算は D に任せる
  async function buildFromForecast(date, btn) {
    const f = K.ask("sales.forecast", { date });
    const by = f && f.byRecipe && typeof f.byRecipe === "object" ? f.byRecipe : null;
    const ids = by ? Object.keys(by).filter((id) => n(by[id]) > 0 && SHOP.get(id)) : [];
    if (!ids.length) {
      K.toast("売上の記録が増えると自動で作れます。いまは下の「行を追加」から手動で追加してください", "bad");
      return;
    }
    const cur = prepDoc(date);
    if (cur && (cur.lines || []).length) {
      const ls = cur.lines || [];
      const nMan = ls.filter((l) => l.manual).length;
      const nDone = ls.filter((l) => !l.manual && l.done).length;
      const nEd = ls.filter((l) => !l.manual && !l.done && l.edited).length;
      const nRe = ls.filter((l) => !l.manual && !l.done && !l.edited).length;
      const keepTxt = [nMan ? "手動で追加した行 " + nMan + "件" : "", nDone ? "完了済み " + nDone + "件" : "", nEd ? "数量を手で直した行 " + nEd + "件" : ""].filter(Boolean).join("・");
      const ok = await K.confirm("仕込みリストを予測から作り直します。" + (nRe ? "予測の行 " + nRe + "件を最新の予測で置き換えます。" : "") + (keepTxt ? keepTxt + "はそのまま残します。" : "") + "よろしいですか？", "作り直す", { danger: false });
      if (!ok) return;
    }
    if (btn) btn.disabled = true;
    try {
      await writePrep(date, (d) => {
        // 手動行はそのまま残す（自動行とは別扱い）。自動行は完了済み・数量を手で直した行だけ残し、そのレシピは作り直さない
        const keep = (d.lines || []).filter((l) => l.manual || l.done || l.edited);
        const keepRecipes = new Set(keep.filter((l) => !l.manual && l.recipeId).map((l) => l.recipeId));
        const auto = ids.filter((id) => !keepRecipes.has(id)).map((id) => {
          const r = SHOP.get(id);
          const por = Math.max(1, Math.round(n(r.portions)) || 1);
          const qty = Math.ceil(n(by[id]) / por) * por;
          return { id: lineId(), recipeId: id, name: r.name || "", qty, unit: "人前", portions: por, done: false, doneBy: null, doneAt: null, forecast: Math.round(n(by[id])) };
        }).sort((a, b) => String(a.name).localeCompare(String(b.name), "ja"));
        d.lines = keep.concat(auto);
        d.covers = f.covers != null ? f.covers : null;
        d.basis = f.basis || "なし";
        d.staffId = K.currentStaffId() || d.staffId || null;
        return d;
      });
      K.toast("予測から仕込みリストを作りました", "ok");
    } finally { if (btn) btn.disabled = false; }
  }
  // 材料の合計：各行の人前 ÷ レシピの portions × レシピの分量 を itemId（なければ名前+単位）ごとに合算
  function materialTotals(doc) {
    const m = new Map();
    (doc.lines || []).forEach((pl) => {
      const r = pl.recipeId && SHOP.get(pl.recipeId);
      if (!r) return;
      const mult = n(pl.qty) / Math.max(1, n(r.portions) || 1);
      (r.lines || []).forEach((l) => {
        const it = item(l.itemId);
        const key = it ? "i:" + it.id : "n:" + (l.name || "") + "|" + (l.unit || "");
        const cur = m.get(key) || { name: it ? it.name : l.name, unit: it ? it.unit || l.unit : l.unit, qty: 0, stock: it ? n(it.stock) : null, done: 0 };
        cur.qty += n(l.qty) * mult;
        m.set(key, cur);
      });
    });
    return Array.from(m.values()).sort((a, b) => String(a.name).localeCompare(String(b.name), "ja"));
  }
  const basisText = (doc) => !doc || !doc.basis || doc.basis === "なし" ? "" : (doc.basis === "予約" ? "予約 " : "曜日平均 ") + (doc.covers != null ? doc.covers + "名" : "") + " から予測";

  function renderPrep() {
    if (!prepHost) return;
    const ro = K.readOnly();
    const today = K.today(), tomorrow = K.addDays(today, 1);
    if (prepDate !== today && prepDate !== tomorrow) prepDate = today;
    const date = prepDate;
    const doc = prepDoc(date);
    const lines = doc ? doc.lines || [] : [];
    const done = lines.filter((l) => l.done).length;
    prepHost.textContent = "";
    const mkBtn = h("button", { class: "btn primary", attrs: { "data-write": "" }, disabled: ro, onClick: (e) => buildFromForecast(date, e.currentTarget) }, K.icon("chart"), lines.length ? "予測から作り直す" : "予測から作成");
    prepHost.append(
      h("div", { class: "rcp-head" }, h("h2", { class: "sec-title", text: "仕込みリスト" }), mkBtn),
      h("div", { class: "rcp-prep-top" },
        h("div", { class: "seg", role: "group", "aria-label": "日付" },
          [{ d: today, l: "今日" }, { d: tomorrow, l: "明日" }].map((o) => h("button", { class: "seg-btn", type: "button", text: o.l, attrs: { "aria-pressed": String(date === o.d) }, onClick: () => { prepDate = o.d; renderPrep(); } }))),
        h("span", { class: "rcp-prep-date", text: K.fmt.date(date) }),
        doc && basisText(doc) ? h("span", { class: "rcp-prep-basis", text: basisText(doc) }) : null));
    if (lines.length) {
      const pct = Math.round(done / lines.length * 100);
      prepHost.appendChild(h("div", { class: "rcp-prog" },
        h("div", { class: "rcp-prog-t" }, h("span", null, "進み具合"), h("span", { class: "num", text: done + " / " + lines.length + "（" + pct + "%）" })),
        h("div", { class: "bar", attrs: { role: "progressbar", "aria-valuemin": "0", "aria-valuemax": String(lines.length), "aria-valuenow": String(done) } }, h("i", { class: done === lines.length ? "is-done" : "", style: { width: pct + "%" } }))));
      const list = h("div", { class: "list rcp-pl" });
      lines.forEach((l) => {
        const qtyI = K.input({ type: "number", value: l.qty, min: 0, step: "any", inputmode: "decimal", class: "inp num", "aria-label": l.name + " の数量", disabled: ro || null });
        qtyI.addEventListener("change", async () => {
          const v = qtyI.value.trim();
          if (v === "" || !isFinite(Number(v)) || Number(v) < 0) { qtyI.value = l.qty; K.fieldError(qtyI, "0以上の数字で入力してください（元の値に戻しました）"); return; }
          if (Number(v) === n(l.qty)) return;
          await writePrep(date, (d) => { const x = d.lines.find((y) => y.id === l.id); if (!x) return false; x.qty = Number(v); if (!x.manual) x.edited = true; return d; });
        });
        const sub = l.done && l.doneAt
          ? "完了 " + fmtAt(l.doneAt).slice(-5) + (l.doneBy ? "・" + K.staffName(l.doneBy) : "")
          : l.manual ? "手動で追加" : l.edited ? "予測 " + (l.forecast != null ? l.forecast + "食" : "") + " → 数量を手で修正（作り直しても残ります）" : l.forecast != null ? "予測 " + l.forecast + "食 → 仕込み単位 " + (l.portions || 1) + "人前で切り上げ" : "";
        list.appendChild(h("div", { class: "rcp-pl-i" + (l.done ? " is-done" : "") },
          h("button", { class: "rcp-chkbtn", type: "button", disabled: ro, attrs: { "aria-pressed": String(!!l.done) }, "aria-label": l.name + (l.done ? " を未完了に戻す" : " を完了にする"), onClick: () => togglePrepLine(date, l.id) }, K.icon("check")),
          h("div", { class: "rcp-pl-main" },
            l.recipeId && SHOP.get(l.recipeId)
              ? h("button", { class: "rcp-pl-name", type: "button", style: { background: "none", border: "0", padding: "0", textAlign: "left", cursor: "pointer", color: "inherit", font: "inherit", fontWeight: "700" }, onClick: () => openDetail(l.recipeId, SHOP), text: l.name })
              : h("span", { class: "rcp-pl-name", text: l.name }),
            sub ? h("span", { class: "rcp-pl-sub", text: sub }) : null),
          h("div", { class: "field rcp-pl-qty" }, h("div", { class: "rcp-sfx" }, qtyI, h("span", { class: "rcp-unit", text: l.unit || "" }))),
          h("button", { class: "icon-btn danger", type: "button", disabled: ro, "aria-label": l.name + " の行を削除", onClick: async () => {
            const removed = JSON.parse(JSON.stringify(l));
            const ok = await writePrep(date, (d) => { d.lines = d.lines.filter((y) => y.id !== l.id); return d; });
            if (ok) K.toast("「" + l.name + "」を削除しました", "ok", { action: { label: "元に戻す", onClick: () => writePrep(date, (d) => { d.lines.push(removed); return d; }) } });
          } }, K.icon("trash"))));
      });
      prepHost.appendChild(list);
      // 材料の合計（折りたたみ）
      const mats = materialTotals(doc);
      if (mats.length) {
        prepHost.appendChild(h("details", { class: "rcp-mat card" },
          h("summary", null, K.icon("chev"), "材料の合計（" + mats.length + "品目）", h("span", { class: "rcp-hint", text: "レシピの分量 × 仕込み人前" })),
          h("div", { class: "tblwrap" }, h("table", { class: "tbl" },
            h("thead", null, h("tr", null, h("th", { text: "材料" }), h("th", { class: "r", text: "必要量" }), h("th", { class: "r", text: "在庫" }))),
            h("tbody", null, mats.map((m) => h("tr", null,
              h("td", { text: m.name || "—" }),
              h("td", { class: "r" }, h("span", { class: "num", text: fmtQty(m.qty) }), h("span", { class: "rcp-u", text: " " + (m.unit || "") })),
              h("td", { class: "r" }, m.stock == null ? h("span", { class: "muted", text: "—" })
                : h("span", { class: "num" + (m.stock < m.qty ? " rcp-short" : ""), style: m.stock < m.qty ? { color: "var(--bad)", fontWeight: "700" } : null, text: fmtQty(m.stock) + (m.stock < m.qty ? " 不足" : "") })))))))));
      }
    } else {
      prepHost.appendChild(h("div", { class: "rcp-info" },
        "この日の仕込みリストはまだありません。「予測から作成」で売上予測からまとめて作るか、下の「行を追加」で手動で追加できます。",
        K.ask("sales.forecast", { date }) ? null : h("div", { class: "rcp-hint", style: { marginTop: "6px" }, text: "※ 売上の記録が増えると自動で作れます。" })));
    }
    // 手動行の追加
    const nameI = K.input({ placeholder: "例：だし（一番）・唐揚げ", "aria-label": "仕込む物", list: "rcp-prep-dl" });
    const qtyA = K.input({ type: "number", min: 0, step: "any", inputmode: "decimal", placeholder: "数量", class: "inp num", "aria-label": "数量" });
    const unitA = K.input({ value: "人前", "aria-label": "単位" });
    const dl = h("datalist", { id: "rcp-prep-dl" }, SHOP.list().map((r) => h("option", { value: r.name || "" })));
    const addBtn = h("button", { class: "btn", type: "button", disabled: ro, attrs: { "data-write": "" }, onClick: async () => {
      const name = nameI.value.trim();
      const v = qtyA.value.trim();
      let bad = false;
      if (!name) { K.fieldError(nameI, "仕込む物を入力してください"); bad = true; }
      if (v === "" || !isFinite(Number(v)) || Number(v) < 0) { K.fieldError(qtyA, "0以上の数字"); bad = true; }
      if (bad) { K.focusFirstError(prepHost); return; }
      addBtn.disabled = true;
      try {
        const r = SHOP.list().find((x) => x.name === name);
        await writePrep(date, (d) => { d.lines.push({ id: lineId(), recipeId: r ? r.id : null, name, qty: Number(v), unit: unitA.value.trim(), portions: r ? Math.max(1, n(r.portions) || 1) : null, done: false, doneBy: null, doneAt: null, manual: true }); return d; });
        K.toast("「" + name + "」を追加しました", "ok");
      } finally { addBtn.disabled = false; }
    } }, K.icon("plus"), "行を追加");
    prepHost.appendChild(h("div", { class: "card stack", style: { gap: "10px" } },
      h("p", { class: "rcp-h", text: "行を追加（手動）" }),
      h("div", { class: "rcp-padd" }, K.field("仕込む物", nameI), K.field("数量", qtyA), K.field("単位", unitA), addBtn), dl));
  }

  // 他の画面向けの問い合わせ（今日モード・ホーム用）
  K.answer("prep.status", (args) => {
    const date = (args && args.date) || K.today();
    const doc = prepDoc(date);
    const lines = doc ? doc.lines || [] : [];
    return { date, total: lines.length, done: lines.filter((l) => l.done).length, lines: lines.map((l) => ({ name: l.name, qty: l.qty, unit: l.unit || "", done: !!l.done })) };
  });

  // 今日モードの欄（大きな文字のチェックリスト）
  K.todaySection({
    key: "prep", title: "仕込み", icon: "knife", order: 10, span: 2,
    mount(el, ctx) {
      const host = h("div", { class: "rcp-today" });
      el.appendChild(host);
      const draw = () => {
        host.textContent = "";
        const date = K.today();
        const doc = prepDoc(date);
        const lines = doc ? doc.lines || [] : [];
        const done = lines.filter((l) => l.done).length;
        if (!lines.length) {
          host.append(h("p", { class: "rcp-info", text: "今日の仕込みリストはまだありません。" }),
            h("div", { class: "row" }, h("button", { class: "btn sm", type: "button", onClick: () => { if (ctx && ctx.close) ctx.close(); prepDate = date; K.go("recipe", "prep"); } }, K.icon("knife"), "仕込みリストを作る")));
          return;
        }
        const pct = Math.round(done / lines.length * 100);
        host.append(
          h("div", { class: "rcp-today-h" }, h("span", null, basisText(doc) || "今日の仕込み"), h("span", { class: "num", text: done + " / " + lines.length })),
          h("div", { class: "bar" }, h("i", { class: done === lines.length ? "is-done" : "", style: { width: pct + "%", background: done === lines.length ? "var(--ok)" : null } })),
          h("div", { class: "rcp-today-list" }, lines.slice().sort((a, b) => !!a.done - !!b.done).map((l) =>
            h("button", { class: "rcp-today-i" + (l.done ? " is-done" : ""), type: "button", disabled: K.readOnly(), attrs: { "aria-pressed": String(!!l.done) }, onClick: () => togglePrepLine(date, l.id) },
              h("span", { class: "rcp-chkbtn", attrs: { "aria-pressed": String(!!l.done) } }, K.icon("check")),
              h("span", { class: "rcp-today-n", text: l.name }),
              h("span", { class: "rcp-today-q num", text: fmtQty(l.qty) + " " + (l.unit || "") })))));
      };
      const off1 = K.watch("prep", draw);
      const off2 = K.on("day", draw);
      draw();
      return () => { off1(); off2(); };
    },
  });

  // クイックメモ → 仕込みリストに追加
  K.provide("prep.add", {
    label: "仕込みリストに追加", icon: "knife", order: 25,
    handle: (memo) => new Promise((resolve) => {
      let saved = false;
      const today = K.today(), tomorrow = K.addDays(today, 1);
      let date = today;
      const text = String(memo.text || "").trim();
      const g = guessRecipe(text, SHOP.list());
      const numM = text.match(/(\d+(?:\.\d+)?)\s*(人前|個|枚|本|kg|g|L|ml|袋|パック|バット)?/);
      const nameI = K.input({ value: g ? g.name : text.replace(/(\d+(?:\.\d+)?)\s*(人前|個|枚|本|kg|g|L|ml|袋|パック|バット)?/, "").trim(), "aria-label": "仕込む物", list: "rcp-prep-dl2" });
      const qtyI = K.input({ type: "number", min: 0, step: "any", inputmode: "decimal", class: "inp num", value: memo.qty != null ? memo.qty : numM ? numM[1] : "", "aria-label": "数量" });
      const unitI = K.input({ value: numM && numM[2] ? numM[2] : "人前", "aria-label": "単位" });
      const segB = [{ d: today, l: "今日" }, { d: tomorrow, l: "明日" }].map((o) => h("button", { class: "seg-btn", type: "button", text: o.l + "（" + K.fmt.md(o.d) + "）", dataset: { d: o.d }, attrs: { "aria-pressed": String(o.d === date) }, onClick: () => { date = o.d; segB.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.d === date))); } }));
      const body = h("div", { class: "stack", style: { gap: "14px" } },
        h("div", { class: "field" }, h("span", { class: "field-label", text: "日付" }), h("div", { class: "seg" }, segB)),
        K.field("仕込む物", nameI, g ? "本文からレシピ「" + g.name + "」を選んでいます" : null),
        h("div", { class: "grid2" }, K.field("数量", qtyI), K.field("単位", unitI)),
        h("datalist", { id: "rcp-prep-dl2" }, SHOP.list().map((r) => h("option", { value: r.name || "" }))));
      K.sheet({
        title: "仕込みリストに追加", body,
        onClose: () => resolve(saved),
        actions: [
          { label: "キャンセル", kind: "ghost" },
          { label: "追加", kind: "primary", disabled: K.readOnly(), onClick: async () => {
            const name = nameI.value.trim(); const v = qtyI.value.trim();
            let bad = false;
            if (!name) { K.fieldError(nameI, "仕込む物を入力してください"); bad = true; }
            if (v === "" || !isFinite(Number(v)) || Number(v) < 0) { K.fieldError(qtyI, "0以上の数字を入力してください"); bad = true; }
            if (bad) { K.focusFirstError(body); return false; }
            const r = SHOP.list().find((x) => x.name === name);
            const ok = await writePrep(date, (d) => { d.lines.push({ id: lineId(), recipeId: r ? r.id : null, name, qty: Number(v), unit: unitI.value.trim(), portions: r ? Math.max(1, n(r.portions) || 1) : null, done: false, doneBy: null, doneAt: null, manual: true }); return d; });
            if (!ok) return false;
            saved = true;
            K.toast("仕込みリスト（" + K.fmt.md(date) + "）に「" + name + "」を追加しました", "ok");
          } },
        ],
      });
    }),
  });

  K.watch("prep", () => renderPrep());
  K.on("day", () => renderPrep());

  /* ---------- マイページの欄（v2.5） ---------- */
  K.mypageSection({
    key: "my-recipes", title: "マイレシピ", icon: "book", order: 40,
    mount(el) {
      const host = h("div", { class: "stack", style: { gap: "10px" } });
      const note = h("span", { class: "rcp-note" });
      el.appendChild(host);
      function draw(rows) {
        host.textContent = "";
        note.textContent = "";
        note.append(K.icon("user"), K.my.note());
        const sorted = rows.slice().sort((a, b) => (!!b.fav - !!a.fav) || String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
        const btns = h("div", { class: "row" },
          h("button", { class: "btn sm", type: "button", onClick: () => { setView("mine"); K.go("recipe"); } }, K.icon("book"), "マイレシピを開く"),
          h("button", { class: "btn sm", type: "button", onClick: () => openEdit(null, MINE) }, K.icon("plus"), "新しく書く"));
        if (!rows.length) {
          host.append(K.empty("マイレシピはまだありません", "賄い・試作・自分の料理を、自分だけのレシピとして残せます。", "新しく書く", () => openEdit(null, MINE)), note);
          return;
        }
        const list = h("div", { class: "list rcp-mp-rows" });
        sorted.slice(0, 5).forEach((r) => {
          const ph = recipePhotos(r)[0];
          list.appendChild(h("button", { class: "li", type: "button", onClick: () => openDetail(r.id, MINE) },
            h("span", { class: "rcp-tthumb" }, ph ? photoImg(ph, "") : h("span", { class: "rcp-ph-none" }, K.icon("book"))),
            h("span", { class: "rcp-mp-main" },
              h("span", { class: "rcp-mp-name" }, r.fav ? h("span", { class: "rcp-star", "aria-label": "お気に入り", text: "★ " }) : null, r.name || "（名前なし）"),
              h("span", { class: "rcp-mp-sub" }, (r.category || "その他") + (r.updatedAt ? "・更新 " + fmtDay(r.updatedAt) : ""))),
            K.icon("chev")));
        });
        host.append(list);
        if (rows.length > 5) host.append(h("span", { class: "rcp-hint", text: "ほか " + (rows.length - 5) + " 件" }));
        host.append(btns, note);
      }
      K.my.watch("recipes", (rows) => draw(rows));
      K.on("staff", () => draw(K.my.list("recipes")));
    },
  });

  /* ---------- 登録 ---------- */
  K.register({
    key: "recipe", label: "レシピ", icon: "book", order: 3,
    mount(root) {
      viewBtns = [{ v: "shop", l: "店のレシピ" }, { v: "mine", l: "マイレシピ" }].map((o) => h("button", {
        class: "seg-btn", type: "button", text: o.l, dataset: { v: o.v }, attrs: { "aria-pressed": String(view === o.v) }, onClick: () => setView(o.v) }));
      headHost = h("div");
      viewbarEl = h("div", { class: "rcp-viewbar" }, h("div", { class: "seg", role: "group", "aria-label": "表示するレシピ" }, viewBtns));
      searchInp = K.input({ type: "search", placeholder: "料理名で検索", "aria-label": "レシピを検索", class: "inp rcp-search", onInput: (e) => { query = e.target.value; renderList(); } });
      sortHost = h("div", { class: "seg", role: "group", "aria-label": "並べ替え" });
      sumHost = h("div", { class: "sumbar rcp-sumbar", role: "group", "aria-label": "レシピの集計" });
      catHost = h("div", { class: "fchips", role: "group", "aria-label": "カテゴリで絞り込み" });
      tagHost = h("div", { class: "fchips", role: "group", "aria-label": "タグで絞り込み" });
      bandHost = h("div");
      listHost = h("div", { class: "stack", style: { gap: "10px" } });
      sumLine = h("p", { class: "rcp-sumline" });
      headHost.classList.add("rcp-titlerow", "rcp-o-title");
      sumHost.classList.add("rcp-o-sum");
      bandHost.classList.add("rcp-o-band");
      listHost.classList.add("rcp-o-list");
      root.appendChild(h("h1", { class: "page-title", text: "レシピ" }));
      K.subtabs(root, "recipe", [
        { id: "list", label: "レシピ", render(el) {
          el.append(
            headHost,
            sumHost,
            sumLine,
            bandHost,
            h("div", { class: "rcp-filters rcp-o-cats" }, catHost, tagHost),
            h("div", { class: "rcp-tools rcp-o-tools" }, searchInp, sortHost),
            listHost);
        } },
        { id: "prep", label: "仕込み", render(el) {
          prepHost = h("div", { class: "stack", style: { gap: "14px" } });
          el.appendChild(prepHost);
          renderPrep();
        } },
      ]);

      K.my.watch("recipes", (rows) => { myRecipes = rows; renderList(); });
      K.my.watch("recipeFav", () => renderList());
      K.my.watch("recipeNotes", () => {});
      K.on("settings", () => renderList());
      K.on("staff", () => renderList());
      K.on("readonly", () => renderList());
      renderList();
    },
  });
})();
