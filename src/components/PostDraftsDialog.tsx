"use client";

import { FilePenLine, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { draftPreview, type PostDraft } from "@/lib/postDrafts";

function when(timestamp: number) {
  const date = new Date(timestamp);
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function PostDraftsDialog({
  open,
  onOpenChange,
  drafts,
  activeId,
  onOpen,
  onDelete,
  onDeleteAll,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drafts: PostDraft[];
  activeId: string | null;
  onOpen: (draft: PostDraft) => void;
  onDelete: (id: string) => void;
  onDeleteAll: () => void;
}) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-md bg-white dark:bg-zinc-900">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Drafts</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Saved on this device. Pick one to keep writing, or delete the ones you don&apos;t need.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        {drafts.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No drafts yet.</p>
        ) : (
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {drafts.map((draft) => (
              <li
                key={draft.id}
                className="flex items-center gap-2 rounded-lg border p-2 dark:border-zinc-700"
              >
                <button
                  type="button"
                  onClick={() => onOpen(draft)}
                  className="min-w-0 flex-1 rounded-md p-1 text-left hover:bg-gray-100 dark:hover:bg-zinc-800"
                >
                  <span className="line-clamp-2 break-words text-sm">{draftPreview(draft)}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {draft.id === activeId ? "Editing · " : ""}
                    {when(draft.updatedAt)}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label="Delete draft"
                  onClick={() => onDelete(draft.id)}
                  className="rounded-full p-2 text-red-500 hover:bg-red-500/10"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
        {drafts.length > 1 && (
          <Button variant="ghost" className="text-red-500" onClick={onDeleteAll}>
            Delete all drafts
          </Button>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

export function DraftsTrigger({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full px-2 py-1 text-xl font-bold text-brand hover:bg-brand/10"
    >
      <FilePenLine size={18} />
      Drafts
      {count > 0 && (
        <span className="rounded-full bg-brand px-1.5 text-xs font-semibold text-white">{count}</span>
      )}
    </button>
  );
}
