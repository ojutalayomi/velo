import {
  Attachment,
  ChatType,
  MessageAttributes,
  MessageType,
  msgStatus,
  Reaction,
} from "../types/type";

/**
 * Client-side version of ChatMessage that doesn't use MongoDB
 * This is safe to use in client components
 */
export class ChatMessageClient implements MessageAttributes {
  public _id: string;
  public chatId: string;
  public receiverId: string;
  public content: string;
  public timestamp: string;
  public messageType: MessageType;
  public isRead: Record<string, boolean>;
  public chatType: ChatType;
  public sender: {
    id: string;
    name: string;
    displayPicture: string;
    username: string;
    verified: boolean;
  };

  public reactions: Reaction[];
  public attachments: Attachment[];
  public quotedMessageId: string;
  public status: msgStatus;

  constructor(data: MessageAttributes) {
    // Generate a placeholder ID (not ObjectId)
    this._id = data._id?.toString() || Math.random().toString(36).substr(2, 9);
    this.chatId = data.chatId;
    this.receiverId = data.receiverId;
    this.content = data.content;
    this.timestamp = data.timestamp || new Date().toISOString();
    this.messageType = data.messageType;
    this.isRead = data.isRead || {};
    this.sender = data.sender;
    this.reactions = data.reactions;
    this.attachments = data.attachments;
    this.quotedMessageId = data.quotedMessageId;
    this.status = data.status;
    this.chatType = data.chatType;
  }

  public toMessageAttributes(): MessageAttributes {
    return {
      _id: this._id,
      chatId: this.chatId,
      receiverId: this.receiverId,
      content: this.content,
      timestamp: this.timestamp,
      messageType: this.messageType,
      isRead: this.isRead,
      sender: this.sender,
      reactions: this.reactions,
      attachments: this.attachments,
      quotedMessageId: this.quotedMessageId,
      status: this.status,
      chatType: this.chatType,
    };
  }
}
