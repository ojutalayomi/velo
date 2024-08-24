import { ChatAttributes, ChatSettings } from '../types/type';

class ChatRepository {
  // Database-specific operations
  async getAllChats(): Promise<ChatAttributes[]> {
    // Fetch all chats from the database
    // and return them as an array of ChatAttributes
    const response = await fetch('/api/chats');
    const chats = await response.json();
    return chats;
  }

  async getChatById(id: number): Promise<ChatAttributes | undefined> {
    // Fetch a chat by its ID from the database
    // and return it as a ChatAttributes object (or undefined if not found)
    const response = await fetch(`/api/chats?id=${id}`);
    const chat = await response.json();
    return chat;
  }

  async createChat(chatAttributes: ChatAttributes): Promise<ChatAttributes> {
    // Insert a new chat into the database
    // and return the created ChatAttributes object
    const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chatAttributes),
    });
    const createdChat = await response.json();
    return createdChat;
  }

  async updateChat(id: number, updatedAttributes: Partial<ChatAttributes>): Promise<void> {
    // Update an existing chat in the database
    const response = await fetch(`/api/chats/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedAttributes),
    });
    await response.json();
  }

  async updateChatSettings(id: number, updatedSettings: Partial<ChatSettings>): Promise<void> {
    // Update the chat settings in the database
    const response = await fetch(`/api/chats/${id}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedSettings),
    });
    await response.json();
  }

  async deleteChat(id: number): Promise<void> {
    // Delete a chat from the database
    const response = await fetch(`/api/chats/${id}`, {
        method: 'DELETE',
    });
    await response.json();
  }
}

export default ChatRepository;