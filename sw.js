const CACHE_NAME = "my-schedule-v11";
const APP_SHELL = [
  "./",
  "./index.html",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  // 首页之外的跨域请求（天气接口）交给浏览器直连：
  // 否则接口响应会被缓存下来，之后一直读到过期数据；
  // 而且断网时 catch 分支会拿 index.html 去顶上，返回一段 HTML 给 JSON 接口。
  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;

  // manifest 永远走网络：安卓拿它做 WebAPK 更新检查（状态栏颜色、名称、图标都靠它），
  // 一旦被缓存命中，装好的 App 会长期停留在旧配置上。
  if (/manifest\.webmanifest$/.test(url.pathname)) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  event.respondWith(
    fetch(req)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        return response;
      })
      .catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
  );
});
