import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import { emitViaSocketServer } from "@/lib/socket";
import { prepareStatusReply } from "@/lib/statusReplyServer";
import { getAuthenticatedUserId } from "@/lib/statusServer";

/**
 * Gets the DM a voice reply goes to, after the same checks as a text reply. The voice note itself
 * is then sent over the socket like any chat message, so the file takes the usual upload path.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ message: "Invalid status id" }, { status: 400 });

    const prepared = await prepareStatusReply(userId, id);
    if (prepared.error) return prepared.error;
    const { status, dm } = prepared;

    // A brand-new DM has to reach the sender's screen before the first message does.
    if (dm.created) {
      try {
        await emitViaSocketServer(userId, "addChat", { chat: { _id: dm.chatId } });
      } catch (error) {
        console.error("[api/statuses/:id/reply-chat] addChat failed:", error);
        return NextResponse.json({ message: "Could not open the chat. Try again." }, { status: 502 });
      }
    }
    return NextResponse.json({ data: { chatId: dm.chatId, receiverId: status.userId } });
  } catch (error) {
    console.error("[api/statuses/:id/reply-chat] POST failed:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
