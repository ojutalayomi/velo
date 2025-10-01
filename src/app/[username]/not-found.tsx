"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigateWithHistory } from "@/hooks/useNavigateWithHistory";

export default function NotFound() {
  const router = useRouter();
  const navigate = useNavigateWithHistory();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2">
      <h2 className="text-2xl font-semibold">404 Not Found</h2>
      <p className="text-muted-foreground">Could not find the requested user profile.</p>
      <div className="flex gap-4 mt-4">
        <Button onClick={() => navigate()} variant="outline" className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Go back
        </Button>
        <Button onClick={() => router.push("/home")}>Return Home</Button>
      </div>
    </div>
  );
}
