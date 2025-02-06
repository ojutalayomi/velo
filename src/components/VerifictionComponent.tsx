import { cn } from "@/lib/utils";
import { cva, VariantProps } from "class-variance-authority";
import { ComponentPropsWithoutRef, forwardRef } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { BadgeCheck, BadgeInfo, BadgeX } from "lucide-react";

const Variants = cva(
  "",
  {
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
  }
)

const Icons = {
    "not-verified": BadgeInfo,
    warning: BadgeX,
    verified: BadgeCheck,
}

export const Statuser = 
forwardRef<SVGSVGElement, 
ComponentPropsWithoutRef<"svg"> & 
VariantProps<typeof Variants>>
(({ variant = "verified", ...props }, ref) => {
    const Icon = Icons[variant as keyof typeof Icons];
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger>
                    <Icon size={16} ref={ref} className={cn(Variants({ variant }), props.className)} {...props}/>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Account verification status: {variant?.toUpperCase()}</p>
                    <p className="text-xs text-gray-600">Verification done by © 2024 VELO</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
})

Statuser.displayName = "Statuser";