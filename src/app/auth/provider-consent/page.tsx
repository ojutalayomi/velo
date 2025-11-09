"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

export default function ProviderConsent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [provider, setProvider] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [consenting, setConsenting] = useState(false);

  useEffect(() => {
    const token = searchParams?.get("token");
    if (!token) {
      setError("Invalid consent token");
      setLoading(false);
      return;
    }

    // Verify token and get provider info
    fetch(`/api/auth/provider-consent?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setProvider(data.provider);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to verify consent token");
        setLoading(false);
      });
  }, [searchParams]);

  const handleConsent = async () => {
    const token = searchParams?.get("token");
    if (!token) return;

    setConsenting(true);
    try {
      const response = await fetch("/api/auth/provider-consent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update provider");
      }

      // Redirect to the backTo URL or home
      router.push(data.redirectTo || "/home");
    } catch (err: any) {
      setError(err.message);
      setConsenting(false);
    }
  };

  const handleDecline = () => {
    router.push("/accounts/login");
  };

  const getProviderName = (provider: string | null) => {
    if (!provider) return "this provider";
    return provider.charAt(0).toUpperCase() + provider.slice(1);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-red-600">Error</h1>
          <p className="mb-4 text-red-500">{error}</p>
          <Button onClick={() => router.push("/accounts/login")}>Go to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg dark:bg-gray-900">
        <h1 className="mb-4 text-2xl font-bold">Link {getProviderName(provider)} Account</h1>
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          You&apos;re signing in with {getProviderName(provider)} for the first time. Would you like to
          link this account to your existing profile? This will allow you to sign in with{" "}
          {getProviderName(provider)} in the future.
        </p>

        {error && (
          <div className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700 dark:bg-red-900 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="flex gap-4">
          <Button
            onClick={handleConsent}
            disabled={consenting}
            className="flex-1"
          >
            {consenting ? "Linking..." : "Yes, Link Account"}
          </Button>
          <Button
            onClick={handleDecline}
            disabled={consenting}
            variant="outline"
            className="flex-1"
          >
            No, Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

