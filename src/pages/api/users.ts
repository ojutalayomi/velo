import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import { verifyToken } from "@/lib/auth";
import { MongoDBClient } from "@/lib/mongodb";
import { Payload } from "@/lib/types/type";

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }
  const { query, search } = req.query;

  if (!query) {
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
        return res.status(400).json({ error: "Invalid ObjectId format" });
      }
      const data = await db.users().findOne(
        {
          $or: [{ _id: new ObjectId(query as string) }, { username: query as string }],
        },
        {
          projection: {
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
        }
      );
      users = [data];
    } else {
      users = await db.users().aggregate(agg).toArray();
    }

    if (!users) {
      return res.status(401).json({ error: "Invalid username or email" });
    }

    const newUsers = users.map(async (obj: any) => {
      const newObj = { ...obj };
      const isFollowing = payload
        ? await db.followers().findOne({ followerId: payload._id, followedId: obj._id.toString() })
        : false;
      newObj.isFollowing = !!isFollowing;
      return newObj;
    });

    res.status(200).json(await Promise.all(newUsers));
  } catch (error) {
    console.error("An error occurred:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
