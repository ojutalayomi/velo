/** A message's sender as clients see it. */
export interface MessageSender {
  id: string;
  name: string;
  displayPicture: string;
  username: string;
  verified: boolean;
}

export interface Account {
  name?: string;
  firstname?: string;
  lastname?: string;
  username?: string;
  displayPicture?: string;
  verified?: boolean;
}

/**
 * What is stored on a message: only who sent it. Names, pictures and the verified badge change,
 * so they are read from the account when the message is read, not copied into every message.
 * (Messages saved before this still carry a full copy, which is only a fallback.)
 */
export const storedSender = (sender: { id: string }) => ({ id: sender.id }) as MessageSender;

/** The sender to show: the current account wins; a stored copy only fills in for a missing account. */
export function mergeSender(stored: Partial<MessageSender> & { id: string }, account?: Account | null): MessageSender {
  if (!account) {
    return {
      id: stored.id,
      name: stored.name || "Deleted user",
      displayPicture: stored.displayPicture ?? "",
      username: stored.username ?? "",
      verified: stored.verified ?? false,
    };
  }
  return {
    id: stored.id,
    name: account.name || [account.firstname, account.lastname].filter(Boolean).join(" ") || account.username || "",
    displayPicture: account.displayPicture ?? "",
    username: account.username ?? "",
    verified: account.verified === true,
  };
}


/** The profile fields of a user, as kept per chat. */
export type SenderProfile = Pick<MessageSender, "name" | "username" | "displayPicture" | "verified">;

/**
 * How to show a message's sender: the chat member's current profile when we have one, otherwise
 * the copy that came with the message (a person who left, or who joined since the last fetch).
 */
export function resolveSender<T extends { id: string } & Partial<MessageSender>>(
  sender: T | undefined,
  profiles?: Record<string, SenderProfile>
): (T & SenderProfile) | undefined {
  if (!sender) return sender;
  const profile = profiles?.[sender.id];
  return {
    ...sender,
    name: profile?.name || sender.name || "",
    username: profile?.username || sender.username || "",
    displayPicture: profile ? profile.displayPicture : (sender.displayPicture ?? ""),
    verified: profile ? profile.verified : (sender.verified ?? false),
  };
}
