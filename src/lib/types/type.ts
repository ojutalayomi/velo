import { ObjectId } from "mongodb";

export interface User {
    name: string;
    id: number;
}

export interface ReadReceipt {
    _id: ObjectId;
    messageId: string;
    userId: string;
    chatId: string;
    readAt: string;
}

export interface Reaction{
  _id: ObjectId,
  messageId: string,
  userId: string,
  reaction: string,
  timestamp: string
}

export type ChatType = 'Personal' | 'DMs' | 'Groups' | 'Channels';

export interface ChatData {
  _id: ObjectId;
  name: {
      [id: string]: string
  };
  chatType: ChatType;
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

export interface ChatSettings {
    _id: ObjectId;
    chatId: string;
    // General settings
    isMuted: boolean;
    isPinned: boolean;
    isArchived: boolean;
    notificationSound: string; // Path to a sound file
    notificationVolume: number; // Volume level (0-100)
    wallpaper: string; // Path to an image file
    theme: 'light' | 'dark';
  
    // Specific to group chats
    isPrivate?: boolean;
    inviteLink?: string;
    members: string[]; // List of user IDs
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
    chatType: ChatType;
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
    chatType: ChatType;
    participants: string[];
    chatSettings: ChatSettings
    lastUpdated: Date | string | undefined;
    displayPicture?: string,
}

export interface NewChat {
    _id?: string | ObjectId | undefined; // Assuming ObjectId is converted to string
    id?: string;
    name: { [id: string]: string };
    chatType: ChatType;
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

export interface ChatParticipant {
    _id: ObjectId;
    chatId: string;
    unreadCount: number;
    favorite: boolean;
    pinned: boolean;
    deleted: boolean;
    archived: boolean;
    chatSettings: ChatSettings;
    displayPicture: string;
    userId: string;
    chatType: ChatType;
}

export interface NewChatSettings {
    _id: ObjectId; // Assuming ObjectId is converted to string
    chatId: string; // Reference to the chat in Chats collection
  
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

export type msgStatus = 'sending' | 'sent' | 'delivered' | 'failed';

export type Attachment = {
    name: string; // File name (e.g., "image.png")
    type: string; // MIME type (e.g., "image/png")
    data: number[]; // File content as an array of bytes (Uint8Array converted to number[])
    url?: string;
    size? : number;
    lastModified?: number;
}

export interface MessageAttributes {
    _id?: ObjectId | string;
    chatId: string;
    senderId: string;
    receiverId: string;
    content: string;
    timestamp: string;
    isRead?: { [participantId: string]: boolean }; // Object with participant IDs as keys and their read status as values
    messageType: string;
    reactions: Reaction[];
    attachments: Attachment[];
    quotedMessageId: string;
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
    attachments: Attachment[];
    quotedMessageId: string;
    status: msgStatus;
}

export interface Err {
    [x: string]: string
}

export interface UserData{
    _id?: ObjectId | string | undefined,
    bio?: string,
    confirmationToken?: string,
    coverPhoto?: string,
    dob?: string,
    displayPicture?: string,
    email: string,
    firstname: string,
    followers?: number,
    following?: number,
    isEmailConfirmed?: boolean,
    isFollowing?: boolean,
    isPrivate?: boolean,
    lastLogin?: string,
    lastname: string,
    lastResetAttempt?: {
      [x: string]: string
    },
    lastSeen?: string,
    lastUpdate?: string[],
    location?: string,
    loginToken?: string,
    name: string,
    noOfUpdates?: number,
    password?: string,
    password_reset_time?: string,
    providers: {
        [x: string]: {
            id: string | undefined;
            lastUsed: string;
        };
    },
    resetAttempts?: number,
    resetToken?: string,
    resetTokenExpiry?: number,
    signUpCount?: number,
    theme?: string,
    time: string,
    userId: string,
    username: string,
    verified?: boolean,
    website?: string
  }

export interface UserSchema extends UserData {
    _id?: ObjectId,
    password: string,
    signUpCount?: number,
    resetToken?: string,
    resetTokenExpiry?: number,
    confirmationToken?: string,
    loginToken?: string,
    noOfUpdates?: number,
}

export interface PostSchema_ {
    _id: {
        $oid: string
    };
    DisplayPicture: string;
    NameOfPoster: string;
    Verified: boolean;
    TimeOfPost: string;
    Caption: string;
    Image: string[];
    IsFollowing?: boolean;
    NoOfLikes: {
        $numberInt: string
    };
    Liked: boolean;
    NoOfComment: {
        $numberInt: string
    };
    NoOfShares: {
        $numberInt: string
    };
    NoOfBookmarks: {
        $numberInt: string
    };
    Bookmarked: boolean;
    Username: string;
    PostID: string;
    Code: string;
    WhoCanComment: string;
    Shared: boolean;
    Type: string;
    ParentId: string;
}


export type AllChats = {
    chats: ChatDataClient[],
    chatSettings: {
        [key: string]: NewChatSettings;
    };
    messages?: (MessageAttributes)[],
    requestId: string
}


export type AllChatsServer = {
    chats: ChatDataServer[],
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
    chat: ChatDataClient;
    requestId: string;
}

export interface ChatDataServer {
    _id: ObjectId;
    name: {
        [id: string]: string
    };
    chatType: ChatType;
    groupDescription: string;
    groupDisplayPicture: string;
    verified: boolean;
    adminIds: string[];
    inviteLink: string;
    isPrivate: boolean;
    timestamp: string;
    lastMessageId: string;
    lastUpdated: string;
}

export interface ChatDataClient extends ChatDataServer {
    participants: ChatParticipant[];
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
    isTypingList: {
        id: string,
        name: string,
        displayPicture: string,
        username: string,
        isTyping: boolean,
        chatId: string
    }[]
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

export type GoogleAuth = {
    User: {
        id: string,
        name: string,
        email: string,
        image: string
    }, 
    Account: {
        provider: string,
        type: string,
        providerAccountId: string,
        access_token: string,
        expires_at: number,
        scope: string,
        token_type: string,
        id_token: string
    } 
    Profile: {
        iss: string,
        azp: string,
        aud: string,
        sub: string,
        email: string,
        email_verified: boolean,
        at_hash: string,
        name: string,
        picture: string,
        given_name: string,
        family_name: string,
        iat: number,
        exp: number
    }
}
export type ReactionType = {
    type: 'like' | 'bookmark' | 'unlike' | 'unbookmark';
    key1: 'Liked' | 'Bookmarked';
    value1: boolean;
    key2: 'NoOfLikes' | 'NoOfBookmarks';
    value: 'inc' | 'dec',
    postId: string;
};
export interface ClientComponentsProps {
    children: React.ReactNode;
}
export interface ConvoTypeProp {
    conversations: ConvoType[];
}
export interface FileValidationConfig {
    maxFileSize: number; // in bytes
    maxTotalSize: number; // in bytes
    maxFiles: number;
    allowedFileTypes: string | string[];
}

export type TextOverlay = {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  align: string;
  isDragging: boolean;
  dragOffset: { x: number; y: number; };
};
export interface Payload {
  _id: string;
  exp: number;
}
export interface PostSchema {
  _id: string;
  UserId: string;
  DisplayPicture: string;
  NameOfPoster: string;
  Verified: boolean;
  TimeOfPost: string;
  Visibility: 'everyone' | 'friends' | 'none';
  Caption: string;
  Image: string[];
  IsFollowing: boolean;
  NoOfLikes: number;
  Liked: boolean;
  NoOfComment: number;
  NoOfShares: number;
  NoOfBookmarks: number;
  Bookmarked: boolean;
  Username: string;
  PostID: string;
  Code: string;
  WhoCanComment: 'everyone' | 'friends' | 'none';
  Shared: boolean;
  Type: "post" | "comment" | "repost" | "quote";
  ParentId: string;
  OriginalPostId?: string;
}

export interface UserSettings {
  twoFactorAuth: boolean;
  loginAlerts: boolean;
  showOnlineStatus: boolean;
  showLastSeen: boolean;
  showReadReceipts: boolean;
  showTypingStatus: boolean;
}