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
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold text-red-600 mb-4">Authentication Error</h1>
      <p className="text-lg text-red-500">An error occurred: {error}</p>
    </div>
  );
}
