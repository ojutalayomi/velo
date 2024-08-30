import { AllChats, ChatAttributes, ChatSettings, Err, MessageAttributes, NewChat, NewChatResponse, NewChatSettings } from "../types/type";
import Chat, { Newchat } from "./chatAttr";
import ChatRepository from './ChatRepository';

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

  async getChatById(id: string): Promise<Chat | undefined> {
    const chatAttributes = await this.chatRepository.getChatById(id);
    return chatAttributes ? new Chat(chatAttributes) : undefined;
  }

  async addChat(chatAttributes: NewChat): Promise<NewChatResponse> {
    const createdAttributes = await this.chatRepository.createChat(chatAttributes);
    return new Newchat(createdAttributes);
  }

  async updateChat(id: string, updatedAttributes: Partial<ChatAttributes>): Promise<void> {
    await this.chatRepository.updateChat(id, updatedAttributes);
  }

  async updateChatSettings(id: string, updatedSettings: Partial<ChatSettings>): Promise<any> {
    return await this.chatRepository.updateChatSettings(id, updatedSettings);
  }

  async deleteChat(id: string): Promise<void> {
    await this.chatRepository.deleteChat(id);
  }

  async sendMessage(newMessage: MessageAttributes, id: string): Promise<MessageAttributes | Err> {
    const createdMessage = await this.chatRepository.sendMessage(newMessage,id);
    return createdMessage;
  }

  async deleteMessageForMe(id: {[x: string]: string}): Promise<string> {
    return await this.chatRepository.deleteMessageForMe(id);
  }

  async deleteMyMessage(id: {[x: string]: string}): Promise<string> {
    return await this.chatRepository.deleteMyMessage(id);
  }

  async editMessage(id: {[x: string]: string}, updatedAttributes: Partial<MessageAttributes>): Promise<string> {
    return await this.chatRepository.editMessage(id, updatedAttributes);
  }
}

export default ChatSystem;