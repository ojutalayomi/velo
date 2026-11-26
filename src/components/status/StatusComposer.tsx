/* eslint-disable @next/next/no-img-element */
"use client";

import { ImagePlus, Loader2, Mic, Plus, Send, Type, X } from "lucide-react";
import React, { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@/lib/toast";

import { VoiceRecorderBar } from "@/components/chat/VoiceRecorderBar";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Textarea } from "@/components/ui/textarea";
import { VoiceNotePlayer } from "@/components/VoiceNotePlayer";
import { MAX_VOICE_SECONDS, useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { createStatus } from "@/lib/statusApi";
import {
  DEFAULT_STATUS_BACKGROUND,
  MAX_STATUS_TEXT,
  STATUS_BACKGROUNDS,
  statusBackground,
  type StatusBackgroundId,
} from "@/lib/statusBackgrounds";
import { BUCKETNAME, S3UploadBody, s3ObjectUrl } from "@/lib/types/s3";
import type { StatusCreateItem } from "@/lib/types/status";
import { cn } from "@/lib/utils";
import { formatClock, voiceNoteSeconds } from "@/lib/voiceNote";
import { useAppDispatch } from "@/redux/hooks";
import { upsertStatusGroup } from "@/redux/statusSlice";

export const MAX_STATUS_FILES = 10;
export const MAX_STATUS_FILE_SIZE = 10 * 1024 * 1024;

type Tab = "media" | "text" | "voice";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "media", label: "Photo / video", icon: ImagePlus },
  { id: "text", label: "Text", icon: Type },
  { id: "voice", label: "Voice", icon: Mic },
];

const previewCache = new Map<File, string>();
function getPreviewUrl(file: File) {
  let url = previewCache.get(file);
  if (!url) {
    url = URL.createObjectURL(file);
    previewCache.set(file, url);
  }
  return url;
}

/** Sends one file to S3 and returns where it ended up. */
async function uploadStatusFile(file: File): Promise<StatusCreateItem> {
  const presign = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: S3UploadBody({
      filename: file.name,
      contentType: file.type,
      bucketName: BUCKETNAME.ARTICLE,
    }),
  });
  if (!presign.ok) throw new Error(`Failed to prepare ${file.name}`);
  const { url, fields } = await presign.json();
  const formData = new FormData();
  Object.keys(fields).forEach((key) => formData.append(key, fields[key]));
  formData.append("file", file);
  const upload = await fetch(url, { method: "POST", body: formData });
  if (!upload.ok) throw new Error(`Failed to upload ${file.name}`);
  return {
    mediaUrl: s3ObjectUrl(url, fields.key),
    mediaKey: fields.key as string,
    mediaType: file.type.startsWith("video/")
      ? "video"
      : file.type.startsWith("audio/")
        ? "audio"
        : "image",
  };
}

