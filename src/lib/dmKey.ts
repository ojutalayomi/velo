/**
 * A DM is identified by the unordered pair of its two members. `dmKey` is stored on the chat
 * document and carries a unique index, so the database itself refuses a second DM for a pair.
 */
export function dmKeyFor(userA: string, userB: string): string {
  return [userA, userB].sort().join(":");
}

/**
 * Chooses which of several DMs between the same two people survives a merge: the oldest one
 * (ObjectIds sort chronologically), so existing links and history keep pointing at it.
 */
export function planDmMerge(chatIds: string[]): { keepId: string; removeIds: string[] } {
  if (chatIds.length === 0) throw new Error("planDmMerge needs at least one chat");
  const sorted = [...chatIds].sort();
  return { keepId: sorted[0], removeIds: sorted.slice(1) };
}
