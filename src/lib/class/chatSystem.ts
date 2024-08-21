import { ChatAttributes, ChatSettings } from "../types/type";
import Chat from "./chatAttr";

export default class ChatSystem {
    private chats: Map<number, Chat> = new Map();
  
    addChat(chatAttributes: ChatAttributes): void {
      const chat = new Chat(chatAttributes);
      this.chats.set(chat.id, chat);
    }
  
    getChat(id: number): Chat | undefined {
      return this.chats.get(id);
    }
  
    updateChat(id: number, updatedAttributes: Partial<ChatAttributes>): void {
      const chat = this.getChat(id);
      if (chat) {
        Object.assign(chat, updatedAttributes);
      }
    }
  
    deleteChat(id: number): void {
      this.chats.delete(id);
    }
  
    getAllChats(): Chat[] {
      return Array.from(this.chats.values());
    }
  
    getAllChatsByType(chatType: string): Chat[] {
      return this.getAllChats().filter((chat) => chat.chatType === chatType);
    }
  
    getAllUnreadChats(): Chat[] {
      return this.getAllChats().filter((chat) => chat.unread);
    }
  
    getAllFavoriteChats(): Chat[] {
      return this.getAllChats().filter((chat) => chat.favorite);
    }
  
    getAllPinnedChats(): Chat[] {
      return this.getAllChats().filter((chat) => chat.pinned);
    }
  
    getAllArchivedChats(): Chat[] {
      return this.getAllChats().filter((chat) => chat.archived);
    }
  
    getAllDeletedChats(): Chat[] {
      return this.getAllChats().filter((chat) => chat.deleted);
    }
  
    markChatAsRead(id: number): void {
      const chat = this.getChat(id);
      if (chat) {
        chat.unread = false;
      }
    }
  
    toggleChatFavorite(id: number): void {
      const chat = this.getChat(id);
      if (chat) {
        chat.favorite = !chat.favorite;
      }
    }
  
    toggleChatPin(id: number): void {
      const chat = this.getChat(id);
      if (chat) {
        chat.pinned = !chat.pinned;
      }
    }
  
    toggleChatArchive(id: number): void {
      const chat = this.getChat(id);
      if (chat) {
        chat.archived = !chat.archived;
      }
    }
  
    toggleChatDelete(id: number): void {
      const chat = this.getChat(id);
      if (chat) {
        chat.deleted = !chat.deleted;
      }
    }
  
    updateChatSettings(id: number, updatedSettings: Partial<ChatSettings>): void {
      const chat = this.getChat(id);
      if (chat && chat.chatSettings) {
        Object.assign(chat.chatSettings, updatedSettings);
      }
    }
  }