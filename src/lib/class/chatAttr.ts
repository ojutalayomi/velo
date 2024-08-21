import { ChatAttributes, ChatSettings, User } from "../types/type";


export default class Chat {
    constructor({
        id, name, lastMessage, timestamp, unread, chatId, chatType, participants,
        chatSettings, messageId, senderId, messageContent, messageType, isRead,
        reactions, attachments, favorite, pinned, deleted, archived, lastUpdated,
    }: ChatAttributes) {
        this.id = id;
        this.name = name;
        this.lastMessage = lastMessage;
        this.timestamp = timestamp;
        this.unread = unread;
        this.chatId = chatId;
        this.chatType = chatType;
        this.participants = participants;
        this.chatSettings = chatSettings;
        this.messageId = messageId;
        this.senderId = senderId;
        this.messageContent = messageContent;
        this.messageType = messageType;
        this.isRead = isRead;
        this.reactions = reactions;
        this.attachments = attachments;
        this.favorite = favorite;
        this.pinned = pinned;
        this.deleted = deleted;
        this.archived = archived;
        this.lastUpdated = lastUpdated;
    }
    id: number;
    name: string;
    lastMessage: string;
    timestamp: string;
    unread: boolean;
    chatId: string | undefined;
    chatType: string;
    participants: User[] | undefined;
    chatSettings: ChatSettings | undefined;
    messageId: string | undefined;
    senderId: number | undefined;
    messageContent: string | undefined;
    messageType: string | undefined;
    isRead: boolean | undefined;
    reactions: any[] | undefined;
    attachments: any[] | undefined;
    favorite: boolean | undefined;
    pinned: boolean;
    deleted: boolean;
    archived: boolean;
    lastUpdated: string;
}