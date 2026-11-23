// Copied to public/sw.js by `npm run sync:sw` (runs before dev/build) because
// next-pwa only runs under webpack, while this project builds with Turbopack.

const DEFAULT_URL = "/notifications";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    output[i] = rawData.charCodeAt(i);
  }

  return output;
}

function parsePayload(data) {
  if (!data) return {};

  try {
    return data.json() || {};
  } catch {
    try {
      return { body: data.text() };
    } catch {
      return {};
    }
  }
}

function safeUrl(value) {
  try {
    const url = new URL(typeof value === "string" ? value : DEFAULT_URL, self.location.origin);
    if (url.origin !== self.location.origin) return DEFAULT_URL;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_URL;
  }
}

async function closeByTag(tag) {
  if (!tag) return;
  const notifications = await self.registration.getNotifications({ tag });
  notifications.forEach((notification) => notification.close());
}

/** Visible windows already showing the page this notification points to. */
async function viewingClients(url) {
  const target = new URL(safeUrl(url), self.location.origin);
  const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });

  return clientList.filter((client) => {
    if (client.visibilityState !== "visible") return false;
    try {
      const open = new URL(client.url);
      return open.origin === target.origin && open.pathname === target.pathname;
    } catch {
      return false;
    }
  });
}

async function focusOrOpen(url) {
  const targetUrl = new URL(safeUrl(url), self.location.origin).href;
  const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });

  for (const client of clientList) {
    if (client.url === targetUrl) {
      await client.focus();
      return;
    }
  }

  for (const client of clientList) {
    try {
      if (new URL(client.url).origin === self.location.origin) {
        await client.focus();
        if ("navigate" in client) await client.navigate(targetUrl);
        return;
      }
    } catch {
      // Ignore malformed client URLs.
    }
  }

  await self.clients.openWindow(targetUrl);
}

async function resubscribe(event) {
  try {
    let subscription = event.newSubscription;

    if (!subscription) {
      const keyResponse = await fetch("/api/push/public-key", { cache: "no-store" });
      if (!keyResponse.ok) return;

      const { publicKey } = await keyResponse.json();
      if (!publicKey) return;

      subscription = await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ subscription: subscription.toJSON() }),
    });
  } catch (error) {
    console.error("[push] Failed to refresh subscription:", error);
  }
}

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      const payload = parsePayload(event.data);

      if (payload.action === "close" || payload.data?.action === "close") {
        await closeByTag(payload.tag);
        return;
      }

      // The in-app UI already shows what the user is looking at, so a system banner is noise.
      const viewers = await viewingClients(payload.url);
      if (viewers.length > 0) {
        // Still make a sound, since the system would have; the page plays it.
        viewers.forEach((client) => client.postMessage({ type: "push-sound" }));
        return;
      }

      const data = payload.data && typeof payload.data === "object" ? payload.data : {};
      const options = {
        body: typeof payload.body === "string" ? payload.body : "",
        icon: typeof payload.icon === "string" ? payload.icon : "/notifications.png",
        badge: typeof payload.badge === "string" ? payload.badge : "/icon.png",
        tag: typeof payload.tag === "string" ? payload.tag : undefined,
        data: { ...data, url: safeUrl(payload.url) },
        vibrate: [100, 50, 100],
        // Ask the OS to alert audibly; a repeated tag would otherwise replace the earlier
        // notification quietly. renotify is only valid together with a tag.
        silent: false,
        ...(typeof payload.tag === "string" && payload.tag ? { renotify: true } : {}),
      };
      const title = typeof payload.title === "string" && payload.title ? payload.title : "Velo";

      const size = new TextEncoder().encode(JSON.stringify({ title, options })).length;
      if (size > 4096) options.body = "";

      await self.registration.showNotification(title, options);
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "close") return;

  const notificationData = event.notification.data || {};
  event.waitUntil(focusOrOpen(notificationData.url || DEFAULT_URL));
});

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(resubscribe(event));
});

