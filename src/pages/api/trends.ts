import type { NextApiRequest, NextApiResponse } from "next";

import { parseTrendLimit } from "@/lib/trends";
import { getTrendsSnapshot } from "@/lib/trendsServer";

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  // HTTP caches must not extend the independently managed application snapshot TTL.
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method Not Allowed" });
  }
  const limit = parseTrendLimit(req.query.limit);
  if (limit === null) {
    return res.status(400).json({ message: "limit must be an integer between 1 and 20" });
  }
  try {
    const snapshot = await getTrendsSnapshot();
    return res.status(200).json({ ...snapshot, data: snapshot.data.slice(0, limit) });
  } catch (error) {
    console.error("Error loading trends:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
