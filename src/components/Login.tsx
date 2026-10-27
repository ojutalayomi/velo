"use client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import "./fontAwesomeLibrary";

import { useAppDispatch } from "@/redux/hooks";
import { setSuccess } from "@/redux/signupSlice";
import { setUserData } from "@/redux/userSlice";

import Wrapper from "./AccountComponentWrapper";
import SignInComponent from "./SignInController";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface FormData {
  UsernameOrEmail: string;
  password: string;
}

const initialFormData: FormData = {
  UsernameOrEmail: "",
  password: "",
};

const Login: React.FC = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const backTo = searchParams?.get("backto");
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isEye, setIsEye] = useState(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<FormData>(initialFormData);
  const [error, setError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState<boolean>(false);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const onInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    const newErrors: FormData = { UsernameOrEmail: "", password: "" };
    if (name === "UsernameOrEmail") {
      if (value.length > 0) newErrors.UsernameOrEmail = "";
    } else if (name === "password") {
      if (value.length > 0) newErrors.password = "";
    }
    setErrors(newErrors);
    // console.log(value)
  };

  const handleValidation = () => {
    let valid = true;
    const newErrors: FormData = { ...initialFormData };

    if (!formData.UsernameOrEmail) {
      newErrors.UsernameOrEmail = "Username or Email is required";
      valid = false;
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
      valid = false;
    }

    setErrors(newErrors);
    // console.log(newErrors)
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handleValidation) return;
    setLoading(true);
    setError(null);
    try {
      const msg = await SignInComponent(formData);
      dispatch(setUserData(msg));
      setLoginSuccess(true);
      dispatch(setSuccess(true));
      router.push(backTo || "/home")
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Wrapper
      auth="Sign in"
      header={
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link className="font-medium text-brand transition-colors hover:underline" href="/accounts/signup">
              Sign up
            </Link>
          </p>
        </div>
      }
      body={
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            {/*<label className="text-sm font-medium">Username or Email</label>*/}
            <Input
              className="input1 font-semibold"
              type="text"
              name="UsernameOrEmail"
              onInput={onInput}
              id="text"
              value={formData.UsernameOrEmail}
              onChange={handleInputChange}
              placeholder="Username Or Email"
              required
            />
            {errors.UsernameOrEmail && <div className="warning">{errors.UsernameOrEmail}</div>}
          </div>
          <div className="flex flex-col gap-1.5">
            {/*<label className="text-sm font-medium">Password</label>*/}
            <div className="relative">
              <Input
                className="font-semibold"
                type={isEye ? "password" : "text"}
                name="password"
                onInput={onInput}
                id="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Password"
                required
              />
              <FontAwesomeIcon
                onClick={() => setIsEye(!isEye)}
                icon={isEye ? "eye-slash" : "eye"}
                className="icon-eye absolute right-4 top-1/2 -translate-y-1/2 transform text-gray-400"
              />
            </div>
            {errors.password && <div className="warning">{errors.password}</div>}
            {error && <div className="warning">{error}</div>}
          </div>
          <div className="flex justify-end">
            <Link
              className="text-xs text-muted-foreground transition-colors hover:text-brand"
              href="/accounts/forgot-password"
            >
              Forgot password?
            </Link>
          </div>
          <Button
            className="h-10 w-full bg-brand font-semibold text-white shadow-sm transition-all hover:bg-brand/90 active:scale-[0.98]"
            disabled={loading}
          >
            {loading ? (
              <div className="loader show" />
            ) : loginSuccess ? (
              <span>Success!</span>
            ) : (
              <span>Continue</span>
            )}
          </Button>
        </form>
      }
    />
  );
};

export default Login;
