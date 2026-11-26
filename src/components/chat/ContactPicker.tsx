"use client";

import { Loader2, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";

interface Found {
  _id: string;
  name: string;
  username: string;
  displayPicture?: string;
  verified?: boolean;
}

/** Search for a Velo user and share them as a contact. */
export function ContactPicker({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The server re-reads the account from the id; the rest only fills the card until it arrives. */
  onSelect: (user: { userId: string; name: string; username: string; displayPicture: string; verified: boolean }) => void;
}) {
  const [text, setText] = useState("");
  const [results, setResults] = useState<{ query: string; users: Found[] } | null>(null);
  const query = text.trim();

  useEffect(() => {
    if (query.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      fetch(`/api/users?query=${encodeURIComponent(query)}`)
        .then((res) => (res.ok ? res.json() : { data: [] }))
        .catch(() => ({ data: [] }))
        .then((json) => {
          if (!cancelled) setResults({ query, users: (json.data ?? []) as Found[] });
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const settled = results?.query === query ? results.users : null;
  const loading = query.length >= 2 && settled === null;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-sm">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Share a contact</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>Search for someone on Velo.</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <Input
            autoFocus
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Name or username"
            className="pl-8"
          />
        </div>
        <ul className="max-h-72 overflow-y-auto">
          {loading && (
            <li className="flex justify-center p-4">
              <Loader2 className="size-5 animate-spin text-gray-400" />
            </li>
          )}
          {query.length >= 2 && settled?.length === 0 && (
            <li className="p-4 text-center text-sm text-gray-500">No one found</li>
          )}
          {(settled ?? []).map((user) => (
            <li key={user._id}>
              <button
                type="button"
                onClick={() => {
                  onSelect({
                    userId: String(user._id),
                    name: user.name,
                    username: user.username,
                    displayPicture: user.displayPicture ?? "",
                    verified: Boolean(user.verified),
                  });
                  onOpenChange(false);
                }}
                className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-gray-100 dark:hover:bg-zinc-800"
              >
                <Avatar className="size-9">
                  <AvatarImage src={user.displayPicture} alt={user.name} className="object-cover" />
                  <AvatarFallback className="capitalize">{user.name?.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium dark:text-white">{user.name}</span>
                  <span className="block truncate text-xs text-gray-500">@{user.username}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
