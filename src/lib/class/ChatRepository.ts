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

class ChatRepository {
  // Database-specific operations
  async getAllChats(): Promise<AllChats> {
    // Fetch all chats from the database
    // and return them as an array of ChatAttributes
    const response = await fetch("/api/chats");
    const chats: AllChats = await response.json();
    return chats;
  }

  async getChatById(id: string): Promise<ChatDataClient | undefined> {
    // Fetch a chat by its ID from the database
    // and return it as a ChatAttributes object (or undefined if not found)
    const response = await fetch(`/api/chats?id=${id}`);
    const chat = await response.json();
    return chat;
  }

  async createChat(chatAttributes: NewChat): Promise<NewChat_> {
    // Insert a new chat into the database
    // and return the created ChatAttributes object
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
    // Update an existing chat in the database
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
    // Update the chat settings in the database
    // console.log(updatedSettings)
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
    // Delete a chat from the database
    const response = await fetch(`/api/chats/?id=${id}`, {
      method: "DELETE",
    });
    await response.json();
  }

  async sendMessage(newMessage: MessageAttributes, id: string): Promise<MessageAttributes | Err> {
    // Insert a new chat into the database
    // and return the created ChatAttributes object
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
    // Delete a chat from the database
    const response = await fetch(
      `/api/chats/?chatId=${id}&messageId=${id}&userId=${id}&option=me`,
      {
        method: "DELETE",
      }
    );
    return await response.json();
  }

  async deleteMyMessage(id: { [x: string]: string }): Promise<string> {
    // Delete a chat from the database
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
    // Update an existing chat in the database
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
