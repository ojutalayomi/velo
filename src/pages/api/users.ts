import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import { pagingMeta, MAX_API_LIMIT, parsePaging } from "@/lib/apiPagination";
import { verifyToken } from "@/lib/auth";
import { SocialMediaUser, UserSchema } from "@/lib/class/User";
import { MongoDBClient } from "@/lib/mongodb";
import { Payload } from "@/lib/types/type";

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }
  const { query, search, getSuggestions, limit } = req.query;

  if (!query && !getSuggestions) {
    return res.status(400).json({ error: "Query parameter is required" });
  }

  const cookie = decodeURIComponent(req.cookies.velo_12 ? req.cookies.velo_12 : "").replace(
    /"/g,
    ""
  );

  try {
    let payload: Payload | null = null;
    if (cookie) {
      try {
        payload = (await verifyToken(cookie as unknown as string)) as unknown as Payload;
      } catch {
        payload = null;
      }
    }

    const db = await new MongoDBClient().init();

    if (search) {
      const qSearch = Array.isArray(query) ? query[0] : query;
      if (!ObjectId.isValid(qSearch as string)) {
        res.status(400).json({ error: "Invalid ObjectId format" });
        return;
      }
      const foundUser = await db.users().findOne({
        $or: [{ _id: new ObjectId(qSearch as string) }, { username: query as string }],
      });

      if (!foundUser) {
        return res.status(400).json({ error: "User not found" });
      }

      const users = await addIsFollowing(db, [foundUser as UserSchema], payload);
      return res.status(200).json({
        data: users,
        pagination: pagingMeta(0, 1, false),
      });
    }

    if (getSuggestions) {
      const { limit: pageLimit, skip } = parsePaging(req, {
        limitKey: "limit",
        defaultLimit: limit ? parseInt(String(limit), 10) || 10 : 10,
        maxLimit: MAX_API_LIMIT,
      });
      const fetchLimit = pageLimit + 1;
      const raw = await db
        .users()
        .find({})
        .sort({ _id: 1 })
        .skip(skip)
        .limit(fetchLimit)
        .toArray();
      const hasMore = raw.length > pageLimit;
      const slice = raw.slice(0, pageLimit);
      const users = await addIsFollowing(db, slice as UserSchema[], payload);
      return res.status(200).json({
        data: users,
        pagination: pagingMeta(skip, pageLimit, hasMore),
      });
    }

    const autocompleteQuery = String(Array.isArray(query) ? query[0] : query);
    const { limit: pageLimit, skip } = parsePaging(req, {
      defaultLimit: 15,
      maxLimit: 30,
    });
    const fetchLimit = pageLimit + 1;

    const agg: Record<string, unknown>[] = [
      {
        $search: {
          index: "Users",
          compound: {
            should: [
              {
                autocomplete: {
                  query: autocompleteQuery,
                  path: "name",
                  fuzzy: {
                    maxEdits: 1,
                  },
                  tokenOrder: "any",
                },
              },
              {
                autocomplete: {
                  query: autocompleteQuery,
                  path: "username",
                  fuzzy: {
                    maxEdits: 1,
                  },
                  tokenOrder: "any",
                },
              },
            ],
          },
        },
      },
      { $skip: skip },
      { $limit: fetchLimit },
      {
        $project: {
          password: 0,
          confirmationToken: 0,
          signUpCount: 0,
          lastLogin: 0,
          loginToken: 0,
          theme: 0,
          lastUpdate: 0,
          password_reset_time: 0,
          lastResetAttempt: 0,
          resetAttempts: 0,
          resetToken: 0,
          resetTokenExpiry: 0,
        },
      },
    ];

    const rawAgg = await db.users().aggregate(agg).toArray();
    const hasMore = rawAgg.length > pageLimit;
    const pageUsers = rawAgg.slice(0, pageLimit);
    const users = await addIsFollowing(db, pageUsers as UserSchema[], payload);

    return res.status(200).json({
      data: users,
      pagination: pagingMeta(skip, pageLimit, hasMore),
    });
  } catch (error) {
    console.error("An error occurred:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

async function addIsFollowing(db: MongoDBClient, users: UserSchema[], payload: Payload | null) {
  const userData = users.map((user) =>
    new SocialMediaUser(user as UserSchema).getClientSafeData()
  );

  return Promise.all(
    userData.map(async (obj) => {
      const isFollowing =
        payload?._id != null
          ? await db.followers().findOne({
              followerId: payload._id,
              followedId: obj._id.toString(),
            })
          : false;
      obj.isFollowing = !!isFollowing;
      return obj;
    })
  );
}
