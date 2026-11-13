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

      const data = payload.data && typeof payload.data === "object" ? payload.data : {};
      const options = {
        body: typeof payload.body === "string" ? payload.body : "",
        icon: typeof payload.icon === "string" ? payload.icon : "/notifications.png",
        badge: typeof payload.badge === "string" ? payload.badge : "/badge.png",
        tag: typeof payload.tag === "string" ? payload.tag : undefined,
        data: { ...data, url: safeUrl(payload.url) },
        vibrate: [100, 50, 100],
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

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
