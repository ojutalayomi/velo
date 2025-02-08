import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { ComponentPropsWithoutRef, forwardRef } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { BadgeCheck, BadgeInfo, BadgeX } from "lucide-react";

// Define variants using CVA
const Variants = cva("", {
  variants: {
    variant: {
      "not-verified": "border bg-background text-foreground",
      warning: "group text-destructive-foreground",
      verified: "group text-brand",
    },
  },
  defaultVariants: {
    variant: "verified",
  },
});

// Map variants to icons
const Icons = {
  "not-verified": BadgeInfo,
  warning: BadgeX,
  verified: BadgeCheck,
} as const;

// Define props type
type StatuserProps = ComponentPropsWithoutRef<"svg"> &
  VariantProps<typeof Variants> & {
    tooltipContent?: {
      status?: string;
      footer?: string;
    };
  };

export const Statuser = forwardRef<SVGSVGElement, StatuserProps>(
  ({ variant = "verified", tooltipContent, ...props }, ref) => {
    // Get the appropriate icon based on the variant
    const Icon = Icons[variant!] || Icons.verified;

    // Default tooltip content
    const defaultTooltipContent = {
      status: `Account verification status: ${variant?.toUpperCase()}`,
      footer: "Verification done by © 2024 VELO",
    };

    const { status, footer } = tooltipContent || defaultTooltipContent;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger aria-label={`Verification status: ${variant}`} asChild>
            <Icon
              size={16}
              ref={ref}
              className={cn(Variants({ variant }), props.className)}
              {...props}
            />
          </TooltipTrigger>
          <TooltipContent>
            <p>{status}</p>
            <p className="text-xs text-gray-600">{footer}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
);

Statuser.displayName = "Statuser";