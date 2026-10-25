"use client";
import { LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Logout() {
  const router = useRouter();
  const [isLogout, setLogout] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    setLogout(false);
    const logout = async () => {
      const response = await fetch("/api/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        setMessage("Logged out successfully");
        setLogout(true);
        router.refresh();
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
