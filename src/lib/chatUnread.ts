/**
 * The unread count of a chat after a message arrives or is sent.
 *
 * Your own message is never unread for you: you wrote it. Everyone else's message counts, unless
 * the message is already marked as read for you.
 */
export function unreadAfterMessage(
  current: number | undefined,
  message: { sender?: { id?: string } | null; isRead?: Record<string, boolean> | null },
  myId: string | undefined
): number {
  const count = current ?? 0;
  const me = myId ? String(myId) : "";
  if (!me) return count;
  if (message.sender?.id !== undefined && String(message.sender.id) === me) return count;
  if (message.isRead?.[me]) return count;
  return count + 1;
}
