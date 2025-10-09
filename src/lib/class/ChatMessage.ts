import {
  Attachment,
  ChatType,
  MessageAttributes,
  MessageType,
  msgStatus,
  Reaction,
} from "../types/type";

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

  // constructor to force use of factory methods
  constructor(data: MessageAttributes) {
    // Generate a placeholder MongoDB ID
    this._id = data._id;
    this.chatId = data.chatId;
    this.receiverId = data.receiverId;
    this.content = data.content;
    this.timestamp = data.timestamp || new Date().toISOString(); // Current time
    this.messageType = data.messageType || ChatMessage.determineMessageType(data);
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

  public copy(): MessageAttributes {
    return this.toMessageAttributes();
  }

  /**
   * Implements the logic hierarchy to determine the correct messageType
   * based on attachments and content.
   */
  private static determineMessageType(data: any): MessageType {
    const content = data.content || '';
    const attachments: Attachment[] = data.attachments || [];
    const mimeType = attachments.length > 0 ? attachments[0].type : null;

    // --- 1. Structured & Interactive Types (Highest Priority) ---

    // Note: Poll/PollResponse/Announcement typically rely on specific 
    // structured data fields (e.g., data.pollData, data.isSystemMessage)
    if (data.pollData) {
      // Logic to distinguish Poll/PollResponse/etc would go here
      return "Poll"; 
    }
    if (data.isSystemMessage) {
      return "Announcement";
    }

    // --- 2. Media & File Types (High Priority) ---
    if (mimeType) {
      if (mimeType === 'image/gif') return "AnimatedGIF";
      if (mimeType.startsWith('image/')) return "Image";
      if (mimeType.startsWith('video/')) return "Video";
      if (mimeType.startsWith('audio/')) return "Audio";
      
      // Fallback for all other files
      return "File";
    }

    // --- 3. Text-Based Types (Lowest Priority) ---
    
    // Check for Link (Content is ONLY a URL)
    const urlPattern = /^(http|https):\/\/[^ "]+$/;
    if (urlPattern.test(content.trim())) {
      return "Link"; // Use the recommended specific type for rich previews
    }

    // Check for Sticker (Simplified check - usually based on matching a database ID or large emoji)
    // NOTE: In production, this is done via a specific Sticker ID field, not content matching.
    if (content.length > 0 && content.length <= 10 && !/\s/.test(content)) {
      // Very basic heuristic for a short, single item (like a single large emoji)
      // For real apps, you'd check for a 'stickerId' field.
      // Assuming it's not a sticker for simplicity, letting it fall to Text
      // return "Sticker"; 
    }

    // Default Fallback
    if (content.length > 0) {
      return "Text";
    }

    // Failsafe for an empty message (shouldn't happen in a valid chat system)
    return "Text"; 
  }
}
