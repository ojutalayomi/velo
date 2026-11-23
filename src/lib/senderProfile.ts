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

