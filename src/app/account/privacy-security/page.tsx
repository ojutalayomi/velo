"use client";
import { ArrowLeft, Lock, Shield, Eye, Smartphone, Key } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { useDispatch } from "react-redux";

import { useSocket } from "@/app/providers/SocketProvider";
import LeftSideBar from "@/components/LeftSideBar";
import { UserSettings } from "@/lib/types/type";
import { updateSettings } from "@/redux/userSlice";

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

  const handleToggle = (setting: keyof typeof settings) => {
    const prev = settings;
    setSettings((prev) => ({
      ...prev,
      [setting]: !prev[setting],
    }));
    dispatch(updateSettings({ ...prev, [setting]: !prev[setting] } as UserSettings));
    if (socket) {
      socket.emit("updateSettings", { ...prev, [setting]: !prev[setting] });
    }
  };

  const handleChangePassword = () => {
    router.push("/accounts/change-password");
  };

  return (
    <div className="flex max-h-screen overflow-auto bg-gray-50 dark:bg-zinc-900">
      <div className="w-full overflow-auto md:w-3/5">
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
                Privacy & Security
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
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Online Status</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Show when you&apos;re online
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={settings.showOnlineStatus}
                    onChange={() => handleToggle("showOnlineStatus")}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:size-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand/30 dark:border-neutral-600 dark:bg-neutral-700 dark:peer-focus:ring-brand/80"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Last Seen</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Show when you were last active
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={settings.showLastSeen}
                    onChange={() => handleToggle("showLastSeen")}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:size-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand/30 dark:border-neutral-600 dark:bg-neutral-700 dark:peer-focus:ring-brand/80"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Read Receipts</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Show when you&apos;ve read messages
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={settings.showReadReceipts}
                    onChange={() => handleToggle("showReadReceipts")}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:size-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand/30 dark:border-neutral-600 dark:bg-neutral-700 dark:peer-focus:ring-brand/80"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Typing Status</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Show when you&apos;re typing
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={settings.showTypingStatus}
                    onChange={() => handleToggle("showTypingStatus")}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:size-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand/30 dark:border-neutral-600 dark:bg-neutral-700 dark:peer-focus:ring-brand/80"></div>
                </label>
              </div>
            </div>
          </section>

          {/* Connected Devices Section */}
          <section className="rounded-xl bg-white p-6 shadow-sm dark:bg-neutral-800">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
              <Smartphone className="size-5 text-purple-500" />
              Connected Devices
            </h2>

            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 p-4 dark:bg-neutral-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">iPhone 12 Pro</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Last active: 2 minutes ago
                    </p>
                  </div>
                  <button className="text-sm font-medium text-red-500 hover:text-red-600">
                    Remove
                  </button>
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 p-4 dark:bg-neutral-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">MacBook Pro</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Last active: Currently active
                    </p>
                  </div>
                  <button className="text-sm font-medium text-red-500 hover:text-red-600">
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
      <LeftSideBar />
    </div>
  );
};

export default PrivacySecurityPage;
