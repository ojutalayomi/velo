"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";

import Wrapper from "@/components/AccountComponentWrapper";
import First from "@/components/pg/first";
import Second from "@/components/pg/second";
import SubmitForm from "@/components/pg/submitButton";
import Third from "@/components/pg/third";
import { BUCKETNAME, S3UploadBody } from "@/lib/types/s3";
import { useAppDispatch } from "@/redux/hooks";
import { setLoading, setError1, setSuccess, updateFormData } from "@/redux/signupSlice";
import { RootState } from "@/redux/store";
import { setUserData } from "@/redux/userSlice";


const Comps: React.FC = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const backTo = searchParams?.get("backto");
  const { currentStep, formData } = useSelector(
    (state: RootState) => state.signups
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // if (!passwordsMatch) return;
    dispatch(setLoading(true));
    dispatch(setError1(null));
    try {
      if (formData.file && formData.file.name && formData.file.type) {
        const response = await fetch("/api/upload", {
          method: "POST",
          body: S3UploadBody({
            filename: formData.file.name,
            contentType: formData.file.type,
            bucketName: BUCKETNAME.PROFILE,
          }),
          headers: {
            "Content-Type": "application/json",
          }
        });

        if (!response.ok) {
          throw new Error("Failed to upload image");
        }

        const { url, fields } = await response.json();
        const formData1 = new FormData();

        for (const key in fields) {
          formData1.append(key, fields[key]);
        }

        formData1.append("file", formData.file);

        const uploadResponse = await fetch(url, {
          method: "POST",
          body: formData1,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload image");
        } else {
          dispatch(updateFormData({ file: null, displayPicture: url + fields.key }));
        }
      }

      const response = await SubmitForm(formData);
      dispatch(setUserData(response));
      dispatch(setSuccess(true));
      router.push(backTo || "/home");
    } catch (error: any) {
      dispatch(setError1(error.message));
      toast.error("Error", {
        description: error.message,
      });
    } finally {
      dispatch(setLoading(false));
    }
  };

  return (
    <Wrapper
      auth="Sign up"
      header={
        <div className="flex flex-col gap-2">
          <h1 className="text-center text-2xl font-bold">Sign Up</h1>
          <h2 className="text-center">
            Already have an account?
            <Link className="text-brand transition-all hover:underline" href="/accounts/login">
              {" "}
              Log In
            </Link>
          </h2>
        </div>
      }
      body={
        <form className="space-y-2 p-2" onSubmit={handleSubmit}>
          {(() => {
            switch (currentStep) {
              case 0:
                return <First />;
              case 1:
                return <Second />;
              case 2:
                return <Third />;
              default:
                return null;
            }
          })()}
          <div className="forgot-password">
            <Link
              className="text-xs text-muted-foreground transition-colors hover:text-brand"
              href="/accounts/forgot-password"
            >
              Forgot Password?
            </Link>
          </div>
        </form>
      }
    />
  );
};

export default Comps;