/* ------------------------------------------------------------------------------------------
 * Offline app shell
 *
 * Lets the app open without a network once it has been used: pages you visited, the build
 * assets they need, and images. Data comes from the IndexedDB chat cache and the Cache API media
 * cache; this part only makes sure the page itself loads.
 *
 * Only active when registered as /sw.js?shell=1 (see src/lib/serviceWorker.ts), so `next dev`
 * is never affected. To switch it off for everyone, stop registering with ?shell=1: the
 * browser installs the plain worker and these handlers go away.
 * ---------------------------------------------------------------------------------------- */

const SHELL_ENABLED = new URL(self.location.href).searchParams.get("shell") === "1";

// Bump a suffix to start a cache over. Names are matched by SHELL_CACHE_PATTERN on activate, so
// unrelated caches (the chat media cache, "velo-chat-media-v1") are never touched.
const STATIC_CACHE = "velo-static-v1"; // /_next/static/*: content-hashed, so safe to keep forever
const PAGES_CACHE = "velo-pages-v1"; // HTML of visited pages + the offline fallback
const ASSETS_CACHE = "velo-assets-v1"; // images (avatars, icons) and fonts
const SHELL_CACHE_PATTERN = /^velo-(static|pages|assets)-/;
const CURRENT_CACHES = [STATIC_CACHE, PAGES_CACHE, ASSETS_CACHE];
const MAX_ENTRIES = { [STATIC_CACHE]: 400, [PAGES_CACHE]: 60, [ASSETS_CACHE]: 200 };

const OFFLINE_URL = "/offline";
/** On a slow connection, show the saved copy of a page instead of waiting this long. */
const NAVIGATION_TIMEOUT_MS = 4000;

/**
 * Pages that must always come from the network: signing in/out has side effects when loaded,
 * the API is data, and admin pages are step-up protected.
 */
const NEVER_CACHE_PREFIXES = ["/api/", "/accounts", "/auth", "/admin", "/_next/", "/sw.js"];

function isSameOriginGet(request) {
  if (request.method !== "GET") return false;
  try {
    return new URL(request.url).origin === self.location.origin;
  } catch {
    return false;
  }
}

/** Next's client-side navigation fetches (RSC payloads) must reach the network untouched. */
function isRscRequest(request, url) {
  return url.searchParams.has("_rsc") || request.headers.get("RSC") === "1";
}

function isCacheablePath(pathname) {
  return !NEVER_CACHE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
}

/** A real, complete HTML page: not a redirect (e.g. to login), error, or partial response. */
function isCacheablePage(response) {
  if (!response || response.status !== 200 || response.type === "opaqueredirect") return false;
  if (response.redirected) return false;
  return (response.headers.get("content-type") || "").includes("text/html");
}

function isCacheableAsset(response) {
  return !!response && response.status === 200 && response.type !== "opaque";
}

/** Keep a cache from growing forever: drop the oldest entries beyond its limit. */
async function trimCache(name) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  const excess = keys.length - MAX_ENTRIES[name];
  for (let i = 0; i < excess; i += 1) await cache.delete(keys[i]);
}

// Saving is best effort (quota, a partial response): it must never break the live response.
async function put(name, key, response) {
  try {
    const cache = await caches.open(name);
    await cache.put(key, response);
    await trimCache(name);
  } catch {
    // ignore
  }
}

/** Build assets are named by content hash, so a saved copy is always correct. */
async function cacheFirstStatic(request) {
  const cache = await caches.open(STATIC_CACHE);
  const saved = await cache.match(request);
  if (saved) return saved;
  const response = await fetch(request);
  if (isCacheableAsset(response)) await put(STATIC_CACHE, request, response.clone());
  return response;
}

/** Show the saved copy now and refresh it in the background. */
async function staleWhileRevalidate(event, name) {
  const cache = await caches.open(name);
  const saved = await cache.match(event.request);
  const refresh = fetch(event.request)
    .then(async (response) => {
      if (isCacheableAsset(response)) await put(name, event.request, response.clone());
      return response;
    })
    .catch(() => undefined);
  if (saved) {
    event.waitUntil(refresh);
    return saved;
  }
  const response = await refresh;
  return response || Response.error();
}

