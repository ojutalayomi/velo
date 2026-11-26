"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import * as React from "react";

import { withAsChild } from "@/components/ui/as-child";
import { cn } from "@/lib/utils";

/**
 * A full-screen surface for viewing and composing media. Unlike `Dialog` it isn't a centred card:
 * it covers the whole viewport (dynamic height, so phone browser bars don't clip it), slides up on
 * open, and leaves the device's safe areas (notch, home indicator) to its children, which can use
 * `pt-safe` / `pb-safe` below. Focus trapping, Escape and screen-reader roles still come from Base UI.
 */
const FullscreenSheet = DialogPrimitive.Root;
const FullscreenSheetClose = withAsChild(DialogPrimitive.Close, "FullscreenSheetClose");
const FullscreenSheetTrigger = withAsChild(DialogPrimitive.Trigger, "FullscreenSheetTrigger");
const FullscreenSheetTitle = DialogPrimitive.Title;
const FullscreenSheetDescription = DialogPrimitive.Description;

const FullscreenSheetContent = React.forwardRef<HTMLDivElement, DialogPrimitive.Popup.Props>(
  ({ className, children, ...props }, ref) => (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Popup
        ref={ref}
        className={cn(
          "fixed inset-0 z-50 flex h-dvh w-screen flex-col overflow-hidden bg-zinc-950 text-white outline-hidden",
          "data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom-6",
          "data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-bottom-6",
          "duration-200",
          className
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  )
);
FullscreenSheetContent.displayName = "FullscreenSheetContent";

/** Round icon button used in the top bars of full-screen sheets. */
const SheetIconButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, type = "button", ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    className={cn(
      "flex size-11 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-white/70 active:bg-white/25 disabled:opacity-40",
      className
    )}
    {...props}
  />
));
SheetIconButton.displayName = "SheetIconButton";

export {
  FullscreenSheet,
  FullscreenSheetClose,
  FullscreenSheetContent,
  FullscreenSheetDescription,
  FullscreenSheetTitle,
  FullscreenSheetTrigger,
  SheetIconButton,
};
