"use client";

import { Theme } from "emoji-picker-react";
import { Smile } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useMediaQuery } from "usehooks-ts";

import { useTheme } from "@/app/providers/ThemeProvider";
import { GifPanel } from "@/components/chat/GifPanel";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MOBILE_QUERY } from "@/components/ui/responsive-dialog";
import { KlipyItem, KlipyKind } from "@/lib/klipy";
import { cn } from "@/lib/utils";

const Picker = dynamic(() => import("emoji-picker-react"), { ssr: false });

type Tab = "emoji" | KlipyKind;

export interface ExpressionPick {
  kind: KlipyKind;
  item: KlipyItem;
  query: string;
  customerId: string;
}

/**
 * Emoji, GIFs and stickers in one picker: a bottom drawer on phones, a popover elsewhere.
 * The GIF and sticker tabs only exist when `onGif` is given (KLIPY is configured).
 */
export function ExpressionPicker({
  userId,
  onEmoji,
  onGif,
  triggerClassName,
  children,
}: {
  userId: string;
  onEmoji: (emoji: string) => void;
  onGif?: (pick: ExpressionPick) => void;
  triggerClassName?: string;
  children?: React.ReactNode;
}) {
  const { theme } = useTheme();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("emoji");

  const tabs: { id: Tab; label: string }[] = [
    { id: "emoji", label: "Emoji" },
    ...(onGif
      ? ([
          { id: "gifs", label: "GIFs" },
          { id: "stickers", label: "Stickers" },
        ] as { id: Tab; label: string }[])
      : []),
  ];
  const active: Tab = tabs.some((t) => t.id === tab) ? tab : "emoji";

  const body = (
    <div className="flex h-[min(70vh,420px)] w-full flex-col gap-2 p-2 sm:w-[350px]">
      {tabs.length > 1 && (
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-zinc-800">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex-1 rounded-md py-1.5 text-sm font-medium transition-colors",
                active === t.id
                  ? "bg-white shadow-sm dark:bg-zinc-700 dark:text-white"
                  : "text-gray-600 dark:text-gray-400"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      <div className="min-h-0 flex-1" data-vaul-no-drag>
        {active === "emoji" ? (
          <Picker
            onEmojiClick={(emojiObject) => onEmoji(emojiObject.emoji)}
            width="100%"
            height="100%"
            className="!bg-transparent !mt-0 border-none"
            theme={theme === "dark" ? Theme.DARK : Theme.LIGHT}
            skinTonesDisabled
            searchDisabled
            previewConfig={{ showPreview: false }}
          />
        ) : (
          <GifPanel
            key={active}
            kind={active}
            userId={userId}
            onSelect={(pick) => {
              onGif?.(pick);
              setOpen(false);
            }}
          />
        )}
      </div>
    </div>
  );

  const trigger = children || <Smile className="h-4 w-4" />;

  return isMobile ? (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger className={cn("cursor-pointer", triggerClassName)}>{trigger}</DrawerTrigger>
      <DrawerContent className="pb-4">
        <DrawerTitle className="sr-only">Emoji, GIFs and stickers</DrawerTitle>
        <DrawerDescription className="sr-only">Pick an emoji, GIF or sticker to send</DrawerDescription>
        {body}
      </DrawerContent>
    </Drawer>
  ) : (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={cn("cursor-pointer", triggerClassName)}>{trigger}</PopoverTrigger>
      <PopoverContent className="w-auto p-0" side="top" sideOffset={5}>
        {body}
      </PopoverContent>
    </Popover>
  );
}
