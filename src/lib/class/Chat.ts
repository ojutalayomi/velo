import { previewFor } from "@/lib/chatPreview";
import { ChatDataClient, MessageAttributes } from "../types/type";
import { Time } from "../utils";

export class Chat {
  private chat: ChatDataClient;
  private messages: MessageAttributes[] | [];

  constructor(newChat: ChatDataClient, messages?: MessageAttributes[]) {
    this.chat = newChat;
    this.messages = messages || [];
  }

  private lastMessage(id: string) {
    return this.messages.find((msg) => msg._id === id) ?? null;
  }

  private getName = (uid: string) =>
    this.chat.participants.length === 1
      ? this.chat.name[uid]
      : this.chat.name[
          Object.keys(this.chat.name).find((e) => !e.includes(uid)) || "Unknown Participant"
        ];

  public getConvo(uid: string) {
    const participant = this.chat.participants.find((p) => p.userId === uid);
    const last = this.chat.lastMessageId ? this.lastMessage(this.chat.lastMessageId) : null;
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
      adminIds: this.chat.adminIds,
      onlyAdminsCanSend: this.chat.onlyAdminsCanSend ?? false,
      lastMessage: this.chat.lastMessageId
        ? (last && previewFor(last)) || "🚫 Message not found"
        : "📝 Be the first to send a message",
      lastMessageId: this.chat.lastMessageId || undefined,
      lastSenderId: last?.sender?.id,
      lastSenderName: last?.sender?.name,
      lastRead: last
        ? Object.entries(last.isRead ?? {}).some(([id, read]) => id !== last.sender?.id && read)
        : false,
      timestamp: this.chat.timestamp,
      lastSeenHidden: this.chat.lastSeenHidden ?? false,
      unread: participant?.unreadCount || 0,
      displayPicture:
        this.chat.chatType === "DM" || this.chat.chatType === "Personal"
          ? (displayPicture as string)
          : this.chat.groupDisplayPicture,
      description:
        this.chat.chatType === "DM" || this.chat.chatType === "Personal"
          ? ""
          : this.chat.groupDescription,
      verified: this.chat.verified || false,
      favorite: participant?.favorite || false,
      pinned: participant?.pinned || false,
      deleted: participant?.deleted || false,
      archived: participant?.archived || false,
      lastUpdated: Time(this.chat.lastUpdated),
      participants: this.chat.participants.map((p) => p.userId),
      isBot:
        this.chat.chatType === "DM" && this.chat.participants.some((p) => p.userId !== uid && p.isBot),
      online: false,
      isTypingList: [],
    };
  }
}
