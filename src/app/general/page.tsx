'use client'
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { useTheme } from '@/app/providers';
import { handleThemeChange1 } from '@/components/ThemeToggle';
import { ChevronRight, Bell, Lock, User, Moon, HelpCircle, LogIn, LogOut } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const SettingsPage = () => {
    const pathname = usePathname();
    const router = useRouter();
    const { userdata, loading, error, refetchUser } = useUser();
    const { theme, setTheme } = useTheme()
    const [isOpen,setOpen] = useState<boolean>(false);
    const [isChecked, setIsChecked] = useState(false);
    const pathTo = pathname !== '' ? 'login?backto='+pathname : 'login';
    useEffect(() => {
      theme === 'dark' ? setIsChecked(true) : setIsChecked(false);
    },[theme])
  
    const handleCheckboxChange = (event: { target: { checked: any; }; }) => {
        const check = event.target.checked;
        setIsChecked(check);
        handleThemeChange();
    };

    const handleThemeChange = () => {
        const value = !isChecked ? 'dark' : 'light';
        handleThemeChange1(value,isOpen,setTheme,setOpen)
    }
  const settingsCategories = [
    {
      title: 'Account',
      items: [
        { icon: <User size={20} />, label: 'Personal Information', hasChevron: true },
        { icon: <Bell size={20} />, label: 'Notifications', hasChevron: true },
        { icon: <Lock size={20} />, label: 'Privacy and Security', hasChevron: true },
      ]
    },
    {
      title: 'Preferences',
      items: [
        { icon: <Moon size={20} />, label: 'Dark Mode', hasToggle: true },
        { icon: <HelpCircle size={20} />, label: 'Help & Support', hasChevron: true },
      ]
    },
  ];

  return (
    <div className="bg-gray-100 dark:bg-neutral-950 dark:text-slate-200 min-h-screen">
      {/* Header */}
      <header className="bg-white dark:bg-neutral-900 flex items-center gap-1 dark:border-black-200 px-2 py-2 border-b border-gray-200 dark:border-gray-400">
        <FontAwesomeIcon onClick={() => router.push('/home')} icon={'arrow-left'} className='icon-arrow-left text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors duration-300 ease-in-out max-h-[21px]' size="lg" />
        <h1 className="font-semibold">Settings</h1>
      </header>

      {/* Settings List */}
      <main className="p-4 h-[80dvh]">
        {settingsCategories.map((category, categoryIndex) => (
          <div key={categoryIndex} className="mb-6">
            <h2 className="text-lg font-medium mb-2 px-2">{category.title}</h2>
            <div className="bg-white dark:bg-zinc-900 rounded-lg overflow-hidden shadow-sm">
              {category.items.map((item, itemIndex) => (
                <div 
                  key={itemIndex}
                  className={`flex items-center justify-between p-4 ${
                    itemIndex !== category.items.length - 1 ? 'border-b border-gray-200 dark:border-gray-400' : ''
                  }`}
                >
                  <div className="flex items-center">
                    <span className="mr-3 text-gray-500">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  {item.hasChevron && <ChevronRight size={20} className="text-gray-400" />}
                  {item.hasToggle && (
                    <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                      <input type="checkbox" checked={isChecked} onChange={handleCheckboxChange} name="toggle" id="toggle" className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"/>
                      <label htmlFor="toggle" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Logout/in Button */}
        {/* {`${pathname !== '' ? '/accounts/login?backto='+pathname : '/accounts/login'}`} */}
        <Link href={`/accounts/${!loading && !userdata.username ? pathTo : 'logout'}`}>
          <button className="w-full bg-red-500 text-white py-3 rounded-lg flex gap-2 items-center justify-center mt-6">
            {!loading && !userdata.username ?
              <>
              <span>Log In</span>
              <LogIn size={20} className="mr-2" />
              </> 
              :
              <>
              <LogOut size={20} className="mr-2" />
              <span>Log Out</span>
              </>
            }
          </button>
        </Link>
      </main>
    </div>
  );
};

export default SettingsPage;