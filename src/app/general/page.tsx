"use client";
import { Bell, HelpCircle, LockKeyhole, LogIn, LogOut, Moon, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";

import { useTheme } from "@/app/providers/ThemeProvider";
import { useUser } from "@/app/providers/UserProvider";
import { SettingsGroup, SettingsHeader, SettingsRow, Switch } from "@/components/settings/SettingsUI";
import { handleThemeChange1 } from "@/components/ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const SettingsPage = () => {
  const pathname = usePathname();
  const { userdata, loading } = useUser();
  const { theme, setTheme } = useTheme();
  const [isOpen, setOpen] = useState<boolean>(false);
  const [isDark, setIsDark] = useState(false);
  const signedIn = !loading && Boolean(userdata.username);
  const loginPath = pathname ? `/accounts/login?backto=${pathname}` : "/accounts/login";

  useEffect(() => {
    const t = setTimeout(() => setIsDark(theme === "dark"), 0);
    return () => clearTimeout(t);
  }, [theme]);

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    handleThemeChange1(next ? "dark" : "light", isOpen, setTheme, setOpen);
  };

  return (
    <div className="max-h-screen w-full overflow-auto">
      <SettingsHeader title="Settings" backTo="/home" />

      <main className="mx-auto mb-20 max-w-2xl space-y-6 p-4 tablets:mb-6">
        {signedIn && (
          <Link
            href={`/${userdata.username}`}
            className="flex items-center gap-4 rounded-2xl border bg-white p-4 transition-colors hover:bg-gray-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/60"
          >
            <Avatar className="size-14">
              <AvatarImage src={userdata.displayPicture} />
              <AvatarFallback>{userdata.firstname?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-lg font-bold">
                {userdata.name || `${userdata.firstname} ${userdata.lastname}`}
              </p>
              <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                @{userdata.username}
              </p>
            </div>
          </Link>
        )}

        <SettingsGroup title="Account">
          <SettingsRow
            icon={<UserRound size={20} />}
            label="Personal information"
            description="Your name, bio and profile details"
            href="/account/personal-info"
          />
          <SettingsRow
            icon={<Bell size={20} />}
            label="Notifications"
            description="Choose what you get notified about"
            href="/notifications"
          />
          <SettingsRow
            icon={<LockKeyhole size={20} />}
            label="Privacy and security"
            description="Visibility, passkeys and signed-in devices"
            href="/account/privacy-security"
          />
        </SettingsGroup>

        <SettingsGroup title="Preferences">
          <SettingsRow
            icon={<Moon size={20} />}
            label="Dark mode"
            description="Use a darker theme"
            trailing={<Switch checked={isDark} onChange={toggleDark} label="Dark mode" />}
          />
          <SettingsRow
            icon={<HelpCircle size={20} />}
            label="Help and support"
            description="Get help or contact us"
            href="/help-support"
          />
        </SettingsGroup>

        <SettingsGroup>
          {signedIn ? (
            <SettingsRow
              icon={<LogOut size={20} />}
              label="Sign out"
              href="/accounts/logout"
              destructive
            />
          ) : (
            <SettingsRow
              icon={<LogIn size={20} />}
              label="Sign in"
              description="Log in to manage your account"
              href={loginPath}
            />
          )}
        </SettingsGroup>
      </main>
    </div>
  );
};

export default SettingsPage;
