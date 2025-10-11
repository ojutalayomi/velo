import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

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
  const payload = (await verifyToken(cookie as unknown as string)) as unknown as Payload;

  try {
    const db = await new MongoDBClient().init();
    let users;

    const agg = [
      {
        $search: {
          index: "Users",
          compound: {
            should: [
              {
                autocomplete: {
                  query,
                  path: "name",
                  fuzzy: {
                    maxEdits: 1,
                  },
                  tokenOrder: "any",
                },
              },
              {
                autocomplete: {
                  query,
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
      {
        $limit: 15,
      },
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
    if (search) {
      if (!ObjectId.isValid(query as string)) {
        res.status(400).json({ error: "Invalid ObjectId format" });
        return; 
      }
      const foundUser = ObjectId.isValid(query as string) ? await db.users().findOne({
        $or: [{ _id:  new ObjectId(query as string) }, { username: query as string }],
      }) : null;

      if (!foundUser) {
        return res.status(400).json({ error: "User not found" });
      }

      const data = new SocialMediaUser(foundUser);
      users = [data.getClientSafeData()];
    } else if (getSuggestions) {
      users = await addIsFollowing(db, await db.users().find({}).limit(limit ? parseInt(limit as string) : 10).toArray(), payload);
    } else {
      users = await addIsFollowing(db, await db.users().aggregate(agg).toArray() as UserSchema[], payload);
    }

    if (!users || users.length === 0) {
      return res.status(404).json({ error: "No users found" });
    }


    res.status(200).json(users);
  } catch (error) {
    console.error("An error occurred:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

async function addIsFollowing(db: MongoDBClient, users: UserSchema[], payload: Payload) {
  const userData = users.map(user => new SocialMediaUser(user as UserSchema).getClientSafeData());
  
  const usersWithFollowingStatus = await Promise.all(
    userData.map(async (obj) => {
      const isFollowing = payload
        ? await db.followers().findOne({ followerId: payload._id, followedId: obj._id.toString() })
        : false;
      obj.isFollowing = !!isFollowing;
      return obj;
    })
  );
  
  return usersWithFollowingStatus;
}