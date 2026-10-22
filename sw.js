/* BRIGADE service worker — アプリ本体を端末に保存し、電波がなくても起動できるようにする（データは IndexedDB 側で別管理） */
const VERSION = "brigade-f5016f2ddf";
const SHELL = ["./","index.html","manifest.webmanifest","sample.json","icons/icon-192.png","icons/icon-512.png","icons/icon-maskable-512.png","icons/apple-touch-icon.png","icons/favicon-32.png","core.js?v=f5016f2ddf","mod-sales.js?v=f5016f2ddf","mod-inventory.js?v=f5016f2ddf","mod-recipe.js?v=f5016f2ddf","mod-shift.js?v=f5016f2ddf","mod-mypage.js?v=f5016f2ddf"];
// HTTPキャッシュを通さず最新を取る（古い index.html が新しい版に混ざらないように）
self.addEventListener("install", (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" }))))); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("message", (e) => { if (e.data === "skip") self.skipWaiting(); });
self.addEventListener("fetch", (e) => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (req.mode === "navigate") {
    // 画面本体：ネットの最新を3秒まで待ち、つながらなければ保存版で起動
    const cached = () => caches.match("index.html", { ignoreSearch: true }).then((r) => r || caches.match("./"));
    const net = fetch(req, { cache: "no-cache" }).then((r) => { if (r.ok) { const c = r.clone(); caches.open(VERSION).then((x) => x.put("index.html", c)); } return r; });
    e.respondWith(new Promise((resolve) => {
      let done = false;
      const t = setTimeout(() => { cached().then((r) => { if (r && !done) { done = true; resolve(r); } }); }, 3000);
      net.then((r) => { if (!done) { done = true; clearTimeout(t); resolve(r); } })
        .catch(() => cached().then((r) => { if (!done) { done = true; clearTimeout(t); resolve(r || Response.error()); } }));
    }));
    return;
  }
  if (url.origin === location.origin || url.host.endsWith("fonts.googleapis.com") || url.host.endsWith("fonts.gstatic.com")) {
    e.respondWith(caches.open(VERSION).then(async (c) => {
      const hit = await c.match(req);
      const net = fetch(req).then((r) => { if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
  }
});
