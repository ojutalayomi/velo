import dynamic from 'next/dynamic';
import { Smile } from 'lucide-react';
import { useTheme } from '@/app/providers/ThemeProvider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Theme } from 'emoji-picker-react';
import React from 'react';
import { cn } from '@/lib/utils';

const Picker = dynamic(() => import('emoji-picker-react'), { ssr: false });

interface EmojiPickerProps {
  asChild?: boolean;
  triggerClassName?: string;
  onChange: (emoji: string) => void;
  children?: React.ReactNode;
}

export const EmojiPicker = React.forwardRef<
  React.ElementRef<typeof PopoverTrigger>,
  EmojiPickerProps
>(({ onChange, children, triggerClassName, asChild }, ref) => {
  const { theme } = useTheme();
  
  return (
    <Popover>
      <PopoverTrigger asChild={asChild} className={cn("cursor-pointer", triggerClassName)} ref={ref}>
        {children || <Smile className="h-4 w-4" />}
      </PopoverTrigger>
      <PopoverContent 
        className="w-full p-0 border-none" 
        side="top" 
        sideOffset={5}
      >
        <Picker
          onEmojiClick={(emojiObject) => onChange(emojiObject.emoji)}
          width="100%"
          theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
          skinTonesDisabled
          searchDisabled
          previewConfig={{
            showPreview: false
          }}
        />
      </PopoverContent>
    </Popover>
  );
});

EmojiPicker.displayName = "EmojiPicker";

export default EmojiPicker;