import dynamic from "next/dynamic";
import { SmilePlus } from "lucide-react";
import { useTheme } from "@/app/providers/ThemeProvider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Theme } from "emoji-picker-react";
import { useMediaQuery } from "usehooks-ts";
import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "./drawer";

const Picker = dynamic(() => import("emoji-picker-react"), { ssr: false });

interface EmojiPickerProps {
  asChild?: boolean;
  triggerClassName?: string;
  onChange: (emoji: string) => void;
  children?: React.ReactNode;
  noPopover?: boolean;
}

export const EmojiPicker = React.forwardRef<
  React.ComponentRef<typeof PopoverTrigger>,
  EmojiPickerProps
>(({ onChange, children, triggerClassName, asChild, noPopover }, ref) => {
  const { theme } = useTheme();
  const isMobile = useMediaQuery("(max-width: 640px)");

  // An element, not an inner component: a component declared during render gets a new
  // identity on every parent re-render, which remounts the picker (the flicker on select).
  const picker = (
    <Picker
      onEmojiClick={(emojiObject) => onChange(emojiObject.emoji)}
      width="100%"
      className="!bg-transparent !mt-0 border-none"
      theme={theme === "dark" ? Theme.DARK : Theme.LIGHT}
      skinTonesDisabled
      searchDisabled
      previewConfig={{
        showPreview: false,
      }}
    />
  );

  return (
    <>
      {noPopover ? (
        picker
      ) : isMobile ? (
        <Drawer>
          <DrawerTrigger
            asChild={asChild}
            className={cn("cursor-pointer", triggerClassName)}
            ref={ref}
          >
            {children || <SmilePlus className="h-4 w-4" />}
          </DrawerTrigger>
          <DrawerContent>
            {picker}
          </DrawerContent>
        </Drawer>
      ) : (
        <Popover>
          <PopoverTrigger
            asChild={asChild}
            className={cn("cursor-pointer", triggerClassName)}
            ref={ref}
          >
            {children || <SmilePlus className="h-4 w-4" />}
          </PopoverTrigger>
          <PopoverContent className="w-full p-0 border-none" side="top" sideOffset={5}>
            {picker}
          </PopoverContent>
        </Popover>
      )}
    </>
  );
});

EmojiPicker.displayName = "EmojiPicker";

export default EmojiPicker;
