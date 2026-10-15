"use client";
// import { useEffect } from 'react';
import Link from "next/link";
import { useState } from "react";
import Wrapper from "./AccountComponentWrapper";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

interface FormData {
  email: string;
}

const initialFormData: FormData = {
  email: "",
};

const url: string = `${process.env.REACT_APP_LOCAL_DOMAIN}/forgot-password`;
const postData = async (data: FormData): Promise<void> => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: data.email }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    // Try to parse the response to see if it contains a custom error message
    const errorJson = JSON.parse(errorText);
    throw new Error(errorJson.error || "Network response was not ok");
  }
};

const ForgotPassword: React.FC = () => {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await postData(formData);
      setSuccess(true);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Wrapper
      header={
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold tracking-tight">Reset your password</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you a reset link.{" "}
            <Link className="font-medium text-brand transition-colors hover:underline" href="/accounts/signup">
              Sign up
            </Link>
          </p>
        </div>
      }
      body={
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              name="email"
              id="email"
              value={formData.email}
              placeholder="you@example.com"
              onChange={handleInputChange}
              disabled={loading}
              required
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <Button
            className="h-10 w-full bg-brand font-semibold text-white shadow-sm hover:bg-brand/90 active:scale-[0.98] transition-all"
            disabled={loading}
          >
            {loading ? (
              <div className="loader show"></div>
            ) : success ? (
              <span>Reset link sent!</span>
            ) : (
              <span>Get link</span>
            )}
          </Button>
        </form>
      }
    />
  );
};

export default ForgotPassword;
