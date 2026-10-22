/* 厨房帳 mod-shift.js — 担当C：シフト・業務連絡。書き込みは staff / shifts / notes のみ。v2：白基調デザイン */
(function () {
  "use strict";
  const K = window.K;
  const W = K.scope("shift");
  const h = K.h;

  /* ---------- CSS（sft- 接頭辞のみ・白固定） ---------- */
  K.css("sft", `
${[0, 1, 2, 3, 4, 5].map((i) => `.sft-col${i}{--sft-c:var(--staff-${i + 1});--sft-cs:var(--staff-${i + 1}s);}`).join("\n")}
.sft-head { display: flex; align-items: center; gap: 8px 12px; flex-wrap: wrap; min-height: 44px; }
.sft-head .sec-title { margin-right: auto; }
.sft-count { font-family: var(--f-num); font-size: 13px; color: var(--muted); font-weight: 400; margin-left: 6px; }
.sft-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--sft-c); flex: none; display: inline-block; }

/* 選択チップ（共通 .fchip）。緊急トグルだけ赤 */
.sft-wrapchips { display: flex; gap: 8px; flex-wrap: wrap; }
.fchip.sft-urgent[aria-pressed="true"] { background: var(--bad-soft); border-color: var(--bad); color: var(--bad); }
.fchip:disabled { opacity: .4; cursor: not-allowed; }
.sft-wrapchips[aria-invalid="true"] { outline: 2px solid var(--bad); outline-offset: 4px; border-radius: 12px; }
.sft-wrapchips .fchip .sft-dot { width: 10px; height: 10px; }
@media (max-width: 559px) { .sft-filters { margin-inline: -16px; padding-inline: 16px; } }

/* 投稿欄（最初は1行、タップで展開） */
.sft-compose { padding: 12px; display: flex; flex-direction: column; gap: 12px; }
@media (min-width: 900px) { .sft-compose { padding: 16px; } }
.sft-compose textarea.inp { min-height: 44px; height: 44px; resize: none; overflow: hidden; padding-top: 9px; line-height: 1.5; }
.sft-compose:not(.sft-open) textarea.inp { white-space: nowrap; text-overflow: ellipsis; }
.sft-compose.sft-open textarea.inp { height: auto; min-height: 104px; resize: vertical; overflow: auto; }
.sft-compose:not(.sft-open) .sft-compose-more { display: none; }
.sft-compose-more { display: flex; flex-direction: column; gap: 12px; }
.sft-compose-foot { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.sft-compose-foot .sft-hint { flex: 1 1 12em; font-size: 12.5px; color: var(--muted); }
@media (max-width: 559px) { .sft-compose-foot { justify-content: flex-end; } .sft-compose-foot .sft-hint { flex-basis: 100%; } .sft-compose-foot .sft-post { flex: 1 1 auto; } }
.sft-hint.sft-warnhint { color: var(--warn); font-weight: 700; }
.sft-post { border-color: var(--accent); color: var(--accent); }
.sft-post .ico { color: var(--accent); }

/* 連絡カード */
.sft-notes { display: flex; flex-direction: column; gap: 10px; }
.sft-note { padding: 14px 14px 12px 16px; display: flex; flex-direction: column; gap: 8px; }
@media (min-width: 900px) { .sft-note { padding: 16px 18px 14px 20px; } }
.sft-note-top { display: flex; align-items: center; gap: 6px; min-height: 28px; }
.sft-note-tools { margin-left: auto; display: flex; gap: 0; margin-right: -10px; margin-top: -10px; margin-bottom: -6px; }
.sft-note-tools .icon-btn[aria-pressed="true"] { color: var(--accent); }
.sft-note-text { white-space: pre-wrap; word-break: break-word; font-size: 16px; line-height: 1.85; margin: 0; color: var(--ink); }
.sft-note-foot { display: flex; align-items: flex-end; gap: 10px; flex-wrap: wrap; padding-top: 4px; }
.sft-note-meta { flex: 1 1 14em; min-width: 0; display: flex; flex-direction: column; gap: 2px; font-size: 12.5px; color: var(--muted); line-height: 1.5; }
.sft-note-meta b { color: var(--ink-2); font-weight: 700; }
.sft-note-meta .sft-sep { margin: 0 6px; color: var(--line-strong); }
.sft-unread { color: var(--warn); font-weight: 700; } .sft-allread { color: var(--ok); font-weight: 700; }
.btn.sft-confirm { margin-left: auto; min-height: 44px; padding: 0 14px; }
.sft-confirm.sft-done { background: var(--ok-soft); border-color: var(--ok-soft); color: var(--ok); opacity: 1; }
.sft-confirm:not(.sft-done) .ico { color: var(--accent); }
@media (max-width: 559px) { .sft-confirm { flex: 1 1 100%; } }
.sft-photo { display: block; width: 96px; height: 72px; padding: 0; border: 1px solid var(--line); border-radius: var(--r-sm); overflow: hidden; background: var(--surface-2); cursor: zoom-in; }
.sft-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
.sft-photo-big { display: block; width: 100%; max-height: 70vh; object-fit: contain; border-radius: var(--r-sm); background: var(--surface-2); }
.sft-photo-ng { display: grid; place-items: center; width: 100%; height: 100%; min-height: 72px; font-size: 12px; color: var(--muted); text-align: center; padding: 4px; }
.sft-memo-photo { display: flex; align-items: center; gap: 12px; }
.sft-memo-photo .sft-photo { cursor: default; }
.sft-my { display: flex; flex-direction: column; gap: 14px; }
.sft-my-next { display: flex; flex-direction: column; gap: 2px; padding: 14px 16px; border-radius: var(--r); background: var(--accent-soft); }
.sft-my-next .lbl { font-size: 12.5px; font-weight: 700; color: var(--accent); }
.sft-my-next .val { font: 600 20px/1.35 var(--f-num); font-variant-numeric: tabular-nums; color: var(--ink); }
.sft-my-next .sub { font-size: 12.5px; color: var(--ink-2); }
@media (min-width: 900px) { .sft-my-next .val { font-size: 24px; } }
.sft-my-h { display: flex; align-items: baseline; gap: 8px; font-weight: 700; font-size: 14px; color: var(--ink-2); margin: 0; }
.sft-my-h .sft-count { margin-left: auto; }
.sft-my-row { gap: 10px; min-height: 52px; }
.sft-my-row.sft-is-today { background: var(--accent-soft); }
.sft-my-date { width: 72px; flex: none; font-weight: 700; font-size: 14px; }
.sft-my-date .num { font-size: 15px; }
.sft-my-today { display: block; font-size: 12px; color: var(--accent); line-height: 1.2; }
.sft-my-times { display: flex; flex-direction: column; gap: 0; }
.sft-my-time { font-family: var(--f-num); font-variant-numeric: tabular-nums; font-weight: 600; white-space: nowrap; }
.sft-my-row .sft-grow { flex: 1 1 auto; min-width: 0; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.sft-my-hrs { font: 600 13px var(--f-num); color: var(--muted); white-space: nowrap; }
.sft-my-note { cursor: pointer; align-items: center; }
.sft-my-note:hover { background: #f8f9fb; }
.sft-my-note .sft-grow { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; align-items: stretch; gap: 2px; }
.sft-my-note-text { width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--ink); }
.sft-my-note .btn.sm { min-height: 44px; flex: none; }
.sft-my-empty { font-size: 13.5px; color: var(--muted); padding: 12px 14px; }
@media (max-width: 559px) { .sft-my-note { flex-wrap: wrap; } .sft-my-note .sft-grow { flex-basis: 100%; } .sft-my-note .btn.sm { width: 100%; } }
/* 衛生記録 */
.sft-hyg-list { display: flex; flex-direction: column; gap: 10px; }
.sft-hyg-row { display: flex; flex-direction: column; gap: 8px; padding: 14px 16px; background: var(--surface); border: 1px solid var(--line); border-radius: var(--r); box-shadow: var(--shadow-sm); }
.sft-hyg-row.is-bad { border-color: var(--bad); box-shadow: inset 3px 0 0 var(--bad); }
.sft-hyg-name { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.sft-hyg-name b { font-size: 16px; }
.sft-hyg-range { font-size: 13px; color: var(--muted); }
.sft-hyg-last { font-size: 13px; color: var(--ink-2); }
.sft-hyg-last b { font: 600 15px var(--f-num); color: var(--ink); }
.sft-hyg-last b.sft-bad, .sft-bad { color: var(--bad) !important; }
.sft-hyg-ctl { display: flex; align-items: flex-start; gap: 8px; flex-wrap: wrap; }
.sft-hyg-infield { flex: 0 1 140px; min-width: 110px; }
.sft-hyg-inp { font: 600 20px var(--f-num) !important; text-align: right; }
.sft-hyg-inp.sft-hyg-out { border-color: var(--bad); color: var(--bad); box-shadow: 0 0 0 3px var(--bad-soft); }
.sft-hyg-unit { align-self: center; font-weight: 700; color: var(--muted); }
.sft-hyg-neg { width: 48px; padding: 0; font-size: 18px; }
.btn.sft-hyg-save, .btn.sft-hyg-rebtn { min-height: 44px; }
.sft-hyg-hrow { gap: 12px; }
.sft-hyg-htime { width: 48px; flex: none; color: var(--muted); font-weight: 600; }
.sft-hyg-hmain { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; }
.sft-hyg-judge { align-self: center; font-size: 13px; font-weight: 700; }
.sft-hyg-judge.is-bad { color: var(--bad); } .sft-hyg-judge.is-ok { color: var(--ok); }
.sft-hyg-checks { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.sft-hyg-check { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; min-height: 64px; padding: 6px; border: 1px solid var(--line-strong); border-radius: var(--r); background: var(--surface); color: var(--ink-2); font-weight: 700; font-size: 15px; cursor: pointer; }
.sft-hyg-check .ico { width: 20px; height: 20px; color: var(--line-strong); }
.sft-hyg-check[aria-pressed="true"] { background: var(--ok-soft); border-color: var(--ok); color: var(--ok); }
.sft-hyg-check[aria-pressed="true"] .ico { color: var(--ok); }
.sft-hyg-check small { font-size: 12px; font-weight: 400; color: var(--muted); }
.sft-hyg-check:disabled { opacity: .45; cursor: not-allowed; }
.sft-hyg-hist td, .sft-hyg-hist th { white-space: nowrap; }
.sft-hyg-cell { display: flex; flex-direction: column; font: 600 13px/1.5 var(--f-num); }
.sft-hyg-cell .is-miss { color: var(--line-strong); font-weight: 400; }
.sft-hyg-cell .sft-slot { font: 400 12px var(--f-body); color: var(--muted); margin-right: 4px; }
.sft-hyg-today { background: var(--accent-soft); }
.sft-tm-h { font-size: 15px; font-weight: 700; color: var(--ink-2); margin: 14px 0 8px; }
.sft-tm-h:first-child { margin-top: 0; }
.sft-tm-crew .li { gap: 10px; }
.sft-tm-crew .sft-tm-time { font: 600 18px var(--f-num); margin-left: auto; white-space: nowrap; flex: none; }
.sft-tm-crew .sft-dot { align-self: flex-start; margin-top: 9px; }
.sft-tm-who { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.sft-tm-who b { overflow-wrap: anywhere; }
.sft-tm-sub { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.sft-tm-note { display: flex; flex-direction: column; gap: 6px; align-items: stretch; }
.sft-tm-note p { margin: 0; white-space: pre-wrap; word-break: break-word; }
.sft-tm-ok { display: flex; align-items: center; gap: 8px; color: var(--ok); font-weight: 700; }
.sft-cleanup { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 12px 14px; border: 1px solid var(--warn-soft); background: var(--warn-soft); color: var(--warn); border-radius: var(--r); font-size: 13px; font-weight: 700; }

/* シフト：見出し行（スマホ：1行目＝週ナビ＋主操作、2行目＝今週・先週をコピー） */
.sft-weeknav { order: 1; display: flex; align-items: center; gap: 0; min-width: 0; }
.sft-weeknav .sec-title { font-family: var(--f-num); font-size: 16px; white-space: nowrap; padding: 0 2px; }
.sft-flip { transform: scaleX(-1); display: inline-grid; }
.sft-subrow { order: 2; flex: 1 1 auto; display: flex; align-items: center; gap: 8px; min-width: 0; }
.sft-subrow .sft-copy { margin-left: auto; }
.sft-head .sft-add-main { order: 3; }
.sft-short { display: none; }
@media (max-width: 559px) {
  .sft-head.sft-weekhead { gap: 4px 8px; }
  .sft-weekhead .sec-title { margin-right: 0; }
  .sft-weeknav { flex: 1 1 auto; margin-left: -10px; }
  .sft-head .sft-add-main { order: 2; padding: 0 14px; }
  .sft-subrow { order: 3; flex-basis: 100%; }
  .sft-long { display: none; } .sft-short { display: inline; }
}
.sft-weekhead .sec-title { margin-right: 0; }

/* 今日の出勤 */
.sft-today-strip { display: flex; align-items: center; gap: 8px 12px; flex-wrap: wrap; padding: 12px 16px; }
.sft-today-l { font-weight: 700; font-size: 13.5px; color: var(--ink); white-space: nowrap; }
.sft-today-list { display: flex; gap: 6px; flex-wrap: wrap; flex: 1 1 auto; min-width: 0; }
.sft-tag { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px 4px 8px; border-radius: 99px; background: var(--sft-cs); font-size: 13px; font-weight: 700; color: var(--ink); white-space: nowrap; }
.sft-tag .num { color: var(--ink); font-weight: 600; }
.sft-tag .sft-sub { color: var(--muted); font-weight: 400; font-size: 12px; }
@media (max-width: 559px) {
  .sft-today-strip { display: grid; grid-template-columns: minmax(0, 1fr); gap: 6px; padding: 10px 0 10px 14px; }
  .sft-today-list { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; padding-right: 12px; }
  .sft-today-list::-webkit-scrollbar { display: none; }
}

/* スマホ：日ごとのリスト／PC：スタッフ×曜日の表 */
.sft-daylist { display: flex; flex-direction: column; gap: 10px; }
.sft-board { display: none; }
@media (min-width: 768px) { .sft-daylist, .sft-mobile-only { display: none !important; } .sft-board { display: block; } }
.sft-day { background: var(--surface); border: 1px solid var(--line); border-radius: var(--r); box-shadow: var(--shadow-sm); overflow: hidden; }
.sft-day.sft-is-today { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent), var(--shadow-sm); }
.sft-day-head { display: flex; align-items: center; gap: 8px; padding: 4px 4px 4px 14px; min-height: 48px; background: var(--surface-2); border-bottom: 1px solid var(--line); }
.sft-day.sft-is-today .sft-day-head { background: var(--accent-soft); }
.sft-day-date { font-family: var(--f-num); font-weight: 600; font-size: 15px; }
.sft-dow { font-weight: 700; font-size: 13px; color: var(--ink-2); }
.sft-sun { color: var(--bad) !important; } .sft-sat { color: var(--info) !important; }
.sft-day-sum { margin-left: auto; font-size: 12px; color: var(--muted); font-family: var(--f-num); }
.sft-day-add { color: var(--accent); }
.sft-ent { display: flex; align-items: center; gap: 10px; width: 100%; border: 0; background: transparent; text-align: left; padding: 10px 14px; min-height: 56px; cursor: pointer; color: var(--ink); }
.sft-ent + .sft-ent { border-top: 1px solid var(--line); }
.sft-ent:hover:not(:disabled) { background: #f8f9fb; }
.sft-ent:disabled { cursor: default; }
.sft-ent-bar { width: 4px; align-self: stretch; border-radius: 2px; background: var(--sft-c); flex: none; }
.sft-ent-main { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; }
.sft-ent-name { font-weight: 700; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sft-ent-sub { font-size: 12.5px; color: var(--muted); }
.sft-ent-time { font-family: var(--f-num); font-variant-numeric: tabular-nums; font-weight: 600; font-size: 15px; white-space: nowrap; }
.sft-day-none { padding: 12px 14px; font-size: 13px; color: var(--muted); }

.sft-board .tblwrap { overflow-x: auto; }
.sft-grid { width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed; min-width: 720px; font-size: 13px; }
.sft-grid th, .sft-grid td { border-bottom: 1px solid var(--line); border-left: 1px solid var(--line); padding: 0; vertical-align: top; }
.sft-grid tr > :first-child { border-left: 0; }
.sft-grid thead th { background: var(--surface-2); font-size: 12.5px; font-weight: 700; color: var(--ink-2); padding: 8px 8px; text-align: left; white-space: nowrap; position: sticky; top: 0; }
.sft-grid thead th .num { font-size: 14px; color: var(--ink); margin-right: 4px; }
.sft-grid th.sft-is-today, .sft-grid td.sft-is-today { background: var(--accent-soft); }
.sft-grid thead th.sft-is-today { box-shadow: inset 0 3px 0 var(--accent); color: var(--accent); }
.sft-grid col.sft-c-staff { width: 150px; } .sft-grid col.sft-c-tot { width: 112px; }
.sft-grid tbody th { text-align: left; padding: 10px 12px; font-weight: 700; background: var(--surface); }
.sft-staffcell { display: flex; align-items: center; gap: 8px; min-width: 0; }
.sft-staffcell span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sft-staffcell-sub { font-size: 12px; color: var(--muted); font-weight: 400; margin-top: 2px; font-family: var(--f-num); }
.sft-cell { min-height: 64px; height: 100%; padding: 4px; display: flex; flex-direction: column; gap: 4px; }
.sft-cell-add { flex: 1 1 auto; min-height: 44px; border: 1px dashed transparent; border-radius: 6px; background: transparent; color: transparent; cursor: pointer; font-size: 18px; }
.sft-grid td:hover .sft-cell-add:not(:disabled), .sft-cell-add:focus-visible { border-color: var(--line-strong); color: var(--accent); }
.sft-block { display: flex; flex-direction: column; gap: 3px; width: 100%; text-align: left; border: 0; border-radius: 6px; padding: 6px 7px 7px; background: var(--sft-cs); color: var(--ink); cursor: pointer; min-height: 44px; }
.sft-block:hover:not(:disabled) { box-shadow: inset 0 0 0 1px var(--sft-c); }
.sft-block:disabled { cursor: default; }
.sft-block-time { display: flex; flex-wrap: wrap; column-gap: 0; font-family: var(--f-num); font-variant-numeric: tabular-nums; font-weight: 600; font-size: 13px; color: var(--ink); white-space: nowrap; }
.sft-block-sub { font-size: 12px; color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sft-track { position: relative; height: 4px; border-radius: 2px; background: rgba(20,24,33,.08); }
.sft-track i { position: absolute; top: 0; bottom: 0; border-radius: 2px; background: var(--sft-c); }
.sft-tot { padding: 10px 12px; text-align: right; font-family: var(--f-num); font-variant-numeric: tabular-nums; }
.sft-tot b { display: block; font-size: 14px; font-weight: 600; }
.sft-tot span { font-size: 12px; color: var(--muted); }
.sft-grid tfoot td, .sft-grid tfoot th { background: var(--surface-2); padding: 8px; font-size: 12px; color: var(--muted); border-bottom: 0; text-align: left; font-family: var(--f-num); }
.sft-grid tfoot .sft-tot { color: var(--ink); }
.sft-board-note { font-size: 12px; color: var(--muted); margin: 6px 2px 0; }
@media (max-width: 1099px) { .sft-grid col.sft-c-staff { width: 104px; } .sft-grid col.sft-c-tot { width: 80px; } .sft-cell { padding: 3px; } .sft-block { padding: 5px 5px 6px; } .sft-block-time { font-size: 12.5px; } .sft-grid thead th { padding: 8px 6px; } .sft-today-word { display: none; } .sft-staffcell-sub { display: none; } .sft-grid tbody th { padding: 8px 8px; } .sft-staffcell { align-items: flex-start; } .sft-staffcell .sft-dot { margin-top: 5px; } .sft-staffcell span:last-child { white-space: normal; overflow-wrap: anywhere; font-size: 13px; line-height: 1.4; } .sft-tot { padding: 10px 8px; } }

/* 内訳（スマホ） */
.sft-details summary { list-style: none; cursor: pointer; display: flex; align-items: center; gap: 6px; min-height: 44px; font-weight: 700; font-size: 14px; color: var(--ink-2); }
.sft-details summary::-webkit-details-marker { display: none; }
.sft-details summary .ico { width: 16px; height: 16px; transition: transform .15s; color: var(--muted); }
.sft-details[open] summary .ico { transform: rotate(90deg); }

/* スタッフ */
.sft-staff-li { gap: 12px; }
.sft-staff-name { flex: 1 1 auto; min-width: 0; font-weight: 700; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sft-staff-role { font-size: 12.5px; color: var(--ink-2); background: var(--surface-2); border-radius: 6px; padding: 3px 8px; white-space: nowrap; }
.sft-staff-wage { font-family: var(--f-num); font-variant-numeric: tabular-nums; text-align: right; min-width: 72px; white-space: nowrap; font-weight: 600; }
.sft-staff-wage small { color: var(--muted); font-weight: 400; font-size: 12px; margin-right: 2px; }
.sft-staff-li .ico { color: var(--muted); width: 18px; height: 18px; flex: none; }
.sft-retired .sft-staff-name, .sft-retired .sft-staff-wage { color: var(--muted); }
.sft-retired .sft-dot { opacity: .45; }
.sft-retired-wrap summary { font-size: 13px; font-weight: 700; color: var(--muted); }

/* シート内部品 */
.sft-pickgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; }
.sft-pick { justify-content: flex-start; gap: 8px; min-height: 52px; }
.sft-swatches { display: flex; gap: 10px; flex-wrap: wrap; }
.sft-swatch { width: 44px; height: 44px; border-radius: 50%; border: 0; background: var(--sft-cs); box-shadow: inset 0 0 0 2px var(--sft-c); cursor: pointer; position: relative; }
.sft-swatch::after { content: ""; position: absolute; inset: 12px; border-radius: 50%; background: var(--sft-c); }
.sft-swatch[aria-pressed="true"] { box-shadow: inset 0 0 0 2px var(--sft-c), 0 0 0 3px var(--surface), 0 0 0 5px var(--sft-c); }
.sft-toggle { display: flex; align-items: center; gap: 10px; min-height: 44px; cursor: pointer; font-weight: 700; font-size: 14px; }
.sft-toggle input { width: 20px; height: 20px; accent-color: var(--accent); }
.sft-calc { margin: 0; padding: 10px 12px; border-radius: var(--r-sm); background: var(--surface-2); font-size: 13px; color: var(--ink-2); }
`);

  /* ---------- 定数・ユーティリティ ---------- */
  const KINDS = ["連絡", "引き継ぎ", "仕込み", "衛生"];
  const ROLES = ["料理長", "調理", "仕込み", "洗い場", "ホール"];
  const STATIONS = ["焼き場", "揚げ場", "煮方", "刺し場", "仕込み", "洗い場", "ホール"];
  const MAX_NOTES = 200;
  const PRESETS = [
    { label: "ランチ", start: "10:00", end: "15:00", brk: 0 },
    { label: "ディナー", start: "17:00", end: "22:00", brk: 0 },
    { label: "通し", start: "10:00", end: "22:00", brk: 60 },
    { label: "仕込み", start: "08:00", end: "13:00", brk: 0 },
  ];
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const ro = () => K.readOnly();
  const WR = { "data-write": "" };
  const colorClass = (c) => "sft-col" + ((Number(c) || 0) % 6 + 6) % 6;
  const staffById = (id) => (id ? K.getDoc("staff", id) : null);
  const activeStaff = () => K.list("staff").filter((s) => s.active !== false).sort(byName);
  function byName(a, b) { return String(a.name || "").localeCompare(String(b.name || ""), "ja"); }
  const sName = (id) => (id ? (staffById(id) ? K.staffName(id) : "（削除済み）") : "未選択");
  const pad = (n) => String(n).padStart(2, "0");
  function localIso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function relTime(iso) {
    const t = new Date(iso);
    if (isNaN(t)) return "";
    const diff = (Date.now() - t.getTime()) / 60000;
    if (diff < 1) return "たった今";
    if (diff < 60) return Math.floor(diff) + "分前";
    if (diff < 60 * 24) return Math.floor(diff / 60) + "時間前";
    return K.fmt.date(localIso(t)) + " " + pad(t.getHours()) + ":" + pad(t.getMinutes());
  }
  const toggleBtn = (label, pressed, onClick, extraClass, n) =>
    h("button", { class: "fchip " + (extraClass || ""), type: "button", attrs: { "aria-pressed": String(!!pressed) }, onClick }, label, n != null ? h("span", { class: "n", text: String(n) }) : null);
  const dowClass = (d) => { const w = K.fmt.dow(d); return w === "日" ? "sft-sun" : w === "土" ? "sft-sat" : ""; };
  // 人数は staffId の重複を除く（分割勤務を2人と数えない）。違うときは「6人・8枠」
  const headcount = (list) => { const n = new Set(list.map((e) => e.staffId)).size; return n === list.length ? n + "人" : n + "人・" + list.length + "枠"; };
  const toMin = (t) => { const [a, b] = String(t).split(":").map(Number); return a * 60 + b; };

  // 写真：読み込み失敗時は灰色の枠＋文言
  function photoImg(photo, cls) {
    const img = h("img", { class: cls || "", src: K.photos.src(photo), alt: "連絡の写真", attrs: { loading: "lazy" } });
    img.addEventListener("error", () => img.replaceWith(h("span", { class: "sft-photo-ng", text: "写真を表示できません" })));
    return img;
  }
  function openPhoto(photo) {
    K.sheet({ title: "写真", body: photoImg(photo, "sft-photo-big"), actions: [{ label: "閉じる", kind: "ghost" }] });
  }

  async function markRead(noteId, sid) {
    const latest = K.getDoc("notes", noteId);
    const rb = (latest && latest.readBy) || [];
    if (rb.includes(sid)) { K.toast(K.staffName(sid) + "は確認済みです"); return; }
    try { await W.patch("notes", noteId, { readBy: rb.concat(sid) }); } catch (e) { return; }
    K.toast(K.staffName(sid) + "として確認しました", "ok", { action: { label: "元に戻す", onClick: async () => {
      const d = K.getDoc("notes", noteId);
      if (!d) return;
      try { await W.patch("notes", noteId, { readBy: (d.readBy || []).filter((x) => x !== sid) }); } catch (e) {}
    } } });
  }

  /* ---------- 状態 ---------- */
  const renders = {}; // pane id -> rerender fn
  const refresh = (...ids) => ids.forEach((id) => renders[id] && renders[id]());
  let weekStart = K.weekStart(K.today());
  let noteKind = KINDS[0];
  let noteUrgent = false;
  let noteFilter = "all";

  // ナビのバッジ：いまの担当者が未確認の緊急連絡数（担当者未選択なら誰も確認していない緊急連絡数）
  function updateBadge() {
    const cur = K.currentStaffId();
    const n = K.list("notes").filter((x) => x.priority === "urgent" && (cur ? !(x.readBy || []).includes(cur) : !(x.readBy || []).length)).length;
    K.badge("shift", n, "bad");
  }

  /* =====================================================================
     1. 業務連絡
     ===================================================================== */
  function renderNotes(el) {
    const listHost = h("div", { class: "sft-notes" });
    const filterHost = h("div", { class: "fchips sft-filters", role: "group", "aria-label": "表示の絞り込み" });
    const countEl = h("span", { class: "sft-count" });
    const hint = h("span", { class: "sft-hint" });
    const text = h("textarea", { class: "inp", placeholder: "例：冷蔵庫②が6℃。業者に連絡済み。", attrs: { rows: "1", "aria-label": "連絡の本文" } });
    const kindsHost = h("div", { class: "sft-wrapchips", role: "group", "aria-label": "種類" });
    const urgentHost = h("div");

    const postBtn = h("button", {
      class: "btn sft-post", type: "button", attrs: WR,
      onClick: async () => {
        const body = text.value.trim();
        if (!body) { K.fieldError(text, "本文を入力してください"); text.focus(); return; }
        const cur = K.currentStaffId();
        postBtn.disabled = true;
        try {
          await W.add("notes", {
            text: body, kind: noteKind, priority: noteUrgent ? "urgent" : "normal", pinned: false,
            staffId: cur || null, createdAt: new Date().toISOString(), readBy: cur ? [cur] : [],
          });
          text.value = ""; noteUrgent = false;
          setOpen(false);
          K.toast("投稿しました", "ok");
        } catch (e) { /* core が toast 済み */ }
        drawFormBits();
      },
    }, K.icon("send"), "投稿する");
    const cancelBtn = h("button", { class: "btn ghost", type: "button", text: "キャンセル", onClick: async () => {
      if (text.value.trim() && !(await K.confirm("書きかけの連絡を破棄しますか？", "破棄する"))) return;
      text.value = ""; K.clearErrors(form); setOpen(false); writeBtn.focus();
    } });

    const form = h("div", { class: "card sft-compose", attrs: WR },
      text,
      h("div", { class: "sft-compose-more" },
        h("div", { class: "row", style: "gap:8px" }, kindsHost, h("div", { class: "spacer" }), urgentHost),
        h("div", { class: "sft-compose-foot" }, hint, cancelBtn, postBtn)));
    function setOpen(open) { form.classList.toggle("sft-open", !!open); form.hidden = !open; writeBtn.setAttribute("aria-expanded", String(!!open)); }
    const writeBtn = h("button", { class: "btn primary", type: "button", attrs: Object.assign({ "aria-expanded": "false" }, WR), onClick: () => { setOpen(true); text.focus(); text.scrollIntoView({ block: "center", behavior: "smooth" }); } }, K.icon("edit"), "連絡を書く");
    setOpen(false);

    function drawFormBits() {
      kindsHost.textContent = "";
      KINDS.forEach((k) => kindsHost.appendChild(toggleBtn(k, noteKind === k, () => { noteKind = k; drawFormBits(); })));
      urgentHost.textContent = "";
      urgentHost.appendChild(toggleBtn(noteUrgent ? "緊急 ON" : "緊急", noteUrgent, () => { noteUrgent = !noteUrgent; drawFormBits(); }, "sft-urgent"));
      const cur = K.currentStaffId();
      hint.textContent = cur ? "投稿者：" + K.staffName(cur) : "ヘッダーで担当者を選んでください（未選択でも投稿できます）";
      hint.classList.toggle("sft-warnhint", !cur);
      postBtn.disabled = ro();
      text.disabled = ro();
      writeBtn.disabled = ro();
    }

    function drawFilters() {
      filterHost.textContent = "";
      const all = K.list("notes");
      const cur = K.currentStaffId();
      const cnt = { all: all.length, unread: all.filter((n) => (cur ? !(n.readBy || []).includes(cur) : !(n.readBy || []).length)).length };
      KINDS.forEach((k) => { cnt[k] = all.filter((n) => (KINDS.includes(n.kind) ? n.kind : "連絡") === k).length; });
      [["all", "すべて"], ["unread", "未確認のみ"]].concat(KINDS.map((k) => [k, k])).forEach(([id, label]) =>
        filterHost.appendChild(toggleBtn(label, noteFilter === id, () => { noteFilter = id; drawFilters(); drawList(); }, "", cnt[id])));
    }

    function drawList() {
      listHost.textContent = "";
      const cur = K.currentStaffId();
      const all = K.list("notes").slice();
      const staffActive = activeStaff();
      const myUnread = all.filter((n) => (cur ? !(n.readBy || []).includes(cur) : !(n.readBy || []).length)).length;
      countEl.textContent = all.length ? all.length + "件" + (myUnread ? "・未確認 " + myUnread : "") : "";
      if (all.length > MAX_NOTES) {
        const removable = all.filter((n) => !n.pinned).length;
        listHost.appendChild(h("div", { class: "sft-cleanup" },
          h("span", { style: "flex:1 1 14em", text: "連絡が " + all.length + " 件あります。古い連絡（ピン留め以外）を整理すると表示が軽くなります。" }),
          h("button", { class: "btn sm", type: "button", attrs: WR, disabled: ro() || !removable, text: "古い連絡を整理", onClick: cleanup })));
      }
      let rows = all;
      if (noteFilter === "unread") rows = rows.filter((n) => (cur ? !(n.readBy || []).includes(cur) : !(n.readBy || []).length));
      else if (KINDS.includes(noteFilter)) rows = rows.filter((n) => n.kind === noteFilter);
      rows.sort((a, b) =>
        (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) ||
        (b.priority === "urgent" ? 1 : 0) - (a.priority === "urgent" ? 1 : 0) ||
        String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

      if (!all.length) {
        listHost.appendChild(K.empty("まだ連絡はありません", "引き継ぎ・仕込みの指示・衛生の注意などがここに新しい順で並びます。上の「連絡を書く…」に本文を入れて「投稿する」を押すと最初の1件が追加されます。"));
        return;
      }
      if (!rows.length) {
        listHost.appendChild(K.empty(noteFilter === "unread" ? "未確認の連絡はありません" : "この種類の連絡はありません",
          noteFilter === "unread" && !cur ? "ヘッダーで担当者を選ぶと、自分が未確認の連絡だけを表示できます。" : "絞り込みを「すべて」に戻すと全件を表示します。"));
        return;
      }
      rows.forEach((n) => listHost.appendChild(noteCard(n, cur, staffActive)));
    }

    function noteCard(n, cur, staffActive) {
      const readBy = n.readBy || [];
      const readNames = readBy.map(sName);
      const unread = staffActive.filter((s) => !readBy.includes(s.id)).length;
      const iRead = cur && readBy.includes(cur);
      const urgent = n.priority === "urgent";
      const kind = KINDS.includes(n.kind) ? n.kind : "連絡";
      const confirmBtn = h("button", {
        class: "btn sm sft-confirm" + (iRead ? " sft-done" : ""), type: "button", attrs: WR,
        disabled: ro() || iRead,
        onClick: () => (cur ? markRead(n.id, cur) : pickReader(n)),
      }, K.icon("check"), iRead ? K.staffName(cur) + "は確認済み" : cur ? K.staffName(cur) + "として確認" : "確認する（名前を選ぶ）");
      return h("article", { class: "card sft-note" + (urgent ? " is-flag bad" : n.pinned ? " is-flag" : "") },
        h("div", { class: "sft-note-top" },
          urgent ? h("span", { class: "chip bad" }, K.icon("alert"), "緊急") : null,
          h("span", { class: "chip", text: kind }),
          n.pinned ? h("span", { class: "chip" }, K.icon("pin"), "ピン留め") : null,
          h("div", { class: "sft-note-tools" },
            h("button", {
              class: "icon-btn", type: "button", title: n.pinned ? "ピンを外す" : "ピン留め",
              attrs: Object.assign({ "aria-pressed": String(!!n.pinned), "aria-label": n.pinned ? "ピンを外す" : "ピン留め" }, WR), disabled: ro(),
              onClick: async () => { try { await W.patch("notes", n.id, { pinned: !n.pinned }); } catch (e) {} },
            }, K.icon("pin")),
            h("button", {
              class: "icon-btn danger", type: "button", title: "削除", attrs: Object.assign({ "aria-label": "この連絡を削除" }, WR), disabled: ro(),
              onClick: async () => {
                if (!(await K.confirm("この連絡を削除します。元に戻せません。", "削除する"))) return;
                try { await W.del("notes", n.id); K.toast("削除しました"); } catch (e) {}
              },
            }, K.icon("trash")))),
        h("p", { class: "sft-note-text", text: n.text || "" }),
        n.photo ? h("button", { class: "sft-photo", type: "button", "aria-label": "写真を拡大", onClick: () => openPhoto(n.photo) }, photoImg(n.photo)) : null,
        h("div", { class: "sft-note-foot" },
          h("div", { class: "sft-note-meta" },
            h("div", null, h("b", { text: sName(n.staffId) }), h("span", { class: "sft-sep", text: "·" }), h("span", { text: relTime(n.createdAt) }),
              staffActive.length ? h("span", { class: "sft-sep", text: "·" }) : null,
              staffActive.length ? (unread ? h("span", { class: "sft-unread", text: "未確認 " + unread + "人" }) : h("span", { class: "sft-allread", text: "全員確認済み" })) : null),
            readNames.length ? h("div", { text: "確認：" + readNames.join("、") }) : null),
          confirmBtn));
    }

    // 担当者未選択時：誰として確認するかを選ばせる（共用端末での名義違い防止）
    function pickReader(n) {
      const rb = n.readBy || [];
      const remember = h("input", { type: "checkbox", checked: true });
      let close = null;
      const staff = activeStaff();
      const body = h("div", { class: "stack" },
        h("p", { class: "small muted", style: "margin:0", text: "誰として確認しますか？（確認済みの人は押せません）" }),
        staff.length ? h("div", { class: "sft-pickgrid" }, staff.map((s) => h("button", {
          class: "btn sft-pick " + colorClass(s.color), type: "button", disabled: rb.includes(s.id),
          onClick: async () => {
            if (remember.checked) K.setCurrentStaff(s.id);
            if (close) close();
            await markRead(n.id, s.id);
          },
        }, h("span", { class: "sft-dot" }), h("span", { text: s.name }), rb.includes(s.id) ? h("span", { class: "small muted", text: "確認済" }) : null)))
          : K.empty("在籍スタッフがいません", "「スタッフ」タブで登録すると確認できます。"),
        h("label", { class: "sft-toggle" }, remember, h("span", { text: "この端末の「いまの担当者」にも設定する" })));
      close = K.sheet({ title: "確認する人を選ぶ", body, actions: [{ label: "キャンセル", kind: "ghost" }] });
    }

    async function cleanup() {
      const all = K.list("notes").slice();
      const over = all.length - MAX_NOTES;
      const victims = all.filter((n) => !n.pinned)
        .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")))
        .slice(0, Math.max(0, over));
      if (!victims.length) return;
      if (!(await K.confirm("古い順に " + victims.length + " 件の連絡（ピン留め以外）を削除して " + MAX_NOTES + " 件に整理します。元に戻せません。", "整理する"))) return;
      try {
        for (const v of victims) await W.del("notes", v.id);
        K.toast(victims.length + " 件を整理しました", "ok");
      } catch (e) {}
    }

    el.append(
      h("div", { class: "sft-head" }, h("h2", { class: "sec-title" }, "業務連絡", countEl), writeBtn),
      form, filterHost, listHost);
    renders.notes = () => { drawFormBits(); drawFilters(); drawList(); };
    renders.notes();
    setInterval(() => { if (!el.hidden && el.isConnected) drawList(); }, 60000);
  }

  /* =====================================================================
     2. シフト
     ===================================================================== */
  const weekDocId = (ws) => "w-" + ws;
  const weekEntries = (ws) => {
    const d = K.getDoc("shifts", weekDocId(ws));
    return (d && Array.isArray(d.entries)) ? d.entries.slice() : [];
  };
  async function saveWeek(ws, entries) {
    entries.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
    await W.put("shifts", weekDocId(ws), { weekStart: ws, entries });
  }

  // 今日の出勤者（前日開始の日またぎ勤務は _carry 付きで先頭に）
  function todayCrew(today) {
    const yday = K.addDays(today, -1);
    const carry = weekEntries(K.weekStart(yday)).filter((e) => e.date === yday && e.end < e.start && e.end !== "00:00")
      .map((e) => Object.assign({}, e, { _carry: true })).sort((a, b) => a.end.localeCompare(b.end));
    return carry.concat(weekEntries(K.weekStart(today)).filter((e) => e.date === today).sort((a, b) => a.start.localeCompare(b.start)));
  }

  function renderShift(el) {
    function draw() {
      el.textContent = "";
      const staff = activeStaff();
      if (!K.list("staff").length) {
        el.appendChild(h("div", { class: "sft-head" }, h("h2", { class: "sec-title", text: "シフト" })));
        el.appendChild(K.empty("先にスタッフを登録してください", "シフト表はスタッフごとに色分けして表示します。まず「スタッフ」タブで名前・時給を登録しましょう。",
          "スタッフを登録する", () => K.go("shift", "staff")));
        return;
      }
      const today = K.today();
      const ws = weekStart;
      const days = Array.from({ length: 7 }, (_, i) => K.addDays(ws, i));
      const entries = weekEntries(ws);
      const isThisWeek = ws === K.weekStart(today);

      // 見出し行：週切替 ＋ 主操作（副操作は2行目）
      const lbl = isThisWeek ? "今週" : ws === K.addDays(K.weekStart(today), -7) ? "先週" : ws === K.addDays(K.weekStart(today), 7) ? "来週" : K.fmt.md(ws) + "週";
      el.appendChild(h("div", { class: "sft-head sft-weekhead" },
        h("div", { class: "sft-weeknav" },
          h("button", { class: "icon-btn", type: "button", "aria-label": "前の週", title: "前の週", onClick: () => { weekStart = K.addDays(weekStart, -7); draw(); } }, h("span", { class: "sft-flip" }, K.icon("chev"))),
          h("h2", { class: "sec-title" },
            h("span", { class: "sft-long", text: K.fmt.md(days[0]) + "（月）〜 " + K.fmt.md(days[6]) + "（日）" }),
            h("span", { class: "sft-short", text: K.fmt.md(days[0]) + "〜" + K.fmt.md(days[6]) })),
          h("button", { class: "icon-btn", type: "button", "aria-label": "次の週", title: "次の週", onClick: () => { weekStart = K.addDays(weekStart, 7); draw(); } }, K.icon("chev"))),
        h("div", { class: "sft-subrow" },
          h("button", { class: "btn sm", type: "button", hidden: isThisWeek, onClick: () => { weekStart = K.weekStart(K.today()); draw(); } }, "今週に戻る"),
          h("button", { class: "btn ghost sm sft-copy", type: "button", attrs: WR, disabled: ro(), onClick: () => copyLastWeek(ws) }, "先週をコピー")),
        h("button", { class: "btn primary sft-add-main", type: "button", attrs: WR, disabled: ro() || !staff.length,
          onClick: () => openEntry(null, days.includes(today) ? today : ws) }, K.icon("plus"), "シフトを追加")));

      // 集計帯（期間入りラベル）
      const per = weekTotals(entries);
      el.appendChild(h("div", { class: "sumbar", role: "group", "aria-label": lbl + "の集計" },
        h("div", { class: "cell" }, h("span", { class: "lbl", text: lbl + "の人件費" }), h("span", { class: "val", text: K.fmt.yen(per.totC) })),
        h("div", { class: "cell" }, h("span", { class: "lbl", text: lbl + "の実働" }), h("span", { class: "val" }, K.fmt.num(per.totH, 1), h("small", { text: "時間" }))),
        h("div", { class: "cell" }, h("span", { class: "lbl", text: lbl + "の出勤" }), h("span", { class: "val" }, String(per.ids.length), h("small", { text: "人" })), h("span", { class: "sub", text: entries.length + "枠" }))));

      // 今日の出勤（前日からの日またぎを含む）
      if (isThisWeek || K.weekStart(K.addDays(today, -1)) === ws) el.appendChild(todayStrip(today));

      if (!staff.length) {
        el.appendChild(K.empty("在籍中のスタッフがいません", "退職扱いのスタッフしかいないため、シフトを追加できません。", "スタッフ画面へ", () => K.go("shift", "staff")));
      }

      if (!entries.length) {
        el.appendChild(K.empty("この週のシフトはまだありません", "「シフトを追加」か各日の「＋」で1枠ずつ登録できます。前週と同じなら「先週をコピー」が早いです。"));
      }
      el.appendChild(dayList(days, entries, today, staff));
      el.appendChild(board(days, entries, today, staff, per));
      if (per.ids.length) el.appendChild(mobileBreakdown(per));
      if (per.ids.some((id) => !(staffById(id) && staffById(id).wage))) el.appendChild(h("p", { class: "small muted", style: "margin:0", text: "時給が未登録のスタッフは人件費 0 円で計算しています。" }));
    }

    function weekTotals(entries) {
      const map = {};
      entries.forEach((e) => {
        const p = (map[e.staffId] = map[e.staffId] || { days: new Set(), hours: 0, cost: 0 });
        const s = staffById(e.staffId);
        const hrs = K.hours(e.start, e.end, e.breakMin);
        p.days.add(e.date);
        p.hours += hrs;
        p.cost += hrs * (Number(s && s.wage) || 0);
      });
      const ids = Object.keys(map).sort((a, b) => map[b].hours - map[a].hours);
      return { map, ids, totH: ids.reduce((t, id) => t + map[id].hours, 0), totC: ids.reduce((t, id) => t + Math.round(map[id].cost), 0) };
    }

    function todayStrip(today) {
      const list = todayCrew(today);
      return h("div", { class: "card sft-today-strip" },
        h("span", { class: "sft-today-l", text: "今日の出勤 " + K.fmt.date(today) }),
        list.length
          ? h("div", { class: "sft-today-list" }, list.map((e) => {
              const s = staffById(e.staffId);
              return h("span", { class: "sft-tag " + colorClass(s && s.color) },
                h("span", { class: "sft-dot" }), h("span", { text: sName(e.staffId) }),
                h("span", { class: "num", text: e._carry ? "〜" + e.end : e.start + "–" + e.end }),
                e._carry ? h("span", { class: "sft-sub", text: "（前日から）" }) : null,
                e.station ? h("span", { class: "sft-sub", text: e.station }) : null);
            }))
          : h("span", { class: "small muted", text: "今日のシフトは未登録です" }));
    }

    // スマホ：日ごとのリスト
    function dayList(days, entries, today, staff) {
      return h("div", { class: "sft-daylist" }, days.map((d) => {
        const list = entries.filter((e) => e.date === d).sort((a, b) => a.start.localeCompare(b.start));
        const hrs = list.reduce((t, e) => t + K.hours(e.start, e.end, e.breakMin), 0);
        return h("section", { class: "sft-day" + (d === today ? " sft-is-today" : ""), "aria-label": K.fmt.date(d) },
          h("div", { class: "sft-day-head" },
            h("span", { class: "sft-day-date", text: K.fmt.md(d) }),
            h("span", { class: "sft-dow " + dowClass(d), text: K.fmt.dow(d) + "曜" }),
            d === today ? h("span", { class: "chip info", text: "今日" }) : null,
            h("span", { class: "sft-day-sum", text: list.length ? headcount(list) + "・" + K.fmt.num(hrs, 1) + "h" : "" }),
            h("button", { class: "icon-btn sft-day-add", type: "button", attrs: Object.assign({ "aria-label": K.fmt.date(d) + "にシフトを追加" }, WR),
              disabled: ro() || !staff.length, onClick: () => openEntry(null, d) }, K.icon("plus"))),
          list.length ? list.map((e) => {
            const s = staffById(e.staffId);
            const eh = K.hours(e.start, e.end, e.breakMin);
            return h("button", { class: "sft-ent " + colorClass(s && s.color), type: "button", disabled: ro(), onClick: () => openEntry(e) },
              h("span", { class: "sft-ent-bar" }),
              h("span", { class: "sft-ent-main" },
                h("span", { class: "sft-ent-name", text: sName(e.staffId) }),
                h("span", { class: "sft-ent-sub", text: [e.station, K.fmt.num(eh, 1) + "h", e.breakMin ? "休憩" + e.breakMin + "分" : ""].filter(Boolean).join(" · ") })),
              h("span", { class: "sft-ent-time", text: e.start + "–" + e.end }));
          }) : h("div", { class: "sft-day-none", text: "休み・未登録" }));
      }));
    }

    // PC：スタッフ×曜日の表（各枠に時間帯バー）
    function board(days, entries, today, staff, per) {
      const ids = staff.map((s) => s.id);
      entries.forEach((e) => { if (!ids.includes(e.staffId)) ids.push(e.staffId); });
      // 時間帯バーの範囲（この週の最早〜最遅、既定 8:00〜24:00）
      let lo = 8 * 60, hi = 24 * 60;
      entries.forEach((e) => { const s = toMin(e.start); let en = toMin(e.end); if (en <= s) en += 1440; lo = Math.min(lo, s); hi = Math.max(hi, en); });
      lo = Math.floor(lo / 60) * 60; hi = Math.ceil(hi / 60) * 60;
      const span = Math.max(60, hi - lo);
      const block = (e, s) => {
        const a = toMin(e.start); let b = toMin(e.end); if (b <= a) b += 1440;
        const eh = K.hours(e.start, e.end, e.breakMin);
        return h("button", { class: "sft-block " + colorClass(s && s.color), type: "button", disabled: ro(), title: sName(e.staffId) + " " + e.start + "–" + e.end, onClick: () => openEntry(e) },
          h("span", { class: "sft-block-time" }, h("span", { text: e.start + "–" }), h("span", { text: e.end })),
          h("span", { class: "sft-track", "aria-hidden": "true" }, h("i", { style: { left: ((a - lo) / span * 100) + "%", width: Math.max(3, (b - a) / span * 100) + "%" } })),
          h("span", { class: "sft-block-sub", text: [e.station, K.fmt.num(eh, 1) + "h"].filter(Boolean).join(" · ") }));
      };
      const dayCount = days.map((d) => entries.filter((e) => e.date === d));
      return h("div", { class: "sft-board" },
        h("div", { class: "tblwrap" }, h("table", { class: "sft-grid" },
          h("colgroup", null, h("col", { class: "sft-c-staff" }), days.map(() => h("col")), h("col", { class: "sft-c-tot" })),
          h("thead", null, h("tr", null,
            h("th", { text: "スタッフ" }),
            days.map((d) => h("th", { class: d === today ? "sft-is-today" : "" }, h("span", { class: "num", text: K.fmt.md(d) }), h("span", { class: dowClass(d), text: K.fmt.dow(d) }), d === today ? h("span", { class: "sft-today-word", text: " 今日" }) : null)),
            h("th", { style: "text-align:right", text: "週計" }))),
          h("tbody", null, ids.map((sid) => {
            const s = staffById(sid);
            const p = per.map[sid];
            return h("tr", null,
              h("th", { scope: "row" },
                h("div", { class: "sft-staffcell " + colorClass(s && s.color) }, h("span", { class: "sft-dot" }), h("span", { text: sName(sid) })),
                h("div", { class: "sft-staffcell-sub", text: (s && s.role ? s.role : "") + (s && s.wage ? "  " + K.fmt.yen(s.wage) + "/h" : "") })),
              days.map((d) => {
                const list = entries.filter((e) => e.date === d && e.staffId === sid).sort((a, b) => a.start.localeCompare(b.start));
                const canAdd = !ro() && s && s.active !== false;
                return h("td", { class: d === today ? "sft-is-today" : "" },
                  h("div", { class: "sft-cell" },
                    list.map((e) => block(e, s)),
                    !list.length ? h("button", {
                      class: "sft-cell-add", type: "button", text: "+", disabled: !canAdd,
                      attrs: Object.assign({ "aria-label": sName(sid) + " " + K.fmt.date(d) + "にシフトを追加" }, WR),
                      onClick: () => openEntry(null, d, sid),
                    }) : null));
              }),
              h("td", null, h("div", { class: "sft-tot" },
                h("b", { text: p ? K.fmt.num(p.hours, 1) + "h" : "—" }),
                h("span", { text: p ? K.fmt.yen(p.cost) : "" }))));
          })),
          h("tfoot", null, h("tr", null,
            h("th", { text: "日計" }),
            dayCount.map((list, i) => h("td", { class: days[i] === today ? "sft-is-today" : "",
              text: list.length ? headcount(list) + " · " + K.fmt.num(list.reduce((t, e) => t + K.hours(e.start, e.end, e.breakMin), 0), 1) + "h" : "—" })),
            h("td", null, h("div", { class: "sft-tot", style: "padding:0" }, h("b", { text: K.fmt.num(per.totH, 1) + "h" }), h("span", { text: K.fmt.yen(per.totC) }))))))),
        h("p", { class: "sft-board-note", text: "バーは " + pad(Math.floor(lo / 60) % 24) + ":00〜" + pad(Math.floor(hi / 60) % 24) + ":00 の中での勤務時間帯。空き枠の「＋」で追加、枠を押すと編集できます。" }));
    }

    // スマホ：スタッフ別の内訳（折りたたみ）
    function mobileBreakdown(per) {
      return h("details", { class: "sft-details sft-mobile-only" },
        h("summary", null, K.icon("chev"), "スタッフ別の内訳（" + per.ids.length + "人）"),
        h("div", { class: "tblwrap" }, h("table", { class: "tbl" },
          h("thead", null, h("tr", null, h("th", { text: "スタッフ" }), h("th", { class: "r", text: "日数" }), h("th", { class: "r", text: "実働" }), h("th", { class: "r", text: "人件費" }))),
          h("tbody", null, per.ids.map((id) => {
            const s = staffById(id);
            const p = per.map[id];
            return h("tr", null,
              h("td", null, h("span", { class: "row " + colorClass(s && s.color), style: "gap:6px;flex-wrap:nowrap" }, h("span", { class: "sft-dot" }), h("span", { text: sName(id) }))),
              h("td", { class: "r num", text: p.days.size }),
              h("td", { class: "r num", text: K.fmt.num(p.hours, 1) + "h" }),
              h("td", { class: "r num", text: K.fmt.yen(p.cost) }));
          }),
            h("tr", null, h("td", null, h("b", { text: "合計" })), h("td"), h("td", { class: "r num" }, h("b", { text: K.fmt.num(per.totH, 1) + "h" })), h("td", { class: "r num" }, h("b", { text: K.fmt.yen(per.totC) })))))));
    }

    async function copyLastWeek(ws) {
      const prev = weekEntries(K.addDays(ws, -7));
      if (!prev.length) { K.toast("先週のシフトが登録されていません", "bad"); return; }
      const cur = weekEntries(ws);
      const copied = prev.map((e) => Object.assign({}, e, { id: uid(), date: K.addDays(e.date, 7) }));
      if (!cur.length) {
        if (!(await K.confirm("先週の " + prev.length + " 枠をこの週にコピーします。", "コピーする"))) return;
        try { await saveWeek(ws, copied); K.toast("先週のシフトをコピーしました", "ok"); } catch (e) {}
        return;
      }
      const key = (e) => e.date + "|" + e.staffId;
      const have = new Set(cur.map(key));
      const add = copied.filter((e) => !have.has(key(e)));
      const skip = copied.length - add.length;
      K.sheet({
        title: "先週をコピー",
        body: h("div", { class: "stack" },
          h("p", { style: "margin:0", text: "この週にはすでに " + cur.length + " 枠あります。先週の " + prev.length + " 枠をどう反映しますか？" }),
          h("ul", { class: "small", style: "margin:0;padding-left:1.2em;color:var(--ink-2)" },
            h("li", { text: "追加でコピー：今の枠は残し、" + add.length + " 枠を追加（同じスタッフ・同じ日の " + skip + " 枠はスキップ）" }),
            h("li", { text: "上書き（右上の「…」から）：今の " + cur.length + " 枠を消して、先週の " + prev.length + " 枠に置き換え" }))),
        menu: [{ label: "上書きでコピー（今の枠を消す）", icon: "trash", danger: true, disabled: ro(), onClick: async () => {
          if (!(await K.confirm("この週の " + cur.length + " 枠を消して、先週の " + prev.length + " 枠で置き換えます。元に戻せません。", "上書きする"))) return;
          try { await saveWeek(ws, copied); } catch (e) { return; }
          K.toast("先週のシフトで上書きしました", "ok");
          return "close";
        } }],
        actions: [
          { label: "キャンセル", kind: "ghost" },
          { label: "追加でコピー", kind: "primary", disabled: ro() || !add.length, onClick: async () => {
            try { await saveWeek(ws, cur.concat(add)); } catch (e) { return false; }
            K.toast(add.length + " 枠を追加しました" + (skip ? "（" + skip + " 枠スキップ）" : ""), "ok");
          } },
        ],
      });
    }

    // 同じスタッフの時間帯重複（日またぎ・前後の週も考慮）
    const absRange = (e) => {
      const base = K.daysBetween("2000-01-03", e.date) * 1440;
      const s = base + toMin(e.start);
      let en = base + toMin(e.end);
      if (en <= s) en += 1440;
      return [s, en];
    };
    function overlaps(rec) {
      const ws = K.weekStart(rec.date);
      const pool = [K.addDays(ws, -7), ws, K.addDays(ws, 7)].flatMap(weekEntries);
      const [a, b] = absRange(rec);
      return pool.filter((x) => x.id !== rec.id && x.staffId === rec.staffId && x.start && x.end)
        .filter((x) => { const [c, d] = absRange(x); return a < d && c < b; });
    }

    function openEntry(entry, presetDate, presetStaff) {
      const isNew = !entry;
      // 新規はスタッフ未選択が既定（選ばないと保存不可）。表のマスや日の＋から開いたらその日・その人を初期値に
      const e = entry || { date: presetDate || K.today(), staffId: presetStaff || "", start: "10:00", end: "15:00", breakMin: 0, station: "" };
      let staffId = e.staffId || "";
      const opts = activeStaff().map((s) => ({ id: s.id, label: s.name, color: s.color }));
      if (staffId && !opts.find((o) => o.id === staffId) && staffById(staffId)) opts.push({ id: staffId, label: sName(staffId) + "（退職）", color: staffById(staffId).color });
      if (staffId && !opts.find((o) => o.id === staffId)) staffId = "";
      const fDate = K.input({ type: "date", value: e.date });
      const staffHost = h("div", { class: "sft-wrapchips", role: "group", "aria-label": "スタッフ" });
      const fStart = K.input({ type: "time", value: e.start, step: 300 });
      const fEnd = K.input({ type: "time", value: e.end, step: 300 });
      const fBreak = K.input({ type: "number", value: e.breakMin || 0, min: 0, step: 5 });
      const fStation = K.input({ value: e.station || "", placeholder: "例：焼き場", list: "sft-stations" });
      const presetHost = h("div", { class: "sft-wrapchips", role: "group", "aria-label": "時間帯" });
      const quick = h("div", { class: "sft-wrapchips", role: "group", "aria-label": "持ち場" });
      let sheetApi = null;
      const touch = () => { if (sheetApi && sheetApi.markDirty) sheetApi.markDirty(); };
      function drawStaff() {
        staffHost.textContent = "";
        opts.forEach((o) => staffHost.appendChild(h("button", {
          class: "fchip " + colorClass(o.color), type: "button", attrs: { "aria-pressed": String(staffId === o.id) },
          onClick: () => { staffId = o.id; staffHost.removeAttribute("aria-invalid"); const er = staffHost.parentElement.querySelector(":scope > .field-error"); if (er) er.remove(); drawStaff(); calc(); touch(); },
        }, h("span", { class: "sft-dot" }), o.label)));
      }
      function drawPresets() {
        presetHost.textContent = "";
        PRESETS.forEach((pr) => presetHost.appendChild(h("button", {
          class: "fchip", type: "button",
          attrs: { "aria-pressed": String(fStart.value === pr.start && fEnd.value === pr.end && (Number(fBreak.value) || 0) === pr.brk) },
          onClick: () => { fStart.value = pr.start; fEnd.value = pr.end; fBreak.value = pr.brk; [fStart, fEnd, fBreak].forEach((x) => x.dispatchEvent(new Event("input", { bubbles: true }))); drawPresets(); calc(); },
        }, pr.label, h("span", { class: "n", text: pr.start + "–" + pr.end + (pr.brk ? " 休" + pr.brk : "") }))));
      }
      function drawQuick() {
        quick.textContent = "";
        STATIONS.forEach((st) => quick.appendChild(toggleBtn(st, fStation.value.trim() === st, () => { fStation.value = st; drawQuick(); calc(); touch(); })));
      }
      fStation.addEventListener("input", drawQuick);
      const calcEl = h("p", { class: "sft-calc num" });
      function calc() {
        const s = staffById(staffId);
        const hrs = K.hours(fStart.value, fEnd.value, fBreak.value);
        calcEl.textContent = "実働 " + K.fmt.num(hrs, 2) + " 時間" + (s && s.wage ? "　人件費 " + K.fmt.yen(hrs * s.wage) : "") +
          (fStart.value && fEnd.value && fEnd.value < fStart.value ? "（日をまたぐ勤務として計算）" : "");
      }
      [fStart, fEnd, fBreak].forEach((x) => { x.addEventListener("input", () => { calc(); drawPresets(); }); x.addEventListener("change", () => { calc(); drawPresets(); }); });
      drawStaff(); drawPresets(); drawQuick(); calc();
      const staffField = h("div", { class: "field" }, h("span", { class: "field-label", text: "スタッフ" }), staffHost);
      const body = h("div", { class: "stack" },
        K.field("日付", fDate),
        staffField,
        h("div", { class: "field" }, h("span", { class: "field-label", text: "時間帯（タップで入力）" }), presetHost),
        h("div", { class: "grid2" }, K.field("開始", fStart), K.field("終了", fEnd)),
        h("div", { class: "grid2" }, K.field("休憩（分）", fBreak), K.field("持ち場", fStation)),
        quick,
        h("datalist", { id: "sft-stations" }, STATIONS.map((st) => h("option", { value: st }))),
        calcEl);
      const menu = isNew ? null : [{
        label: "このシフトを削除", icon: "trash", danger: true, disabled: ro(),
        onClick: async () => {
          if (!(await K.confirm(sName(e.staffId) + " の " + K.fmt.date(e.date) + " " + e.start + "–" + e.end + " のシフトを削除します。", "削除する"))) return;
          const ws = K.weekStart(e.date);
          try { await saveWeek(ws, weekEntries(ws).filter((x) => x.id !== e.id)); } catch (err) { return; }
          K.toast("削除しました");
          return "close";
        },
      }];
      const actions = [{ label: "キャンセル", kind: "ghost" }];
      actions.push({
        label: isNew ? "追加する" : "保存する", kind: "primary", disabled: ro(),
        onClick: async () => {
          const date = fDate.value;
          K.clearErrors(body);
          if (!date) K.fieldError(fDate, "日付を入れてください");
          if (!staffId) K.fieldError(staffHost, "スタッフを選んでください");
          if (!fStart.value) K.fieldError(fStart, "開始時刻を入れてください");
          if (!fEnd.value) K.fieldError(fEnd, "終了時刻を入れてください");
          if (fStart.value && fStart.value === fEnd.value) K.fieldError(fEnd, "開始と同じ時刻です");
          if (Number(fBreak.value) < 0) K.fieldError(fBreak, "マイナスは入力できません");
          else if (fStart.value && fEnd.value && fStart.value !== fEnd.value && K.hours(fStart.value, fEnd.value, 0) * 60 <= Number(fBreak.value)) K.fieldError(fBreak, "休憩が勤務時間以上です");
          if (K.focusFirstError(body)) return false;
          const rec = {
            id: isNew ? uid() : e.id, date, staffId, start: fStart.value, end: fEnd.value,
            breakMin: Math.max(0, Math.round(Number(fBreak.value) || 0)), station: fStation.value.trim(),
          };
          const dup = overlaps(rec);
          if (dup.length) {
            const lines = dup.map((x) => K.fmt.date(x.date) + " " + x.start + "–" + x.end + (x.station ? "（" + x.station + "）" : "")).join("、");
            if (!(await K.confirm(sName(rec.staffId) + " は同じ時間帯に別のシフトがあります：" + lines + "。このまま保存しますか？", "重複のまま保存"))) return false;
          }
          const newWs = K.weekStart(date);
          try {
            if (!isNew) {
              const oldWs = K.weekStart(e.date);
              if (oldWs !== newWs) await saveWeek(oldWs, weekEntries(oldWs).filter((x) => x.id !== e.id));
            }
            const list = weekEntries(newWs).filter((x) => x.id !== rec.id);
            list.push(rec);
            await saveWeek(newWs, list);
          } catch (err) { return false; }
          K.toast(isNew ? "シフトを追加しました" : "シフトを更新しました", "ok");
          if (newWs !== weekStart) { weekStart = newWs; draw(); }
        },
      });
      sheetApi = K.sheet({ title: isNew ? "シフトを追加" : "シフトを編集", body, actions, menu });
    }

    renders.shift = draw;
    draw();
  }

  /* =====================================================================
     3. スタッフ
     ===================================================================== */
  function renderStaff(el) {
    function draw() {
      el.textContent = "";
      const all = K.list("staff").slice().sort(byName);
      const act = all.filter((s) => s.active !== false);
      const ret = all.filter((s) => s.active === false);
      el.appendChild(h("div", { class: "sft-head" },
        h("h2", { class: "sec-title" }, "スタッフ", h("span", { class: "sft-count", text: "在籍 " + act.length + "人" })),
        h("button", { class: "btn primary", type: "button", attrs: WR, disabled: ro(), onClick: () => openStaff(null) }, K.icon("plus"), "スタッフを追加")));
      if (!all.length) {
        el.appendChild(K.empty("スタッフが登録されていません", "名前・役割・時給を登録すると、シフト表の色分けと人件費の計算、業務連絡の確認者に使われます。", "最初のスタッフを登録", () => openStaff(null)));
        return;
      }
      if (act.length) el.appendChild(h("div", { class: "list" }, act.map(staffLi)));
      else el.appendChild(K.empty("在籍中のスタッフはいません", "下の退職者を開いて「在籍中」に戻すか、新しく追加してください。"));
      if (ret.length) {
        el.appendChild(h("details", { class: "sft-details sft-retired-wrap" },
          h("summary", null, K.icon("chev"), "退職・非表示（" + ret.length + "人）"),
          h("div", { class: "list sft-retired" }, ret.map(staffLi))));
      }
    }
    function staffLi(s) {
      return h("button", { class: "li sft-staff-li " + colorClass(s.color), type: "button", onClick: () => openStaff(s), "aria-label": (s.name || "") + "を編集" },
        h("span", { class: "sft-dot" }),
        h("span", { class: "sft-staff-name", text: s.name || "（名前なし）" }),
        h("span", { class: "chip", text: s.role || "—" }),
        h("span", { class: "sft-staff-wage" }, s.wage ? [h("small", { text: "時給" }), K.fmt.yen(s.wage)] : h("small", { text: "時給未設定" })),
        K.icon("chev"));
    }

    function openStaff(s) {
      const isNew = !s;
      const cur = s || { name: "", role: "調理", wage: 1200, active: true, color: K.list("staff").length % 6 };
      let color = Number(cur.color) || 0;
      const fName = K.input({ value: cur.name, placeholder: "例：山田 太郎", autocomplete: "off" });
      const fRole = K.select(ROLES, cur.role || "調理");
      const fWage = K.input({ type: "number", value: cur.wage || "", min: 0, step: 10, placeholder: "例：1200" });
      const fActive = h("input", { type: "checkbox", checked: cur.active !== false });
      const sw = h("div", { class: "sft-swatches", role: "group", "aria-label": "表示色" });
      function drawSw() {
        sw.textContent = "";
        for (let i = 0; i < 6; i++) sw.appendChild(h("button", {
          class: "sft-swatch " + colorClass(i), type: "button", attrs: { "aria-pressed": String(i === color), "aria-label": "色 " + (i + 1) },
          onClick: () => { color = i; drawSw(); },
        }));
      }
      drawSw();
      const body = h("div", { class: "stack" },
        K.field("名前", fName),
        h("div", { class: "grid2" }, K.field("役割", fRole), K.field("時給（円）", fWage, "人件費の計算に使います")),
        h("div", { class: "field" }, h("span", { class: "field-label", text: "表示色" }), sw),
        h("label", { class: "sft-toggle" }, fActive, h("span", { text: "在籍中（オフにすると退職扱いで一覧・担当者選択から外れます）" })));
      const menu = isNew ? null : [{
        label: "完全に削除", icon: "trash", danger: true, disabled: ro(),
        onClick: async () => {
          if (!(await K.confirm(cur.name + " を完全に削除します。過去のシフトや連絡では「削除済み」と表示されます。通常は「在籍中」をオフにする（退職扱い）のがおすすめです。", "完全に削除"))) return;
          try { await W.del("staff", cur.id); } catch (e) { return; }
          K.toast("削除しました");
          return "close";
        },
      }];
      const actions = [{ label: "キャンセル", kind: "ghost" }];
      actions.push({
        label: isNew ? "追加する" : "保存する", kind: "primary", disabled: ro(),
        onClick: async () => {
          const name = fName.value.trim();
          const wage = Number(fWage.value);
          K.clearErrors(body);
          if (!name) K.fieldError(fName, "名前を入れてください");
          if (fWage.value !== "" && (!isFinite(wage) || wage < 0)) K.fieldError(fWage, "マイナスは入力できません");
          if (K.focusFirstError(body)) return false;
          const prevWage = Number(cur.wage) || 0;
          if (!isNew && prevWage > 0 && wage > prevWage * 10) {
            if (!(await K.confirm("時給が " + K.fmt.yen(prevWage) + " → " + K.fmt.yen(wage) + " と10倍を超えています。桁の打ち間違いではありませんか？", "この時給で保存"))) return false;
          } else if (wage >= 10000) {
            if (!(await K.confirm("時給 " + K.fmt.yen(wage) + " で保存します。桁の打ち間違いではありませんか？", "この時給で保存"))) return false;
          }
          if (!isNew && cur.active !== false && !fActive.checked) {
            if (!(await K.confirm(name + " を退職扱いにします。一覧・担当者選択・シフト追加の候補から外れます（過去の記録は残ります。あとで在籍に戻せます）。", "退職にする", { danger: true }))) return false;
          }
          const data = { name, role: fRole.value, wage: Math.round(wage || 0), active: !!fActive.checked, color };
          try {
            if (isNew) await W.add("staff", data);
            else await W.put("staff", cur.id, data);
          } catch (e) { return false; }
          K.toast(isNew ? name + " を登録しました" : "保存しました", "ok");
        },
      });
      K.sheet({ title: isNew ? "スタッフを追加" : "スタッフを編集", body, actions, menu });
    }

    renders.staff = draw;
    draw();
  }

  /* =====================================================================
     4. 衛生記録（HACCP）：hygiene/config（機器）と hygiene/h-YYYY-MM-DD（その日の記録）
     ===================================================================== */
  const HYG_KINDS = ["冷蔵", "冷凍", "温蔵", "その他"];
  const HYG_CHECKS = ["手洗い", "体調", "清掃"];
  const HYG_SLOTS = ["朝", "夕"];
  const HYG_DEFAULT = [{ name: "冷蔵庫1", kind: "冷蔵", min: 0, max: 10 }, { name: "冷凍庫", kind: "冷凍", min: -25, max: -15 }];
  const hygConfig = () => K.getDoc("hygiene", "config");
  const hygPoints = () => { const c = hygConfig(); return c && Array.isArray(c.points) ? c.points : []; };
  const hygDayId = (d) => "h-" + d;
  const hygDay = (d) => K.getDoc("hygiene", hygDayId(d));
  const hygSlotNow = () => (new Date().getHours() >= 15 ? "夕" : "朝");
  // 夕は15時以降のみ未記録扱い（過去の日は常に対象）
  const eveningDue = (d) => d < K.today() || (d === K.today() && new Date().getHours() >= 15);
  function hygLog(day, pid, slot) {
    const logs = (day && day.logs) || [];
    for (let i = logs.length - 1; i >= 0; i--) if (logs[i].pointId === pid && logs[i].slot === slot && !logs[i].replaced) return logs[i];
    return null;
  }
  // 同じ機器・時間帯の全記録（置き換え済みを含む、新しい順）＝HACCP の証跡
  const hygLogsAll = (day, pid, slot) => ((day && day.logs) || []).filter((l) => l.pointId === pid && l.slot === slot).slice().reverse();
  const fmtTemp = (t) => (t == null || !isFinite(t) ? "—" : (Math.round(t * 10) / 10).toFixed(1) + "℃");
  const rangeText = (p) => p.min + "〜" + p.max + "℃";
  const hhmm = (iso) => { const d = new Date(iso); return isNaN(d) ? "" : pad(d.getHours()) + ":" + pad(d.getMinutes()); };
  const isOut = (p, t) => t < Number(p.min) || t > Number(p.max);
  // 全角数字・全角マイナス・長音記号も受け付ける
  function parseTemp(v) {
    const map = { "．": ".", "－": "-", "ー": "-", "−": "-", "‐": "-" };
    const t = String(v == null ? "" : v).trim().replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/[．－ー−‐]/g, (c) => map[c]).replace(/\s/g, "");
    if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
    return Number(t);
  }

  function hygStatus(date) {
    const d = date || K.today();
    const day = hygDay(d);
    const missing = [], abnormal = [];
    let done = 0, total = 0;
    if (d <= K.today()) hygPoints().forEach((p) => {
      HYG_SLOTS.forEach((slot) => {
        const lg = hygLog(day, p.id, slot);
        if (lg && lg.ok === false) abnormal.push({ pointId: p.id, name: p.name, slot, temp: lg.temp });
        if (slot === "夕" && !eveningDue(d)) return;
        total++;
        if (lg) done++; else missing.push({ pointId: p.id, name: p.name, slot });
      });
    });
    return { date: d, missing, abnormal, done, total };
  }
  K.answer("hygiene.status", (args) => hygStatus(args && args.date));

  // 書き込み直前に最新の記録を読み直し、上書きせず追記する（前の記録は replaced:true で残す＝証跡）
  async function hygSave(date, point, slot, temp, action) {
    const ok = !isOut(point, temp);
    const cur = hygDay(date);
    const logs = ((cur && cur.logs) || []).map((l) => (l.pointId === point.id && l.slot === slot && !l.replaced ? Object.assign({}, l, { replaced: true }) : l));
    const rec = { id: uid(), pointId: point.id, slot, temp, ok, staffId: K.currentStaffId() || null, at: new Date().toISOString() };
    if (!ok) rec.action = action;
    logs.push(rec);
    await W.put("hygiene", hygDayId(date), { date, logs, checks: (cur && cur.checks) || {} });
    return ok;
  }
  async function hygToggleCheck(date, name) {
    const cur = hygDay(date);
    const checks = Object.assign({}, (cur && cur.checks) || {});
    const prev = checks[name] ? Object.assign({}, checks[name]) : null;
    const on = !(prev && prev.done);
    checks[name] = { done: on, staffId: K.currentStaffId() || null, at: new Date().toISOString() };
    try { await W.put("hygiene", hygDayId(date), { date, logs: (cur && cur.logs) || [], checks }); } catch (e) { return; }
    K.toast(name + (on ? "：確認済みにしました" : "：チェックを外しました"), "ok", { action: { label: "元に戻す", onClick: async () => {
      const c2 = hygDay(date);
      const ch = Object.assign({}, (c2 && c2.checks) || {});
      if (prev) ch[name] = prev; else delete ch[name];
      try { await W.put("hygiene", hygDayId(date), { date, logs: (c2 && c2.logs) || [], checks: ch }); } catch (e) {}
    } } });
  }
  async function hygCreateDefault() {
    if (hygConfig()) return;
    try { await W.put("hygiene", "config", { points: HYG_DEFAULT.map((p) => Object.assign({ id: uid() }, p)) }); K.toast("冷蔵庫1・冷凍庫を登録しました。名前や範囲は「機器を設定」で変更できます", "ok"); } catch (e) {}
  }

  // 1機器×1時間帯の入力欄（入力1回＋記録）。範囲外なら赤表示＋是正処置が必須
  function hygEntry(point, slot, date, opts) {
    const o = opts || {};
    const lg = hygLog(hygDay(date), point.id, slot);
    const inp = K.input({ type: "text", inputmode: "decimal", enterkeyhint: "done", autocomplete: "off", placeholder: "温度", "aria-label": point.name + " " + slot + "の温度（℃）" });
    inp.classList.add("sft-hyg-inp");
    const inField = h("div", { class: "field sft-hyg-infield" }, inp);
    const judge = h("span", { class: "sft-hyg-judge", "aria-live": "polite" });
    const act = K.input({ placeholder: "例：扉を閉め直し、30分後に再測定", "aria-label": "是正処置" });
    const actField = K.field("範囲外のため是正処置を入力", act);
    actField.hidden = true;
    function check() {
      const t = parseTemp(inp.value);
      const out = t != null && isOut(point, t);
      actField.hidden = !out;
      inp.classList.toggle("sft-hyg-out", out);
      judge.className = "sft-hyg-judge" + (t == null ? "" : out ? " is-bad" : " is-ok");
      judge.textContent = t == null ? "" : out ? "範囲外（" + rangeText(point) + "）" : "範囲内";
    }
    const neg = h("button", { class: "btn sft-hyg-neg", type: "button", "aria-label": "マイナスに切り替え", title: "マイナスに切り替え", text: "±", disabled: ro(),
      onClick: () => { const v = inp.value.trim(); inp.value = v.startsWith("-") ? v.slice(1) : "-" + v; inp.dispatchEvent(new Event("input", { bubbles: true })); inp.focus(); } });
    let busy = false;
    const saveBtn = h("button", { class: "btn sft-hyg-save" + (o.big ? "" : " sm"), type: "button", attrs: WR, disabled: ro() }, K.icon("check"), lg ? "記録し直す" : "記録");
    saveBtn.addEventListener("click", async () => {
      if (busy) return;
      K.clearErrors(wrap);
      const t = parseTemp(inp.value);
      if (t == null) { K.fieldError(inp, "温度を数字で入れてください（例：4.5、-18）"); inp.focus(); return; }
      if (t < -60 || t > 300) { K.fieldError(inp, "温度が大きすぎます。入力を確認してください"); inp.focus(); return; }
      const out = isOut(point, t);
      if (out && !act.value.trim()) { actField.hidden = false; K.fieldError(act, "範囲外のときは是正処置の入力が必要です"); act.focus(); return; }
      busy = true; saveBtn.disabled = true;
      try {
        const ok = await hygSave(date, point, slot, t, act.value.trim());
        K.toast(point.name + "（" + slot + "）" + fmtTemp(t) + (ok ? " を記録しました" : " ・範囲外として記録しました"), ok ? "ok" : "bad");
      } catch (e) { /* core が通知 */ } finally { busy = false; saveBtn.disabled = ro(); }
    });
    inp.addEventListener("input", check);
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); if (!actField.hidden && !act.value.trim()) act.focus(); else saveBtn.click(); } });
    act.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); saveBtn.click(); } });
    const ctl = h("div", { class: "sft-hyg-ctl" }, inField, h("span", { class: "sft-hyg-unit", text: "℃" }), neg, saveBtn, judge);
    const reBtn = lg && !o.big ? h("button", { class: "btn sft-hyg-rebtn", type: "button", attrs: WR, disabled: ro(), onClick: () => { reBtn.hidden = true; ctl.hidden = false; inp.focus(); } }, K.icon("edit"), "記録し直す") : null;
    if (reBtn) ctl.hidden = true;
    const nAll = hygLogsAll(hygDay(date), point.id, slot).length;
    const histBtn = nAll > 1 ? h("button", { class: "btn ghost sft-hyg-rebtn", type: "button", onClick: () => openHygHistory(point, slot, date) }, K.icon("list"), "履歴 " + nAll + "件") : null;
    const wrap = h("div", { class: "sft-hyg-row" + (lg && lg.ok === false ? " is-bad" : "") },
      h("div", { class: "sft-hyg-name" },
        h("b", { text: point.name }),
        o.showSlot ? h("span", { class: "chip", text: slot }) : null,
        h("span", { class: "chip", text: point.kind || "その他" }),
        h("span", { class: "sft-hyg-range num", text: "適正 " + rangeText(point) })),
      lg ? h("div", { class: "sft-hyg-last" }, (slot + "の記録 "), h("b", { class: lg.ok === false ? "sft-bad" : "", text: fmtTemp(lg.temp) }),
        lg.ok === false ? h("span", { class: "sft-bad", text: " 範囲外" }) : null,
        " · " + hhmm(lg.at) + " · " + sName(lg.staffId) + (lg.action ? " · 処置：" + lg.action : "")) : null,
      (reBtn || histBtn) ? h("div", { class: "row", style: "gap:8px" }, reBtn, histBtn) : null, ctl, actField);
    return wrap;
  }

  function openHygHistory(point, slot, date) {
    const list = hygLogsAll(hygDay(date), point.id, slot);
    K.sheet({ title: point.name + "（" + slot + "）の記録履歴", body: h("div", { class: "stack" },
      h("p", { class: "small muted", style: "margin:0", text: K.fmt.date(date) + "・適正 " + rangeText(point) + "。記録し直しても前の記録は消えずに残ります。" }),
      h("div", { class: "list" }, list.map((l) => h("div", { class: "li sft-hyg-hrow" },
        h("span", { class: "num sft-hyg-htime", text: hhmm(l.at) }),
        h("span", { class: "sft-hyg-hmain" },
          h("b", { class: "num" + (l.ok === false ? " sft-bad" : ""), text: fmtTemp(l.temp) + (l.ok === false ? " 範囲外" : "") }),
          h("span", { class: "small muted", text: sName(l.staffId) + (l.action ? " · 処置：" + l.action : "") })),
        h("span", { class: "chip" + (l.replaced ? "" : " ok"), text: l.replaced ? "置き換え済み" : "有効" })))) ),
      actions: [{ label: "閉じる", kind: "ghost" }] });
  }

  function hygChecks(date) {
    const day = hygDay(date);
    const checks = (day && day.checks) || {};
    return h("div", { class: "sft-hyg-checks", role: "group", "aria-label": "衛生チェック" }, HYG_CHECKS.map((name) => {
      const c = checks[name];
      const on = !!(c && c.done);
      return h("button", { class: "sft-hyg-check", type: "button", attrs: Object.assign({ "aria-pressed": String(on) }, WR), disabled: ro(), onClick: () => hygToggleCheck(date, name) },
        K.icon("check"), h("span", { text: name }), h("small", { text: on ? hhmm(c.at) + " " + (c.staffId ? sName(c.staffId) : "") : "未チェック" }));
    }));
  }

  const hygTimeKey = () => K.today() + "|" + hygSlotNow();
  function renderHyg(el) {
    let slot = hygSlotNow();
    let picked = false;   // 利用者が朝/夕を選んだか（時間帯が変わったら自動に戻す）
    let lastKey = "";
    function draw() {
      const key = hygTimeKey();
      if (key !== lastKey) { if (lastKey) picked = false; lastKey = key; }
      if (!picked) slot = hygSlotNow();
      el.textContent = "";
      const today = K.today();
      const pts = hygPoints();
      const has = !!hygConfig();
      el.appendChild(h("div", { class: "sft-head" },
        h("h2", { class: "sec-title" }, "衛生記録", h("span", { class: "sft-count", text: K.fmt.date(today) })),
        has ? h("button", { class: "btn ghost", type: "button", attrs: WR, disabled: ro(), onClick: openHygConfig }, K.icon("gear"), "機器を設定") : null));
      if (!has || !pts.length) {
        el.appendChild(K.empty("温度を記録する機器が未登録です",
          "冷蔵庫・冷凍庫などの機器と適正温度の範囲を登録すると、朝・夕の温度記録と過去7日の一覧が使えます。",
          has ? "機器を追加" : "初期値（冷蔵庫1・冷凍庫）で始める", has ? () => openHygPoint(null) : hygCreateDefault));
        el.appendChild(h("h3", { class: "sft-my-h", text: "今日のチェック" }));
        el.appendChild(hygChecks(today));
        return;
      }
      const st = hygStatus(today);
      const day = hygDay(today);
      const nChecks = HYG_CHECKS.filter((n) => day && day.checks && day.checks[n] && day.checks[n].done).length;
      el.appendChild(h("div", { class: "sumbar", role: "group", "aria-label": "今日の衛生記録" },
        h("div", { class: "cell" }, h("span", { class: "lbl", text: "今日の温度記録" }), h("span", { class: "val" + (st.missing.length ? " warn" : " ok") }, st.done + "/" + st.total), h("span", { class: "sub", text: eveningDue(today) ? "朝・夕" : "夕は15時から" })),
        h("div", { class: "cell" }, h("span", { class: "lbl", text: "今日の範囲外" }), h("span", { class: "val" + (st.abnormal.length ? " bad" : "") }, String(st.abnormal.length), h("small", { text: "件" }))),
        h("div", { class: "cell" }, h("span", { class: "lbl", text: "今日のチェック" }), h("span", { class: "val" + (nChecks === HYG_CHECKS.length ? " ok" : "") }, nChecks + "/" + HYG_CHECKS.length))));
      // 時間帯の切替
      el.appendChild(h("div", { class: "seg", role: "tablist", "aria-label": "時間帯" }, HYG_SLOTS.map((sl) => h("button", {
        class: "seg-btn", type: "button", role: "tab", attrs: { "aria-selected": String(slot === sl) }, onClick: () => { slot = sl; picked = true; draw(); },
      }, sl === "朝" ? "朝（〜15時）" : "夕（15時〜）"))));
      el.appendChild(h("div", { class: "sft-hyg-list" }, pts.map((p) => hygEntry(p, slot, today))));
      el.appendChild(h("h3", { class: "sft-my-h", text: "今日のチェック（1タップ）" }));
      el.appendChild(hygChecks(today));
      el.appendChild(hygHistory(today, pts));
    }
    renders.hyg = draw;
    draw();
    // 表示時と1分ごと（表示中のみ）：時間帯や日付が変わったら必ず、入力途中でなければ毎回描き直す
    const typing = () => el.contains(document.activeElement) && /INPUT|TEXTAREA/.test(document.activeElement.tagName) || [...el.querySelectorAll("input")].some((x) => x.value && x.type !== "checkbox");
    const tick = () => { if (el.hidden || !el.isConnected || el.offsetParent === null) return; if (hygTimeKey() !== lastKey || !typing()) draw(); };
    setInterval(tick, 60000);
    K.on("nav", (ev) => { if (ev && ev.key === "shift") setTimeout(() => { if (!el.hidden) { if (hygTimeKey() !== lastKey || !typing()) draw(); } }, 0); });
    document.addEventListener("visibilitychange", () => { if (!document.hidden) tick(); });
  }

  // 過去7日の一覧（未記録は灰色の「—」）
  function hygHistory(today, pts) {
    const days = Array.from({ length: 7 }, (_, i) => K.addDays(today, -i));
    return h("div", { class: "stack" },
      h("h3", { class: "sft-my-h" }, "過去7日の記録", h("span", { class: "sft-count", text: "赤＝範囲外・灰色の「—」＝未記録" })),
      h("div", { class: "tblwrap" }, h("table", { class: "tbl sft-hyg-hist" },
        h("thead", null, h("tr", null, h("th", { text: "日付" }), pts.map((p) => h("th", { text: p.name })), h("th", { text: "チェック" }))),
        h("tbody", null, days.map((d) => {
          const day = hygDay(d);
          const nC = HYG_CHECKS.filter((n) => day && day.checks && day.checks[n] && day.checks[n].done).length;
          return h("tr", { class: d === today ? "sft-hyg-today" : "" },
            h("td", null, h("span", { class: "num", text: K.fmt.md(d) }), " ", h("span", { class: dowClass(d), text: K.fmt.dow(d) })),
            pts.map((p) => h("td", null, h("div", { class: "sft-hyg-cell" }, HYG_SLOTS.map((sl) => {
              const lg = hygLog(day, p.id, sl);
              return h("span", { title: lg && lg.action ? "処置：" + lg.action : null },
                h("span", { class: "sft-slot", text: sl }),
                lg ? h("span", { class: lg.ok === false ? "sft-bad" : "", text: fmtTemp(lg.temp) + (lg.ok === false ? " !" : ""), "aria-label": fmtTemp(lg.temp) + (lg.ok === false ? " 範囲外" : "") }) : h("span", { class: "is-miss", text: "—", "aria-label": "未記録" }));
            })))),
            h("td", null, h("span", { class: nC === HYG_CHECKS.length ? "num" : "num muted", text: nC + "/" + HYG_CHECKS.length })));
        })))));
  }

  // 機器の一覧（設定）
  function openHygConfig() {
    let close = null;
    const pts = hygPoints();
    const body = h("div", { class: "stack" },
      pts.length ? h("div", { class: "list" }, pts.map((p) => h("button", { class: "li", type: "button", onClick: () => { close(); openHygPoint(p); } },
        h("span", { style: "flex:1 1 auto;min-width:0;font-weight:700", text: p.name }),
        h("span", { class: "chip", text: p.kind || "その他" }),
        h("span", { class: "num", text: rangeText(p) }), K.icon("chev"))))
        : h("p", { class: "muted", style: "margin:0", text: "機器がありません。「機器を追加」から登録してください。" }));
    close = K.sheet({ title: "温度を記録する機器", body, actions: [
      { label: "閉じる", kind: "ghost" },
      { label: "機器を追加", kind: "primary", disabled: ro(), onClick: () => { setTimeout(() => openHygPoint(null), 0); } },
    ] });
  }
  function openHygPoint(p) {
    const isNew = !p;
    const cur = p || { name: "", kind: "冷蔵", min: 0, max: 10 };
    const fName = K.input({ value: cur.name, placeholder: "例：冷蔵庫2（仕込み用）", autocomplete: "off" });
    const fKind = K.select(HYG_KINDS, cur.kind || "その他");
    const fMin = K.input({ value: String(cur.min), autocomplete: "off", "aria-label": "下限（℃）" });
    const fMax = K.input({ value: String(cur.max), autocomplete: "off", "aria-label": "上限（℃）" });
    const preset = { 冷蔵: [0, 10], 冷凍: [-25, -15], 温蔵: [65, 85] };
    fKind.addEventListener("change", () => { const r = preset[fKind.value]; if (r && isNew) { fMin.value = r[0]; fMax.value = r[1]; } });
    const body = h("div", { class: "stack" },
      K.field("名前", fName),
      K.field("種類", fKind, "新規のときは種類に合わせて範囲の目安が入ります（冷蔵 0〜10℃、冷凍 -25〜-15℃、温蔵 65〜85℃）"),
      h("div", { class: "grid2" }, K.field("下限（℃）", fMin, "マイナスは「-」を付けて入力"), K.field("上限（℃）", fMax)));
    const menu = isNew ? null : [{ label: "この機器を削除", icon: "trash", danger: true, disabled: ro(), onClick: async () => {
      if (!(await K.confirm(cur.name + " を削除します。過去の記録は残りますが、一覧には表示されなくなります。", "削除する"))) return;
      const c = hygConfig();
      try { await W.put("hygiene", "config", { points: ((c && c.points) || []).filter((x) => x.id !== cur.id) }); } catch (e) { return; }
      K.toast("削除しました");
      return "close";
    } }];
    K.sheet({ title: isNew ? "機器を追加" : "機器を編集", body, menu, actions: [
      { label: "キャンセル", kind: "ghost" },
      { label: isNew ? "追加する" : "保存する", kind: "primary", disabled: ro(), onClick: async () => {
        K.clearErrors(body);
        const name = fName.value.trim();
        const mn = parseTemp(fMin.value), mx = parseTemp(fMax.value);
        if (!name) K.fieldError(fName, "名前を入れてください");
        if (mn == null) K.fieldError(fMin, "数字で入れてください（例：0、-25）");
        if (mx == null) K.fieldError(fMax, "数字で入れてください（例：10、-15）");
        if (mn != null && mx != null && mn >= mx) K.fieldError(fMax, "上限は下限より大きくしてください");
        if (mn != null && (mn < -60 || mn > 300)) K.fieldError(fMin, "-60〜300℃の範囲で入れてください");
        if (mx != null && (mx < -60 || mx > 300)) K.fieldError(fMax, "-60〜300℃の範囲で入れてください");
        const c = hygConfig();
        const list = ((c && c.points) || []).slice();
        if (name && list.some((x) => x.name === name && x.id !== cur.id)) K.fieldError(fName, "同じ名前の機器があります");
        if (K.focusFirstError(body)) return false;
        const rec = { id: isNew ? uid() : cur.id, name, kind: fKind.value, min: mn, max: mx };
        const i = list.findIndex((x) => x.id === rec.id);
        if (i >= 0) list[i] = rec; else list.push(rec);
        try { await W.put("hygiene", "config", { points: list }); } catch (e) { return false; }
        K.toast(isNew ? name + " を追加しました" : "保存しました", "ok");
      } },
    ] });
  }

  /* ---------- 今日モードの欄（v3.0） ---------- */
  K.todaySection({ key: "hygiene", title: "衛生チェック", icon: "thermo", order: 20, mount(el, ctx) {
    const draw = () => {
      el.textContent = "";
      const today = K.today();
      const pts = hygPoints();
      if (!pts.length) {
        el.appendChild(h("p", { class: "muted", style: "margin:0 0 12px", text: "温度を記録する機器が未登録です。" }));
        el.appendChild(h("button", { class: "btn", type: "button", onClick: () => { if (ctx && ctx.close) ctx.close(); K.go("shift", "hygiene"); } }, "衛生記録を開く"));
        return;
      }
      const st = hygStatus(today);
      if (st.abnormal.length) {
        el.appendChild(h("h3", { class: "sft-tm-h sft-bad", text: "範囲外 " + st.abnormal.length + "件" }));
        el.appendChild(h("div", { class: "list" }, st.abnormal.map((a) => h("div", { class: "li" },
          h("span", { class: "chip bad" }, K.icon("alert"), a.slot), h("b", { text: a.name }), h("span", { class: "num sft-bad", style: "margin-left:auto", text: fmtTemp(a.temp) })))));
      }
      el.appendChild(h("h3", { class: "sft-tm-h", text: "温度記録 " + st.done + "/" + st.total + (eveningDue(today) ? "" : "（夕は15時から）") }));
      if (st.missing.length) {
        el.appendChild(h("div", { class: "sft-hyg-list" }, st.missing.map((m) => {
          const p = pts.find((x) => x.id === m.pointId);
          return p ? hygEntry(p, m.slot, today, { big: true, showSlot: true }) : null;
        })));
      } else {
        el.appendChild(h("div", { class: "sft-tm-ok" }, K.icon("check"), "いま必要な温度はすべて記録済みです"));
      }
      el.appendChild(h("h3", { class: "sft-tm-h", text: "チェック" }));
      el.appendChild(hygChecks(today));
    };
    let key = hygTimeKey();
    const iv = setInterval(() => { if (hygTimeKey() !== key) { key = hygTimeKey(); draw(); } }, 30000);
    const us = [K.watch("hygiene", draw), K.on("day", draw), () => clearInterval(iv)];
    return () => us.forEach((u) => { try { u(); } catch (e) {} });
  } });

  K.todaySection({ key: "crew", title: "今日の出勤と連絡", icon: "calendar", order: 30, mount(el, ctx) {
    const draw = () => {
      el.textContent = "";
      const today = K.today();
      const list = todayCrew(today);
      const now = new Date(); const nowMin = now.getHours() * 60 + now.getMinutes();
      const working = (e) => { const a = toMin(e.start), b = toMin(e.end); if (e._carry) return nowMin < b; return b > a ? nowMin >= a && nowMin < b : nowMin >= a; };
      el.appendChild(h("h3", { class: "sft-tm-h", text: "今日の出勤 " + (list.length ? headcount(list) : "") }));
      el.appendChild(list.length
        ? h("div", { class: "list sft-tm-crew" }, list.map((e) => {
            const s = staffById(e.staffId);
            const isWorking = working(e);
            return h("div", { class: "li " + colorClass(s && s.color) },
              h("span", { class: "sft-dot" }),
              h("span", { class: "sft-tm-who" },
                h("b", { text: sName(e.staffId) }),
                (e.station || isWorking || e._carry) ? h("span", { class: "sft-tm-sub" },
                  isWorking ? h("span", { class: "chip ok", text: "勤務中" }) : null,
                  e.station ? h("span", { class: "chip", text: e.station }) : null,
                  e._carry ? h("span", { class: "small muted", text: "前日から" }) : null) : null),
              h("span", { class: "sft-tm-time", text: e._carry ? "〜" + e.end : e.start + "–" + e.end }));
          }))
        : h("p", { class: "muted", style: "margin:0", text: "今日のシフトは登録されていません" }));
      const cur = K.currentStaffId();
      const notes = K.list("notes").filter((n) => n.priority === "urgent" || n.pinned)
        .sort((a, b) => (b.priority === "urgent" ? 1 : 0) - (a.priority === "urgent" ? 1 : 0) || String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
        .slice(0, 6);
      el.appendChild(h("h3", { class: "sft-tm-h", text: "緊急・ピン留めの連絡" }));
      if (!notes.length) { el.appendChild(h("p", { class: "muted", style: "margin:0", text: "緊急・ピン留めの連絡はありません" })); return; }
      el.appendChild(h("div", { class: "list" }, notes.map((n) => {
        const read = cur && (n.readBy || []).includes(cur);
        return h("div", { class: "li sft-tm-note" },
          h("div", { class: "row", style: "gap:6px" },
            n.priority === "urgent" ? h("span", { class: "chip bad" }, K.icon("alert"), "緊急") : null,
            n.pinned ? h("span", { class: "chip" }, K.icon("pin"), "ピン留め") : null,
            h("span", { class: "chip", text: KINDS.includes(n.kind) ? n.kind : "連絡" }),
            h("span", { class: "small muted", text: sName(n.staffId) + " · " + relTime(n.createdAt) })),
          h("p", { text: n.text || "" }),
          cur
            ? h("button", { class: "btn sm" + (read ? " sft-done sft-confirm" : ""), type: "button", attrs: WR, disabled: ro() || read, onClick: () => markRead(n.id, cur) }, K.icon("check"), read ? K.staffName(cur) + "は確認済み" : K.staffName(cur) + "として確認")
            : h("button", { class: "btn sm", type: "button", onClick: () => { if (ctx && ctx.close) ctx.close(); K.go("shift", "notes"); } }, "業務連絡で確認する"));
      })));
    };
    const iv = setInterval(draw, 60000);
    const us = [K.watch("shifts", draw), K.watch("notes", draw), K.watch("staff", draw), K.on("staff", draw), K.on("day", draw), () => clearInterval(iv)];
    return () => us.forEach((u) => { try { u(); } catch (e) {} });
  } });

  /* ---------- マイページの欄「自分の予定と連絡」（v2.5）：本人用なので人件費は出さない ---------- */
  function renderMy(el) {
    el.classList.add("sft-my");
    function nextShift(sid) {
      const now = new Date();
      const today = K.today();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const ws = K.weekStart(today);
      const pool = [ws, K.addDays(ws, 7), K.addDays(ws, 14)].flatMap(weekEntries)
        .filter((e) => e.staffId === sid && e.date >= today)
        .filter((e) => e.date > today || (toMin(e.end) > toMin(e.start) ? toMin(e.end) > nowMin : true))
        .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
      return pool[0] || null;
    }
    function draw() {
      el.textContent = "";
      const sid = K.currentStaffId();
      if (!sid) {
        el.appendChild(K.empty("担当者が選ばれていません", "ヘッダーで自分の名前を選ぶと表示されます。今週のシフトと、自分が未確認の連絡がここに出ます。"));
        return;
      }
      const today = K.today();
      const ws = K.weekStart(today);
      // 次の出勤
      const nx = nextShift(sid);
      el.appendChild(h("div", { class: "sft-my-next" },
        h("span", { class: "lbl", text: nx && nx.date === today ? "次の出勤（今日）" : "次の出勤" }),
        nx ? h("span", { class: "val", text: K.fmt.date(nx.date) + " " + nx.start + "–" + nx.end })
          : h("span", { class: "val", style: "font-size:16px", text: "3週間以内の予定はありません" }),
        nx ? h("span", { class: "sub", text: [nx.station, "実働 " + K.fmt.num(K.hours(nx.start, nx.end, nx.breakMin), 1) + "時間"].filter(Boolean).join(" · ") }) : null));
      // 今週のシフト
      const mine = weekEntries(ws).filter((e) => e.staffId === sid).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
      const totH = mine.reduce((t, e) => t + K.hours(e.start, e.end, e.breakMin), 0);
      const daysN = new Set(mine.map((e) => e.date)).size;
      el.appendChild(h("h3", { class: "sft-my-h" }, "今週のシフト", h("span", { class: "sft-count", text: mine.length ? "今週の合計 " + K.fmt.num(totH, 1) + "時間・" + daysN + "日" : "" })));
      // 日ごとに1行（同じ日の分割勤務はまとめて表示）
      const byDay = [];
      mine.forEach((e) => { const d = byDay.find((x) => x.date === e.date); if (d) d.list.push(e); else byDay.push({ date: e.date, list: [e] }); });
      el.appendChild(byDay.length
        ? h("div", { class: "list" }, byDay.map((d) => {
            const isToday = d.date === today;
            const stations = [...new Set(d.list.map((e) => e.station).filter(Boolean))];
            return h("div", { class: "li sft-my-row" + (isToday ? " sft-is-today" : ""), "aria-current": isToday ? "date" : null },
              h("span", { class: "sft-my-date" },
                h("span", { class: "num", text: K.fmt.md(d.date) }), " ", h("span", { class: dowClass(d.date), text: K.fmt.dow(d.date) }),
                isToday ? h("span", { class: "sft-my-today", text: "今日" }) : null),
              h("span", { class: "sft-grow" },
                h("span", { class: "sft-my-times" }, d.list.map((e) => h("span", { class: "sft-my-time", text: e.start + "–" + e.end }))),
                stations.map((st) => h("span", { class: "chip", text: st }))),
              h("span", { class: "sft-my-hrs", text: K.fmt.num(d.list.reduce((t, e) => t + K.hours(e.start, e.end, e.breakMin), 0), 1) + "h" }));
          }))
        : h("div", { class: "list" }, h("div", { class: "sft-my-empty", text: "今週のシフトは登録されていません" })));
      // 自分が未確認の連絡
      const unread = K.list("notes").filter((n) => !(n.readBy || []).includes(sid))
        .sort((a, b) => (b.priority === "urgent" ? 1 : 0) - (a.priority === "urgent" ? 1 : 0) || String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
      el.appendChild(h("h3", { class: "sft-my-h" }, "未確認の連絡", h("span", { class: "sft-count", text: unread.length ? unread.length + "件" + (unread.length > 5 ? "（新しい5件を表示）" : "") : "" })));
      if (!unread.length) {
        el.appendChild(h("div", { class: "list" }, h("div", { class: "sft-my-empty", text: "未確認の連絡はありません" })));
        return;
      }
      const goNotes = () => K.go("shift", "notes");
      el.appendChild(h("div", { class: "list" }, unread.slice(0, 5).map((n) => h("div", {
        class: "li sft-my-note", role: "link", tabindex: "0", "aria-label": "業務連絡を開く：" + (n.text || "").slice(0, 30),
        onClick: goNotes, onKeydown: (ev) => { if (ev.target === ev.currentTarget && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); goNotes(); } },
      },
        h("span", { class: "sft-grow" },
          h("span", { class: "row", style: "gap:6px" },
            n.priority === "urgent" ? h("span", { class: "chip bad" }, K.icon("alert"), "緊急") : null,
            h("span", { class: "chip", text: KINDS.includes(n.kind) ? n.kind : "連絡" }),
            h("span", { class: "small muted", text: sName(n.staffId) + " · " + relTime(n.createdAt) })),
          h("span", { class: "sft-my-note-text", text: n.text || "" })),
        h("button", {
          class: "btn sm", type: "button", attrs: WR, disabled: ro(),
          onClick: (ev) => { ev.stopPropagation(); markRead(n.id, sid); },
        }, K.icon("check"), K.staffName(sid) + "として確認")))));
    }
    renders.my = draw;
    draw();
  }
  if (typeof K.mypageSection === "function") {
    K.mypageSection({ key: "my-schedule", title: "自分の予定と連絡", icon: "calendar", order: 30, mount: renderMy });
  }

  /* ---------- 窓口：クイックメモ →「業務連絡として共有」（v2.4） ---------- */
  K.provide("note.post", {
    label: "業務連絡として共有", icon: "send", order: 10,
    handle: (memo) => new Promise((resolve) => {
      const tag = memo.tag || "";
      let kind = tag === "温度記録" ? "衛生" : tag === "追加仕込み" ? "仕込み" : "連絡";
      let urgent = tag === "品切れ" || tag === "要確認";
      const qty = memo.qty != null && memo.qty !== "" && Number(memo.qty) !== 0 ? memo.qty : null;
      const text = h("textarea", { class: "inp", attrs: { rows: "4", "aria-label": "連絡の本文" } });
      text.value = String(memo.text || "") + (qty != null ? " ×" + qty : "");
      const kinds = h("div", { class: "sft-wrapchips", role: "group", "aria-label": "種類" });
      const urg = h("div");
      function draw() {
        kinds.textContent = "";
        KINDS.forEach((k) => kinds.appendChild(toggleBtn(k, kind === k, () => { kind = k; draw(); })));
        urg.textContent = "";
        urg.appendChild(toggleBtn(urgent ? "緊急 ON" : "緊急", urgent, () => { urgent = !urgent; draw(); }, "sft-urgent"));
      }
      draw();
      const usePhoto = h("input", { type: "checkbox", checked: true });
      const sid = memo.staffId && staffById(memo.staffId) ? memo.staffId : K.currentStaffId();
      const body = h("div", { class: "stack" },
        K.field("本文", text),
        h("div", { class: "field" }, h("span", { class: "field-label", text: "種類" }), kinds),
        h("div", { class: "field" }, h("span", { class: "field-label", text: "優先度" }), urg,
          (tag === "品切れ" || tag === "要確認") ? h("span", { class: "field-hint", text: "メモのタグが「" + tag + "」のため緊急をおすすめしています" }) : null),
        memo.photo ? h("div", { class: "sft-memo-photo" },
          h("span", { class: "sft-photo" }, photoImg(memo.photo)),
          h("label", { class: "sft-toggle" }, usePhoto, h("span", { text: "写真を付ける" }))) : null,
        h("p", { class: "small muted", style: "margin:0", text: "投稿者：" + (sid ? K.staffName(sid) : "未選択（ヘッダーで担当者を選べます）") }));
      let saved = false;
      K.sheet({
        title: "業務連絡として共有",
        body,
        onClose: () => resolve(saved),
        actions: [
          { label: "キャンセル", kind: "ghost" },
          { label: "共有する", kind: "primary", disabled: ro(), onClick: async () => {
            const t = text.value.trim();
            if (!t) { K.toast("本文を入力してください", "bad"); return false; }
            const data = {
              text: t, kind, priority: urgent ? "urgent" : "normal", pinned: false,
              staffId: sid || null, createdAt: new Date().toISOString(), readBy: sid ? [sid] : [],
            };
            if (memo.photo && usePhoto.checked) data.photo = memo.photo;
            try { await W.add("notes", data); } catch (e) { return false; }
            saved = true;
            K.toast("業務連絡に共有しました", "ok");
          } },
        ],
      });
    }),
  });

  /* ---------- 購読（各コレクション1回だけ。ナビのバッジは画面を開く前から出すため登録時に購読） ---------- */
  K.watch("staff", () => { updateBadge(); refresh("notes", "shift", "staff", "my"); });
  K.watch("shifts", () => refresh("shift", "my"));
  K.watch("hygiene", () => refresh("hyg"));
  K.watch("notes", () => { updateBadge(); refresh("notes", "my"); });
  K.on("staff", () => { updateBadge(); refresh("notes", "shift", "my"); });
  K.on("readonly", () => refresh("notes", "shift", "staff", "my"));
  // 日付が変わったら「今日」の表示を更新。今週を見ていた場合は新しい週へ進める
  let lastToday = K.today();
  K.on("day", (d) => {
    const nd = d || K.today();
    if (weekStart === K.weekStart(lastToday)) weekStart = K.weekStart(nd);
    lastToday = nd;
    updateBadge();
    refresh("notes", "shift", "my", "hyg");
  });
  // ホーム等からの絞り込み：K.go("shift", "notes", { filter: { notes: "unread" } })（文字列 "unread" も可）
  K.on("nav", (ev) => {
    if (!ev || ev.key !== "shift") return;
    const f = ev.filter;
    const v = typeof f === "string" ? f : f && f.notes;
    if (v === "unread") { noteFilter = "unread"; refresh("notes"); }
  });

  /* ---------- 登録 ---------- */
  K.register({
    key: "shift", label: "シフト・連絡", icon: "calendar", order: 4,
    mount(root) {
      root.appendChild(h("h1", { class: "page-title", text: "シフト・連絡" }));
      K.subtabs(root, "shift", [
        { id: "notes", label: "業務連絡", render: renderNotes },
        { id: "shift", label: "シフト", render: renderShift },
        { id: "hygiene", label: "衛生", render: renderHyg },
        { id: "staff", label: "スタッフ", render: renderStaff },
      ]);
    },
  });
})();
