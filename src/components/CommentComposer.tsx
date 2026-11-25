"use client";

import { TextAreaBox } from "@ojutalayomi/react-textarea-enhanced";
import { Send, SmileIcon } from "lucide-react";
import Image from "next/image";
import { useCallback } from "react";

import { useUser } from "@/app/providers/UserProvider";
import { useCommentComposer, UseCommentComposerOptions } from "@/hooks/useCommentComposer";
import { ClientPostSchema } from "@/lib/types/type";
import { cn } from "@/lib/utils";

import { Button } from "./ui/button";
import { EmojiPicker } from "./ui/emoji-picker";

export interface CommentComposerProps extends UseCommentComposerOptions {
  /** The post being replied to. */
  parent: ClientPostSchema | null | undefined;
  /**
   * "card": textarea with a Reply button underneath (sidebars, detail panes).
   * "bar": avatar + pill input with emoji/send icons (pinned footers, drawers).
   */
  variant?: "card" | "bar";
  placeholder?: string;
  className?: string;
  /** Called instead of submitting when the viewer is signed out (e.g. open a sign-in prompt). */
  onRequireSignIn?: () => void;
}

export default function CommentComposer({
  parent,
  variant = "card",
  placeholder,
  className,
  onRequireSignIn,
  ...options
}: CommentComposerProps) {
  const { userdata } = useUser();
  const { text, setText, submit, canSubmit, isSignedIn } = useCommentComposer(parent, options);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key !== "Enter" || e.shiftKey) return;
      e.preventDefault();
      submit();
    },
    [submit]
  );

  const guard = (e: React.SyntheticEvent) => {
    if (isSignedIn) return;
    e.preventDefault();
    onRequireSignIn?.();
  };

  if (variant === "bar") {
    const expanded = text.length > 0;
    return (
      <div className={cn("flex items-center gap-2", className)} onClickCapture={guard}>
        <Image
          src={userdata.displayPicture || "/velo11.png"}
          className={cn("rounded-full object-cover", expanded && "hidden")}
          width={32}
          height={32}
          alt="Your avatar"
        />
        <div
          className={cn(
            "relative flex flex-1 overflow-hidden",
            expanded ? "rounded-xl" : "rounded-full"
          )}
        >
          <TextAreaBox
            className="max-h-28 min-h-[34px] flex-1 resize-none border bg-gray-100 py-2 pl-3 pr-[70px] text-sm outline-none placeholder:text-gray-500 dark:bg-zinc-900 dark:placeholder:text-gray-400"
            value={text}
            onChange={setText}
            onKeyDown={handleKeyDown}
            highlightColor="#ff6257"
            minHeight={20}
            maxHeight={160}
            placeholder={placeholder ?? "Write a comment..."}
            fontFamily="myCustomFont, myCustomFont Fallback"
            textareaClassName="!caret-black dark:!caret-white placeholder:!text-black dark:placeholder:!text-slate-200"
          />
          <div
            className={cn(
              "absolute right-3 flex -translate-y-1/2 items-center gap-4",
              expanded ? "bottom-0" : "top-1/2"
            )}
          >
            <EmojiPicker onChange={(emoji: string) => setText(text + emoji)}>
              <SmileIcon className="size-4 cursor-pointer text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200" />
            </EmojiPicker>
            <button
              type="button"
              aria-label="Send comment"
              disabled={!canSubmit}
              onClick={() => submit()}
              className="text-brand hover:text-brand/80 disabled:opacity-40"
            >
              <Send className="size-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-end gap-2 bg-white p-4 dark:bg-zinc-900 dark:text-white",
        className
      )}
      onClickCapture={guard}
    >
      <TextAreaBox
        charLimit={250}
        minHeight={38}
        maxHeight={300}
        value={text}
        onChange={setText}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? "Send your reply"}
        highlightColor="#ff6257"
        className="max-h-[100px] w-full flex-grow resize-none border-none bg-transparent p-2 text-sm focus:border-b focus:border-brand focus:outline-none dark:text-white"
      />
      <Button
        onClick={() => submit()}
        className="rounded-full bg-brand px-2 py-1 text-sm text-white disabled:opacity-50"
        disabled={!canSubmit}
      >
        Reply
      </Button>
    </div>
  );
}
