import dynamic from 'next/dynamic';
import { Smile } from 'lucide-react';
import { useTheme } from '@/app/providers/ThemeProvider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Theme } from 'emoji-picker-react';

const Picker = dynamic(() => import('emoji-picker-react'), { ssr: false });

interface EmojiPickerProps {
  onChange: (emoji: string) => void;
  children?: React.ReactNode;
}

export function EmojiPicker({ onChange, children }: EmojiPickerProps) {
  const { theme } = useTheme();
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        {children || <Smile className="h-4 w-4 cursor-pointer" />}
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
} 