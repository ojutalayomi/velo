"use client";

import { useEffect, useState } from "react";

export default function AuthError() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const errorParam = searchParams.get("error");
    setError(errorParam);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="mb-4 text-4xl font-bold text-red-600">Authentication Error</h1>
      <p className="text-lg text-red-500">An error occurred: {error}</p>
    </div>
  );
}
