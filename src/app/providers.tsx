'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useHotkeys } from 'react-hotkeys-hook';

export type Theme = 'light' | 'dark' | 'system'

export interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('light');

  useHotkeys('cmd+m', () => {
    // console.log('Cmmd');
    let thm = '' as 'light' | 'dark' | 'system';
    theme === 'light' ? thm = 'dark' : thm = 'light'; 
    setTheme(thm);
  });

  useHotkeys('ctrl+m', () => {
    // console.log('Cmmd');
    let thm = '' as 'light' | 'dark' | 'system';
    theme === 'light' ? thm = 'dark' : thm = 'light'; 
    setTheme(thm);
  });

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') as Theme | null
    if (storedTheme) {
      setTheme(storedTheme)
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark')
    }
  }, [])

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}