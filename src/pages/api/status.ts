import type { NextApiRequest, NextApiResponse } from "next";
import { MongoDBClient } from "@/lib/mongodb";

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      const db = await new MongoDBClient().init();
      const collection = db.users();
      const status = await collection.find({}).toArray();
      const statuses: string[] = [];

      status.forEach((user) => {
        statuses.push(user.displayPicture || "");
      });

      res.json(statuses);
    } catch (err) {
      console.error("Error: ", err);
      res.status(500).json({ error: err });
    }
  } else {
    res.status(405).json({ message: "Method Not Allowed" });
  }
}
