/** Client calls for blocking and muting another account. Both resolve to an error message or null. */
type Kind = "blocks" | "mutes";

async function change(kind: Kind, userId: string, on: boolean): Promise<string | null> {
  try {
    const response = await fetch(`/api/${kind}`, {
      method: on ? "POST" : "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (response.ok) return null;
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    return body?.message || `Could not ${on ? "update" : "undo"} that. Try again.`;
  } catch {
    return "You're offline. Try again when you're back online.";
  }
}

export const setUserBlocked = (userId: string, blocked: boolean) => change("blocks", userId, blocked);
export const setUserMuted = (userId: string, muted: boolean) => change("mutes", userId, muted);
