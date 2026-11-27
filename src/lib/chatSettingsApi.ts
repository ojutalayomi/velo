import type { NewChatSettings } from "@/lib/types/type";

type Dispatch = (action: { type: string; payload?: unknown }) => unknown;

/** Saves per-chat settings (mute, wallpaper). Resolves to an error message, or null when it worked. */
export async function putChatSettings(
  chatId: string,
  updates: Partial<Pick<NewChatSettings, "isMuted" | "wallpaper">>
): Promise<string | null> {
  try {
    const response = await fetch(`/api/chats/${chatId}/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (response.ok) return null;
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    return body?.error || "Couldn't save that. Try again.";
  } catch {
    return "You're offline. Try again when you're back online.";
  }
}

/**
 * Changes a chat setting at once on screen, then saves it; if saving fails the screen goes back to
 * what it was. `patch` is the store's `patchChatSettings`, passed in so this stays testable.
 */
export async function saveChatSettings(params: {
  dispatch: Dispatch;
  patch: (payload: { chatId: string; updates: Partial<NewChatSettings> }) => { type: string; payload?: unknown };
  chatId: string;
  previous: Partial<NewChatSettings>;
  updates: Partial<Pick<NewChatSettings, "isMuted" | "wallpaper">>;
}): Promise<string | null> {
  const { dispatch, patch, chatId, previous, updates } = params;
  dispatch(patch({ chatId, updates }));
  const error = await putChatSettings(chatId, updates);
  if (error) {
    const undo: Partial<NewChatSettings> = {};
    for (const key of Object.keys(updates) as (keyof typeof updates)[]) {
      (undo as Record<string, unknown>)[key] = previous[key];
    }
    dispatch(patch({ chatId, updates: undo }));
  }
  return error;
}
