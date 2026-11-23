"use client";
import { LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearChatCache } from "@/lib/chatCache";
import { clearMediaCache } from "@/lib/mediaCache";
import { clearOfflineShell } from "@/lib/serviceWorker";
import { clearCachedUser } from "@/lib/userCache";
import { resetChatPersistence } from "@/redux/chatPersistence";
import { clearSocketToken } from "@/lib/socketToken";

export default function Logout() {
  const router = useRouter();
  const [isLogout, setLogout] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const logout = async () => {
      // Best effort: detach this device from the current user's push subscriptions.
      try {
        const registration = await navigator.serviceWorker?.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) {
          await fetch("/api/push/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });
        }
      } catch {
        // Push cleanup is not critical to logging out.
      }

      const response = await fetch("/api/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      resetChatPersistence(); // stop the live writer before the cache is emptied
      void clearChatCache(); // cached messages must not outlive the session
      void clearMediaCache(); // nor the files that came with them
      void clearOfflineShell(); // nor the pages and images saved for offline use
      clearCachedUser(); // nor the saved profile that offline mode would sign them back in with
      clearSocketToken(); // the next sign-in must not reuse this user's token
      if (response.ok) {
        setMessage("Logged out successfully");
        setLogout(true);
        router.refresh();
        router.push("/accounts/login");
      } else {
        router.push("/accounts/login");
        setMessage("Failed to log out");
        setLogout(true);
      }
    };
    logout();
  }, [router]);
  
  const handleClick = () => {
    router.push("/accounts/login");
  };

  return (
    <div className="dark:text-white">
      {!isLogout ? (
        <div>
          <h1>Logging out...</h1>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2">
          <h1>{message}</h1>
          {message === "Failed to log out" && (
            <button
              onClick={handleClick}
              className="flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-white hover:bg-tomatom focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <span>Log in</span>
              <LogIn size={20} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
