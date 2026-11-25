/** The most messages that can be pinned in one chat. The socket server enforces the same limit. */
export const MAX_PINNED_MESSAGES = 5;

export interface PinnedMessage {
  messageId: string;
  pinnedBy: string;
  pinnedAt: string;
}

/**
 * Who may pin and unpin: either person in a DM, only the admins of a group or channel.
 * The socket server decides for real; this only decides whether to offer the option.
 */
export function canPinMessages(params: {
  chatType?: string;
  adminIds?: string[];
  userId: string;
}): boolean {
  if (params.chatType === "Group" || params.chatType === "Channels") {
    return Boolean(params.adminIds?.includes(params.userId));
  }
  return true;
}

/** Why a message can't be pinned right now, or null when it can. */
export function pinBlockReason(params: {
  isPinned: boolean;
  pinCount: number;
  deleted: boolean;
}): string | null {
  if (params.deleted) return "Deleted messages can't be pinned";
  if (!params.isPinned && params.pinCount >= MAX_PINNED_MESSAGES) {
    return `You can pin up to ${MAX_PINNED_MESSAGES} messages. Unpin one first.`;
  }
  return null;
}
