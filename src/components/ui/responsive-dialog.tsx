"use client";

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
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

/** The same breakpoint the emoji picker uses for its drawer. */
export const MOBILE_QUERY = "(max-width: 640px)";

const ModeContext = React.createContext(false);

/** A dialog on larger screens and a bottom drawer on phones. */
export function ResponsiveDialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const Root = isMobile ? Drawer : Dialog;
  return (
    <ModeContext.Provider value={isMobile}>
      <Root open={open} onOpenChange={onOpenChange}>
        {children}
      </Root>
    </ModeContext.Provider>
  );
}

export function ResponsiveDialogContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const isMobile = React.useContext(ModeContext);
  // The dialog's width classes do not apply to a full-width drawer, so only the dialog gets them.
  return isMobile ? (
    <DrawerContent className="max-h-[90vh]">
      <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-4 pb-6" data-vaul-no-drag>
        {children}
      </div>
    </DrawerContent>
  ) : (
    <DialogContent className={className}>{children}</DialogContent>
  );
}

export function ResponsiveDialogHeader({ children }: { children: React.ReactNode }) {
  const isMobile = React.useContext(ModeContext);
  return isMobile ? <DrawerHeader className="px-0">{children}</DrawerHeader> : <DialogHeader>{children}</DialogHeader>;
}

export function ResponsiveDialogFooter({ children }: { children: React.ReactNode }) {
  const isMobile = React.useContext(ModeContext);
  return isMobile ? (
    <div className="flex flex-col-reverse gap-2">{children}</div>
  ) : (
    <DialogFooter>{children}</DialogFooter>
  );
}

export function ResponsiveDialogTitle({ children }: { children: React.ReactNode }) {
  const isMobile = React.useContext(ModeContext);
  return isMobile ? <DrawerTitle>{children}</DrawerTitle> : <DialogTitle>{children}</DialogTitle>;
}

export function ResponsiveDialogDescription({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const isMobile = React.useContext(ModeContext);
  return isMobile ? (
    <DrawerDescription className={className}>{children}</DrawerDescription>
  ) : (
    <DialogDescription className={className}>{children}</DialogDescription>
  );
}