/**
 * Pages: the network wins, so a deploy is picked up straight away. Every good page is kept; when
 * the network is down, or slower than NAVIGATION_TIMEOUT_MS, the saved copy is shown instead.
 */
async function handleNavigation(event) {
  const key = event.request.url;
  const saved = () =>
    caches.open(PAGES_CACHE).then((cache) => cache.match(key, { ignoreVary: true }));

  const network = fetch(event.request).then(async (response) => {
    if (isCacheablePage(response)) await put(PAGES_CACHE, key, response.clone());
    return response;
  });
  const outcome = network.then(
    (response) => ({ response }),
    () => ({ failed: true })
  );
  // Keep refreshing the saved copy even if we answered from it.
  event.waitUntil(outcome);

  const slow = new Promise((resolve) => setTimeout(() => resolve({ slow: true }), NAVIGATION_TIMEOUT_MS));
  const first = await Promise.race([outcome, slow]);
  if (first.response) return first.response;

  const copy = await saved();
  if (copy) return copy;

  if (first.slow) {
    const second = await outcome; // nothing saved: keep waiting for the network
    if (second.response) return second.response;
  }

  const cache = await caches.open(PAGES_CACHE);
  return (
    (await cache.match(OFFLINE_URL)) ||
    new Response("You are offline.", { status: 503, headers: { "content-type": "text/plain" } })
  );
}

/**
 * Page data (RSC) for a navigation: always the network first, so it is never stale online. A
 * good response is kept, and used only when the network fails. Without it, Next answers a failed
 * fetch by reloading the page, which makes the same fetch again, and so on.
 */
async function handleRsc(event) {
  const key = event.request.url;
  try {
    const response = await fetch(event.request);
    const type = response.headers.get("content-type") || "";
    if (response.status === 200 && !response.redirected && type.includes("text/x-component")) {
      event.waitUntil(put(PAGES_CACHE, key, response.clone()));
    }
    return response;
  } catch (error) {
    const cache = await caches.open(PAGES_CACHE);
    const copy = await cache.match(key, { ignoreVary: true });
    if (copy) return copy;
    throw error;
  }
}

async function precacheOfflinePage() {
  try {
    const response = await fetch(OFFLINE_URL, { cache: "reload" });
    if (isCacheablePage(response)) await put(PAGES_CACHE, OFFLINE_URL, response);
  } catch {
    // Offline during install: the plain-text fallback above still works.
  }
}

async function removeOldShellCaches() {
  const names = await caches.keys();
  await Promise.all(
    names
      .filter((name) => SHELL_CACHE_PATTERN.test(name) && !CURRENT_CACHES.includes(name))
      .map((name) => caches.delete(name))
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(Promise.all([self.skipWaiting(), SHELL_ENABLED ? precacheOfflinePage() : null]));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([self.clients.claim(), SHELL_ENABLED ? removeOldShellCaches() : null])
  );
});

self.addEventListener("fetch", (event) => {
  if (!SHELL_ENABLED) return;
  const { request } = event;
  if (!isSameOriginGet(request)) return;
  // Media streams ask for byte ranges (206), which can't be cached or sliced here.
  if (request.headers.get("range")) return;

  const url = new URL(request.url);
  if (isRscRequest(request, url)) {
    // Prefetches and never-cached paths go straight to the network; real page-data requests are
    // kept so an offline page does not fall into Next's "reload the page" fallback (a loop).
    if (!request.headers.get("next-router-prefetch") && isCacheablePath(url.pathname)) {
      event.respondWith(handleRsc(event));
    }
    return;
  }

  if (request.mode === "navigate") {
    if (isCacheablePath(url.pathname)) event.respondWith(handleNavigation(event));
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirstStatic(request));
    return;
  }

  if (url.pathname.startsWith("/api/") || url.pathname === "/sw.js") return;

  // Avatars, icons and fonts. `/_next/image` is next/image's resizer, also an image.
  if (request.destination === "image" || request.destination === "font") {
    event.respondWith(staleWhileRevalidate(event, ASSETS_CACHE));
  }
});
