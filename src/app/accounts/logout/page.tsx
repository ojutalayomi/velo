"use client";
import { LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearChatCache } from "@/lib/chatCache";
import { clearMediaCache } from "@/lib/mediaCache";
import { clearOfflineShell } from "@/lib/serviceWorker";
import { clearFeedCache } from "@/lib/feedCache";
import { clearOutbox } from "@/lib/outbox";
import { clearCachedUser } from "@/lib/userCache";
import { resetChatPersistence } from "@/redux/chatPersistence";
import { clearSocketToken } from "@/lib/socketToken";
import { useAppDispatch } from "@/redux/hooks";
import { clearUserData } from "@/redux/userSlice";

export default function Logout() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [isLogout, setLogout] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    // Where to land after logging out: the sign-up form when that is what the user came for.
    const destination =
      new URLSearchParams(window.location.search).get("next") === "signup"
        ? "/accounts/signup"
        : "/accounts/login";
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
      void clearFeedCache(); // nor the saved home feeds
      void clearOutbox(); // unsent messages must not be sent by whoever signs in next
      clearCachedUser(); // nor the saved profile that offline mode would sign them back in with
      clearSocketToken(); // the next sign-in must not reuse this user's token
      if (response.ok) {
        dispatch(clearUserData()); // so the sign-in pages stop treating this device as signed in
        setMessage("Logged out successfully");
        setLogout(true);
        router.refresh();
        router.push(destination);
      } else {
        router.push("/accounts/login");
        setMessage("Failed to log out");
        setLogout(true);
      }
    };
    logout();
  }, [router, dispatch]);
  
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
              className="flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-white hover:bg-tomatom focus:outline-hidden focus:ring-2 focus:ring-brand"
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
