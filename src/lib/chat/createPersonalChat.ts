import { ObjectId } from 'mongodb';
import { ChatType, UserSchema, NewChatSettings, ChatParticipant } from '@/lib/types/type';
import { MongoDBClient } from '@/lib/mongodb';

export async function createPersonalChatForUser(user: UserSchema, db: MongoDBClient) {
  if (!user._id) {
    throw new Error('User _id is required to create a personal chat');
  }
  const userIdStr = user._id.toString();
  const userName = typeof user.name === 'string' ? user.name : '';
  const userDisplayPicture = typeof user.displayPicture === 'string' ? user.displayPicture : '';
  const newID = new ObjectId();
  const chatSettings: NewChatSettings = {
    _id: new ObjectId(),
    chatId: newID.toString(),
    isMuted: false,
    isPinned: false,
    isArchived: false,
    notificationSound: '',
    notificationVolume: 0,
    wallpaper: '',
    theme: 'light',
    members: [userIdStr],
    isBlocked: false,
    lastSeen: new Date().toISOString(),
  };

  const chat = {
    _id: newID,
    name: { [userIdStr]: userName },
    chatType: 'Personal' as ChatType,
    groupDescription: '',
    groupDisplayPicture: '',
    verified: false,
    adminIds: [userIdStr],
    isPrivate: false,
    inviteLink: '',
    timestamp: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    lastMessageId: '',
  };

  const participant: ChatParticipant = {
    _id: new ObjectId(),
    unreadCount: 0,
    favorite: false,
    pinned: false,
    deleted: false,
    archived: false,
    chatSettings,
    displayPicture: userDisplayPicture,
    userId: userIdStr,
    chatId: chat._id.toString(),
    chatType: 'Personal',
  };

  await db.chats().insertOne(chat);
  await db.chatParticipants().insertOne(participant);

  return chat;
} 