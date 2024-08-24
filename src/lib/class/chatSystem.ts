import { ChatAttributes, ChatSettings } from "../types/type";
import Chat from "./chatAttr";
import ChatRepository from './ChatRepository';

class ChatSystem {
  private chatRepository: ChatRepository;

  constructor(chatRepository: ChatRepository) {
    this.chatRepository = chatRepository;
  }

  async getAllChats(): Promise<Chat[]> {
    const chatAttributes = await this.chatRepository.getAllChats();
    return chatAttributes.map((attributes) => new Chat(attributes));
  }

  async getChatById(id: number): Promise<Chat | undefined> {
    const chatAttributes = await this.chatRepository.getChatById(id);
    return chatAttributes ? new Chat(chatAttributes) : undefined;
  }

  async addChat(chatAttributes: ChatAttributes): Promise<Chat> {
    const createdAttributes = await this.chatRepository.createChat(chatAttributes);
    return new Chat(createdAttributes);
  }

  async updateChat(id: number, updatedAttributes: Partial<ChatAttributes>): Promise<void> {
    await this.chatRepository.updateChat(id, updatedAttributes);
  }

  async updateChatSettings(id: number, updatedSettings: Partial<ChatSettings>): Promise<void> {
    await this.chatRepository.updateChatSettings(id, updatedSettings);
  }

  async deleteChat(id: number): Promise<void> {
    await this.chatRepository.deleteChat(id);
  }
}

export default ChatSystem;