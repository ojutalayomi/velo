import { ObjectId } from "mongodb";

export interface User {
    name: string;
    id: number;
}

export interface ChatSettings {
    // General settings
    isMuted: boolean;
    isPinned: boolean;
    isArchived: boolean;
    notificationSound?: string; // Path to a sound file
    notificationVolume?: number; // Volume level (0-100)
    wallpaper?: string; // Path to an image file
    theme: 'light' | 'dark';
  
    // Specific to group chats
    isPrivate?: boolean;
    inviteLink?: string;
    members?: string[]; // List of user IDs
    adminIds?: string[]; // List of admin user IDs
  
    // Specific to direct messages
    isBlocked: boolean;
    lastSeen: string; // Timestamp of the last time the user was online
}

export interface ChatAttributes {
    _id?: ObjectId; // Or string depending on your chat ID format
    name: string;
    lastMessage: string;
    timestamp: string; // Consider using a specific date/time type library
    unread: boolean;
    chatId?: string; // Optional chat ID
    chatType: 'DMs' | 'Groups' | 'Channels';
    participants?: User[]; // Separate type for participants
    chatSettings?: ChatSettings; // Separate type for settings
    messageId?: string;
    senderId?: number; // Or string depending on your user ID format
    messageContent?: string;
    messageType?: string;
    isRead?: boolean;
    reactions?: any[]; // Consider a specific type if needed
    attachments?: any[]; // Consider a specific type if needed
    favorite?: boolean;
    pinned: boolean;
    deleted: boolean;
    archived: boolean;
    lastUpdated: string; // Consider using a specific date/time type library
}

export interface NewChatResponse {
    _id?: string | ObjectId | undefined; // Assuming ObjectId is converted to string
    name: string;
    lastMessageId: string;
    timestamp: string;
    unreadCounts: { [participantId: string]: number };
    chatType: 'DMs' | 'Groups' | 'Channels';
    participants: string[];
    chatSettings: ChatSettings
    lastUpdated: Date | string | undefined;
    displayPicture?: string,
}

export interface NewChat {
    _id?: string | ObjectId | undefined; // Assuming ObjectId is converted to string
    id?: string;
    name: { [id: string]: string };
    chatType: 'DMs' | 'Groups' | 'Channels';
    groupDescription: string;
    groupDisplayPicture: string;
    participants: string[]; // Assuming participants are represented by their IDs
    participantsImg?: { [participantId: string]: string };
    lastMessageId: string; // Assuming ObjectId is converted to string
    unreadCounts: { [participantId: string]: number };
    favorite: boolean;
    pinned: boolean;
    deleted: boolean;
    archived: boolean;
    lastUpdated?: Date | undefined;
    timestamp?: Date | undefined;
}

export interface NewChatSettings {
    _id: ObjectId; // Assuming ObjectId is converted to string
    chatId: ObjectId; // Reference to the chat in Chats collection
  
    // General settings
    isMuted: boolean;
    isPinned: boolean;
    isArchived: boolean;
    notificationSound: string; // Path to a sound file
    notificationVolume: number; // Volume level (0-100)
    wallpaper: string; // Path to an image file
    theme: 'light' | 'dark';
  
    // Specific to group chats
    members: string[]; // List of user IDs
  
    // Specific to direct messages
    isBlocked: boolean;
    lastSeen: string; // ISO timestamp of the last time the user was online
}

type Globals = "-moz-initial" | "inherit" | "initial" | "revert" | "revert-layer" | "unset";
export type UserSelect = "text" | "none" | Globals | "auto" | "-moz-none" | "all" | "contain" | "element"

interface Reaction {
    emoji: string;
    users: string[];
  }

export type msgStatus = 'sending' | 'sent' | 'delivered' | 'failed';
export interface MessageAttributes {
    _id?: ObjectId | string;
    chatId: ObjectId | string; // Reference to the chat in Chats collection
    senderId: string;
    receiverId: string;
    content: string;
    timestamp: string;
    messageType: string;
    isRead: { [participantId: string]: boolean }; // Object with participant IDs as keys and their read status as values
    reactions: Reaction[];
    attachments: string[];
    quotedMessage: string;
    status: msgStatus;
}

export interface GroupMessageAttributes {
    _id?: ObjectId | string;
    chatId: ObjectId | string; // Reference to the chat in Chats collection
    sender: {
        id: string;
        name: string;
        displayPicture: string;
        username: string;
        verified: boolean;
    };
    receiverId: string;
    content: string;
    timestamp: string;
    messageType: string;
    isRead: { [participantId: string]: boolean }; // Object with participant IDs as keys and their read status as values
    reactions: Reaction[];
    attachments: string[];
    quotedMessage: string;
    status: msgStatus;
}

export interface Err {
    [x: string]: string
}

export interface Schema {
    _id?: ObjectId,
    time?: string,
    userId?: string,
    firstname?: string,
    lastname?: string,
    email?: string,
    username?: string,
    password?: string,
    displayPicture?: string,
    isEmailConfirmed?: true,
    confirmationToken?: null,
    signUpCount?: 1,
    lastLogin?: string,
    loginToken?: string,
    lastResetAttempt?: {
      [x: string]: string
    },
    resetAttempts?: 6,
    password_reset_time?: string,
    theme?: string,
    verified?: true,
    followers?: [],
    following?: [],
    bio?: string,
    coverPhoto?: string,
    dob?: string,
    lastUpdate?: string[],
    location?: string,
    noOfUpdates?: 9,
    website?: string,
    resetToken?: string,
    resetTokenExpiry?: number,
    name?: string
}

export type AllChats = {
    chats: ChatData[],
    chatSettings: {
        [key: string]: NewChatSettings;
    };
    messages?: (MessageAttributes | GroupMessageAttributes)[],
    requestId: string
}

export interface Participant {
    id: string;
    lastMessageId: string;
    unreadCount: number;
    favorite: boolean;
    pinned: boolean;
    deleted: boolean;
    archived: boolean;
    chatSettings: NewChatSettings;
    displayPicture: string;
}

export interface NewChat_ {
    chat: ChatData;
    requestId: string;
}

export interface ChatData {
    _id: string;
    name: {
        [id: string]: string
    };
    chatType: 'DMs' | 'Groups' | 'Channels';
    participants: Participant[];
    groupDescription: string;
    groupDisplayPicture: string;
    verified: boolean;
    adminIds: string[];
    inviteLink: string;
    isPrivate: boolean;
    timestamp: string;
    lastUpdated: string;
}

export interface ConvoType {
    id: string;
    type: string;
    name: string;
    lastMessage: string;
    timestamp: string;
    unread: number;
    displayPicture: string;
    description: string;
    verified: boolean;
    favorite: boolean,
    pinned: boolean,
    deleted: boolean,
    archived: boolean,
    lastUpdated: string,
    participants: string[],
    online: boolean,
    isTyping: {
      [x: string]: boolean
    }
}
export type hook<P = any, Q = boolean, R = boolean> = {
    payload: P,
    suspense: Q,
    exit: R
}
export const ConvoType: Partial<hook<Partial<ConvoType>>> = {
    payload: {},
    suspense: false
};