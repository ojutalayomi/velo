/**
 * One place that knows how the service worker is registered, so every caller (push
 * notifications, app start) uses the same script URL. Registering a different URL at the same
 * scope replaces the worker, so they must not disagree.
 *
 * The `?shell=1` flag turns on the offline app shell (caching of pages and build assets) inside
 * the worker. It is on in production builds and off in `next dev`, whose chunks aren't safe to
 * cache. Set NEXT_PUBLIC_OFFLINE_SHELL=1 to try it in development.
 */

export const SW_SCOPE = "/";

export function serviceWorkerUrl(): string {
  const shell =
    process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_OFFLINE_SHELL === "1";
  return shell ? "/sw.js?shell=1" : "/sw.js";
}

export function isServiceWorkerSupported(): boolean {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator;
}

/** Register the worker (a no-op when it already is). Resolves null where unsupported or on error. */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) return null;
  try {
    return await navigator.serviceWorker.register(serviceWorkerUrl(), {
      scope: SW_SCOPE,
      updateViaCache: "none",
    });
  } catch (error) {
    console.error("[sw] registration failed:", error);
    return null;
  }
}

/** Cache name prefixes the worker uses for things that can hold a user's data. */
const PRIVATE_CACHE_PREFIXES = ["velo-pages-", "velo-assets-"];

/** Forget saved pages and images (logout). Build assets contain no user data and are kept. */
export async function clearOfflineShell(): Promise<void> {
  try {
    if (typeof caches === "undefined") return;
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((name) => PRIVATE_CACHE_PREFIXES.some((prefix) => name.startsWith(prefix)))
        .map((name) => caches.delete(name))
    );
  } catch {
    // best effort
  }
}
