'use client'

import React, { useEffect, useState } from 'react'
import { useTheme, Theme } from '@/app/providers'

export const handleThemeChange1 = (value: string, isOpen: boolean, setTheme: (theme: Theme) => void, setOpen: React.Dispatch<React.SetStateAction<boolean>>) => {
  setOpen(!isOpen)
  const selectedTheme = value as 'light' | 'dark' | 'system'
  if (selectedTheme === 'system') {
    localStorage.removeItem('theme')
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark')
      setTheme('dark')
    } else {
      document.documentElement.classList.remove('dark')
      setTheme('light')
    }
  } else {
    setTheme(selectedTheme)
  }
}

const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme()
  const [isOpen,setOpen] = useState<boolean>(false);

  const handleThemeChange = (value: string) => {
    handleThemeChange1(value,isOpen,setTheme,setOpen)
  }

  const handleSetOpen = () => {
    setOpen(!isOpen)
  }

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        setTheme(e.matches ? 'dark' : 'light')
      }
    }

    // Add listener
    mediaQuery.addEventListener('change', handleChange)

    // Initial check
    if (!localStorage.getItem('theme')) {
      setTheme(mediaQuery.matches ? 'dark' : 'light')
    }

    // Cleanup
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [setTheme])

  return (
    <>
    {/* <select value={theme} onChange={() => handleThemeChange('')}>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
      <option value="system">System</option>
    </select> */}
    <div className='cursor-pointer' onClick={handleSetOpen}>
    {(() => {
      switch (theme) {
        case 'light':
          return <svg viewBox="0 0 24 24" className='w-6 h-6' fill="none" xmlns="http://www.w3.org/2000/svg"><g id="sun" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <g clipPath="url(#clip0_429_11039)"> <circle cx="12" cy="12" r="4"className='dark:stroke-white' stroke="#292929" strokeWidth="2.5" strokeLinejoin="round"></circle> <path d="M20 12H21"className='dark:stroke-white' stroke="#292929" strokeWidth="2.5" strokeLinecap="round"></path> <path d="M3 12H4"className='dark:stroke-white' stroke="#292929" strokeWidth="2.5" strokeLinecap="round"></path> <path d="M12 20L12 21"className='dark:stroke-white' stroke="#292929" strokeWidth="2.5" strokeLinecap="round"></path> <path d="M12 3L12 4"className='dark:stroke-white' stroke="#292929" strokeWidth="2.5" strokeLinecap="round"></path> <path d="M17.6569 17.6569L18.364 18.364"className='dark:stroke-white' stroke="#292929" strokeWidth="2.5" strokeLinecap="round"></path> <path d="M5.63605 5.63604L6.34315 6.34315"className='dark:stroke-white' stroke="#292929" strokeWidth="2.5" strokeLinecap="round"></path> <path d="M6.34314 17.6569L5.63603 18.364"className='dark:stroke-white' stroke="#292929" strokeWidth="2.5" strokeLinecap="round"></path> <path d="M18.364 5.63604L17.6568 6.34315"className='dark:stroke-white' stroke="#292929" strokeWidth="2.5" strokeLinecap="round"></path> </g> <defs> <clipPath id="clip0_429_11039"> <rect width="24" height="24" fill="white"></rect> </clipPath> </defs> </g></svg>
        case 'dark':
          return <svg viewBox="0 0 24 24" className='w-6 h-6' fill="none" xmlns="http://www.w3.org/2000/svg"><g id="moon" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <g clipPath="url(#clip0_429_11017)"> <path className='dark:fill-white' d="M20.9955 11.7115L22.2448 11.6721C22.2326 11.2847 22.0414 10.9249 21.7272 10.698C21.413 10.4711 21.0113 10.4029 20.6397 10.5132L20.9955 11.7115ZM12.2885 3.00454L13.4868 3.36028C13.5971 2.98873 13.5289 2.58703 13.302 2.2728C13.0751 1.95857 12.7153 1.76736 12.3279 1.75516L12.2885 3.00454ZM20.6397 10.5132C20.1216 10.667 19.5716 10.75 19 10.75V13.25C19.815 13.25 20.6046 13.1314 21.3512 12.9098L20.6397 10.5132ZM19 10.75C15.8244 10.75 13.25 8.17564 13.25 5H10.75C10.75 9.55635 14.4437 13.25 19 13.25V10.75ZM13.25 5C13.25 4.42841 13.333 3.87841 13.4868 3.36028L11.0902 2.64879C10.8686 3.39542 10.75 4.18496 10.75 5H13.25ZM12 4.25C12.0834 4.25 12.1665 4.25131 12.2492 4.25392L12.3279 1.75516C12.219 1.75173 12.1097 1.75 12 1.75V4.25ZM4.25 12C4.25 7.71979 7.71979 4.25 12 4.25V1.75C6.33908 1.75 1.75 6.33908 1.75 12H4.25ZM12 19.75C7.71979 19.75 4.25 16.2802 4.25 12H1.75C1.75 17.6609 6.33908 22.25 12 22.25V19.75ZM19.75 12C19.75 16.2802 16.2802 19.75 12 19.75V22.25C17.6609 22.25 22.25 17.6609 22.25 12H19.75ZM19.7461 11.7508C19.7487 11.8335 19.75 11.9166 19.75 12H22.25C22.25 11.8903 22.2483 11.781 22.2448 11.6721L19.7461 11.7508Z" fill="#292929"></path> </g> <defs> <clipPath id="clip0_429_11017"> <rect className='dark:fill-black' width="24" height="24" fill="white"></rect> </clipPath> </defs> </g></svg>
        case 'system':
          return <svg viewBox="0 0 24 24" className='w-6 h-6' id="system" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" fill="#000000"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"><defs></defs><rect className="cls-1" x="1.5" y="1.5" width="21" height="16.23" rx="1.91"></rect><polygon className="cls-1" points="15.82 22.5 8.18 22.5 9.14 17.73 14.86 17.73 15.82 22.5"></polygon><line className="cls-1" x1="5.32" y1="22.5" x2="18.68" y2="22.5"></line><circle className="cls-2" cx="12" cy="14.86" r="0.95"></circle></g></svg>
        default:
          return <svg viewBox="0 0 24 24" className='w-6 h-6' id="system" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" fill="#000000"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"><defs></defs><rect className="cls-1" x="1.5" y="1.5" width="21" height="16.23" rx="1.91"></rect><polygon className="cls-1" points="15.82 22.5 8.18 22.5 9.14 17.73 14.86 17.73 15.82 22.5"></polygon><line className="cls-1" x1="5.32" y1="22.5" x2="18.68" y2="22.5"></line><circle className="cls-2" cx="12" cy="14.86" r="0.95"></circle></g></svg>;
      }
    })()}
    </div>
    {/* {}  */}
    <div className={`absolute backdrop-blur-sm ${isOpen ? 'block' : 'hidden'} bg-white dark:bg-black flex flex-col gap-2 items-start p-2 rounded-md shadow-md top-full right-1/2 w-30`}>
      <div className='flex gap-1 items-center cursor-pointer' onClick={() => handleThemeChange('light')}>
        <svg viewBox="0 0 24 24" className='w-4 h-4' fill="none" xmlns="http://www.w3.org/2000/svg"><g id="sun" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <g clipPath="url(#clip0_429_11039)"> <circle cx="12" cy="12" r="4"className='dark:stroke-white' stroke="#292929" strokeWidth="2.5" strokeLinejoin="round"></circle> <path d="M20 12H21"className='dark:stroke-white' stroke="#292929" strokeWidth="2.5" strokeLinecap="round"></path> <path d="M3 12H4"className='dark:stroke-white' stroke="#292929" strokeWidth="2.5" strokeLinecap="round"></path> <path d="M12 20L12 21"className='dark:stroke-white' stroke="#292929" strokeWidth="2.5" strokeLinecap="round"></path> <path d="M12 3L12 4"className='dark:stroke-white' stroke="#292929" strokeWidth="2.5" strokeLinecap="round"></path> <path d="M17.6569 17.6569L18.364 18.364"className='dark:stroke-white' stroke="#292929" strokeWidth="2.5" strokeLinecap="round"></path> <path d="M5.63605 5.63604L6.34315 6.34315"className='dark:stroke-white' stroke="#292929" strokeWidth="2.5" strokeLinecap="round"></path> <path d="M6.34314 17.6569L5.63603 18.364"className='dark:stroke-white' stroke="#292929" strokeWidth="2.5" strokeLinecap="round"></path> <path d="M18.364 5.63604L17.6568 6.34315"className='dark:stroke-white' stroke="#292929" strokeWidth="2.5" strokeLinecap="round"></path> </g> <defs> <clipPath id="clip0_429_11039"> <rect width="24" height="24" fill="white"></rect> </clipPath> </defs> </g></svg>
        <span className='text-xs dark:text-white'>Light</span>
      </div>
      <div className='flex gap-1 items-center cursor-pointer' onClick={() => handleThemeChange('dark')}>
        <svg viewBox="0 0 24 24" className='w-4 h-4' fill="none" xmlns="http://www.w3.org/2000/svg"><g id="moon" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <g clipPath="url(#clip0_429_11017)"> <path className='dark:fill-white' d="M20.9955 11.7115L22.2448 11.6721C22.2326 11.2847 22.0414 10.9249 21.7272 10.698C21.413 10.4711 21.0113 10.4029 20.6397 10.5132L20.9955 11.7115ZM12.2885 3.00454L13.4868 3.36028C13.5971 2.98873 13.5289 2.58703 13.302 2.2728C13.0751 1.95857 12.7153 1.76736 12.3279 1.75516L12.2885 3.00454ZM20.6397 10.5132C20.1216 10.667 19.5716 10.75 19 10.75V13.25C19.815 13.25 20.6046 13.1314 21.3512 12.9098L20.6397 10.5132ZM19 10.75C15.8244 10.75 13.25 8.17564 13.25 5H10.75C10.75 9.55635 14.4437 13.25 19 13.25V10.75ZM13.25 5C13.25 4.42841 13.333 3.87841 13.4868 3.36028L11.0902 2.64879C10.8686 3.39542 10.75 4.18496 10.75 5H13.25ZM12 4.25C12.0834 4.25 12.1665 4.25131 12.2492 4.25392L12.3279 1.75516C12.219 1.75173 12.1097 1.75 12 1.75V4.25ZM4.25 12C4.25 7.71979 7.71979 4.25 12 4.25V1.75C6.33908 1.75 1.75 6.33908 1.75 12H4.25ZM12 19.75C7.71979 19.75 4.25 16.2802 4.25 12H1.75C1.75 17.6609 6.33908 22.25 12 22.25V19.75ZM19.75 12C19.75 16.2802 16.2802 19.75 12 19.75V22.25C17.6609 22.25 22.25 17.6609 22.25 12H19.75ZM19.7461 11.7508C19.7487 11.8335 19.75 11.9166 19.75 12H22.25C22.25 11.8903 22.2483 11.781 22.2448 11.6721L19.7461 11.7508Z" fill="#292929"></path> </g> <defs> <clipPath id="clip0_429_11017"> <rect className='dark:fill-black' width="24" height="24" fill="white"></rect> </clipPath> </defs> </g></svg>
        <span className='text-xs dark:text-white'>Dark</span>
      </div>
      <div className='flex gap-1 items-center cursor-pointer' onClick={() => handleThemeChange('system')}>
        <svg viewBox="0 0 24 24" className='w-4 h-4' id="system" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" fill="#000000"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"><defs></defs><rect className="cls-1 dark:stroke-white" x="1.5" y="1.5" width="21" height="16.23" rx="1.91"></rect><polygon className="cls-1 dark:stroke-white" points="15.82 22.5 8.18 22.5 9.14 17.73 14.86 17.73 15.82 22.5"></polygon><line className="cls-1 dark:stroke-white" x1="5.32" y1="22.5" x2="18.68" y2="22.5"></line><circle className="cls-2 dark:fill-white" cx="12" cy="14.86" r="0.95"></circle></g></svg>
        <span className='text-xs dark:text-white'>System</span>
      </div>
    </div>
    </>
  )
}

export default ThemeToggle