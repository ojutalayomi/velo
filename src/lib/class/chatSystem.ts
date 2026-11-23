import ChatRepository from "./ChatRepository";
import {
  AllChats,
  ChatUpdate,
  ChatDataClient,
  Err,
  MessageAttributes,
  NewChat,
  NewChat_,
  NewChatSettings,
} from "../types/type";

class ChatSystem {
  private chatRepository: ChatRepository;

  constructor(chatRepository: ChatRepository) {
    this.chatRepository = chatRepository;
  }

  async getAllChats(): Promise<AllChats> {
    const chatAttributes = await this.chatRepository.getAllChats();
    return chatAttributes;
    // return chatAttributes.map((attributes) => new Chat(attributes));
  }

  async getChatsSince(since: string): Promise<AllChats> {
    return this.chatRepository.getChatsSince(since);
  }

  async getChatById(id: string): Promise<ChatDataClient | undefined> {
    const chatAttributes = await this.chatRepository.getChatById(id);
    return chatAttributes || undefined;
  }

  async addChat(chatAttributes: NewChat): Promise<NewChat_> {
    const createdAttributes = await this.chatRepository.createChat(chatAttributes);
    return createdAttributes;
  }

  async addParticipants(chatId: string, userIds: string[]) {
    return await this.chatRepository.addParticipants(chatId, userIds);
  }

  async removeParticipants(chatId: string, userIds: string[]) {
    return await this.chatRepository.removeParticipants(chatId, userIds);
  }

  async getParticipants(chatId: string) {
    return await this.chatRepository.getParticipants(chatId);
  }

  async getInvite(chatId: string) {
    return await this.chatRepository.getInvite(chatId);
  }

  async createInvite(
    chatId: string,
    options: { expiresInHours?: number; maxUses?: number | null } = {}
  ) {
    return await this.chatRepository.createInvite(chatId, options);
  }

  async updateInvite(
    chatId: string,
    updates: { enabled?: boolean; expiresInHours?: number; maxUses?: number | null }
  ) {
    return await this.chatRepository.updateInvite(chatId, updates);
  }

  async previewInvite(token: string) {
    return await this.chatRepository.previewInvite(token);
  }

  async joinInvite(token: string) {
    return await this.chatRepository.joinInvite(token);
  }

  async updateChat(id: string, updatedAttributes: ChatUpdate): Promise<void> {
    await this.chatRepository.updateChat(id, updatedAttributes);
  }

  async setAdmin(chatId: string, userId: string, admin: boolean) {
    return await this.chatRepository.setAdmin(chatId, userId, admin);
  }

  async updateChatSettings(
    id: string,
    updatedSettings: Partial<NewChatSettings>
  ): Promise<NewChatSettings> {
    return await this.chatRepository.updateChatSettings(id, updatedSettings);
  }

  async deleteChat(id: string): Promise<void> {
    await this.chatRepository.deleteChat(id);
  }

  async sendMessage(newMessage: MessageAttributes, id: string): Promise<MessageAttributes | Err> {
    const createdMessage = await this.chatRepository.sendMessage(newMessage, id);
    return createdMessage;
  }

  async deleteMessageForMe(id: { [x: string]: string }): Promise<string> {
    return await this.chatRepository.deleteMessageForMe(id);
  }

  async deleteMyMessage(id: { [x: string]: string }): Promise<string> {
    return await this.chatRepository.deleteMyMessage(id);
  }

  async editMessage(
    id: { [x: string]: string },
    updatedAttributes: Partial<MessageAttributes>
  ): Promise<string> {
    return await this.chatRepository.editMessage(id, updatedAttributes);
  }
}

export default ChatSystem;
