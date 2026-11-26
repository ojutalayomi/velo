import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import { emitSequenceViaSocketServer } from "@/lib/socket";
import { prepareStatusReply } from "@/lib/statusReplyServer";
import { getAuthenticatedUserId, MAX_STATUS_REPLY_LENGTH } from "@/lib/statusServer";

/**
 * Reply to someone's status. The reply is an ordinary message in your DM with them (made if you
 * don't have one yet), carrying the status along so the chat can show what it answers. The socket
 * server builds that status card itself from the status in the database.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid status id" }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as { content?: unknown };
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!content || content.length > MAX_STATUS_REPLY_LENGTH) {
      return NextResponse.json(
        { message: `Write a reply of up to ${MAX_STATUS_REPLY_LENGTH} characters` },
        { status: 400 }
      );
    }

    const prepared = await prepareStatusReply(userId, id);
    if (prepared.error) return prepared.error;
    const { db, status, dm } = prepared;

    const me = await db
      .users()
      .findOne(
        { _id: new ObjectId(userId) },
        { projection: { name: 1, username: 1, displayPicture: 1, verified: 1 } }
      );
    const messageId = new ObjectId().toString();
    const message = {
      _id: messageId,
      chatId: dm.chatId,
      receiverId: status.userId,
      // The socket server replaces the sender with the connected account.
      sender: {
        id: userId,
        name: me?.name ?? "",
        username: me?.username ?? "",
        displayPicture: me?.displayPicture ?? "",
        verified: Boolean(me?.verified),
      },
      content,
      timestamp: new Date().toISOString(),
      chatType: "DM",
      messageType: "Text",
      reactions: [],
      attachments: [],
      quotedMessageId: "",
      status: "sent",
      mentions: [],
      // Only the id: what the card shows is read from the status on the socket server.
      statusReply: { statusId: id },
    };

    try {
      await emitSequenceViaSocketServer(userId, [
        ...(dm.created
          ? [{ event: "addChat" as const, payload: { chat: { _id: dm.chatId } } }]
          : []),
        { event: "chatMessage" as const, payload: message },
      ]);
    } catch (error) {
      console.error(
        "[api/statuses/:id/reply] could not hand the message to the socket server:",
        error
      );
      return NextResponse.json(
        { message: "Could not send your reply. Try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ message: "Reply sent", data: { chatId: dm.chatId, messageId } });
  } catch (error) {
    console.error("[api/statuses/:id/reply] POST failed:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