export const StatusComposer = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const dispatch = useAppDispatch();
  const inputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>("media");
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState("");
  const [text, setText] = useState("");
  const [background, setBackground] = useState<StatusBackgroundId>(DEFAULT_STATUS_BACKGROUND);
  const voice = useVoiceRecorder();
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  // URLs are cached per File and revoked only when the file is removed or the composer
  // unmounts for good (revoking in a useMemo cleanup breaks under StrictMode).
  const previewItems = useMemo(
    () => files.map((file) => ({ file, url: getPreviewUrl(file) })),
    [files]
  );

  useEffect(() => {
    const live = new Set(files);
    previewCache.forEach((url, file) => {
      if (!live.has(file)) {
        URL.revokeObjectURL(url);
        previewCache.delete(file);
      }
    });
  }, [files]);

  const finishVoice = async () => {
    const file = await voice.stop();
    if (!file) return;
    setVoiceFile(file);
    setVoiceUrl(URL.createObjectURL(file));
  };

  // A recording that reaches the limit stops by itself.
  useEffect(() => {
    if (voice.recording && voice.seconds >= MAX_VOICE_SECONDS) void Promise.resolve().then(finishVoice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.recording, voice.seconds]);

  useEffect(() => {
    return () => {
      if (voiceUrl) URL.revokeObjectURL(voiceUrl);
    };
  }, [voiceUrl]);

  const startVoice = async () => {
    const error = await voice.start();
    if (error) toast.error(error, { duration: 8000 });
  };

  const discardVoice = () => {
    setVoiceFile(null);
    setVoiceUrl(null);
  };

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!selected.length) return;

    const nextFiles = [...files];
    const remainingSlots = MAX_STATUS_FILES - nextFiles.length;
    if (remainingSlots <= 0) {
      toast.error(`You can share up to ${MAX_STATUS_FILES} status items at once`);
      return;
    }

    const accepted = selected.slice(0, remainingSlots).filter((item) => {
      if (!item.type.startsWith("image/") && !item.type.startsWith("video/")) {
        toast.error(`${item.name} is not an image or video`);
        return false;
      }
      if (item.size > MAX_STATUS_FILE_SIZE) {
        toast.error(`${item.name} must be 10MB or less`);
        return false;
      }
      return true;
    });

    if (selected.length > remainingSlots) {
      toast.warning(
        `Only ${remainingSlots} more status item${remainingSlots === 1 ? "" : "s"} can be added`
      );
    }

    if (accepted.length) setFiles([...nextFiles, ...accepted]);
  };

  const removeFile = (index: number) => {
    setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const resetComposer = () => {
    setFiles([]);
    setCaption("");
    setText("");
    setBackground(DEFAULT_STATUS_BACKGROUND);
    setTab("media");
    if (voice.recording) voice.cancel();
    discardVoice();
  };

  const canShare =
    !posting &&
    (tab === "media"
      ? files.length > 0
      : tab === "text"
        ? text.trim().length > 0
        : voiceFile !== null);

  const submit = async () => {
    if (!canShare) return;
    setPosting(true);
    try {
      let created;
      let summary = "Status added";
      if (tab === "text") {
        created = await createStatus({ mediaType: "text", text: text.trim(), background });
      } else if (tab === "voice" && voiceFile) {
        const uploaded = await uploadStatusFile(voiceFile);
        created = await createStatus({
          ...uploaded,
          durationSec: voiceNoteSeconds(voiceFile.name) || Math.max(1, voice.seconds),
          caption,
        });
      } else {
        // Upload everything first; the status is created in one request only if all uploads worked.
        const items = await Promise.all(files.map(uploadStatusFile));
        created = await createStatus({ ...items[0], items, caption });
        summary = `Status added (${items.length} item${items.length === 1 ? "" : "s"})`;
      }
      const [group] = created;
      if (group) dispatch(upsertStatusGroup(group));
      resetComposer();
      onOpenChange(false);
      toast.success(summary);
    } catch (error) {
      toast.error((error as Error).message || "Could not post your status");
    } finally {
      setPosting(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !posting) resetComposer();
    onOpenChange(nextOpen);
  };

  const bg = statusBackground(background);

  return (
    <ResponsiveDialog open={open} onOpenChange={handleOpenChange} mobile="fullscreen">
      <ResponsiveDialogContent className="max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Add status</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Share with your followers for 24 hours. Use @username to mention someone.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div role="tablist" aria-label="Status type" className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              disabled={posting}
              onClick={() => setTab(id)}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium transition-colors",
                tab === id
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>

        {tab === "media" && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleFile}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex min-h-56 items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-muted/40"
            >
              {previewItems[0] ? (
                previewItems[0].file.type.startsWith("video/") ? (
                  <video
                    src={previewItems[0].url}
                    className="max-h-80 w-full object-contain mb:max-h-[45dvh]"
                    controls
                  />
                ) : (
                  <img
                    src={previewItems[0].url}
                    alt=""
                    className="max-h-80 w-full object-contain mb:max-h-[45dvh]"
                  />
                )
              ) : (
                <span className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                  <ImagePlus className="size-8" />
                  Select up to {MAX_STATUS_FILES} photos or videos
                </span>
              )}
            </button>
            {previewItems.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {previewItems.map((item, index) => (
                  <div
                    key={`${item.file.name}-${item.file.lastModified}-${index}`}
                    className="relative size-16 shrink-0 overflow-hidden rounded-md border border-border"
                  >
                    {item.file.type.startsWith("video/") ? (
                      <video src={item.url} className="size-full object-cover" muted />
                    ) : (
                      <img src={item.url} alt="" className="size-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute right-1 top-1 rounded-full bg-black/70 p-0.5 text-white"
                      aria-label={`Remove ${item.file.name}`}
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
                {files.length < MAX_STATUS_FILES && (
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="flex size-16 shrink-0 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground"
                    aria-label="Add more media"
                  >
                    <Plus className="size-5" />
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {tab === "text" && (
          <>
            <div
              className="relative flex h-72 items-center justify-center overflow-hidden rounded-xl p-5 mb:h-[45dvh]"
              style={{ background: bg.css }}
            >
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                maxLength={MAX_STATUS_TEXT}
                aria-label="Status text"
                placeholder="Type a status"
                className={cn(
                  "size-full resize-none bg-transparent text-center font-bold outline-hidden placeholder:opacity-60",
                  "dark" in bg && bg.dark
                    ? "text-zinc-900 placeholder:text-zinc-900"
                    : "text-white placeholder:text-white",
                  text.length > 200 ? "text-lg" : text.length > 90 ? "text-2xl" : "text-3xl"
                )}
                style={{ paddingTop: "18%" }}
              />
              <span className="absolute bottom-2 right-3 text-xs text-white/80 mix-blend-difference">
                {text.length}/{MAX_STATUS_TEXT}
              </span>
            </div>
            <div role="radiogroup" aria-label="Background" className="flex gap-2 overflow-x-auto py-1">
              {STATUS_BACKGROUNDS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={background === item.id}
                  aria-label={item.label}
                  onClick={() => setBackground(item.id)}
                  className={cn(
                    "size-9 shrink-0 rounded-full border-2 border-transparent ring-offset-2 ring-offset-background transition",
                    background === item.id && "ring-2 ring-brand"
                  )}
                  style={{ background: item.css }}
                />
              ))}
            </div>
          </>
        )}

        {tab === "voice" && (
          <div className="flex min-h-56 flex-col items-center justify-center gap-4 rounded-md border border-dashed border-border bg-muted/40 p-4">
            {voiceFile && voiceUrl ? (
              <>
                <VoiceNotePlayer
                  url={voiceUrl}
                  name={voiceFile.name}
                  className="w-full max-w-sm"
                />
                <Button variant="outline" size="sm" onClick={discardVoice} disabled={posting}>
                  Record again
                </Button>
              </>
            ) : voice.recording || voice.processing ? (
              <div className="w-full max-w-sm">
                <VoiceRecorderBar voice={voice} onSend={finishVoice} />
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={startVoice}
                  aria-label="Record a voice status"
                  className="flex size-20 items-center justify-center rounded-full bg-brand text-white shadow-lg transition-transform active:scale-95"
                >
                  <Mic className="size-9" />
                </button>
                <p className="text-sm text-muted-foreground">
                  Tap to record, up to {formatClock(MAX_VOICE_SECONDS)}
                </p>
              </>
            )}
          </div>
        )}

        {tab !== "text" && (
          <Textarea
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            maxLength={700}
            placeholder="Add a caption"
          />
        )}

        <ResponsiveDialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={posting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canShare} className="gap-2">
            {posting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Share {tab === "media" && files.length > 1 ? files.length : ""}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
