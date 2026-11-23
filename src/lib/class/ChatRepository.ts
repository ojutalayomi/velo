import {
  AllChats,
  ChatUpdate,
  ChatDataClient,
  ChatInviteMetadata,
  ChatInvitePreview,
  ChatParticipant,
  ChatSettings,
  NewChat,
  NewChat_,
} from "../types/type";

/** Initial / per-request message window — load older via fetchChatsPage with higher skip. */
const CHAT_MESSAGE_PAGE = 500;

class ChatRepository {
  /** One GET /api/chats page (paginated messages). */
  async fetchChatsPage(
    messageSkip: number,
    messageLimit = CHAT_MESSAGE_PAGE,
    since?: string
  ): Promise<AllChats> {
    const sinceParam = since ? `&since=${encodeURIComponent(since)}` : "";
    const response = await fetch(
      `/api/chats?messageSkip=${messageSkip}&messageLimit=${messageLimit}${sinceParam}`
    );
    if (!response.ok) {
      throw new Error(await response.text());
    }
    return (await response.json()) as AllChats;
  }

  async getAllChats(): Promise<AllChats> {
    return this.fetchChatsPage(0, CHAT_MESSAGE_PAGE);
  }

  /** Only messages changed after `since` (new, edited/deleted, reactions, read receipts). */
  async getChatsSince(since: string): Promise<AllChats> {
    return this.fetchChatsPage(0, CHAT_MESSAGE_PAGE, since);
  }

  async getChatById(id: string): Promise<ChatDataClient | undefined> {
    const response = await fetch(`/api/chats?id=${id}`);
    const chat = await response.json();
    return chat;
  }

  async createChat(chatAttributes: NewChat): Promise<NewChat_> {
    const response = await fetch("/api/chats", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(chatAttributes),
    });
    const createdChat = await response.json().catch(() => null);
    // A failed request must throw: callers treat any object as success and would otherwise
    // read `.chat` off an error body.
    if (!response.ok || !createdChat?.chat) {
      throw new Error(createdChat?.error ?? `Failed to create chat (${response.status})`);
    }
    return createdChat;
  }

  async addParticipants(
    chatId: string,
    userIds: string[]
  ): Promise<{ added: ChatParticipant[]; participants: ChatParticipant[] }> {
    const response = await fetch(`/api/chats/${chatId}/participants`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userIds }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error ?? "Failed to add members");
    }
    return await response.json();
  }

  async removeParticipants(
    chatId: string,
    userIds: string[]
  ): Promise<{
    removed: string[];
    participants: ChatParticipant[];
    adminIds: string[];
    chatDeleted: boolean;
  }> {
    const response = await fetch(`/api/chats/${chatId}/participants`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error ?? "Failed to remove members");
    }
    return await response.json();
  }

  async getParticipants(
    chatId: string
  ): Promise<{ userId: string; username: string; name: string; displayPicture: string }[]> {
    const response = await fetch(`/api/chats?participants=true&chatId=${chatId}`);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error ?? "Failed to load members");
    }
    return await response.json();
  }

  async getInvite(chatId: string): Promise<ChatInviteMetadata> {
    const response = await fetch(`/api/chats/${chatId}/invite`);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error ?? "Failed to load the invite link");
    }
    return await response.json();
  }

  /** The only call that returns a usable link; it cannot be fetched again afterwards. */
  async createInvite(
    chatId: string,
    options: { expiresInHours?: number; maxUses?: number | null } = {}
  ): Promise<ChatInviteMetadata & { link: string }> {
    const response = await fetch(`/api/chats/${chatId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error ?? "Failed to create the invite link");
    }
    return await response.json();
  }

  async updateInvite(
    chatId: string,
    updates: { enabled?: boolean; expiresInHours?: number; maxUses?: number | null }
  ): Promise<ChatInviteMetadata> {
    const response = await fetch(`/api/chats/${chatId}/invite`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error ?? "Failed to update the invite link");
    }
    return await response.json();
  }

  async previewInvite(token: string): Promise<ChatInvitePreview> {
    const response = await fetch(`/api/invites/${encodeURIComponent(token)}`);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error ?? "Failed to load this invite");
    }
    return await response.json();
  }

  async joinInvite(token: string): Promise<{ chatId: string; alreadyMember: boolean }> {
    const response = await fetch(`/api/invites/${encodeURIComponent(token)}`, { method: "POST" });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error ?? "Failed to join the group");
    }
    return await response.json();
  }

  async updateChat(id: string, updatedAttributes: ChatUpdate): Promise<void> {
    const response = await fetch(`/api/chats?id=${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedAttributes),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error ?? "Failed to update chat");
    }
  }

  /** Promotes or demotes a group member; resolves to the group's new admin ids. */
  async setAdmin(chatId: string, userId: string, admin: boolean): Promise<string[]> {
    const response = await fetch(`/api/chats/${chatId}/admins`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, admin }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error ?? "Failed to update admin role");
    return data.adminIds;
  }

  async updateChatSettings(id: string, updatedSettings: Partial<ChatSettings>): Promise<any> {
    const response = await fetch(`/api/chats/${id}/settings`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedSettings),
    });
    return await response.json();
  }

  async deleteChat(id: string): Promise<void> {
    const response = await fetch(`/api/chats/?id=${id}`, {
      method: "DELETE",
    });
    await response.json();
  }
}

export default ChatRepository;
