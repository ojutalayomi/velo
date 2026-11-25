"use client";

import { X } from "lucide-react";
import * as React from "react";
import { useMediaQuery } from "usehooks-ts";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FullscreenSheet,
  FullscreenSheetClose,
  FullscreenSheetContent,
  FullscreenSheetDescription,
  FullscreenSheetTitle,
  SheetIconButton,
} from "@/components/ui/fullscreen-sheet";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

/** The same breakpoint the emoji picker uses for its drawer. */
export const MOBILE_QUERY = "(max-width: 640px)";

type Mode = "dialog" | "drawer" | "sheet";
const ModeContext = React.createContext<Mode>("dialog");

/**
 * A dialog on larger screens. On phones it becomes a bottom drawer, or, for content that needs the
 * whole screen (a photo preview with a caption, say), a full-screen sheet: `mobile="fullscreen"`.
 */
export function ResponsiveDialog({
  open,
  onOpenChange,
  mobile = "drawer",
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mobile?: "drawer" | "fullscreen";
  children: React.ReactNode;
}) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const mode: Mode = !isMobile ? "dialog" : mobile === "fullscreen" ? "sheet" : "drawer";
  const Root = mode === "dialog" ? Dialog : mode === "sheet" ? FullscreenSheet : Drawer;
  return (
    <ModeContext.Provider value={mode}>
      <Root open={open} onOpenChange={onOpenChange}>
        {children}
      </Root>
    </ModeContext.Provider>
  );
}
ResponsiveDialog.displayName = "ResponsiveDialog";

export function ResponsiveDialogContent({
  className,
  onClick,
  children,
}: {
  className?: string;
  /** For dialogs opened from inside a clickable card: stop a click here from reaching the card. */
  onClick?: React.MouseEventHandler<HTMLElement>;
  children: React.ReactNode;
}) {
  const mode = React.useContext(ModeContext);
  if (mode === "sheet") {
    return (
      // Forms and previews follow the app's light/dark theme, unlike the always-dark media viewer.
      <FullscreenSheetContent className="bg-background text-foreground" onClick={onClick}>
        <div className="flex items-center justify-end px-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <FullscreenSheetClose asChild>
            <SheetIconButton aria-label="Close" className="text-foreground hover:bg-foreground/10 active:bg-foreground/15">
              <X size={22} />
            </SheetIconButton>
          </FullscreenSheetClose>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </FullscreenSheetContent>
    );
  }
  // The dialog's width classes do not apply to a full-width drawer, so only the dialog gets them.
  return mode === "drawer" ? (
    <DrawerContent className="max-h-[90vh]" onClick={onClick}>
      <div
        className="flex min-h-0 flex-col gap-4 overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        data-vaul-no-drag
      >
        {children}
      </div>
    </DrawerContent>
  ) : (
    <DialogContent className={className} onClick={onClick}>
      {children}
    </DialogContent>
  );
}
ResponsiveDialogContent.displayName = "ResponsiveDialogContent";

export function ResponsiveDialogHeader({ children }: { children: React.ReactNode }) {
  const mode = React.useContext(ModeContext);
  if (mode === "sheet") return <div className="flex flex-col gap-1.5">{children}</div>;
  return mode === "drawer" ? <DrawerHeader className="px-0">{children}</DrawerHeader> : <DialogHeader>{children}</DialogHeader>;
}
ResponsiveDialogHeader.displayName = "ResponsiveDialogHeader";

export function ResponsiveDialogFooter({ children }: { children: React.ReactNode }) {
  const mode = React.useContext(ModeContext);
  return mode === "dialog" ? (
    <DialogFooter>{children}</DialogFooter>
  ) : (
    <div className="flex flex-col-reverse gap-2">{children}</div>
  );
}
ResponsiveDialogFooter.displayName = "ResponsiveDialogFooter";

export function ResponsiveDialogTitle({ children }: { children: React.ReactNode }) {
  const mode = React.useContext(ModeContext);
  if (mode === "sheet") return <FullscreenSheetTitle className="text-lg font-semibold">{children}</FullscreenSheetTitle>;
  return mode === "drawer" ? <DrawerTitle>{children}</DrawerTitle> : <DialogTitle>{children}</DialogTitle>;
}
ResponsiveDialogTitle.displayName = "ResponsiveDialogTitle";

export function ResponsiveDialogDescription({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const mode = React.useContext(ModeContext);
  if (mode === "sheet") {
    return (
      <FullscreenSheetDescription className={className ?? "text-sm text-muted-foreground"}>
        {children}
      </FullscreenSheetDescription>
    );
  }
  return mode === "drawer" ? (
    <DrawerDescription className={className}>{children}</DrawerDescription>
  ) : (
    <DialogDescription className={className}>{children}</DialogDescription>
  );
}
ResponsiveDialogDescription.displayName = "ResponsiveDialogDescription";
