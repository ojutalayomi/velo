"use client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import "./fontAwesomeLibrary";
import { useSelector } from "react-redux";

import { useSocket } from "@/app/providers/SocketProvider";
import { fetchChats } from "@/redux/chatSlice";
import { useAppDispatch } from "@/redux/hooks";
import { RootState } from "@/redux/store";
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
  const userData = useSelector((state: RootState) => state.user.userdata);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isEye, setIsEye] = useState(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<FormData>(initialFormData);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const socket = useSocket();

  useEffect(() => {
    if (success) router.push(backTo || "/home");
    const fetchData = async () => {
      await fetchChats(dispatch);
    };
    fetchData();
    if (socket) {
      socket.on("connect", () => {
        // console.log('Connected to server');
        socket.emit("register", userData._id);
      });
    }
  }, [success, router, backTo, dispatch, socket, userData]);

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
      setSuccess(true);
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
        <div className="flex flex-col gap-2">
          <h1 className="mb-2 text-center text-2xl font-bold">Sign in to your account today.</h1>
          <h2>
            Don&apos;t have an account?
            <Link className="text-brand transition-all hover:underline" href="/accounts/signup">
              {" "}
              Sign Up
            </Link>
          </h2>
        </div>
      }
      body={
        <form className="space-y-2 p-2" onSubmit={handleSubmit}>
          <div className="flex flex-col justify-between gap-2">
            <label className="text-start font-semibold">Username or Email</label>
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
          <div className="flex flex-col justify-between gap-2">
            <label className="text-start font-semibold">Password</label>
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
                className="icon-eye absolute right-3 top-1/2 -translate-y-1/2 transform text-gray-400"
                size="lg"
              />
            </div>
            {errors.password && <div className="warning">{errors.password}</div>}
            {error && <div className="warning">{error}</div>}
          </div>
          <div className="forgot-password">
            <Link
              className="text-brand transition-all hover:underline"
              href="/accounts/forgot-password"
            >
              Forgot Password?
            </Link>
          </div>
          <Button
            className="w-full rounded-lg bg-brand p-2 font-semibold text-white shadow"
            disabled={loading}
          >
            {loading ? (
              <div className="loader show"></div>
            ) : success ? (
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
