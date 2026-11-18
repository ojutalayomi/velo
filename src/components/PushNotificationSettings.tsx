"use client";

import { Bell, BellOff, Send, ShieldAlert } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export default function PushNotificationSettings() {
  const { initialized, supported, permission, subscribed, busy, error, subscribe, unsubscribe, sendTest } =
    usePushNotifications();
  const [testMessage, setTestMessage] = useState<string | null>(null);

  const handleToggle = async () => {
    setTestMessage(null);
    if (subscribed) await unsubscribe();
    else await subscribe();
  };

  const handleTest = async () => {
    const result = await sendTest();
    setTestMessage(result.message);
  };

  if (!initialized) {
    return (
      <Card className="border bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <CardContent className="p-4 text-sm text-gray-500 dark:text-zinc-400">
          Checking notification support…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <CardHeader className="p-4">
        <CardTitle className="flex items-center gap-2 text-base dark:text-slate-200">
          <Bell size={18} className="text-yellow-500" />
          Push notifications
        </CardTitle>
        <CardDescription className="dark:text-zinc-400">
          Get alerts for messages, mentions, follows, and calls even when Velo is closed.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3 p-4 pt-0">
        {!supported ? (
          <p className="flex items-center gap-2 text-sm text-gray-500 dark:text-zinc-400">
            <BellOff size={16} />
            Push notifications are not supported in this browser.
          </p>
        ) : permission === "denied" ? (
          <p className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
            <ShieldAlert size={16} className="mt-0.5 shrink-0" />
            Notifications are blocked. Allow them for this site in your browser settings, then reload
            the page.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium dark:text-slate-200">
                  {subscribed ? "Notifications are enabled" : "Notifications are disabled"}
                </p>
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  {subscribed
                    ? "This device will receive push notifications."
                    : "Enable notifications on this device."}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={subscribed}
                aria-label={subscribed ? "Disable push notifications" : "Enable push notifications"}
                disabled={busy}
                onClick={handleToggle}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                  subscribed ? "bg-brand" : "bg-gray-300 dark:bg-zinc-700"
                }`}
              >
                <span
                  className={`inline-block size-5 transform rounded-full bg-white shadow transition-transform ${
                    subscribed ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {subscribed && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={handleTest}
                className="gap-2"
              >
                <Send size={14} />
                Send test notification
              </Button>
            )}
          </>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {testMessage && !error && (
          <p className="text-sm text-green-600 dark:text-green-400">{testMessage}</p>
        )}
      </CardContent>
    </Card>
  );
}
