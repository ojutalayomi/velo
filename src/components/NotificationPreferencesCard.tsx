"use client";

import { BellRing, Loader2, MessageSquare, MoonStar, Phone, ShieldCheck, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DndWindow, NotificationPreferences } from "@/lib/types/type";

const TYPE_OPTIONS = [
  { key: "messages", label: "Messages", description: "New direct and group messages", icon: MessageSquare },
  { key: "mentions", label: "Mentions", description: "When someone @mentions you", icon: BellRing },
  { key: "follows", label: "New followers", description: "When someone follows you", icon: UserPlus },
  { key: "calls", label: "Calls", description: "Incoming audio and video calls", icon: Phone },
] as const;

const FALLBACK_TIMEZONES = [
  "UTC",
  "Africa/Lagos",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Australia/Sydney",
  "Europe/London",
  "Europe/Paris",
];

function listTimezones(): string[] {
  const supportedValuesOf = (Intl as { supportedValuesOf?: (key: string) => string[] })
    .supportedValuesOf;
  if (typeof supportedValuesOf !== "function") return FALLBACK_TIMEZONES;

  try {
    return supportedValuesOf("timeZone");
  } catch {
    return FALLBACK_TIMEZONES;
  }
}

function Toggle({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        checked ? "bg-brand" : "bg-gray-300 dark:bg-zinc-700"
      }`}
    >
      <span
        className={`inline-block size-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

type BooleanPreferenceKey = "messages" | "mentions" | "follows" | "calls" | "hideMessagePreview";

export default function NotificationPreferencesCard() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [timezones] = useState<string[]>(listTimezones);

  useEffect(() => {
    let active = true;

    fetch("/api/push/settings")
      .then(async (response) => {
        if (!response.ok) throw new Error("Failed to load notification settings");
        return (await response.json()) as { preferences: NotificationPreferences };
      })
      .then((body) => {
        if (active) setPreferences(body.preferences);
      })
      .catch(() => {
        if (active) setMessage({ tone: "error", text: "Could not load notification settings." });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const save = useCallback(
    async (patch: Partial<Omit<NotificationPreferences, "dnd">> & { dnd?: Partial<DndWindow> }) => {
      setSaving(true);
      setMessage(null);

      try {
        const response = await fetch("/api/push/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        const body = (await response.json().catch(() => null)) as
          | { preferences?: NotificationPreferences; message?: string }
          | null;

        if (!response.ok || !body?.preferences) {
          throw new Error(body?.message || "Failed to save notification settings");
        }

        setPreferences(body.preferences);
        setMessage({ tone: "ok", text: "Saved." });
      } catch (error) {
        setMessage({
          tone: "error",
          text: error instanceof Error ? error.message : "Failed to save notification settings",
        });
      } finally {
        setSaving(false);
      }
    },
    []
  );

  if (loading) {
    return (
      <Card className="border bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <CardContent className="flex items-center gap-2 p-4 text-sm text-gray-500 dark:text-zinc-400">
          <Loader2 className="size-4 animate-spin" />
          Loading notification preferences…
        </CardContent>
      </Card>
    );
  }

  if (!preferences) {
    return (
      <Card className="border bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <CardContent className="p-4 text-sm text-red-600 dark:text-red-400">
          {message?.text ?? "Notification preferences are unavailable."}
        </CardContent>
      </Card>
    );
  }

  const toggleBoolean = (key: BooleanPreferenceKey, value: boolean) => {
    setPreferences((current) => (current ? { ...current, [key]: value } : current));
    save({ [key]: value });
  };

  const updateDnd = (patch: Partial<DndWindow>) => {
    setPreferences((current) =>
      current ? { ...current, dnd: { ...current.dnd, ...patch } } : current
    );
    save({ dnd: patch });
  };

  return (
    <Card className="border bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <CardHeader className="p-4">
        <CardTitle className="flex items-center gap-2 text-base dark:text-slate-200">
          <ShieldCheck size={18} className="text-brand" />
          Notification preferences
        </CardTitle>
        <CardDescription className="dark:text-zinc-400">
          Choose what reaches this account. Quiet hours pause everything except calls.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 p-4 pt-0">
        <div className="space-y-3">
          {TYPE_OPTIONS.map(({ key, label, description, icon: Icon }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-2">
                <Icon className="mt-0.5 size-4 text-gray-500 dark:text-zinc-400" />
                <div>
                  <p className="text-sm font-medium dark:text-slate-200">{label}</p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">{description}</p>
                </div>
              </div>
              <Toggle
                checked={preferences[key]}
                disabled={saving}
                label={`Toggle ${label.toLowerCase()} notifications`}
                onChange={(value) => toggleBoolean(key, value)}
              />
            </div>
          ))}
        </div>

        <div className="space-y-3 border-t pt-4 dark:border-zinc-800">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-2">
              <MoonStar className="mt-0.5 size-4 text-gray-500 dark:text-zinc-400" />
              <div>
                <p className="text-sm font-medium dark:text-slate-200">Quiet hours</p>
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  Mute messages, mentions, and follows during this window.
                </p>
              </div>
            </div>
            <Toggle
              checked={preferences.dnd.enabled}
              disabled={saving}
              label="Toggle quiet hours"
              onChange={(value) => updateDnd({ enabled: value })}
            />
          </div>

          {preferences.dnd.enabled && (
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-medium text-gray-600 dark:text-zinc-400">
                Start
                <input
                  type="time"
                  value={preferences.dnd.start}
                  disabled={saving}
                  onChange={(event) => updateDnd({ start: event.target.value })}
                  className="mt-1 w-full rounded-md border bg-white px-2 py-1.5 text-sm text-gray-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-slate-200"
                />
              </label>
              <label className="text-xs font-medium text-gray-600 dark:text-zinc-400">
                End
                <input
                  type="time"
                  value={preferences.dnd.end}
                  disabled={saving}
                  onChange={(event) => updateDnd({ end: event.target.value })}
                  className="mt-1 w-full rounded-md border bg-white px-2 py-1.5 text-sm text-gray-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-slate-200"
                />
              </label>
              <label className="col-span-2 text-xs font-medium text-gray-600 dark:text-zinc-400">
                Time zone
                <select
                  value={preferences.dnd.timezone}
                  disabled={saving}
                  onChange={(event) => updateDnd({ timezone: event.target.value })}
                  className="mt-1 w-full rounded-md border bg-white px-2 py-1.5 text-sm text-gray-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-slate-200"
                >
                  {timezones.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 border-t pt-4 dark:border-zinc-800">
          <div>
            <p className="text-sm font-medium dark:text-slate-200">Hide message previews</p>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              Show &ldquo;New message&rdquo; instead of the message text on your lock screen.
            </p>
          </div>
          <Toggle
            checked={preferences.hideMessagePreview}
            disabled={saving}
            label="Toggle message preview privacy"
            onChange={(value) => toggleBoolean("hideMessagePreview", value)}
          />
        </div>

        {message && (
          <p
            className={`text-sm ${
              message.tone === "ok"
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {message.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
