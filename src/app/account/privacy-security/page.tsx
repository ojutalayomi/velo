"use client";
import { ArrowLeft, Eye, Key, Laptop, Lock, Shield, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";

import { useSocket } from "@/app/providers/SocketProvider";
import { UserSettings } from "@/lib/types/type";
import { updateSettings } from "@/redux/userSlice";

import { Skeleton } from "../../../components/ui/skeleton";

// ── types ─────────────────────────────────────────────────────────────────────
interface DeviceSession {
  id: string;
  userId: string;
  deviceInfo: {
    browser: { name?: string; version?: string };
    os: { name?: string; version?: string };
    device: { model?: string; type?: string; vendor?: string };
    ua?: string;
  };
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

// ── helpers ───────────────────────────────────────────────────────────────────
function deviceLabel(info: DeviceSession["deviceInfo"]): string {
  const { device, os } = info;
  if (device?.vendor && device?.model) return `${device.vendor} ${device.model}`;
  if (os?.name) return os.version ? `${os.name} ${os.version}` : os.name;
  return "Unknown Device";
}

function deviceSubLabel(info: DeviceSession["deviceInfo"]): string {
  const parts: string[] = [];
  if (info.browser?.name) parts.push(info.browser.name);
  if (info.os?.name) parts.push(info.os.name);
  return parts.join(" on ") || info.ua?.slice(0, 60) || "Unknown browser";
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function isMobile(info: DeviceSession["deviceInfo"]): boolean {
  return info.device?.type === "mobile" || info.device?.type === "tablet";
}

// ── main component ────────────────────────────────────────────────────────────
const PrivacySecurityPage = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const socket = useSocket();

  const [settings, setSettings] = useState({
    twoFactorAuth: false,
    loginAlerts: true,
    showOnlineStatus: true,
    showLastSeen: true,
    showReadReceipts: true,
    showTypingStatus: true,
  });

  // devices
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/user/devices")
      .then((r) => r.json())
      .then((body: { data?: DeviceSession[] }) => {
        if (body.data) setDevices(body.data);
      })
      .catch(console.error)
      .finally(() => setDevicesLoading(false));
  }, []);

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    try {
      const res = await fetch("/api/user/devices", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId: id }),
      });
      if (res.ok) {
        setDevices((prev) => prev.filter((d) => d.id !== id));
      } else {
        const err = (await res.json()) as { message?: string };
        console.error(err.message);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRemovingId(null);
    }
  };

  const handleToggle = (setting: keyof typeof settings) => {
    const prev = settings;
    setSettings((prev) => ({ ...prev, [setting]: !prev[setting] }));
    dispatch(updateSettings({ ...prev, [setting]: !prev[setting] } as UserSettings));
    if (socket) {
      socket.emit("updateSettings", { ...prev, [setting]: !prev[setting] });
    }
  };

  const handleChangePassword = () => {
    router.push("/accounts/forgot-password");
  };

  return (
    <div className="w-full max-h-screen overflow-auto">
      <header className="sticky top-0 z-10 border-b bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center gap-4 px-4 py-2">
          <button
            onClick={() => router.push("/general")}
            className="rounded-full p-2 transition-colors hover:bg-gray-100 dark:hover:bg-neutral-800"
          >
            <ArrowLeft className="size-5 text-gray-600 dark:text-gray-300" />
          </button>
          <div className="flex items-center gap-2">
            <Lock className="size-6 text-gray-900 dark:text-white" />
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Privacy &amp; Security
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto mb-16 max-w-4xl space-y-6 p-4 tablets:mb-0">
        {/* Security Section */}
        <section className="rounded-xl bg-white p-6 shadow-sm dark:bg-neutral-800">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <Shield className="size-5 text-green-500" />
            Security Settings
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Two-Factor Authentication
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Add an extra layer of security to your account
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={settings.twoFactorAuth}
                  onChange={() => handleToggle("twoFactorAuth")}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:size-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand/30 dark:border-neutral-600 dark:bg-neutral-700 dark:peer-focus:ring-brand/80"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Login Alerts</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Get notified of new login attempts
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={settings.loginAlerts}
                  onChange={() => handleToggle("loginAlerts")}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:size-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand/30 dark:border-neutral-600 dark:bg-neutral-700 dark:peer-focus:ring-brand/80"></div>
              </label>
            </div>

            <button
              onClick={handleChangePassword}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-gray-100 px-4 py-2 text-gray-900 transition-colors hover:bg-gray-200 dark:bg-neutral-700 dark:text-white dark:hover:bg-neutral-600"
            >
              <Key className="size-4" />
              Change Password
            </button>
          </div>
        </section>

        {/* Privacy Section */}
        <section className="rounded-xl bg-white p-6 shadow-sm dark:bg-neutral-800">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <Eye className="size-5 text-blue-500" />
            Privacy Settings
          </h2>

          <div className="space-y-4">
            {(
              [
                {
                  key: "showOnlineStatus",
                  label: "Online Status",
                  desc: "Show when you're online",
                },
                {
                  key: "showLastSeen",
                  label: "Last Seen",
                  desc: "Show when you were last active",
                },
                {
                  key: "showReadReceipts",
                  label: "Read Receipts",
                  desc: "Show when you've read messages",
                },
                {
                  key: "showTypingStatus",
                  label: "Typing Status",
                  desc: "Show when you're typing",
                },
              ] as { key: keyof typeof settings; label: string; desc: string }[]
            ).map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{label}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{desc}</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={settings[key]}
                    onChange={() => handleToggle(key)}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:size-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand/30 dark:border-neutral-600 dark:bg-neutral-700 dark:peer-focus:ring-brand/80"></div>
                </label>
              </div>
            ))}
          </div>
        </section>

        {/* Connected Devices Section */}
        <section className="rounded-xl bg-white p-6 shadow-sm dark:bg-neutral-800">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <Smartphone className="size-5 text-purple-500" />
            Connected Devices
          </h2>

          <div className="space-y-3">
            {devicesLoading ? (
              <>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="rounded-lg bg-gray-50 p-4 dark:bg-neutral-700">
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-9 rounded-full shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-36 rounded" />
                        <Skeleton className="h-3 w-52 rounded" />
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : devices.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No active sessions found.</p>
            ) : (
              devices.map((device) => {
                const mobile = isMobile(device.deviceInfo);
                const Icon = mobile ? Smartphone : Laptop;
                return (
                  <div key={device.id} className="rounded-lg bg-gray-50 p-4 dark:bg-neutral-700">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                        <Icon className="size-4 text-purple-600 dark:text-purple-400" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-gray-900 dark:text-white truncate">
                            {deviceLabel(device.deviceInfo)}
                          </h3>
                          {device.isCurrent && (
                            <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              This device
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {deviceSubLabel(device.deviceInfo)}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          Session started {timeAgo(device.createdAt)}
                        </p>
                      </div>

                      {!device.isCurrent && (
                        <button
                          onClick={() => handleRemove(device.id)}
                          disabled={removingId === device.id}
                          className="shrink-0 text-sm font-medium text-red-500 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {removingId === device.id ? "Removing…" : "Remove"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default PrivacySecurityPage;
