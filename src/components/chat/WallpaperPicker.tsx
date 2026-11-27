"use client";
import { Check, ImageUp, Loader2 } from "lucide-react";
import React, { useRef, useState } from "react";
import { useSelector, useStore } from "react-redux";

import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import {
  WALLPAPER_PRESETS,
  parseWallpaper,
  presetValue,
  wallpaperFileError,
  wallpaperStyle,
} from "@/lib/chatWallpaper";
import { saveChatSettings } from "@/lib/chatSettingsApi";
import { toast } from "@/lib/toast";
import { uploadWallpaper } from "@/lib/wallpaperUpload";
import { patchChatSettings } from "@/redux/chatSlice";
import { useAppDispatch } from "@/redux/hooks";
import type { RootState } from "@/redux/store";
import { cn } from "@/lib/utils";

/** Pick a background for one chat. It only changes this person's view of the chat. */
export default function WallpaperPicker({
  chatId,
  open,
  onOpenChange,
}: {
  chatId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();
  const current = useSelector((state: RootState) => state.chat.settings?.[chatId]?.wallpaper ?? "");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const parsed = parseWallpaper(current);

  const choose = async (value: string) => {
    if (value === current) return;
    const previous = store.getState().chat.settings?.[chatId];
    const error = await saveChatSettings({
      dispatch,
      patch: patchChatSettings,
      chatId,
      previous: { wallpaper: previous?.wallpaper ?? "" },
      updates: { wallpaper: value },
    });
    if (error) toast.error(error);
  };

  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const problem = wallpaperFileError(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    setUploading(true);
    try {
      await choose(await uploadWallpaper(file));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't upload that image. Try again.");
    } finally {
      setUploading(false);
    }
  };

  const tile = "relative aspect-3/4 overflow-hidden rounded-xl border-2 transition-transform active:scale-95";
  const ring = (on: boolean) => (on ? "border-brand" : "border-gray-200 dark:border-zinc-700");

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Wallpaper</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            The background of this chat. Only you see it.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="grid grid-cols-4 gap-2 px-4 pb-2 sm:px-0" role="radiogroup" aria-label="Wallpaper">
          <button
            type="button"
            role="radio"
            aria-checked={parsed.kind === "none"}
            aria-label="Wallpaper: Default"
            onClick={() => void choose("")}
            className={cn(tile, ring(parsed.kind === "none"), "bg-white dark:bg-zinc-900")}
          >
            <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-500">
              Default
            </span>
            {parsed.kind === "none" && <Selected />}
          </button>

          {WALLPAPER_PRESETS.map((preset) => {
            const on = parsed.kind === "preset" && parsed.preset.id === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={`Wallpaper: ${preset.label}`}
                onClick={() => void choose(presetValue(preset.id))}
                className={cn(tile, ring(on))}
                style={{ background: preset.background }}
              >
                {on && <Selected />}
              </button>
            );
          })}

          {parsed.kind === "image" && (
            <button
              type="button"
              role="radio"
              aria-checked
              aria-label="Wallpaper: Your photo"
              className={cn(tile, ring(true))}
              style={wallpaperStyle(current)}
            >
              <Selected />
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2 px-4 pb-4 sm:px-0">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            aria-label="Choose a wallpaper photo"
            onChange={onFile}
          />
          <Button variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImageUp className="size-4" />}
            {uploading ? "Uploading…" : parsed.kind === "image" ? "Choose another photo" : "Use your own photo"}
          </Button>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

function Selected() {
  return (
    <span className="absolute bottom-1 right-1 flex size-5 items-center justify-center rounded-full bg-brand text-white">
      <Check className="size-3.5" />
    </span>
  );
}
