import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import { MongoDBClient } from "@/lib/mongodb";
import { findLiveStatus, getAuthenticatedUserId } from "@/lib/statusServer";
import type { StatusViewerDetail } from "@/lib/types/status";

/** Who viewed a status, newest first, with names. Only the owner may ask. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid status id" }, { status: 400 });
    }

    const db = await new MongoDBClient().init();
    const status = await findLiveStatus(db, id);
    if (!status) return NextResponse.json({ message: "Status not found" }, { status: 404 });
    if (status.userId !== userId) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const [views, likes] = await Promise.all([
      db.statusViewers().find({ statusId: id }).sort({ viewedAt: -1 }).limit(500).toArray(),
      db.statusLikes().find({ statusId: id }).project({ userId: 1 }).toArray(),
    ]);
    const liked = new Set(likes.map((like) => like.userId));
    const ids = views.map((view) => view.viewerId).filter((v) => ObjectId.isValid(v));
    const users = ids.length
      ? await db
          .users()
          .find({ _id: { $in: ids.map((v) => new ObjectId(v)) } })
          .project({ name: 1, firstname: 1, lastname: 1, username: 1, displayPicture: 1, verified: 1 })
          .toArray()
      : [];
    const byId = new Map(users.map((user) => [user._id.toString(), user]));

    const data: StatusViewerDetail[] = views.map((view) => {
      const user = byId.get(view.viewerId);
      return {
        userId: view.viewerId,
        name:
          user?.name ||
          `${user?.firstname ?? ""} ${user?.lastname ?? ""}`.trim() ||
          user?.username ||
          "Velo user",
        username: user?.username || "",
        displayPicture: user?.displayPicture || "",
        verified: Boolean(user?.verified),
        viewedAt: view.viewedAt,
        liked: liked.has(view.viewerId),
      };
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[api/statuses/:id/viewers] GET failed:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
