"use client";
import { Camera, Loader2 } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "@/lib/toast";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import ChatRepository from "@/lib/class/ChatRepository";
import ChatSystem from "@/lib/class/chatSystem";
import { BUCKETNAME, S3UploadBody, s3ObjectUrl } from "@/lib/types/s3";
import { ChatUpdate } from "@/lib/types/type";

const chatSystem = new ChatSystem(new ChatRepository());

const NAME_MAX = 100;
const DESCRIPTION_MAX = 500;
const PICTURE_MAX_BYTES = 5 * 1024 * 1024;

interface Props {
  chatId: string;
  name: string;
  description: string;
  displayPicture: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (updates: { name: string; description: string; displayPicture: string }) => void;
}

const uploadPicture = async (file: File): Promise<string> => {
  const response = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: S3UploadBody({
      filename: file.name,
      contentType: file.type,
      bucketName: BUCKETNAME.PROFILE,
    }),
  });
  if (!response.ok) throw new Error("Failed to get upload URL");
  const { url, fields } = await response.json();

  const formData = new FormData();
  for (const key in fields) formData.append(key, fields[key]);
  formData.append("file", file);

  const uploaded = await fetch(url, { method: "POST", body: formData });
  if (!uploaded.ok) throw new Error("Failed to upload image");
  return s3ObjectUrl(url, fields.key);
};

const fieldClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-1 focus:ring-brand dark:border-neutral-600 dark:bg-neutral-800 dark:text-white";

const EditGroupForm: React.FC<Props> = ({
  chatId,
  name,
  description,
  displayPicture,
  onOpenChange,
  onSaved,
}) => {
  const [draftName, setDraftName] = useState(name);
  const [draftDescription, setDraftDescription] = useState(description);
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Object URLs must be released; the latest one is tracked in a ref for unmount cleanup.
  const previewRef = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    []
  );

  const trimmedName = draftName.trim();
  const trimmedDescription = draftDescription.trim();
  const dirty =
    trimmedName !== name || trimmedDescription !== description || pictureFile !== null;
  const canSave = dirty && trimmedName.length > 0 && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const updates: ChatUpdate = {};
      if (trimmedName !== name) updates.name = { group: trimmedName };
      if (trimmedDescription !== description) updates.groupDescription = trimmedDescription;
      let nextPicture = displayPicture;
      if (pictureFile) {
        nextPicture = await uploadPicture(pictureFile);
        updates.groupDisplayPicture = nextPicture;
      }
      await chatSystem.updateChat(chatId, updates);
      onSaved({ name: trimmedName, description: trimmedDescription, displayPicture: nextPicture });
      toast.success("Group details updated");
      onOpenChange(false);
    } catch (error) {
      toast.error("Could not update the group", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const onPickPicture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
    } else if (file.size > PICTURE_MAX_BYTES) {
      toast.error("Image must be 5MB or less");
    } else {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      previewRef.current = URL.createObjectURL(file);
      setPreviewUrl(previewRef.current);
      setPictureFile(file);
    }
  };

  return (
    <>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Edit group</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Changes are visible to everyone in the group. Only admins can edit these details.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="group relative rounded-full"
              aria-label="Change group picture"
            >
              <Avatar className="size-24">
                <AvatarFallback className="text-xl">
                  {(trimmedName || name).slice(0, 2).toUpperCase()}
                </AvatarFallback>
                <AvatarImage
                  src={previewUrl ?? displayPicture}
                  className="size-24 rounded-full object-cover"
                  alt=""
                />
              </Avatar>
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                <Camera className="size-6" />
              </span>
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPickPicture}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="group-name" className="text-sm font-medium">
              Group name
            </label>
            <input
              id="group-name"
              value={draftName}
              maxLength={NAME_MAX}
              onChange={(e) => setDraftName(e.target.value)}
              className={fieldClass}
              placeholder="Group name"
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="group-description" className="text-sm font-medium">
                Description
              </label>
              <span className="text-xs text-gray-400">
                {draftDescription.length}/{DESCRIPTION_MAX}
              </span>
            </div>
            <textarea
              id="group-description"
              value={draftDescription}
              maxLength={DESCRIPTION_MAX}
              onChange={(e) => setDraftDescription(e.target.value)}
              rows={4}
              className={`${fieldClass} resize-none`}
              placeholder="What is this group about?"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSave}
              className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              Save changes
            </button>
          </div>
        </form>
    </>
  );
};

const EditGroupDialog: React.FC<Props> = (props) => (
  <ResponsiveDialog open={props.open} onOpenChange={props.onOpenChange}>
    <ResponsiveDialogContent className="max-w-md">
      {/* Mounted only while open, so drafts always start from the saved values. */}
      <EditGroupForm {...props} />
    </ResponsiveDialogContent>
  </ResponsiveDialog>
);

export default EditGroupDialog;
