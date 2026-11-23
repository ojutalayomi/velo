"use client";

import { useCallback, useEffect, useState } from "react";

import { useUser } from "@/app/providers/UserProvider";
import { SW_SCOPE, serviceWorkerUrl } from "@/lib/serviceWorker";

export type PushPermissionState = "unsupported" | NotificationPermission;

export interface PushTestResult {
  ok: boolean;
  message: string;
}


function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    output[i] = rawData.charCodeAt(i);
  }

  return output;
}

async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  const registration = await navigator.serviceWorker.register(serviceWorkerUrl(), {
    scope: SW_SCOPE,
    updateViaCache: "none",
  });

  await navigator.serviceWorker.ready;
  return registration;
}

async function fetchPublicKey(): Promise<string> {
  const response = await fetch("/api/push/public-key", { cache: "no-store" });
  if (!response.ok) throw new Error("Push notifications are not available right now.");

  const data = (await response.json()) as { publicKey?: string };
  if (!data.publicKey) throw new Error("Push notifications are not configured.");

  return data.publicKey;
}

async function syncSubscription(subscription: PushSubscription): Promise<boolean> {
  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  });

  return response.ok;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export function usePushNotifications() {
  const { userdata } = useUser();
  const userId = userdata?._id ?? "";

  const [initialized, setInitialized] = useState(false);
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<PushPermissionState>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isPushSupported()) {
      setSupported(false);
      setPermission("unsupported");
      setInitialized(true);
      return;
    }

    setSupported(true);
    setPermission(Notification.permission);

    try {
      const registration = await getServiceWorkerRegistration();
      const subscription = await registration.pushManager.getSubscription();
      setSubscribed(Boolean(subscription));

      if (subscription && Notification.permission === "granted") {
        await syncSubscription(subscription);
      }
    } catch {
      setSubscribed(false);
    } finally {
      setInitialized(true);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      refresh().catch(() => undefined);
    });
  }, [refresh, userId]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh().catch(() => undefined);
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [refresh]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    setBusy(true);
    setError(null);

    try {
      if (!isPushSupported()) {
        setError("Push notifications are not supported in this browser.");
        return false;
      }

      const nextPermission =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();
      setPermission(nextPermission);

      if (nextPermission !== "granted") {
        setError("Notifications are blocked. Allow them in your browser settings and try again.");
        return false;
      }

      const registration = await getServiceWorkerRegistration();
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(await fetchPublicKey()),
        }));

      const synced = await syncSubscription(subscription);
      if (!synced) {
        throw new Error("Could not save your notification settings. Please sign in and try again.");
      }

      setSubscribed(true);
      return true;
    } catch (err) {
      setError(toErrorMessage(err));
      return false;
    } finally {
      setBusy(false);
      setInitialized(true);
    }
  }, []);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setBusy(true);
    setError(null);

    try {
      const registration = await getServiceWorkerRegistration();
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        }).catch(() => undefined);

        await subscription.unsubscribe();
      }

      setSubscribed(false);
      return true;
    } catch (err) {
      setError(toErrorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const sendTest = useCallback(async (): Promise<PushTestResult> => {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/push/test", { method: "POST" });
      const data = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message || "Could not send a test notification.");
      }

      return { ok: true, message: "Test notification sent." };
    } catch (err) {
      const message = toErrorMessage(err);
      setError(message);
      return { ok: false, message };
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    initialized,
    supported,
    permission,
    subscribed,
    busy,
    error,
    subscribe,
    unsubscribe,
    sendTest,
  };
}
