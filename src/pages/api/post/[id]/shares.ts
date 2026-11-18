import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import { addInteractionFlags } from "@/lib/apiUtils";
import { MAX_API_LIMIT, pagingMeta, parsePaging } from "@/lib/apiPagination";
import { verifyToken } from "@/lib/auth";
import { SocialMediaUser, UserSchema } from "@/lib/class/User";
import { MongoDBClient } from "@/lib/mongodb";
import type { Payload, PostSchema } from "@/lib/types/type";

type ShareTab = "reposts" | "quotes";
type ShareType = "repost" | "quote";

function firstQueryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function shareTypeFromQuery(type: string | undefined): ShareType | null {
  if (type === "reposts") return "repost";
  if (type === "quotes") return "quote";
  return null;
}

async function getPayload(req: NextApiRequest): Promise<Payload | null> {
  const cookie = decodeURIComponent(req.cookies.velo_12 || "").replace(/"/g, "");
  if (!cookie) return null;

  try {
    return (await verifyToken(cookie)) as unknown as Payload;
  } catch {
    return null;
  }
}

async function searchPostFromMultipleCollections(db: MongoDBClient, id: string) {
  const post = await db.posts().findOne({ PostID: id });
  if (post) return post;

  const comment = await db.postsComments().findOne({ PostID: id });
  if (comment) return comment;

  const share = await db.postsShares().findOne({ PostID: id });
  if (share) return share;

  return null;
}

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const id = firstQueryValue(req.query.id);
  if (!id) {
    return res.status(400).json({ message: "Post ID is required" });
  }

  const rawType = firstQueryValue(req.query.type) as ShareTab | undefined;
  const shareType = shareTypeFromQuery(rawType);
  if (!shareType) {
    return res.status(400).json({ message: "type must be either reposts or quotes" });
  }

  try {
    const payload = await getPayload(req);
    const db = await new MongoDBClient().init();
    const target = await searchPostFromMultipleCollections(db, id);

    if (!target) {
      return res.status(404).json({ message: "Post not found" });
    }

    const { limit: pageLimit, skip } = parsePaging(req, {
      defaultLimit: 20,
      maxLimit: MAX_API_LIMIT,
    });
    const fetchLimit = pageLimit + 1;

    const rawShares = await db
      .postsShares()
      .find({ OriginalPostId: id, Type: shareType })
      .sort({ TimeOfPost: -1 })
      .skip(skip)
      .limit(fetchLimit)
      .toArray();

    const hasMore = rawShares.length > pageLimit;
    const posts = rawShares.slice(0, pageLimit) as PostSchema[];

    if (shareType === "repost") {
      const userIds = posts.map((post) => post.UserId).filter((id) => ObjectId.isValid(id));
      const hydratedUsers = userIds.length
        ? ((await db
            .users()
            .find({ _id: { $in: userIds.map((id) => new ObjectId(id)) } })
            .toArray()) as UserSchema[])
        : [];
      const usersById = new Map(hydratedUsers.map((user) => [user._id.toString(), user]));
      const orderedUsers = posts
        .map((post) => usersById.get(post.UserId))
        .filter((user): user is UserSchema => Boolean(user));
      const safeUsers = orderedUsers.map((user) => new SocialMediaUser(user).getClientSafeData());
      const safeUserIds = safeUsers.map((user) => user._id.toString());
      const followedByViewer =
        payload?._id && safeUserIds.length
          ? await db
              .followers()
              .find({
                followerId: payload._id,
                followedId: { $in: safeUserIds.filter((id) => id !== payload._id) },
              })
              .toArray()
          : [];
      const followedByViewerIds = new Set(followedByViewer.map((row) => row.followedId));

      return res.status(200).json({
        data: safeUsers.map((user) => ({
          ...user,
          isFollowing:
            payload?._id !== user._id.toString() && followedByViewerIds.has(user._id.toString()),
        })),
        pagination: pagingMeta(skip, pageLimit, hasMore),
      });
    }

    if (payload?._id && posts.length) {
      await addInteractionFlags(db, posts, payload._id);
    }

    return res.status(200).json({
      data: posts,
      pagination: pagingMeta(skip, pageLimit, hasMore),
    });
  } catch (error) {
    console.error("Error fetching post shares:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
