"use client";
import { Loader2, X } from "lucide-react";
import React, { useCallback, useState } from "react";
import { toast } from "sonner";

import ImageContent, { UserProfileLazyLoader } from "@/components/imageContent";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import type { PaginationMeta } from "@/lib/apiPagination";
import ChatRepository from "@/lib/class/ChatRepository";
import ChatSystem from "@/lib/class/chatSystem";
import { fetchUsersSearchPage } from "@/lib/getStatus";
import { UserData } from "@/lib/types/user";

const chatSystem = new ChatSystem(new ChatRepository());

interface PickerProps {
  chatId: string;
  existingMemberIds: string[];
  onOpenChange: (open: boolean) => void;
  onAdded: (participantIds: string[]) => void;
}

interface Props extends PickerProps {
  open: boolean;
}

const MemberPicker: React.FC<PickerProps> = ({
  chatId,
  existingMemberIds,
  onOpenChange,
  onAdded,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<UserData[]>([]);
  const [paging, setPaging] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [noUser, setNoUser] = useState(false);
  const [selected, setSelected] = useState<UserData[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const excluded = new Set(existingMemberIds);
  const selectedIds = selected.map((user) => String(user._id));

  const mergeRows = useCallback((rows: UserData[], extras: UserData[]) => {
    const ids = new Set(rows.map((row) => String(row._id)));
    return [...rows, ...extras.filter((row) => !ids.has(String(row._id)))];
  }, []);

  const search = async (raw: string) => {
    const cleaned = raw.replace(/[^a-zA-Z0-9\s]/g, "");
    setSearchQuery(cleaned);
    setNoUser(false);
    if (cleaned.trim() === "") {
      setResults([]);
      setPaging(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const page = await fetchUsersSearchPage(cleaned, 0, 15);
      const data = (page.data as unknown as UserData[]).filter(
        (user) => !excluded.has(String(user._id))
      );
      setResults(data);
      setNoUser(data.length < 1);
      setPaging(page.pagination);
    } catch (error) {
      console.error("Error searching people:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMore = async () => {
    if (!paging?.hasMore || isLoading || searchQuery.trim() === "") return;
    setIsLoading(true);
    try {
      const page = await fetchUsersSearchPage(
        searchQuery,
        paging.skip + paging.limit,
        paging.limit
      );
      const chunk = (page.data as unknown as UserData[]).filter(
        (user) => !excluded.has(String(user._id))
      );
      setResults((prev) => mergeRows(prev, chunk));
      setPaging(page.pagination);
    } catch (error) {
      console.error("Error loading more people:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelection = (userId: string) => {
    setSelected((prev) =>
      prev.some((user) => String(user._id) === userId)
        ? prev.filter((user) => String(user._id) !== userId)
        : [...prev, ...results.filter((user) => String(user._id) === userId)]
    );
  };

  const submit = async () => {
    if (selected.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await chatSystem.addParticipants(chatId, selectedIds);
      onAdded(result.participants.map((participant) => participant.userId));
      toast.success(
        result.added.length === 1
          ? "Member added to the group"
          : `${result.added.length} members added to the group`
      );
      onOpenChange(false);
    } catch (error) {
      toast.error("Could not add members", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <input
        className="w-full rounded-full border px-4 py-2 text-sm outline-0 dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-200"
        value={searchQuery}
        onChange={(event) => void search(event.target.value)}
        type="text"
        placeholder="Search for people..."
      />

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 border-b pb-3 dark:border-neutral-700">
          {selected.map((user) => (
            <div
              key={String(user._id)}
              className="flex items-center gap-2 rounded-full bg-gray-100 px-2 py-1 dark:bg-neutral-900"
            >
              <Avatar className="size-6">
                <AvatarFallback className="text-xs">
                  {user.name?.slice(0, 2) ||
                    `${user.firstname?.[0] ?? ""}${user.lastname?.[0] ?? ""}`}
                </AvatarFallback>
                <AvatarImage
                  src={user.displayPicture || ""}
                  className="rounded-full"
                  alt={user.name || `${user.firstname} ${user.lastname}`}
                />
              </Avatar>
              <span className="text-sm dark:text-slate-200">
                {user.name || `${user.firstname} ${user.lastname}`}
              </span>
              <button
                type="button"
                aria-label={`Remove ${user.name || user.username}`}
                onClick={() => toggleSelection(String(user._id))}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="min-h-24">
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <UserProfileLazyLoader key={index} />
            ))}
          </div>
        ) : noUser ? (
          <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
            No people found. Check the spelling, or they may already be a member.
          </p>
        ) : (
          <>
            {results.map((person) => (
              <ImageContent
                key={String(person._id)}
                userdata={person}
                onClick={toggleSelection}
                selectedUsers={selectedIds}
              />
            ))}
            {paging?.hasMore && (
              <button
                type="button"
                className="mt-2 text-sm font-medium text-brand"
                onClick={() => void loadMore()}
              >
                Load more
              </button>
            )}
          </>
        )}
      </div>

      <button
        type="button"
        disabled={selected.length === 0 || isSubmitting}
        onClick={() => void submit()}
        className="flex items-center justify-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:bg-gray-400"
      >
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        {selected.length > 0 ? `Add ${selected.length} member(s)` : "Add members"}
      </button>
    </>
  );
};

// The picker is mounted only while open so each session starts with a clean search.
const AddGroupMembersDialog: React.FC<Props> = ({ open, ...pickerProps }) => (
  <ResponsiveDialog open={open} onOpenChange={pickerProps.onOpenChange}>
    <ResponsiveDialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <ResponsiveDialogHeader>
        <ResponsiveDialogTitle>Add members</ResponsiveDialogTitle>
        <ResponsiveDialogDescription>
          Search for people to add to this group. Existing members are hidden.
        </ResponsiveDialogDescription>
      </ResponsiveDialogHeader>
      {open && <MemberPicker {...pickerProps} />}
    </ResponsiveDialogContent>
  </ResponsiveDialog>
);

export default AddGroupMembersDialog;