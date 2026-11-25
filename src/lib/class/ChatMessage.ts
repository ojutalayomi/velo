import {
  Attachment,
  ChatType,
  Mention,
  MessageAttributes,
  MessageType,
  msgStatus,
  Reaction,
} from "../types/type";
import { deriveMessageType } from "../messageType";
import type { StatusReplyPreview } from "../types/status";

/**
 * Represents a simplified chat message object in the application's database.
 */
export class ChatMessage implements MessageAttributes {
  public _id: string;
  public chatId: string;
  public receiverId: string;
  public content: string; // This is the field we want to populate
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
  public mentions: Mention[];
  public forwarded?: boolean;
  public statusReply?: StatusReplyPreview;

  // constructor to force use of factory methods
  constructor(data: MessageAttributes) {
    // Generate a placeholder MongoDB ID
    this._id = data._id;
    this.chatId = data.chatId;
    this.receiverId = data.receiverId;
    this.content = data.content;
    this.timestamp = data.timestamp || new Date().toISOString(); // Current time
    this.messageType = ChatMessage.determineMessageType(data);
    this.isRead = data.isRead || {};
    this.sender = data.sender;
    this.reactions = data.reactions;
    this.attachments = data.attachments;
    this.quotedMessageId = data.quotedMessageId;
    this.status = data.status;
    this.chatType = data.chatType;
    this.mentions = data.mentions ?? [];
    if (data.forwarded) this.forwarded = true;
    if (data.statusReply) this.statusReply = data.statusReply;
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
      mentions: this.mentions,
      ...(this.forwarded ? { forwarded: true } : {}),
      ...(this.statusReply ? { statusReply: this.statusReply } : {}),
    };
  }

  public copy(): MessageAttributes {
    return this.toMessageAttributes();
  }

  /**
   * The type follows from the content and attachments (see lib/messageType.ts). It is derived
   * again by `retype()` once attachments have been added, and by the server, which is authoritative.
   */
  private static determineMessageType(data: any): MessageType {
    // Marker fields that predate the explicit type.
    if (data.pollData) return "Poll";
    if (data.isSystemMessage) return "Announcement";
    return deriveMessageType({
      content: data.content,
      attachments: data.attachments,
      requested: data.messageType,
    });
  }

  /** Re-derives the type; call after attachments were added to a freshly built message. */
  public retype(requested?: string): this {
    this.messageType = deriveMessageType({
      content: this.content,
      attachments: this.attachments,
      requested: requested ?? this.messageType,
    });
    return this;
  }
}
