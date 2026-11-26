"use client";

import * as React from "react";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";

import { withAsChild } from "@/components/ui/as-child";
import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = withAsChild(TooltipPrimitive.Trigger, "TooltipTrigger");

type TooltipContentProps = TooltipPrimitive.Popup.Props &
  Pick<TooltipPrimitive.Positioner.Props, "side" | "sideOffset" | "align" | "alignOffset">;

const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
  ({ className, side, sideOffset = 6, align, alignOffset, children, ...props }, ref) => (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        className="z-50"
      >
        <TooltipPrimitive.Popup
          ref={ref}
          className={cn(
            "overflow-hidden rounded-md bg-white px-3 py-1.5 text-xs shadow-md dark:bg-zinc-900 transition-[opacity,transform] duration-150 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0",
            className
          )}
          {...props}
        >
          {children}
          <TooltipPrimitive.Arrow className="fill-white dark:fill-zinc-900 data-[side=bottom]:top-[-5px] data-[side=top]:bottom-[-5px] data-[side=top]:rotate-180">
            <svg width="11" height="5" viewBox="0 0 11 5" fill="currentColor" aria-hidden="true">
              <path d="M0 5 5.5 0 11 5z" />
            </svg>
          </TooltipPrimitive.Arrow>
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
);
TooltipContent.displayName = "TooltipContent";

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
