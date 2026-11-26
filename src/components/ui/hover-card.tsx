"use client";

import * as React from "react";
import { PreviewCard as PreviewCardPrimitive } from "@base-ui/react/preview-card";

import { withAsChild } from "@/components/ui/as-child";
import { cn } from "@/lib/utils";

const HoverCard = PreviewCardPrimitive.Root;
const HoverCardTrigger = withAsChild(PreviewCardPrimitive.Trigger, "HoverCardTrigger");

type HoverCardContentProps = PreviewCardPrimitive.Popup.Props &
  Pick<PreviewCardPrimitive.Positioner.Props, "side" | "sideOffset" | "align" | "alignOffset">;

const HoverCardContent = React.forwardRef<HTMLDivElement, HoverCardContentProps>(
  ({ className, align = "center", sideOffset = 4, side, alignOffset, ...props }, ref) => (
    <PreviewCardPrimitive.Portal>
      <PreviewCardPrimitive.Positioner
        align={align}
        side={side}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        className="z-50"
      >
        <PreviewCardPrimitive.Popup
          ref={ref}
          className={cn(
            "w-64 origin-(--transform-origin) rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-hidden transition-[opacity,transform] duration-150 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0",
            className
          )}
          {...props}
        />
      </PreviewCardPrimitive.Positioner>
    </PreviewCardPrimitive.Portal>
  )
);
HoverCardContent.displayName = "HoverCardContent";

export { HoverCard, HoverCardTrigger, HoverCardContent };
