"use client";

import React, { useEffect, useState, useRef } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { Theme } from "@/app/providers/ThemeProvider";

export const handleThemeChange1 = (
  value: string,
  isOpen: boolean,
  setTheme: (theme: Theme) => void,
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
) => {
  setOpen(!isOpen);
  const selectedTheme = value as "light" | "dark" | "system";
  if (selectedTheme === "system") {
    localStorage.removeItem("theme");
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.classList.add("dark");
      setTheme("dark");
    } else {
      document.documentElement.classList.remove("dark");
      setTheme("light");
    }
  } else {
    setTheme(selectedTheme);
  }
};

const ThemeToggle: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent, newTheme: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setTheme(newTheme);
      setIsOpen(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        aria-label="Toggle theme"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {theme === "dark" ? (
          <Moon className="w-5 h-5" />
        ) : theme === "light" ? (
          <Sun className="w-5 h-5" />
        ) : (
          <Monitor className="w-5 h-5" />
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5"
          role="menu"
        >
          <div className="py-1" role="none">
            <button
              onClick={() => {
                setTheme("light");
                setIsOpen(false);
              }}
              onKeyDown={(e) => handleKeyDown(e, "light")}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              role="menuitem"
            >
              <div className="flex items-center">
                <Sun className="w-4 h-4 mr-2" />
                <span className="text-xs dark:text-white">Light</span>
              </div>
            </button>
            <button
              onClick={() => {
                setTheme("dark");
                setIsOpen(false);
              }}
              onKeyDown={(e) => handleKeyDown(e, "dark")}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              role="menuitem"
            >
              <div className="flex items-center">
                <Moon className="w-4 h-4 mr-2" />
                <span className="text-xs dark:text-white">Dark</span>
              </div>
            </button>
            <button
              onClick={() => {
                setTheme("system");
                setIsOpen(false);
              }}
              onKeyDown={(e) => handleKeyDown(e, "system")}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              role="menuitem"
            >
              <div className="flex items-center">
                <Monitor className="w-4 h-4 mr-2" />
                <span className="text-xs dark:text-white">System</span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeToggle;
