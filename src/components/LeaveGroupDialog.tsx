"use client";
import { Loader2 } from "lucide-react";
import React, { useState } from "react";
import { toast } from "@/lib/toast";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ChatRepository from "@/lib/class/ChatRepository";
import ChatSystem from "@/lib/class/chatSystem";

const chatSystem = new ChatSystem(new ChatRepository());

interface Props {
  chatId: string;
  groupName: string;
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeft: () => void;
}

const LeaveGroupDialog: React.FC<Props> = ({
  chatId,
  groupName,
  userId,
  open,
  onOpenChange,
  onLeft,
}) => {
  const [isLeaving, setIsLeaving] = useState(false);

  const leave = async () => {
    if (isLeaving) return;
    setIsLeaving(true);
    try {
      await chatSystem.removeParticipants(chatId, [userId]);
      toast.success(`You left ${groupName}`);
      onOpenChange(false);
      onLeft();
    } catch (error) {
      toast.error("Could not leave the group", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave {groupName}?</AlertDialogTitle>
          <AlertDialogDescription>
            You will stop receiving messages from this group. If you are the last admin, the
            longest-standing member becomes admin. If you are the last member, the group is
            deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLeaving}>Cancel</AlertDialogCancel>
          <button
            type="button"
            onClick={leave}
            disabled={isLeaving}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:pointer-events-none disabled:opacity-50"
          >
            {isLeaving && <Loader2 className="size-4 animate-spin" />}
            Leave group
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default LeaveGroupDialog;