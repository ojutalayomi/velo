'use client'
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Lock, Shield, Eye, Bell, Smartphone, Key } from 'lucide-react';
import LeftSideBar from '@/components/LeftSideBar';
import { useDispatch } from 'react-redux';
import { updateSettings } from '@/redux/userSlice';
import { UserSettings } from '@/lib/types/type';
import { useSocket } from '@/app/providers/SocketProvider';

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
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
    dispatch(updateSettings({ ...prev, [setting]: !prev[setting] } as UserSettings));
    if (socket) {
      socket.emit('updateSettings', { ...prev, [setting]: !prev[setting] });
    }
  };

  const handleChangePassword = () => {
    router.push('/accounts/change-password');
  };

  return (
    <div className="max-h-screen overflow-auto flex bg-gray-50 dark:bg-zinc-900">
      <div className="md:w-3/5 overflow-auto w-full">
        <header className="sticky top-0 z-10 bg-white dark:bg-neutral-900 border-b dark:border-neutral-800">
          <div className="px-4 py-2 flex items-center gap-4">
            <button 
              onClick={() => router.push('/general')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <div className="flex items-center gap-2">
              <Lock className="w-6 h-6 text-gray-900 dark:text-white" />
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Privacy & Security</h1>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto p-4 space-y-6 mb-16 tablets:mb-0">
          {/* Security Section */}
          <section className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-500" />
              Security Settings
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Add an extra layer of security to your account</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.twoFactorAuth}
                    onChange={() => handleToggle('twoFactorAuth')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand/30 dark:peer-focus:ring-brand/80 rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-brand"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Login Alerts</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Get notified of new login attempts</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.loginAlerts}
                    onChange={() => handleToggle('loginAlerts')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand/30 dark:peer-focus:ring-brand/80 rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-brand"></div>
                </label>
              </div>

              <button
                onClick={handleChangePassword}
                className="w-full mt-4 px-4 py-2 bg-gray-100 dark:bg-neutral-700 text-gray-900 dark:text-white rounded-md hover:bg-gray-200 dark:hover:bg-neutral-600 transition-colors flex items-center justify-center gap-2"
              >
                <Key className="w-4 h-4" />
                Change Password
              </button>
            </div>
          </section>

          {/* Privacy Section */}
          <section className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-500" />
              Privacy Settings
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Online Status</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Show when you&apos;re online</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showOnlineStatus}
                    onChange={() => handleToggle('showOnlineStatus')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand/30 dark:peer-focus:ring-brand/80 rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-brand"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Last Seen</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Show when you were last active</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showLastSeen}
                    onChange={() => handleToggle('showLastSeen')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand/30 dark:peer-focus:ring-brand/80 rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-brand"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Read Receipts</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Show when you&apos;ve read messages</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showReadReceipts}
                    onChange={() => handleToggle('showReadReceipts')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand/30 dark:peer-focus:ring-brand/80 rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-brand"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Typing Status</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Show when you&apos;re typing</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showTypingStatus}
                    onChange={() => handleToggle('showTypingStatus')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand/30 dark:peer-focus:ring-brand/80 rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-brand"></div>
                </label>
              </div>
            </div>
          </section>

          {/* Connected Devices Section */}
          <section className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-purple-500" />
              Connected Devices
            </h2>
            
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-neutral-700 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">iPhone 12 Pro</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Last active: 2 minutes ago</p>
                  </div>
                  <button className="text-red-500 hover:text-red-600 text-sm font-medium">
                    Remove
                  </button>
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-neutral-700 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">MacBook Pro</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Last active: Currently active</p>
                  </div>
                  <button className="text-red-500 hover:text-red-600 text-sm font-medium">
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
      <LeftSideBar/>
    </div>
  );
};

export default PrivacySecurityPage;
