"use client";

import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";

import { authenticateWithPasskey } from "@/lib/passkey-client";
import { Button } from "@/components/ui/button";

interface PasskeyButtonProps {
  username?: string;
  onSuccess?: (user: any) => void;
  onError?: (error: string) => void;
  variant?: "default" | "outline" | "ghost";
  className?: string;
}

export function PasskeyButton({
  username,
  onSuccess,
  onError,
  variant = "outline",
  className = "",
}: PasskeyButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handlePasskeySignIn = async () => {
    setIsLoading(true);
    try {
      const result = await authenticateWithPasskey(username);

      if (result.success && result.user) {
        onSuccess?.(result.user);
        // Redirect to home on successful authentication
        window.location.href = "/home";
      } else {
        onError?.(result.error || "Authentication failed");
      }
    } catch (error: any) {
      onError?.(error.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      className={className}
      onClick={handlePasskeySignIn}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Authenticating...
        </>
      ) : (
        <>
          <KeyRound className="mr-2 h-4 w-4" />
          Sign in with Passkey
        </>
      )}
    </Button>
  );
}
