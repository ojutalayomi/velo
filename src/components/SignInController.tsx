import { UserData } from "@/lib/types/user";

// 'use client'
interface FormData {
  UsernameOrEmail: string;
  password: string;
}

export default async function SignInComponent(formData: FormData): Promise<UserData> {
  const response = await fetch("/api/user", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(formData),
  });
  if (!response.ok) {
    // The body is not always JSON (a gateway error page, for example), so never let parsing throw.
    const errorJson: { error?: string; message?: string } | null = await response.json().catch(() => null);
    throw new Error(
      errorJson?.error ||
        errorJson?.message ||
        (response.status >= 500
          ? "The server had a problem. Please try again in a moment."
          : "Couldn't sign you in. Please try again.")
    );
  }
  return response.json();
}
