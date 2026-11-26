import * as React from "react";

import { toast as manager } from "@/components/ui/toast";

type ToastType = "success" | "error" | "warning" | "info";

export interface ToastOptions {
  description?: React.ReactNode;
  /** Milliseconds before the toast closes on its own. */
  duration?: number;
  action?: { label: string; onClick: () => void };
}

function show(type: ToastType | undefined, title: React.ReactNode, options: ToastOptions = {}) {
  const { description, duration, action } = options;
  return manager.add({
    type,
    title,
    description,
    timeout: duration,
    actionProps: action ? { children: action.label, onClick: action.onClick } : undefined,
  });
}

/**
 * The app's one toast API. Call it as `toast("Saved")` or `toast.error("Failed", { description })`.
 * It sits on top of shadcn's Base UI toast manager and returns the toast's id, which `toast.dismiss`
 * accepts. Swapping the underlying library only touches this file.
 */
export const toast = Object.assign(
  (title: React.ReactNode, options?: ToastOptions) => show(undefined, title, options),
  {
    success: (title: React.ReactNode, options?: ToastOptions) => show("success", title, options),
    error: (title: React.ReactNode, options?: ToastOptions) => show("error", title, options),
    warning: (title: React.ReactNode, options?: ToastOptions) => show("warning", title, options),
    info: (title: React.ReactNode, options?: ToastOptions) => show("info", title, options),
    dismiss: (id?: string) => manager.close(id),
  }
);
