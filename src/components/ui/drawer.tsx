"use client";

import * as React from "react";
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";

import { withAsChild } from "@/components/ui/as-child";
import { cn } from "@/lib/utils";

/** A bottom sheet that can be swiped down to dismiss. */
const Drawer = DrawerPrimitive.Root;
const DrawerTrigger = withAsChild(DrawerPrimitive.Trigger, "DrawerTrigger");
const DrawerPortal = DrawerPrimitive.Portal;
const DrawerClose = withAsChild(DrawerPrimitive.Close, "DrawerClose");

const DrawerOverlay = React.forwardRef<HTMLDivElement, DrawerPrimitive.Backdrop.Props>(
  ({ className, ...props }, ref) => (
    <DrawerPrimitive.Backdrop
      ref={ref}
      className={cn(
        "fixed inset-0 z-50 min-h-dvh bg-black/80 opacity-[calc(1-var(--drawer-swipe-progress,0))] transition-opacity duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] data-swiping:duration-0 data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-[calc(var(--drawer-swipe-strength,1)*400ms)]",
        className
      )}
      {...props}
    />
  )
);
DrawerOverlay.displayName = "DrawerOverlay";

const DrawerContent = React.forwardRef<HTMLDivElement, DrawerPrimitive.Popup.Props>(
  ({ className, children, ...props }, ref) => (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Viewport className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center">
        <DrawerPrimitive.Popup
          ref={ref}
          className={cn(
            "pointer-events-auto mt-24 flex h-auto max-h-[calc(100dvh-1.5rem)] w-full flex-col rounded-t-[10px] border bg-background outline-hidden will-change-transform transform-[translateY(var(--drawer-swipe-movement-y,0px))] transition-transform duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] data-swiping:select-none data-swiping:duration-0 data-starting-style:transform-[translateY(100%)] data-ending-style:transform-[translateY(100%)] data-ending-style:duration-[calc(var(--drawer-swipe-strength,1)*400ms)]",
            className
          )}
          {...props}
        >
          <div className="mx-auto mt-4 h-2 w-[100px] shrink-0 rounded-full bg-muted" />
          <DrawerPrimitive.Content className="flex min-h-0 flex-1 flex-col">
            {children}
          </DrawerPrimitive.Content>
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPortal>
  )
);
DrawerContent.displayName = "DrawerContent";

const DrawerHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("grid gap-1.5 p-4 text-center sm:text-left", className)} {...props} />
);
DrawerHeader.displayName = "DrawerHeader";

const DrawerFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mt-auto flex flex-col gap-2 p-4", className)} {...props} />
);
DrawerFooter.displayName = "DrawerFooter";

const DrawerTitle = React.forwardRef<HTMLHeadingElement, DrawerPrimitive.Title.Props>(
  ({ className, ...props }, ref) => (
    <DrawerPrimitive.Title
      ref={ref}
      className={cn("text-lg font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  )
);
DrawerTitle.displayName = "DrawerTitle";

const DrawerDescription = React.forwardRef<HTMLParagraphElement, DrawerPrimitive.Description.Props>(
  ({ className, ...props }, ref) => (
    <DrawerPrimitive.Description
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
);
DrawerDescription.displayName = "DrawerDescription";

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};
