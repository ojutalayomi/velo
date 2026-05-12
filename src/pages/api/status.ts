import type { NextApiRequest, NextApiResponse } from "next";

import { pagingMeta, DEFAULT_STATUS_LIMIT, MAX_API_LIMIT, parsePaging } from "@/lib/apiPagination";
import { MongoDBClient } from "@/lib/mongodb";

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      const db = await new MongoDBClient().init();
      const collection = db.users();
      const { limit: pageLimit, skip } = parsePaging(req, {
        defaultLimit: DEFAULT_STATUS_LIMIT,
        maxLimit: MAX_API_LIMIT,
      });
      const fetchLimit = pageLimit + 1;

      const docs = await collection
        .find({})
        .sort({ _id: 1 })
        .skip(skip)
        .limit(fetchLimit)
        .project({ displayPicture: 1 })
        .toArray();

      const hasMore = docs.length > pageLimit;
      const page = docs.slice(0, pageLimit);
      const statuses: string[] = page.map((user) => user.displayPicture || "");

      res.json({
        data: statuses,
        pagination: pagingMeta(skip, pageLimit, hasMore),
      });
    } catch (err) {
      console.error("Error: ", err);
      res.status(500).json({ error: err });
    }
  } else {
    res.status(405).json({ message: "Method Not Allowed" });
  }
}
