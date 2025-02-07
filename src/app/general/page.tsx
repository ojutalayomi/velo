'use client'
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { useTheme } from '@/app/providers';
import { handleThemeChange1 } from '@/components/ThemeToggle';
import { ChevronRight, Bell, Lock, User, Moon, HelpCircle, LogIn, LogOut, Settings2, ArrowLeft } from 'lucide-react';

interface SettingsItem {
  icon: React.ReactNode;
  label: string;
  description: string;
  hasChevron?: boolean;
  hasToggle?: boolean;
  path?: string;
}

interface SettingsCategory {
  title: string;
  items: SettingsItem[];
}

const SettingsPage = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { userdata, loading } = useUser();
  const { theme, setTheme } = useTheme();
  const [isOpen, setOpen] = useState<boolean>(false);
  const [isChecked, setIsChecked] = useState(false);
  const pathTo = pathname !== '' ? `login?backto=${pathname}` : 'login';

  useEffect(() => {
    setIsChecked(theme === 'dark');
  }, [theme]);

  const handleThemeChange = (checked: boolean) => {
    setIsChecked(checked);
    const value = checked ? 'dark' : 'light';
    handleThemeChange1(value, isOpen, setTheme, setOpen);
  };

  const handleItemClick = (path: string) => {
    router.push(path);
  };

  const settingsCategories: SettingsCategory[] = [
    {
      title: 'Account',
      items: [
        { 
          icon: <User className="text-blue-500" size={20} />, 
          label: 'Personal Information',
          description: 'Manage your personal details',
          hasChevron: true,
          path: '/account/personal-info'
        },
        { 
          icon: <Bell className="text-yellow-500" size={20} />, 
          label: 'Notifications',
          description: 'Control your notification preferences', 
          hasChevron: true,
          path: '/notifications'
        },
        { 
          icon: <Lock className="text-green-500" size={20} />, 
          label: 'Privacy and Security',
          description: 'Manage your account security',
          hasChevron: true,
          path: '/account/privacy-security'
        },
      ]
    },
    {
      title: 'Preferences',
      items: [
        { 
          icon: <Moon className="text-purple-500" size={20} />, 
          label: 'Dark Mode',
          description: 'Toggle dark/light theme',
          hasToggle: true 
        },
        { 
          icon: <HelpCircle className="text-red-500" size={20} />, 
          label: 'Help & Support',
          description: 'Get help and contact support',
          hasChevron: true,
          path: '/help-support'
        },
      ]
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900">
      <header className="sticky top-0 z-10 bg-white dark:bg-neutral-900 border-b dark:border-neutral-800">
        <div className="px-4 py-2 flex items-center gap-4">
          <button 
            onClick={() => router.push('/home')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <div className="flex items-center gap-2">
            <Settings2 className="w-6 h-6 text-gray-900 dark:text-white" />
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Settings</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-8">
        {settingsCategories.map((category, categoryIndex) => (
          <section key={categoryIndex}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 px-2">
              {category.title}
            </h2>
            <div className="bg-white dark:bg-neutral-800 rounded-xl overflow-hidden shadow-sm divide-y dark:divide-neutral-700">
              {category.items.map((item, itemIndex) => (
                <div 
                  key={itemIndex}
                  onClick={() => item.path && handleItemClick(item.path)}
                  className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-gray-100 dark:bg-neutral-900 rounded-lg">
                      {item.icon}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {item.label}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  {item.hasChevron && (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                  {item.hasToggle && (
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => handleThemeChange(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-blue-600"></div>
                    </label>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        <Link 
          href={`/accounts/${!loading && !userdata.username ? pathTo : 'logout'}`}
          className="block"
        >
          <button className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3 font-medium">
            {!loading && !userdata.username ? (
              <>
                <span>Sign In</span>
                <LogIn size={20} />
              </>
            ) : (
              <>
                <span>Sign Out</span>
                <LogOut size={20} />
              </>
            )}
          </button>
        </Link>
      </main>
    </div>
  );
};

export default SettingsPage;