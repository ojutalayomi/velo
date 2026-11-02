"use client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Camera, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";

import { FormData } from "./FormProps";
import "../fontAwesomeLibrary";
import { useAppDispatch } from "../../redux/hooks";
import {
  setError,
  setErrors,
  handlePrevious,
  updateFormData,
} from "../../redux/signupSlice";
import { RootState } from "../../redux/store";
import { Button } from "../ui/button";
import { Input } from "../ui/input";


const Third: React.FC = () => {
  const [preview, setPreview] = useState<string | null>(null);
  const [isEye, setIsEye] = useState(true);
  const dispatch = useAppDispatch();
  const { loading, formData, error, errors } = useSelector(
    (state: RootState) => state.signups
  );

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const isValidPassword = (password: string) => {
    const re = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[.,/#!$%^&*;:{}=_-`~()]).{6,20}$/;
    return re.test(password);
  };

  const onInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (name === "password" && value.length > 0) {
      newErrors.password = !isValidPassword(value)
        ? "6–20 chars, including uppercase, lowercase, number & special character."
        : "";
      dispatch(setError(!!newErrors.password));
    }
    dispatch(setErrors(newErrors));
  };

  const onPrevious = () => dispatch(handlePrevious(1));

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    dispatch(updateFormData({ [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      dispatch(updateFormData({ file }));
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleRemovePhoto = (e: React.MouseEvent) => {
    e.preventDefault();
    setPreview(null);
    dispatch(updateFormData({ file: null }));
  };

  return (
    <div className="space-y-5">
      {/* ── Profile photo uploader ── */}
      <div className="flex flex-col items-center gap-3">
        <Input
          id="file"
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept="image/png, image/jpeg"
        />

        {/* Avatar circle */}
        <div className="relative">
          <label
            htmlFor="file"
            className="group relative flex size-28 cursor-pointer items-center justify-center"
            aria-label="Upload profile photo"
          >
            <div
              className="size-full overflow-hidden rounded-full border-2 border-dashed border-border
                         bg-muted transition-colors duration-200
                         group-hover:border-brand"
            >
              {preview ? (
                <img
                  src={preview}
                  alt="Profile preview"
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full flex-col items-center justify-center gap-1.5">
                  <Camera className="size-7 text-muted-foreground transition-colors duration-200 group-hover:text-brand" />
                  <span className="px-2 text-center text-[10px] font-medium leading-tight text-muted-foreground">
                    Add photo
                  </span>
                </div>
              )}
            </div>

            {/* Hover overlay when image is loaded */}
            {preview && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <Camera className="size-6 text-white drop-shadow" />
              </div>
            )}
          </label>

          {/* Remove button */}
          {preview && (
            <button
              type="button"
              onClick={handleRemovePhoto}
              aria-label="Remove photo"
              className="absolute -right-0.5 -top-0.5 flex size-6 items-center justify-center
                         rounded-full bg-destructive text-destructive-foreground shadow-md
                         transition-colors hover:bg-destructive/80"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Caption */}
        <div className="flex flex-col items-center gap-0.5 text-center">
          <p className="text-sm font-medium">Profile photo</p>
          <p className="text-xs text-muted-foreground">PNG or JPG · optional · max 10 MB</p>
        </div>
      </div>

      {/* ── Password ── */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="password">
          Password
        </label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={isEye ? "password" : "text"}
            onInput={onInput}
            placeholder="Password"
            value={formData.password}
            onChange={onInputChange}
            required
          />
          <FontAwesomeIcon
            onClick={() => setIsEye(!isEye)}
            icon={isEye ? "eye-slash" : "eye"}
            className="icon-eye absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
          />
        </div>
        {errors.password && (
          <p className="text-xs leading-snug text-destructive">{errors.password}</p>
        )}
      </div>

      {/* ── Actions ── */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="bg-brand w-1/2"
          onClick={onPrevious}
        >
          Previous
        </Button>
        <Button
          className="h-10 w-1/2 bg-brand font-semibold text-white shadow-sm
                     transition-all hover:bg-brand/90 active:scale-[0.98]
                     disabled:cursor-not-allowed"
          disabled={!formData.password || error || loading}
        >
          {loading ? <div className="loader show" /> : <span>Submit</span>}
        </Button>
      </div>
    </div>
  );
};

export default Third;
