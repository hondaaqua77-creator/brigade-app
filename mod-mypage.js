/* BRIGADE mod-mypage.js — 統括：マイページ（自分専用のタスク管理・クイックメモ・各担当の欄）。
   書き込みは K.my の kind "tasks" のみ（自分専用）。共有データには書かない。 */
(function () {
  "use strict";
  const K = window.K;
  const h = K.h;

  K.css("myp", `
.myp-head { display: flex; flex-direction: column; gap: 4px; }
.myp-sub { font-size: 13px; color: var(--muted); display: flex; align-items: center; gap: 6px; }
.myp-sub .ico { width: 16px; height: 16px; }
.myp-warn { display: flex; gap: 10px; align-items: center; padding: 12px 14px; border-radius: var(--r-sm); background: var(--warn-soft); color: var(--warn); font-weight: 700; font-size: 14px; }
.myp-grid { display: grid; gap: 16px; grid-template-columns: 1fr; align-items: start; }
@media (min-width: 1100px) { .myp-grid { grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr); } }
.myp-col { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.myp-sec-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.myp-sec-head > .ico { width: 20px; height: 20px; color: var(--accent); }
.myp-add { display: flex; flex-direction: column; gap: 10px; }
.myp-add-row { display: flex; gap: 8px; }
.myp-add-row .inp { flex: 1 1 auto; font-size: 16px; }
.myp-add-opts { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.myp-add-opts .fchip { min-height: 44px; padding: 0 14px; font-size: 14px; }
.myp-date { width: 160px; min-height: 44px; padding: 4px 10px; font-size: 15px; }
.myp-group { display: flex; flex-direction: column; gap: 6px; }
.myp-group-title { font-size: 12.5px; font-weight: 700; color: var(--muted); letter-spacing: .02em; display: flex; gap: 6px; align-items: center; }
.myp-group-title.is-bad { color: var(--bad); }
.myp-task { display: flex; align-items: center; gap: 4px; padding: 4px 8px 4px 4px; min-height: 56px; }
.myp-check { flex: none; width: 44px; height: 44px; border: 0; background: transparent; display: grid; place-items: center; cursor: pointer; border-radius: 50%; }
.myp-check span { width: 24px; height: 24px; border-radius: 50%; border: 2px solid var(--line-strong); display: grid; place-items: center; color: #fff; transition: background .12s, border-color .12s; }
.myp-check:hover span { border-color: var(--accent); }
.myp-check .ico { width: 14px; height: 14px; stroke-width: 3; opacity: 0; }
.myp-task.is-done .myp-check span { background: var(--ok); border-color: var(--ok); }
.myp-task.is-done .myp-check .ico { opacity: 1; }
.myp-task.is-high .myp-check span { border-color: var(--bad); }
.myp-body { flex: 1 1 auto; min-width: 0; border: 0; background: transparent; text-align: left; cursor: pointer; padding: 6px 4px; display: flex; flex-direction: column; gap: 3px; }
.myp-title { font-size: 15.5px; font-weight: 700; color: var(--ink); overflow-wrap: anywhere; }
.myp-task.is-done .myp-title { color: var(--muted); text-decoration: line-through; font-weight: 400; }
.myp-meta { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; font-size: 12.5px; color: var(--muted); }
.myp-meta .chip { padding: 3px 7px; font-size: 11.5px; }
.myp-meta .is-bad { color: var(--bad); font-weight: 700; }
.myp-meta .ico { width: 14px; height: 14px; }
.myp-empty { padding: 20px 8px; text-align: center; color: var(--muted); font-size: 14px; }
.myp-progress { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--muted); }
.myp-progress .bar { flex: 1 1 auto; }
.myp-cl { display: flex; flex-direction: column; gap: 6px; }
.myp-cl-row { display: flex; gap: 6px; align-items: center; }
.myp-cl-row .inp { flex: 1 1 auto; }
.myp-cl-row input[type=checkbox] { width: 24px; height: 24px; accent-color: var(--accent); flex: none; }
.myp-memo { display: flex; gap: 8px; align-items: center; }
.myp-route { min-height: 44px; flex: none; }
.myp-seg-host .seg-btn { min-height: 44px; padding: 0 10px; }
.myp-memo-text { flex: 1 1 auto; min-width: 0; font-size: 14.5px; overflow-wrap: anywhere; }
/* タイムライン（1日の時間割） */
.myp-tl-nav { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
.myp-tl-day { font-family: var(--f-display); font-weight: 700; font-size: 17px; min-width: 8.5em; text-align: center; }
.myp-tl-nav .icon-btn { width: 44px; height: 44px; }
.myp-tl-sum { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-bottom: 10px; }
.myp-tl-kpi { border: 1px solid var(--line); border-radius: var(--r-sm); padding: 8px 10px; min-width: 0; }
.myp-tl-kpi b { display: block; font-size: 12px; color: var(--muted); font-weight: 700; }
.myp-tl-kpi span { display: block; font-size: 15px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
@media (max-width: 559px) { .myp-tl-sum { grid-template-columns: 1fr 1fr; } .myp-tl-kpi:first-child { grid-column: 1 / -1; } .myp-tl-kpi:first-child span { white-space: normal; } }
.myp-tl-kpi.is-next { border-color: var(--accent); background: var(--accent-soft); }
.myp-tl-kpi.is-bad span { color: var(--bad); }
.myp-tl-untimed { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-bottom: 10px; font-size: 13px; color: var(--muted); }
.myp-tl-untimed .fchip { min-height: 44px; font-size: 13.5px; }
.myp-tl-scroll { max-height: 62vh; overflow-y: auto; border: 1px solid var(--line); border-radius: var(--r-sm); background: var(--surface); overscroll-behavior: contain; }
.myp-tl { position: relative; margin-left: 52px; }
.myp-tl-hour { position: absolute; left: -52px; right: 0; height: 0; border-top: 1px solid var(--line); }
.myp-tl-hour span { position: absolute; left: 8px; top: 2px; font-size: 12px; color: var(--muted); font-family: var(--f-num); }
.myp-tl-half { position: absolute; left: 0; right: 0; height: 0; border-top: 1px dashed var(--line); opacity: .7; }
.myp-tl-slot { position: absolute; left: 0; right: 0; border: 0; background: transparent; cursor: pointer; padding: 0; }
.myp-tl-slot:hover, .myp-tl-slot:focus-visible { background: var(--accent-soft); }
.myp-tl-shift { position: absolute; left: 0; width: 6px; border-radius: 3px; background: var(--accent); opacity: .55; pointer-events: none; }
.myp-tl-shift-lb { position: absolute; z-index: 0; left: 10px; background: var(--surface); padding: 0 4px; border-radius: 4px; font-size: 12px; font-weight: 700; color: var(--accent); pointer-events: none; white-space: nowrap; }
.myp-tl-blk { position: absolute; z-index: 1; border-radius: 8px; padding: 3px 6px 3px 4px; display: flex; gap: 4px; align-items: flex-start; overflow: hidden; border: 1px solid #b9cdf5; background: #eaf1ff; color: var(--ink); min-height: 40px; box-sizing: border-box; }
.myp-tl-blk.is-high { border-color: #f1b3ad; background: #fff0ee; }
.myp-tl-blk.is-done { background: #eef1f5; border-color: var(--line); color: var(--muted); }
.myp-tl-blk.is-done .myp-tl-tt { text-decoration: line-through; }
.myp-tl-blk.is-ev { background: repeating-linear-gradient(-45deg, #f4f6fa, #f4f6fa 6px, #eceff5 6px, #eceff5 12px); border: 1px dashed var(--line-strong); color: var(--ink-2, var(--ink)); }
.myp-tl-blk.is-now { box-shadow: 0 0 0 2px var(--accent); }
.myp-tl-blk .myp-check { width: 44px; height: 44px; margin: -4px -6px -4px -4px; }
.myp-tl-blk .myp-check span { width: 20px; height: 20px; }
.myp-tl-blk.is-done .myp-check span { background: var(--ok); border-color: var(--ok); }
.myp-tl-blk.is-done .myp-check .ico { opacity: 1; }
.myp-tl-bb { flex: 1 1 auto; min-width: 0; border: 0; background: transparent; text-align: left; cursor: pointer; padding: 3px 2px; display: flex; flex-direction: column; color: inherit; font: inherit; }
.myp-tl-tt { font-size: 14px; font-weight: 700; line-height: 1.3; overflow-wrap: anywhere; }
.myp-tl-tm { font-size: 12px; color: var(--muted); font-family: var(--f-num); }
.myp-tl-now { position: absolute; left: -8px; right: 0; height: 0; border-top: 2px solid var(--bad); z-index: 3; pointer-events: none; }
.myp-tl-now::before { content: ""; position: absolute; left: -4px; top: -6px; width: 10px; height: 10px; border-radius: 50%; background: var(--bad); }
.myp-tl-legend { display: flex; gap: 12px; flex-wrap: wrap; font-size: 12px; color: var(--muted); margin-top: 8px; }
.myp-tl-legend i { display: inline-block; width: 12px; height: 12px; border-radius: 3px; vertical-align: -2px; margin-right: 4px; }
.myp-dur { display: flex; gap: 6px; flex-wrap: wrap; }
.myp-dur .fchip { min-height: 44px; }
.myp-td-row { display: flex; align-items: center; gap: 10px; min-height: 60px; padding: 6px 4px; border-bottom: 1px solid var(--line); }
.myp-td-row:last-child { border-bottom: 0; }
.myp-td-time { flex: none; width: 4.6em; font-family: var(--f-num); font-weight: 600; color: var(--accent); }
.myp-td-row.is-done .myp-td-tt { text-decoration: line-through; color: var(--muted); }
.myp-td-row.is-done .myp-check span { background: var(--ok); border-color: var(--ok); }
.myp-td-row.is-done .myp-check .ico { opacity: 1; }
.myp-td-row.is-past:not(.is-done) .myp-td-time { color: var(--bad); }
.myp-td-tt { flex: 1 1 auto; min-width: 0; font-weight: 700; overflow-wrap: anywhere; }
`);

  const TAGS = ["仕込み", "発注", "衛生", "勉強", "その他"];
  const PRI = [{ value: "high", label: "高" }, { value: "mid", label: "中" }, { value: "low", label: "低" }];
  const REPEAT = [{ value: "none", label: "なし" }, { value: "daily", label: "毎日" }, { value: "weekdays", label: "平日" }, { value: "weekly", label: "毎週" }];
  const repLabel = { daily: "毎日", weekdays: "平日", weekly: "毎週" };

  const toMin = (t) => { const m = /^(\d{1,2}):(\d{2})/.exec(t || ""); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
  const fromMin = (n) => String(Math.floor(n / 60)).padStart(2, "0") + ":" + String(n % 60).padStart(2, "0");
  const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
  const dayLabel = (d) => { const t = K.today(); return (d === t ? "今日 " : d === K.addDays(t, 1) ? "明日 " : d === K.addDays(t, -1) ? "昨日 " : "") + K.fmt.md(d) + "（" + K.fmt.dow(d) + "）"; };

  // その日の自分の材料：時刻つきタスク・時刻なしタスク・自分のシフト・店の予定（共有データは読むだけ）
  function dayData(date) {
    const me = K.currentStaffId();
    const timed = [], untimed = [];
    tasks.filter((t) => t.due === date).forEach((t) => {
      const st = toMin(t.time);
      if (st == null) { untimed.push(t); return; }
      let en = toMin(t.endTime); if (en == null || en <= st) en = Math.min(st + 30, 24 * 60);
      timed.push({ kind: "task", t, st, en });
    });
    const shifts = [];
    if (me) {
      const wk = K.getDoc("shifts", "w-" + K.weekStart(date));
      ((wk && wk.entries) || []).filter((e) => e.date === date && e.staffId === me).forEach((e) => {
        const st = toMin(e.start); let en = toMin(e.end);
        if (st == null || en == null) return;
        if (en <= st) en = 24 * 60; // 日付をまたぐ勤務は 24:00 で切る
        shifts.push({ st, en, label: e.start + "–" + e.end + (e.station ? " " + e.station : "") });
      });
    }
    const allDay = [];
    (K.list("events") || []).filter((ev) => ev.date && ev.date <= date && (ev.endDate || ev.date) >= date).forEach((ev) => {
      const st = toMin(ev.start);
      if (ev.allDay || st == null || ev.date !== date) { allDay.push(ev); return; }
      let en = toMin(ev.end); if (en == null || en <= st) en = Math.min(st + 60, 24 * 60);
      timed.push({ kind: "event", ev, st, en });
    });
    timed.sort((a, b) => a.st - b.st || b.en - a.en);
    return { timed, untimed, shifts, allDay };
  }

  // 重なりの段組み（同時刻のものは横に並べる）
  function layoutCols(items) {
    let cluster = [], clusterEnd = -1;
    const flush = () => { const n = Math.max(1, ...cluster.map((x) => x.col + 1)); cluster.forEach((x) => { x.cols = n; }); cluster = []; };
    items.forEach((it) => {
      if (it.st >= clusterEnd && cluster.length) flush(), (clusterEnd = -1);
      const used = new Set(cluster.filter((x) => x.en > it.st).map((x) => x.col));
      let c = 0; while (used.has(c)) c++;
      it.col = c; cluster.push(it); clusterEnd = Math.max(clusterEnd, it.en);
    });
    if (cluster.length) flush();
    return items;
  }

  let tlDate = null;           // null＝今日を追う
  const tlScroll = {};         // 日付ごとのスクロール位置（再描画で戻す）
  const PXH = 88;              // 1時間の高さ
  function renderTimeline(host) {
    const prevScroller = host.querySelector(".myp-tl-scroll");
    if (prevScroller && prevScroller.dataset.date) tlScroll[prevScroller.dataset.date] = prevScroller.scrollTop;
    host.textContent = "";
    const today = K.today(), date = tlDate || today, isToday = date === today, now = nowMin();
    const dd = dayData(date);
    const redraw = () => listeners.forEach((fn) => fn());
    const go = (d) => { tlDate = d === today ? null : d; redraw(); };
    const quarter = () => { const n = isToday ? Math.ceil((now + 1) / 15) * 15 : 9 * 60; return fromMin(Math.min(n, 23 * 60 + 30)); };
    const dateIn = h("input", { type: "date", class: "inp myp-date", "aria-label": "日付を選ぶ", value: date, onChange: (e) => { if (e.target.value) go(e.target.value); } });
    host.appendChild(h("div", { class: "myp-tl-nav" },
      h("button", { class: "icon-btn", "aria-label": "前の日", onClick: () => go(K.addDays(date, -1)) }, K.icon("chevl")),
      h("span", { class: "myp-tl-day", text: dayLabel(date) }),
      h("button", { class: "icon-btn", "aria-label": "次の日", onClick: () => go(K.addDays(date, 1)) }, K.icon("chev")),
      isToday ? null : h("button", { class: "btn sm", onClick: () => go(today) }, "今日へ"),
      dateIn,
      h("span", { class: "spacer" }),
      h("button", { class: "btn", onClick: () => editTask({ due: date, time: quarter() }) }, K.icon("plus"), "時間を決めて追加")));

    // 要約：次の予定・進み具合・勤務/重なり
    const tTasks = dd.timed.filter((x) => x.kind === "task");
    const doneN = tTasks.filter((x) => x.t.done).length;
    let nextTxt = "—", nextCls = "";
    if (isToday || date > today) {
      const cur = dd.timed.find((x) => (x.kind === "event" || !x.t.done) && x.st <= now && x.en > now && isToday);
      const nx = dd.timed.find((x) => (x.kind === "event" || !x.t.done) && (!isToday || x.st > now));
      const it = cur || nx;
      if (it) {
        const nm = it.kind === "task" ? it.t.title : it.ev.title;
        nextTxt = (cur ? "いま " : fromMin(it.st) + " ") + nm + (!cur && isToday ? "（あと" + (it.st - now >= 60 ? Math.floor((it.st - now) / 60) + "時間" : "") + ((it.st - now) % 60 ? ((it.st - now) % 60) + "分" : "") + "）" : "");
        nextCls = " is-next";
      } else nextTxt = dd.timed.length ? "予定はここまで" : "予定なし";
    }
    const overlaps = tTasks.filter((a, i) => tTasks.some((b, j) => j !== i && !a.t.done && !b.t.done && a.st < b.en && b.st < a.en)).length;
    const overdueT = isToday ? tTasks.filter((x) => !x.t.done && x.en <= now).length : 0;
    host.appendChild(h("div", { class: "myp-tl-sum" },
      h("div", { class: "myp-tl-kpi" + nextCls, title: nextTxt }, h("b", { text: isToday ? "いま・次" : "最初の予定" }), h("span", { text: nextTxt })),
      h("div", { class: "myp-tl-kpi" + (overdueT ? " is-bad" : "") }, h("b", { text: "時間割の進み" }), h("span", { class: "num", text: doneN + "/" + tTasks.length + (overdueT ? "（遅れ" + overdueT + "）" : "") })),
      overlaps
        ? h("div", { class: "myp-tl-kpi is-bad" }, h("b", { text: "時間の重なり" }), h("span", { text: overlaps + "件 要調整" }))
        : h("div", { class: "myp-tl-kpi" }, h("b", { text: "自分の勤務" }), h("span", { class: "num", text: dd.shifts.length ? dd.shifts.map((x) => x.label.split(" ")[0]).join(" / ") : (K.currentStaffId() ? "シフトなし" : "名前未選択") }))));

    // 時間未定・終日
    if (dd.untimed.length || dd.allDay.length) {
      const row = h("div", { class: "myp-tl-untimed" });
      if (dd.allDay.length) { row.appendChild(h("span", { text: "終日：" })); dd.allDay.forEach((ev) => row.appendChild(h("span", { class: "chip", text: ev.title || "予定" }))); }
      if (dd.untimed.length) row.appendChild(h("span", { text: (dd.allDay.length ? "　" : "") + "時間未定：" }));
      dd.untimed.forEach((t) => row.appendChild(h("button", { class: "fchip", attrs: { "aria-pressed": String(!!t.done) }, title: "時刻を入れて時間割に置く", onClick: () => editTask(Object.assign({}, t, { time: t.time || quarter() })) }, (t.done ? "✓ " : "") + t.title)));
      host.appendChild(row);
    }

    // 表示範囲：通常 7〜24時。予定・勤務がはみ出す場合は広げる
    const mins = [...dd.timed.map((x) => x.st), ...dd.shifts.map((x) => x.st)];
    const maxs = [...dd.timed.map((x) => x.en), ...dd.shifts.map((x) => x.en)];
    const h0 = Math.max(0, Math.min(7, Math.floor((Math.min(...mins, 7 * 60) - 30) / 60)));
    const h1 = Math.min(24, Math.max(24, Math.ceil(Math.max(...maxs, 0) / 60)));
    const y = (m) => ((m - h0 * 60) * PXH) / 60;
    const tl = h("div", { class: "myp-tl", style: { height: (h1 - h0) * PXH + 8 + "px" } });
    for (let hr = h0; hr <= h1; hr++) {
      tl.appendChild(h("div", { class: "myp-tl-hour", style: { top: y(hr * 60) + "px" } }, h("span", { text: String(hr).padStart(2, "0") + ":00" })));
      if (hr < h1) {
        tl.appendChild(h("div", { class: "myp-tl-half", style: { top: y(hr * 60 + 30) + "px" } }));
        [0, 30].forEach((mm) => { const at = hr * 60 + mm; tl.appendChild(h("button", { class: "myp-tl-slot", style: { top: y(at) + "px", height: PXH / 2 + "px" }, "aria-label": fromMin(at) + " にタスクを追加", onClick: () => editTask({ due: date, time: fromMin(at), endTime: fromMin(Math.min(at + 30, 24 * 60 - 1)) }) })); });
      }
    }
    dd.shifts.forEach((sh) => {
      tl.appendChild(h("div", { class: "myp-tl-shift", style: { top: y(sh.st) + "px", height: Math.max(8, y(sh.en) - y(sh.st)) + "px" } }));
      tl.appendChild(h("div", { class: "myp-tl-shift-lb", style: { top: y(sh.st) + 2 + "px" }, text: "勤務 " + sh.label }));
    });
    layoutCols(dd.timed).forEach((it) => {
      const top = y(it.st), hgt = Math.max(42, y(it.en) - y(it.st) - 2);
      const L = 14, colW = "((100% - " + (L + 4) + "px) / " + it.cols + ")";
      const style = { top: top + 1 + "px", height: hgt + "px", left: "calc(" + L + "px + " + colW + " * " + it.col + ")", width: "calc(" + colW + " - 4px)" };
      const live = isToday && it.st <= now && it.en > now;
      if (it.kind === "event") {
        const ev = it.ev;
        tl.appendChild(h("div", { class: "myp-tl-blk is-ev" + (live ? " is-now" : ""), style, title: "店の予定（ホームのカレンダーで編集）" },
          h("div", { class: "myp-tl-bb", style: { cursor: "default" } },
            h("span", { class: "myp-tl-tt", text: "📅 " + (ev.title || "予定") + (ev.covers ? "（" + ev.covers + "名）" : "") }),
            h("span", { class: "myp-tl-tm", text: fromMin(it.st) + "–" + fromMin(it.en) }))));
        return;
      }
      const t = it.t;
      tl.appendChild(h("div", { class: "myp-tl-blk" + (t.done ? " is-done" : t.priority === "high" ? " is-high" : "") + (live && !t.done ? " is-now" : ""), style },
        h("button", { class: "myp-check", "aria-label": t.done ? "未完了に戻す" : "完了にする", onClick: () => toggleDone(t) }, h("span", null, K.icon("check"))),
        h("button", { class: "myp-tl-bb", onClick: () => editTask(t) },
          h("span", { class: "myp-tl-tt", text: t.title }),
          hgt >= 60 ? h("span", { class: "myp-tl-tm", text: fromMin(it.st) + "–" + fromMin(it.en) + (t.tag ? " · " + t.tag : "") + ((t.checklist || []).length ? " · ☑" + t.checklist.filter((c) => c.done).length + "/" + t.checklist.length : "") }) : null)));
    });
    if (isToday && now >= h0 * 60 && now <= h1 * 60) tl.appendChild(h("div", { class: "myp-tl-now", style: { top: y(now) + "px" }, "aria-hidden": "true" }));
    const scroller = h("div", { class: "myp-tl-scroll", dataset: { date } }, tl);
    host.appendChild(scroller);
    host.appendChild(h("div", { class: "myp-tl-legend" },
      h("span", null, h("i", { style: { background: "#eaf1ff", border: "1px solid #b9cdf5" } }), "自分のタスク"),
      h("span", null, h("i", { style: { background: "#fff0ee", border: "1px solid #f1b3ad" } }), "優先：高"),
      h("span", null, h("i", { style: { background: "#eceff5", border: "1px dashed #9aa6b8" } }), "店の予定"),
      h("span", null, h("i", { style: { background: "var(--accent)", opacity: ".55" } }), "自分の勤務"),
      h("span", null, "空いた枠をタップで追加")));
    requestAnimationFrame(() => {
      if (tlScroll[date] != null) { scroller.scrollTop = tlScroll[date]; return; }
      const first = isToday ? now - 60 : (dd.timed[0] ? dd.timed[0].st - 30 : (dd.shifts[0] ? dd.shifts[0].st - 30 : 9 * 60));
      scroller.scrollTop = Math.max(0, y(first));
    });
  }

  let tasks = [];
  let filter = "today";
  try { const f = localStorage.getItem("kitchen-ledger-myp-filter"); if (["today", "timeline", "all", "done"].includes(f)) filter = f; } catch (e) {}
  const listeners = new Set();
  K.my.watch("tasks", (rows) => {
    tasks = rows;
    const today = K.today();
    const n = rows.filter((t) => !t.done && t.due && t.due <= today).length;
    K.badge("mypage", n, n && rows.some((t) => !t.done && t.due && t.due < today) ? "bad" : "info");
    listeners.forEach((fn) => fn());
  });

  function nextDue(t) {
    const base = t.due || K.today();
    if (t.repeat === "daily") return K.addDays(base, 1);
    if (t.repeat === "weekly") return K.addDays(base, 7);
    if (t.repeat === "weekdays") { let d = K.addDays(base, 1); while (["土", "日"].includes(K.fmt.dow(d))) d = K.addDays(d, 1); return d; }
    return null;
  }

  let toggling = false;
  async function toggleDone(t) {
    if (toggling) return; toggling = true;
    const owner = K.currentStaffId();
    try {
      if (!t.done) {
        await K.my.patch("tasks", t.id, { done: true, doneAt: new Date().toISOString() });
        let nid = null;
        const nd = nextDue(t);
        if (nd) {
          const copy = Object.assign({}, t, { due: nd, done: false, doneAt: null, createdAt: new Date().toISOString(), repeatFrom: t.id, checklist: (t.checklist || []).map((c) => ({ text: c.text, done: false })) });
          delete copy.id;
          nid = await K.my.add("tasks", copy);
          await K.my.patch("tasks", t.id, { nextId: nid });
        }
        K.toast("「" + t.title + "」を完了" + (nd ? "（次回 " + K.fmt.date(nd) + "）" : ""), "ok", { action: { label: "元に戻す", onClick: async () => {
          if (K.currentStaffId() !== owner) { K.toast("担当者が切り替わったため元に戻せません", "bad"); return; }
          await K.my.patch("tasks", t.id, { done: false, doneAt: null, nextId: null });
          if (nid && K.my.get("tasks", nid)) await K.my.del("tasks", nid);
        } } });
      } else {
        // 未完了に戻す：この完了で自動作成された次回分（未着手のもの）を削除して重複を防ぐ
        const nx = t.nextId ? K.my.get("tasks", t.nextId) : K.my.list("tasks").find((x) => x.repeatFrom === t.id && !x.done);
        await K.my.patch("tasks", t.id, { done: false, doneAt: null, nextId: null });
        if (nx && !nx.done) await K.my.del("tasks", nx.id);
      }
    } finally { toggling = false; }
  }

  // タスク編集シート（新規・編集・クイックメモから）。保存で true、閉じると false
  function editTask(t, opts) {
    return new Promise((resolve) => {
      const isNew = !t || !t.id;
      const d = Object.assign({ title: "", note: "", due: K.today(), time: "", endTime: "", priority: "mid", tag: "", repeat: "none", checklist: [] }, t || {});
      let saved = false;
      const title = K.input({ value: d.title, placeholder: "例：明日の仕込みリストを作る", maxlength: 120 });
      const note = h("textarea", { class: "inp", rows: "3", placeholder: "メモ（任意）" }); note.value = d.note || "";
      const due = K.input({ type: "date", value: d.due || "" });
      const time = K.input({ type: "time", value: d.time || "", step: 300 });
      const endTime = K.input({ type: "time", value: d.endTime || "", step: 300 });
      const durBox = h("div", { class: "myp-dur" });
      const drawDur = () => {
        durBox.textContent = "";
        const cur = time.value && endTime.value ? toMin(endTime.value) - toMin(time.value) : null;
        [15, 30, 60, 90, 120].forEach((m) => durBox.appendChild(h("button", { class: "fchip", text: m < 60 ? m + "分" : (m / 60) + "時間", attrs: { "aria-pressed": String(cur === m) }, onClick: () => {
          if (!time.value) { K.fieldError(time, "先に開始時刻を入れてください"); time.focus(); return; }
          endTime.value = fromMin(Math.min(toMin(time.value) + m, 24 * 60 - 1)); K.clearErrors(body); drawDur(); } })));
      };
      time.addEventListener("change", () => { if (time.value && endTime.value && toMin(endTime.value) <= toMin(time.value)) endTime.value = ""; drawDur(); });
      endTime.addEventListener("change", drawDur);
      let pri = d.priority, tag = d.tag, rep = d.repeat;
      const seg = (opts2, cur, set) => {
        const box = h("div", { class: "seg", role: "group" });
        opts2.forEach((o) => box.appendChild(h("button", { class: "seg-btn", text: o.label, attrs: { "aria-pressed": String(o.value === cur) }, onClick: () => { set(o.value); box.querySelectorAll(".seg-btn").forEach((b, i) => b.setAttribute("aria-pressed", String(opts2[i].value === o.value))); } })));
        return box;
      };
      const tagBox = h("div", { class: "fchips", style: { flexWrap: "wrap" } });
      const drawTags = () => { tagBox.textContent = ""; TAGS.forEach((x) => tagBox.appendChild(h("button", { class: "fchip", text: x, attrs: { "aria-pressed": String(tag === x) }, onClick: () => { tag = tag === x ? "" : x; drawTags(); } }))); };
      drawTags();
      let cl = (d.checklist || []).map((c) => ({ text: c.text, done: !!c.done }));
      const clBox = h("div", { class: "myp-cl" });
      const drawCl = () => {
        clBox.textContent = "";
        cl.forEach((c, i) => {
          const cb = h("input", { type: "checkbox", checked: c.done, "aria-label": "完了", onChange: (e) => { c.done = e.target.checked; } });
          const tx = K.input({ value: c.text, placeholder: "項目", onInput: (e) => { c.text = e.target.value; } });
          clBox.appendChild(h("div", { class: "myp-cl-row" }, cb, tx, h("button", { class: "icon-btn danger", "aria-label": "項目を削除", onClick: () => { cl.splice(i, 1); drawCl(); } }, K.icon("trash"))));
        });
        clBox.appendChild(h("button", { class: "btn sm", onClick: () => { cl.push({ text: "", done: false }); drawCl(); const ins = clBox.querySelectorAll(".inp"); if (ins.length) ins[ins.length - 1].focus(); } }, K.icon("plus"), "チェック項目を追加"));
      };
      drawCl();
      let body;
      body = h("div", { class: "stack" },
        opts && opts.fromMemo ? h("div", { class: "myp-sub" }, K.icon("edit"), "クイックメモから下書きしました") : null,
        K.field("タスク", title),
        K.field("日付（期限）", due),
        h("div", { class: "grid2" }, K.field("開始（任意）", time), K.field("終了（任意）", endTime)),
        K.field("所要時間", durBox, "開始を入れると「時間割」に並びます。終了なしは30分で表示します"),
        K.field("優先度", seg(PRI, pri, (v) => { pri = v; })),
        K.field("分類", tagBox),
        K.field("繰り返し", seg(REPEAT, rep, (v) => { rep = v; }), "完了すると次回分が自動で作られます"),
        K.field("チェックリスト", clBox),
        K.field("メモ", note),
        h("p", { class: "muted small", text: K.my.note() }));
      drawDur();
      const actions = [];
      const menu = isNew ? null : [{ label: "このタスクを削除", icon: "trash", danger: true, onClick: async () => { if (!(await K.confirm("このタスクを削除しますか？", "削除する"))) return; await K.my.del("tasks", t.id); saved = true; K.toast("削除しました"); return "close"; } }];
      actions.push({ label: "キャンセル", kind: "ghost" });
      actions.push({ label: isNew ? "追加" : "保存", kind: "primary", onClick: async () => {
        const tt = title.value.trim();
        if (!tt) { K.fieldError(title, "タスク名を入力してください"); K.focusFirstError(body); return false; }
        if (endTime.value && !time.value) { K.fieldError(time, "終了を入れるときは開始も入れてください"); K.focusFirstError(body); return false; }
        if (endTime.value && time.value && toMin(endTime.value) <= toMin(time.value)) { K.fieldError(endTime, "終了は開始より後にしてください"); K.focusFirstError(body); return false; }
        if (time.value && !due.value) { K.fieldError(due, "時刻を入れるときは日付も入れてください"); K.focusFirstError(body); return false; }
        const data = { title: tt, note: note.value.trim(), due: due.value || "", time: time.value || "", endTime: (time.value && endTime.value) || "", priority: pri, tag, repeat: rep,
          checklist: cl.filter((c) => c.text.trim()).map((c) => ({ text: c.text.trim(), done: c.done })),
          done: isNew ? false : !!d.done, doneAt: isNew ? null : d.doneAt || null, createdAt: d.createdAt || new Date().toISOString(),
          source: d.source || null };
        if (isNew) await K.my.add("tasks", data); else await K.my.put("tasks", t.id, data);
        saved = true;
        K.toast(isNew ? "タスクを追加しました" : "保存しました", "ok");
      } });
      K.sheet({ title: isNew ? "タスクを追加" : "タスクを編集", body, actions, menu, onClose: () => resolve(saved) });
    });
  }

  // クイックメモの行き先「マイタスクに追加」
  K.provide("task.add", {
    label: "マイタスクに追加", icon: "check", order: 5,
    handle: (memo) => {
      const lines = String(memo.text || "").split(/\n/).map((s) => s.trim()).filter(Boolean);
      const tagMap = { "追加仕込み": "仕込み", "発注に追加": "発注", "温度記録": "衛生", "品切れ": "発注" };
      return editTask({ title: ((lines[0] || memo.tag || "メモのタスク") + (memo.qty ? " ×" + memo.qty : "")).slice(0, 120), note: lines.slice(1).join("\n"),
        tag: tagMap[memo.tag] || "", priority: memo.tag === "要確認" || memo.tag === "品切れ" ? "high" : "mid", due: K.today(), source: "memo" }, { fromMemo: true });
    },
  });

  function taskRow(t) {
    const today = K.today();
    const overdue = !t.done && t.due && t.due < today;
    const clDone = (t.checklist || []).filter((c) => c.done).length, clAll = (t.checklist || []).length;
    return h("div", { class: "li myp-task" + (t.done ? " is-done" : "") + (t.priority === "high" && !t.done ? " is-high" : "") },
      h("button", { class: "myp-check", "aria-label": t.done ? "未完了に戻す" : "完了にする", onClick: () => toggleDone(t) }, h("span", null, K.icon("check"))),
      h("button", { class: "myp-body", onClick: () => editTask(t) },
        h("span", { class: "myp-title", text: t.title }),
        h("span", { class: "myp-meta" },
          t.due ? h("span", { class: overdue ? "is-bad num" : "num", text: (t.due === today ? "今日" : t.due === K.addDays(today, 1) ? "明日" : K.fmt.date(t.due)) + (t.time ? " " + t.time + (t.endTime ? "–" + t.endTime : "") : "") + (overdue ? "（期限切れ）" : "") }) : null,
          t.priority === "high" ? h("span", { class: "chip bad", text: "優先：高" }) : null,
          t.tag ? h("span", { class: "chip", text: t.tag }) : null,
          t.repeat && t.repeat !== "none" ? h("span", null, "↻ " + repLabel[t.repeat]) : null,
          clAll ? h("span", { class: "num" }, "☑ " + clDone + "/" + clAll) : null,
          t.note ? h("span", null, "メモあり") : null)));
  }

  function renderTasks(host) {
    host.textContent = "";
    const today = K.today(), tmr = K.addDays(today, 1);
    const open = tasks.filter((t) => !t.done);
    const sortFn = (a, b) => ((a.due || "9999") + (a.time || "99") + ({ high: 0, mid: 1, low: 2 }[a.priority] || 1)).localeCompare((b.due || "9999") + (b.time || "99") + ({ high: 0, mid: 1, low: 2 }[b.priority] || 1));
    const groups = [];
    if (filter === "done") {
      const done = tasks.filter((t) => t.done).sort((a, b) => (b.doneAt || "").localeCompare(a.doneAt || "")).slice(0, 30);
      groups.push({ title: "完了（直近30件）", items: done });
    } else {
      const od = open.filter((t) => t.due && t.due < today).sort(sortFn);
      const td = open.filter((t) => t.due === today).sort(sortFn);
      groups.push({ title: "期限切れ", items: od, bad: true });
      groups.push({ title: "今日", items: td });
      if (filter === "all") {
        groups.push({ title: "明日", items: open.filter((t) => t.due === tmr).sort(sortFn) });
        groups.push({ title: "今後", items: open.filter((t) => t.due && t.due > tmr).sort(sortFn) });
        groups.push({ title: "期限なし", items: open.filter((t) => !t.due).sort(sortFn) });
      }
    }
    const shown = groups.filter((g) => g.items.length);
    if (!shown.length) {
      host.appendChild(h("div", { class: "myp-empty" }, filter === "done" ? "完了したタスクはまだありません。" : filter === "today" ? "今日のタスクはありません。上の欄から追加するか、「すべて」で今後の予定を確認できます。" : "タスクはありません。上の欄から追加できます。"));
      return;
    }
    shown.forEach((g) => host.appendChild(h("div", { class: "myp-group" },
      h("div", { class: "myp-group-title" + (g.bad ? " is-bad" : "") }, g.title, h("span", { class: "num", text: String(g.items.length) })),
      h("div", { class: "list" }, g.items.map(taskRow)))));
  }

  function taskSection(el, headRight) {
    // 進み具合
    const prog = h("div", { class: "myp-progress" });
    // すばやく追加
    let qDue = K.today(), qHigh = false, lastToday = K.today();
    const qIn = K.input({ placeholder: "タスクを入力して Enter", "aria-label": "タスクをすばやく追加", maxlength: 120 });
    const dateIn = h("input", { type: "date", class: "inp myp-date", "aria-label": "期限の日付", value: "" });
    const opts = h("div", { class: "myp-add-opts" });
    const drawOpts = () => {
      opts.textContent = "";
      const today = K.today(), tmr = K.addDays(today, 1);
      [["今日", today], ["明日", tmr], ["期限なし", ""]].forEach(([lb, v]) => opts.appendChild(h("button", { class: "fchip", text: lb, attrs: { "aria-pressed": String(qDue === v) }, onClick: () => { qDue = v; dateIn.value = ""; drawOpts(); } })));
      dateIn.value = qDue && qDue !== today && qDue !== tmr ? qDue : "";
      opts.appendChild(dateIn);
      opts.appendChild(h("button", { class: "fchip", attrs: { "aria-pressed": String(qHigh) }, onClick: () => { qHigh = !qHigh; drawOpts(); } }, "優先：高"));
      opts.appendChild(h("button", { class: "btn ghost", onClick: () => editTask({ title: qIn.value.trim(), due: qDue, priority: qHigh ? "high" : "mid" }) }, "詳しく設定"));
    };
    dateIn.addEventListener("change", () => { qDue = dateIn.value || ""; drawOpts(); });
    let adding = false;
    const add = async () => {
      const tt = qIn.value.trim(); if (!tt) { qIn.focus(); return; }
      if (adding) return; adding = true;
      qIn.value = "";
      const today = K.today();
      // 「今日」チップ選択中は保存の瞬間の日付を使う（0時をまたいでも正しく今日になる）
      const due = qDue === lastToday ? today : qDue;
      try { await K.my.add("tasks", { title: tt, note: "", due, time: "", priority: qHigh ? "high" : "mid", tag: "", repeat: "none", checklist: [], done: false, doneAt: null, createdAt: new Date().toISOString(), source: null }); }
      catch (e) { qIn.value = tt; adding = false; return; }
      adding = false; qIn.focus();
      K.toast("追加しました", "ok");
    };
    qIn.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); add(); } });
    drawOpts();
    const seg = h("div", { class: "seg", role: "tablist", "aria-label": "表示" });
    const segDraw = () => { seg.textContent = ""; [["today", "今日"], ["timeline", "時間割"], ["all", "すべて"], ["done", "完了"]].forEach(([v, lb]) => seg.appendChild(h("button", { class: "seg-btn", text: lb, role: "tab", attrs: { "aria-selected": String(filter === v) }, onClick: () => { filter = v; try { localStorage.setItem("kitchen-ledger-myp-filter", v); } catch (e) {} segDraw(); draw(); } }))); };
    segDraw();
    const listHost = h("div", { class: "stack" });
    const draw = () => {
      if (filter === "timeline") renderTimeline(listHost); else renderTasks(listHost);
      const today = K.today();
      const todays = tasks.filter((t) => t.due === today || (t.done && (t.doneAt || "").slice(0, 10) === today && t.due && t.due <= today));
      const dn = todays.filter((t) => t.done).length;
      prog.textContent = "";
      prog.appendChild(h("span", { text: "今日の進み具合" }));
      prog.appendChild(h("div", { class: "bar" }, h("i", { style: { width: (todays.length ? Math.round((dn / todays.length) * 100) : 0) + "%" } })));
      prog.appendChild(h("span", { class: "num", text: dn + "/" + todays.length }));
    };
    listeners.add(draw);
    K.on("staff", () => { drawOpts(); });
    K.on("day", (d) => { if (qDue === lastToday) qDue = d; lastToday = d; drawOpts(); draw(); });
    el.appendChild(h("div", { class: "myp-add" }, h("div", { class: "myp-add-row" }, qIn, h("button", { class: "btn", onClick: add, "aria-label": "追加" }, K.icon("plus"), "追加")), opts));
    if (headRight) headRight.appendChild(seg); else el.appendChild(h("div", { class: "row" }, seg));
    el.appendChild(prog);
    el.appendChild(listHost);
    draw();
  }

  function memoSection(el) {
    const host = h("div", { class: "stack" });
    const draw = () => {
      host.textContent = "";
      const ms = (K.memos ? K.memos() : []).filter((m) => !m.done);
      if (!ms.length) host.appendChild(h("p", { class: "muted small", style: { margin: 0 }, text: "未処理のメモはありません。料理中は「＋メモ」ボタン（PCは M キーでも）からすぐ書けます。" }));
      else host.appendChild(h("div", { class: "list" }, ms.slice(0, 4).map((m) => h("div", { class: "li myp-memo" },
        h("span", { class: "myp-memo-text" }, m.tag ? h("span", { class: "chip", text: m.tag }) : null, " ", m.text || "（写真のみ）", m.qty ? " ×" + m.qty : ""),
        h("button", { class: "btn sm myp-route", onClick: () => (K.routeMemo ? K.routeMemo(m) : K.openMemos()) }, "行き先へ")))));
      host.appendChild(h("div", { class: "row" },
        ms.length > 4 ? h("span", { class: "muted small", text: "ほか " + (ms.length - 4) + " 件" }) : null, h("span", { class: "spacer" }),
        h("button", { class: "btn", onClick: () => K.openMemos() }, K.icon("edit"), "メモを開く")));
    };
    K.on("memos", draw);
    draw();
    el.appendChild(host);
  }

  // 現在時刻の線を1分ごとに進める（時間割表示中だけ）
  setInterval(() => { if (filter === "timeline" && !document.hidden) listeners.forEach((fn) => fn()); }, 60000);
  // 勤務・店の予定が変わったら時間割を描き直す（読むだけ）
  K.watch("shifts", () => { if (filter === "timeline") listeners.forEach((fn) => fn()); });
  K.watch("events", () => { if (filter === "timeline") listeners.forEach((fn) => fn()); });

  // 今日モードの欄：自分の今日のタスク（時刻順・大きく・1タップで完了）
  K.todaySection({
    key: "my-today", title: "自分の今日のタスク", icon: "check", order: 50,
    mount(el) {
      const draw = () => {
        el.textContent = "";
        const today = K.today(), now = nowMin(), dd = dayData(today);
        if (dd.shifts.length) el.appendChild(h("p", { class: "muted", style: { margin: "0 0 8px" }, text: "勤務 " + dd.shifts.map((x) => x.label).join(" / ") }));
        const rows = [...dd.timed.filter((x) => x.kind === "task").map((x) => ({ t: x.t, st: x.st, en: x.en })), ...dd.untimed.map((t) => ({ t, st: null }))];
        const od = tasks.filter((t) => !t.done && t.due && t.due < today);
        if (!rows.length && !od.length) { el.appendChild(h("p", { class: "muted", text: "今日のタスクはありません。マイページの「時間割」で組めます。" })); return; }
        const box = h("div");
        const row = (r, past) => h("div", { class: "myp-td-row" + (r.t.done ? " is-done" : "") + (past ? " is-past" : "") },
          h("span", { class: "myp-td-time", text: r.st == null ? (r.t.due < today ? "期限切れ" : "時間未定") : fromMin(r.st) }),
          h("span", { class: "myp-td-tt", text: r.t.title }),
          h("button", { class: "myp-check", "aria-label": r.t.done ? "未完了に戻す" : "完了にする", onClick: () => toggleDone(r.t) }, h("span", null, K.icon("check"))));
        od.forEach((t) => box.appendChild(row({ t, st: null }, true)));
        rows.forEach((r) => box.appendChild(row(r, r.st != null && r.en <= now)));
        el.appendChild(box);
      };
      listeners.add(draw);
      const iv = setInterval(draw, 60000);
      draw();
      return () => { listeners.delete(draw); clearInterval(iv); };
    },
  });

  function card(title, icon, extra) {
    const body = h("div");
    const c = h("section", { class: "card" }, h("div", { class: "myp-sec-head" }, K.icon(icon), h("h2", { class: "sec-title", text: title }), h("span", { class: "spacer" }), extra || null), body);
    return { c, body };
  }

  K.register({
    key: "mypage", label: "マイページ", short: "My", icon: "user", order: 6,
    mount(root) {
      const sub = h("div", { class: "myp-sub" });
      const warn = h("div", { class: "myp-warn", hidden: true }, K.icon("user"), h("span", { text: "ヘッダーで自分の名前を選んでください。選ばないと「この端末の利用者」として保存されます。" }));
      const drawHead = () => { sub.textContent = ""; sub.appendChild(K.icon("user")); sub.appendChild(document.createTextNode(K.my.note())); warn.hidden = !!K.currentStaffId(); };
      K.on("staff", drawHead);
      root.appendChild(h("div", { class: "myp-head" }, h("h1", { class: "page-title", text: "マイページ" }), sub));
      root.appendChild(warn);
      drawHead();
      const left = h("div", { class: "myp-col" }), right = h("div", { class: "myp-col" });
      root.appendChild(h("div", { class: "myp-grid" }, left, right));
      const segHost = h("div", { class: "myp-seg-host" });
      const t = card("マイタスク", "check", segHost);
      t.c.dataset.order = "10";
      taskSection(t.body, segHost); left.appendChild(t.c);
      const m = card("クイックメモ", "edit");
      m.c.dataset.order = "20";
      memoSection(m.body); right.appendChild(m.c);
      const mounted = new Set();
      const mountSections = () => {
        K.mypageSections().forEach((s) => {
          if (mounted.has(s.key)) return; mounted.add(s.key);
          const c = card(s.title, s.icon || "box");
          try { s.mount(c.body); } catch (e) { console.error(e); c.body.appendChild(h("p", { class: "muted small", text: "この欄を表示できませんでした" })); }
          // 各担当の欄は右列に order 順で並べる（スマホでは縦に連続）
          // PC（1100px〜）では order 40 以上を左列（タスクの下）へ、それ以外は右列。スマホは縦に連続
          const wide = window.matchMedia && matchMedia("(min-width: 1100px)").matches;
          const col = wide && s.order >= 40 ? left : right;
          const after = [...col.children].find((x) => Number(x.dataset.order || 0) > s.order);
          c.c.dataset.order = String(s.order);
          col.insertBefore(c.c, after || null);
        });
      };
      K.on("mypage-sections", mountSections);
      mountSections();
    },
  });
})();
