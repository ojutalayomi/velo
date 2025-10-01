"use client";
import { Button } from "@/components/ui/button";
import { BadgeCheck, Home } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SuccessPage() {
  const router = useRouter();

  useEffect(() => {
    setTimeout(() => {
      router.push("/home");
    }, 6000);
  }, []);

  function handleClick() {
    router.push("/home");
  }

  return (
    <div className="dark:text-white">
      <div className="flex flex-col items-center justify-center gap-2">
        <BadgeCheck size={60} className="text-brand" />
        <h1>Your email has been successfully confirmed. You can proceed to the homepage.</h1>
        <Button
          onClick={handleClick}
          className="bg-brand flex items-center justify-center gap-2 text-white px-4 py-3 rounded-lg hover:bg-tomatom focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <span>Go home</span>
          <Home size={20} />
        </Button>
      </div>
    </div>
  );
}
