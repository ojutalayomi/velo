import dynamic from 'next/dynamic';
import { SmilePlus } from 'lucide-react';
import { useTheme } from '@/app/providers/ThemeProvider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Theme } from 'emoji-picker-react';
import { useMediaQuery } from "usehooks-ts";
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from './drawer';

const Picker = dynamic(() => import('emoji-picker-react'), { ssr: false });

interface EmojiPickerProps {
  asChild?: boolean;
  triggerClassName?: string;
  onChange: (emoji: string) => void;
  children?: React.ReactNode;
  noPopover?: boolean;
}

export const EmojiPicker = React.forwardRef<
  React.ElementRef<typeof PopoverTrigger>,
  EmojiPickerProps
>(({ onChange, children, triggerClassName, asChild, noPopover }, ref) => {
  const { theme } = useTheme();
  const isMobile = useMediaQuery("(max-width: 640px)");

  const EPicker = () => {
    return (
      <Picker
        onEmojiClick={(emojiObject) => onChange(emojiObject.emoji)}
        width="100%"
        className='bg-background border-none'
        theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
        skinTonesDisabled
        searchDisabled
        previewConfig={{
          showPreview: false
        }}
      />
    )
  }

  return (
    <>
    {noPopover ? (
      <EPicker />
    ) : isMobile ? (
      <Drawer>
        <DrawerTrigger asChild={asChild} className={cn("cursor-pointer", triggerClassName)} ref={ref}>
          {children || <SmilePlus className="h-4 w-4" />}
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Emoji Picker</DrawerTitle>
          </DrawerHeader>
          <EPicker />
        </DrawerContent>
      </Drawer>
    ) : (
      <Popover>
        <PopoverTrigger asChild={asChild} className={cn("cursor-pointer", triggerClassName)} ref={ref}>
          {children || <SmilePlus className="h-4 w-4" />}
        </PopoverTrigger>
        <PopoverContent 
          className="w-full p-0 border-none" 
          side="top" 
          sideOffset={5}
        >
          <EPicker />
        </PopoverContent>
      </Popover>
    )}
    </>
  );
});

EmojiPicker.displayName = "EmojiPicker";

export default EmojiPicker;