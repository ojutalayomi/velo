import { CopyObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import { MongoDBClient } from "@/lib/mongodb";
import { createStatusForUser } from "@/lib/statusCreate";
import { statusForwardBlockReason } from "@/lib/statusForward";
import { statusPayloadFor } from "@/lib/statusForwardServer";
import { getAuthenticatedUserId } from "@/lib/statusServer";
import { BUCKETNAME, s3ObjectUrl } from "@/lib/types/s3";

const CHAT_BUCKET = "files-for-chat";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

/** Adds a chat message (text, photo, video or voice note) to the user's own status. */
export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { messageId } = (await request.json().catch(() => ({}))) as { messageId?: unknown };
    if (typeof messageId !== "string" || !ObjectId.isValid(messageId)) {
      return NextResponse.json({ message: "Invalid message" }, { status: 400 });
    }

    const db = await new MongoDBClient().init();
    const message = await db.chatMessages().findOne({ _id: new ObjectId(messageId) });
    // Same answer for a missing message and one from a chat the user isn't in.
    const member = message
      ? await db.chatParticipants().findOne({ chatId: String(message.chatId), userId }, { projection: { _id: 1 } })
      : null;
    if (!message || !member) return NextResponse.json({ message: "Message not found" }, { status: 404 });

    const blocked = statusForwardBlockReason({
      messageType: message.messageType,
      content: message.content,
      attachmentCount: message.attachments?.length ?? 0,
      viewOnce: Boolean((message as { viewOnce?: boolean }).viewOnce),
    });
    if (blocked) return NextResponse.json({ message: blocked }, { status: 422 });

    const needsFile = message.messageType !== "Text";
    const file = needsFile ? await db.files().findOne({ key: String(message.attachments[0]) }) : null;
    if (needsFile && (!file || !file.key)) {
      return NextResponse.json({ message: "That file is no longer available" }, { status: 410 });
    }

    const payload = statusPayloadFor(
      { messageType: message.messageType, content: message.content },
      file ? { name: file.name, type: file.type } : null
    );
    if (!payload) return NextResponse.json({ message: "There's nothing to share" }, { status: 422 });

    let item: Record<string, unknown> = payload;
    if (file) {
      // The status gets its own copy, so deleting the chat message never breaks it.
      const destKey = `status-forward/${new ObjectId().toHexString()}-${file.name}`;
      await s3.send(
        new CopyObjectCommand({
          Bucket: BUCKETNAME.ARTICLE,
          Key: destKey,
          CopySource: `${CHAT_BUCKET}/${file.key.split("/").map(encodeURIComponent).join("/")}`,
          ACL: "public-read",
        })
      );
      item = {
        ...payload,
        mediaKey: destKey,
        mediaUrl: s3ObjectUrl(`https://${BUCKETNAME.ARTICLE}.s3.amazonaws.com/`, destKey),
      };
    }

    const created = await createStatusForUser(userId, { ...item, items: [item], caption: "" }, db);
    if (!created) return NextResponse.json({ message: "Couldn't create the status" }, { status: 422 });
    return NextResponse.json({ data: created.group ? [created.group] : [] }, { status: 201 });
  } catch (error) {
    console.error("[api/statuses/forward] POST failed:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
