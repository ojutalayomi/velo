import { ObjectId } from "mongodb";
import { ChatAttributes, ChatSettings, NewChatResponse, User } from "../types/type";


export class Newchat {
    constructor({
        _id, name, lastMessageId, timestamp, unreadCounts, 
        chatType, participants, chatSettings, lastUpdated,
    }: NewChatResponse) {
        this._id = _id;
        this.name = name;
        this.lastMessageId = lastMessageId;
        this.timestamp = timestamp;
        this.unreadCounts = unreadCounts;
        this.chatType = chatType;
        this.participants = participants;
        this.chatSettings = chatSettings;
        this.lastUpdated = lastUpdated;
    }
    _id: ObjectId | string | undefined;
    name: string;
    lastMessageId: string; // Assuming ObjectId is converted to string
    timestamp: string;
    unreadCounts: { [participantId: string]: number; };
    chatType: 'Chats' | 'Groups' | 'Channels';
    participants: string[]; // Assuming participants are represented by their IDs
    chatSettings: ChatSettings
    lastUpdated: string | Date | undefined;
}

export default class Chat {
    constructor({
        _id, name, lastMessage, timestamp, unread, chatId, chatType, participants,
        chatSettings, messageId, senderId, messageContent, messageType, isRead,
        reactions, attachments, favorite, pinned, deleted, archived, lastUpdated,
    }: ChatAttributes) {
        this._id = _id;
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
    _id: ObjectId | undefined;
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