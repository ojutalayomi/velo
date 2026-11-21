"use client";
import {
  BellRing,
  CheckCheck,
  Clock,
  Eye,
  Key,
  Laptop,
  MessageSquareMore,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";

import { useSocket } from "@/app/providers/SocketProvider";
import { UserSettings } from "@/lib/types/type";
import { updateSettings } from "@/redux/userSlice";
import { PasskeyManager } from "@/components/passkey";
import { SettingsGroup, SettingsHeader, SettingsRow, Switch } from "@/components/settings/SettingsUI";

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

  // Load the saved settings (they used to reset to the defaults on every visit).
  useEffect(() => {
    fetch("/api/user/settings")
      .then((r) => r.json())
      .then((body: { data?: typeof settings }) => {
        if (body.data) {
          setSettings(body.data);
          dispatch(updateSettings(body.data as UserSettings));
        }
      })
      .catch(console.error);
  }, [dispatch]);

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
    const next = { ...prev, [setting]: !prev[setting] };
    setSettings(next);
    dispatch(updateSettings(next as UserSettings));
    // Save on the server so other people's views (e.g. last seen) honour it.
    fetch("/api/user/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [setting]: next[setting] }),
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to save setting");
        // Tell the socket server only after the save, so it reads the new value.
        socket?.emit("updateSettings", next);
      })
      .catch((e) => {
        console.error(e);
        // Roll back so the toggle reflects what is actually saved.
        setSettings(prev);
        dispatch(updateSettings(prev as UserSettings));
      });

  };

  const handleChangePassword = () => {
    router.push("/accounts/forgot-password");
  };

  const privacyRows: { key: keyof typeof settings; icon: React.ReactNode; label: string; desc: string }[] = [
    { key: "showOnlineStatus", icon: <Eye size={20} />, label: "Online status", desc: "Show when you're online" },
    { key: "showLastSeen", icon: <Clock size={20} />, label: "Last seen", desc: "Show when you were last active" },
    { key: "showReadReceipts", icon: <CheckCheck size={20} />, label: "Read receipts", desc: "Show when you've read messages" },
    { key: "showTypingStatus", icon: <MessageSquareMore size={20} />, label: "Typing status", desc: "Show when you're typing" },
  ];

  return (
    <div className="max-h-screen w-full overflow-auto">
      <SettingsHeader title="Privacy and security" backTo="/general" />

      <main className="mx-auto mb-20 max-w-2xl space-y-6 p-4 tablets:mb-6">
        <SettingsGroup
          title="Who can see what"
          description="Control what other people can see about your activity."
        >
          {privacyRows.map(({ key, icon, label, desc }) => (
            <SettingsRow
              key={key}
              icon={icon}
              label={label}
              description={desc}
              trailing={
                <Switch checked={settings[key]} onChange={() => handleToggle(key)} label={label} />
              }
            />
          ))}
        </SettingsGroup>

        <SettingsGroup title="Security">
          <SettingsRow
            icon={<ShieldCheck size={20} />}
            label="Two-factor authentication"
            description="Coming soon"
            trailing={
              <Switch
                checked={settings.twoFactorAuth}
                onChange={() => handleToggle("twoFactorAuth")}
                label="Two-factor authentication"
                disabled
              />
            }
          />
          <SettingsRow
            icon={<BellRing size={20} />}
            label="Login alerts"
            description="Coming soon"
            trailing={
              <Switch
                checked={settings.loginAlerts}
                onChange={() => handleToggle("loginAlerts")}
                label="Login alerts"
                disabled
              />
            }
          />
          <SettingsRow
            icon={<Key size={20} />}
            label="Change password"
            description="Reset it by email"
            onClick={handleChangePassword}
          />
        </SettingsGroup>

        {/* Passkeys */}
        <div className="[&>div]:rounded-2xl [&>div]:border [&>div]:bg-white [&>div]:shadow-none [&>div]:dark:border-zinc-800 [&>div]:dark:bg-zinc-900">
          <PasskeyManager />
        </div>

        <SettingsGroup
          title="Signed-in devices"
          description="Sessions that are currently logged in to your account."
        >
          {devicesLoading ? (
            [0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                <Skeleton className="size-9 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-36 rounded" />
                  <Skeleton className="h-3 w-52 rounded" />
                </div>
              </div>
            ))
          ) : devices.length === 0 ? (
            <p className="px-4 py-3.5 text-sm text-gray-500 dark:text-gray-400">
              No active sessions found.
            </p>
          ) : (
            devices.map((device) => {
              const Icon = isMobile(device.deviceInfo) ? Smartphone : Laptop;
              return (
                <SettingsRow
                  key={device.id}
                  icon={<Icon size={20} />}
                  label={deviceLabel(device.deviceInfo) + (device.isCurrent ? " · This device" : "")}
                  description={`${deviceSubLabel(device.deviceInfo)} · started ${timeAgo(device.createdAt)}`}
                  trailing={
                    device.isCurrent ? undefined : (
                      <button
                        type="button"
                        onClick={() => handleRemove(device.id)}
                        disabled={removingId === device.id}
                        className="shrink-0 text-sm font-medium text-red-500 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {removingId === device.id ? "Removing…" : "Remove"}
                      </button>
                    )
                  }
                />
              );
            })
          )}
        </SettingsGroup>
      </main>
    </div>
  );
};

export default PrivacySecurityPage;
