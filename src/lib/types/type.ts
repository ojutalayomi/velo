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
    id: number; // Or string depending on your chat ID format
    name: string;
    lastMessage: string;
    timestamp: string; // Consider using a specific date/time type library
    unread: boolean;
    chatId?: string; // Optional chat ID
    chatType: 'Chats' | 'Groups' | 'Channels';
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