
import { ChatDataClient, MessageAttributes } from "../types/type";
import { Time } from "../utils";

export class Chat {
  private chat: ChatDataClient;
  private messages: MessageAttributes[] | [];

  constructor(newChat: ChatDataClient, messages?: MessageAttributes[]) {
    this.chat = newChat;
    this.messages = messages || [];
  }

  private filter(param: string,) {
    if (!this.messages) return;
    const filteredResults = this.messages.filter(msg => msg._id === param);
    const result = filteredResults[0];
    return filteredResults.length > 0
      ? `${result.attachments.length > 0 ? "📷 " : ""}${result.content}`
      : null;
  }

  private getName = (uid: string) =>
    this.chat.participants.length === 1
      ? this.chat.name[uid]
      : this.chat.name[
          Object.keys(this.chat.name).find((e) => !e.includes(uid)) || "Unknown Participant"
        ];

  public getConvo(uid: string) {
    const participant = this.chat.participants.find((p) => p.userId === uid);
    const displayPicture = this.chat.participants
        ? this.chat.participants.length > 1
          ? this.chat.participants.find((p) => p.userId !== uid)?.displayPicture
          : this.chat.participants.find((p) => p.userId === uid)?.displayPicture
        : undefined;
        
    return {
      id: this.chat._id.toString(),
      type: this.chat.chatType,
      name:
        this.chat.chatType === "DM"
          ? this.getName(uid)
          : this.chat.chatType === "Personal"
            ? this.chat.name[uid]
            : this.chat.name.group,
      lastMessage: this.chat.lastMessageId
        ? this.filter(this.chat.lastMessageId) || "🚫 Message not found"
        : "📝 Be the first to send a message",
      timestamp: this.chat.timestamp,
      unread: participant?.unreadCount || 0,
      displayPicture:
        this.chat.chatType === "DM" || this.chat.chatType === "Personal"
          ? (displayPicture as string)
          : this.chat.groupDisplayPicture,
      description: this.chat.chatType === "DM" || this.chat.chatType === "Personal" ? "" : this.chat.groupDescription,
      verified: this.chat.verified || false,
      favorite: participant?.favorite || false,
      pinned: participant?.pinned || false,
      deleted: participant?.deleted || false,
      archived: participant?.archived || false,
      lastUpdated: Time(this.chat.lastUpdated),
      participants: this.chat.participants.map((p) => p.userId),
      online: false,
      isTypingList: [],
    };
  }
}
