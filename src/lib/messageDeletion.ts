/** Trailing marker on the content of a message that was deleted for everyone. */
export const DELETED_MARKER = "≤≤≤";
export const SENDER_DELETED_CONTENT = `You deleted this message.${DELETED_MARKER}`;
export const ADMIN_DELETED_CONTENT = `This message was deleted by an admin.${DELETED_MARKER}`;

/** Wording used for a sender's deletion when the viewer is someone else. */
export const OTHER_DELETED_CONTENT = `This message was deleted.${DELETED_MARKER}`;

/** Chat-list preview for a deleted message: the placeholder without its marker or full stop. */
export const deletedPreview = (content: string) =>
  content.replace(DELETED_MARKER, "").trim().replace(/\.$/, "");

export type MessageDeletion = "sender" | "admin";

/**
 * Mirrors the socket server's rule (the server is the authority): a sender may delete their own
 * message anywhere; a group admin may delete anyone's. A DM has no admins.
 */
export function messageDeletion(params: {
  senderId?: string;
  userId: string;
  chatType?: string;
  adminIds?: string[];
}): MessageDeletion | null {
  if (params.senderId && params.senderId === params.userId) return "sender";
  if (params.chatType === "Group" && params.adminIds?.includes(params.userId)) return "admin";
  return null;
}
