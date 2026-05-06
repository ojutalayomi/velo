import {
  AllChats,
  ChatAttributes,
  ChatDataClient,
  ChatSettings,
  Err,
  MessageAttributes,
  NewChat,
  NewChat_,
} from "../types/type";

/** Initial / per-request message window — load older via fetchChatsPage with higher skip. */
const CHAT_MESSAGE_PAGE = 500;

class ChatRepository {
  /** One GET /api/chats page (paginated messages). */
  async fetchChatsPage(messageSkip: number, messageLimit = CHAT_MESSAGE_PAGE): Promise<AllChats> {
    const response = await fetch(
      `/api/chats?messageSkip=${messageSkip}&messageLimit=${messageLimit}`
    );
    if (!response.ok) {
      throw new Error(await response.text());
    }
    return (await response.json()) as AllChats;
  }

  async getAllChats(): Promise<AllChats> {
    return this.fetchChatsPage(0, CHAT_MESSAGE_PAGE);
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
    const createdChat = await response.json();
    return createdChat;
  }

  async updateChat(id: string, updatedAttributes: Partial<ChatAttributes>): Promise<void> {
    const response = await fetch(`/api/chats/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedAttributes),
    });
    await response.json();
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

  async sendMessage(newMessage: MessageAttributes, id: string): Promise<MessageAttributes | Err> {
    const response = await fetch(`/api/chats?chatId=${id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newMessage),
    });
    const message = await response.json();
    return message;
  }

  async deleteMessageForMe(id: { [x: string]: string }): Promise<string> {
    const response = await fetch(
      `/api/chats/?chatId=${id}&messageId=${id}&userId=${id}&option=me`,
      {
        method: "DELETE",
      }
    );
    return await response.json();
  }

  async deleteMyMessage(id: { [x: string]: string }): Promise<string> {
    const response = await fetch(
      `/api/chats?chatId=${id}&messageId=${id}&userId=${id}&option=all`,
      {
        method: "DELETE",
      }
    );
    return await response.json();
  }

  async editMessage(
    id: { [x: string]: string },
    updatedAttributes: Partial<MessageAttributes>
  ): Promise<string> {
    const response = await fetch(`/api/chats?chatId=${id}&messageId=${id}&userId=${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedAttributes),
    });
    return await response.json();
  }
}

export default ChatRepository;
