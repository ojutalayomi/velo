/* eslint-disable @next/next/no-img-element */
"use client";

import {
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Loader2,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import React, { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";

import { useUser } from "@/app/providers/UserProvider";
import { createStatus, deleteStatus, markStatusViewed } from "@/lib/statusApi";
import type { StatusClient, StatusGroup } from "@/lib/types/status";
import { useAppDispatch } from "@/redux/hooks";
import { markViewedLocal, removeStatus, upsertStatusGroup } from "@/redux/statusSlice";
import { RootState } from "@/redux/store";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const STATUS_DURATION_MS = 6000;

const StatusTray = () => {
  const dispatch = useAppDispatch();
  const { userdata } = useUser();
  const { groups, loading } = useSelector((state: RootState) => state.status);
  const [composerOpen, setComposerOpen] = useState(false);
  const [viewerStart, setViewerStart] = useState<{ groupIndex: number; statusIndex: number } | null>(
    null
  );

  const myGroup = groups.find((group) => group.user._id === userdata._id);
  const otherGroups = groups.filter((group) => group.user._id !== userdata._id);
  const visibleGroups = myGroup ? [myGroup, ...otherGroups] : otherGroups;

  if (loading && groups.length === 0) {
    return (
      <div className="flex items-center gap-2 border-b border-border bg-gray-50 px-4 py-3 text-sm text-muted-foreground dark:bg-zinc-900">
        <Loader2 className="size-4 animate-spin" />
        Loading statuses
      </div>
    );
  }

  return (
    <section className="border-b border-border bg-gray-50 px-3 py-3 dark:bg-zinc-900">
      <div className="flex gap-3 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => (myGroup ? setViewerStart({ groupIndex: 0, statusIndex: 0 }) : setComposerOpen(true))}
          className="flex w-20 shrink-0 flex-col items-center gap-1 text-center"
        >
          <div className="relative">
            <StatusAvatar group={myGroup} fallback={userdata.firstname || userdata.username || "V"} />
            <span className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full border-2 border-gray-50 bg-brand text-white dark:border-zinc-900">
              <Plus className="size-3.5" />
            </span>
          </div>
          <span className="max-w-full truncate text-xs font-medium dark:text-slate-200">
            My status
          </span>
        </button>

        {otherGroups.map((group, index) => (
          <button
            key={group.user._id}
            type="button"
            onClick={() =>
              setViewerStart({
                groupIndex: myGroup ? index + 1 : index,
                statusIndex: Math.max(
                  0,
                  group.statuses.findIndex((status) => !status.viewed)
                ),
              })
            }
            className="flex w-20 shrink-0 flex-col items-center gap-1 text-center"
          >
            <StatusAvatar group={group} />
            <span className="max-w-full truncate text-xs font-medium dark:text-slate-200">
              {group.user.username || group.user.name}
            </span>
          </button>
        ))}
      </div>

      <StatusComposer open={composerOpen} onOpenChange={setComposerOpen} />
      {viewerStart && (
        <StatusViewer
          groups={visibleGroups}
          initialGroupIndex={viewerStart.groupIndex}
          initialStatusIndex={viewerStart.statusIndex}
          onClose={() => setViewerStart(null)}
        />
      )}
    </section>
  );
};

const StatusAvatar = ({ group, fallback }: { group?: StatusGroup; fallback?: string }) => {
  const ringClass = group?.hasUnviewed ? "ring-brand" : "ring-muted-foreground/40";
  return (
    <div className={`rounded-full p-0.5 ring-2 ${ringClass}`}>
      <Avatar className="size-14 border-2 border-gray-50 dark:border-zinc-900">
        <AvatarImage src={group?.user.displayPicture} />
        <AvatarFallback>{(fallback || group?.user.name || "V").slice(0, 2)}</AvatarFallback>
      </Avatar>
    </div>
  );
};

const StatusComposer = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const dispatch = useAppDispatch();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [posting, setPosting] = useState(false);
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected) return;
    if (!selected.type.startsWith("image/") && !selected.type.startsWith("video/")) {
      toast.error("Choose an image or video");
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      toast.error("Status media must be 10MB or less");
      return;
    }
    setFile(selected);
  };

  const submit = async () => {
    if (!file) return;
    setPosting(true);
    try {
      const presign = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          bucketName: "post-s",
        }),
      });
      if (!presign.ok) throw new Error("Failed to prepare upload");
      const { url, fields } = await presign.json();
      const formData = new FormData();
      Object.keys(fields).forEach((key) => formData.append(key, fields[key]));
      formData.append("file", file);
      const upload = await fetch(url, { method: "POST", body: formData });
      if (!upload.ok) throw new Error("Failed to upload media");

      const [group] = await createStatus({
        mediaUrl: url + fields.key,
        mediaKey: fields.key,
        mediaType: file.type.startsWith("video/") ? "video" : "image",
        caption,
        visibility: "followers",
      });
      if (group) dispatch(upsertStatusGroup(group));
      setFile(null);
      setCaption("");
      onOpenChange(false);
      toast.success("Status added");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setPosting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add status</DialogTitle>
          <DialogDescription>Share an image or video with your followers for 24 hours.</DialogDescription>
        </DialogHeader>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleFile}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex min-h-56 items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-muted/40"
        >
          {file ? (
            file.type.startsWith("video/") ? (
              <video src={previewUrl} className="max-h-80 w-full object-contain" controls />
            ) : (
              <img src={previewUrl} alt="" className="max-h-80 w-full object-contain" />
            )
          ) : (
            <span className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
              <ImagePlus className="size-8" />
              Select media
            </span>
          )}
        </button>
        <Textarea
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          maxLength={700}
          placeholder="Add a caption"
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={posting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!file || posting} className="gap-2">
            {posting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Share
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const StatusViewer = ({
  groups,
  initialGroupIndex,
  initialStatusIndex,
  onClose,
}: {
  groups: StatusGroup[];
  initialGroupIndex: number;
  initialStatusIndex: number;
  onClose: () => void;
}) => {
  const dispatch = useAppDispatch();
  const { userdata } = useUser();
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [statusIndex, setStatusIndex] = useState(Math.max(0, initialStatusIndex));
  const [progress, setProgress] = useState(0);

  const group = groups[groupIndex];
  const status = group?.statuses[statusIndex];
  const isOwner = status?.userId === userdata._id;

  useEffect(() => {
    setProgress(0);
    if (!status || isOwner || status.viewed) return;
    markStatusViewed(status._id)
      .then(() =>
        dispatch(
          markViewedLocal({
            statusId: status._id,
            viewer: { userId: userdata._id, viewedAt: new Date().toISOString() },
          })
        )
      )
      .catch(() => undefined);
  }, [dispatch, isOwner, status, userdata._id]);

  useEffect(() => {
    if (!status) return;
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      const nextProgress = Math.min(100, ((Date.now() - startedAt) / STATUS_DURATION_MS) * 100);
      setProgress(nextProgress);
      if (nextProgress >= 100) {
        window.clearInterval(interval);
        goNext();
      }
    }, 100);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?._id]);

  if (!group || !status) return null;

  const goNext = () => {
    if (statusIndex < group.statuses.length - 1) {
      setStatusIndex((value) => value + 1);
      return;
    }
    if (groupIndex < groups.length - 1) {
      setGroupIndex((value) => value + 1);
      setStatusIndex(0);
      return;
    }
    onClose();
  };

  const goPrevious = () => {
    if (statusIndex > 0) {
      setStatusIndex((value) => value - 1);
      return;
    }
    if (groupIndex > 0) {
      const previousGroup = groups[groupIndex - 1];
      setGroupIndex((value) => value - 1);
      setStatusIndex(Math.max(0, previousGroup.statuses.length - 1));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteStatus(status._id);
      dispatch(removeStatus({ statusId: status._id, ownerId: status.userId }));
      toast.success("Status deleted");
      goNext();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black text-white">
      <div className="absolute left-0 right-0 top-0 z-10 p-4">
        <div className="mb-4 flex gap-1">
          {group.statuses.map((item, index) => (
            <div key={item._id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full bg-white"
                style={{
                  width:
                    index < statusIndex ? "100%" : index === statusIndex ? `${progress}%` : "0%",
                }}
              />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={group.user.displayPicture} />
              <AvatarFallback>{group.user.name.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold">{isOwner ? "My status" : group.user.name}</div>
              <div className="text-xs text-white/70">{new Date(status.createdAt).toLocaleString()}</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isOwner && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10 hover:text-white"
                onClick={handleDelete}
                aria-label="Delete status"
              >
                <Trash2 className="size-5" />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 hover:text-white"
              onClick={onClose}
              aria-label="Close status"
            >
              <X className="size-6" />
            </Button>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="absolute left-0 top-24 z-10 flex h-[calc(100%-6rem)] w-1/4 items-center justify-start px-4"
        onClick={goPrevious}
        aria-label="Previous status"
      >
        <ChevronLeft className="size-8 opacity-70" />
      </button>
      <StatusMedia status={status} />
      <button
        type="button"
        className="absolute right-0 top-24 z-10 flex h-[calc(100%-6rem)] w-1/4 items-center justify-end px-4"
        onClick={goNext}
        aria-label="Next status"
      >
        <ChevronRight className="size-8 opacity-70" />
      </button>

      {status.caption && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-center">
          <p className="mx-auto max-w-xl whitespace-pre-wrap text-sm">{status.caption}</p>
        </div>
      )}
    </div>
  );
};

const StatusMedia = ({ status }: { status: StatusClient }) => {
  if (status.mediaType === "video") {
    return <video src={status.mediaUrl} className="max-h-full max-w-full object-contain" autoPlay muted controls />;
  }

  return <img src={status.mediaUrl} alt="" className="max-h-full max-w-full object-contain" />;
};

export default StatusTray;
