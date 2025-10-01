"use client";
import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (arg: string) => void;
  username?: string | string[];
}

const NewChatModal: React.FC<NewChatModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  username = "",
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  useEffect(() => {
    if (isOpen) setLoading(false);
  }, [isOpen]);

  if (!isOpen) return null;
  const chattype = typeof username === "string" ? "DMs" : "Groups";
  const yes = () => {
    onConfirm(chattype);
    setLoading(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogTrigger className="hidden">Open</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{username ? `Directly message ${username}` : "Start new chat"}</DialogTitle>
          <DialogDescription>
            {username ? (
              <>
                Are you sure you want to start a new chat with{" "}
                <b className="text-brand">@{username}</b>{" "}
              </>
            ) : (
              "Are you sure you want to create a new group?"
            )}
          </DialogDescription>
          <div className="flex justify-end space-x-4">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              No
            </button>
            <button
              onClick={() => yes()}
              disabled={loading}
              className="px-4 py-2 bg-brand/90 border border-transparent rounded-md text-sm font-medium text-white hover:bg-brand focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand"
            >
              Yes
            </button>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export default NewChatModal;
