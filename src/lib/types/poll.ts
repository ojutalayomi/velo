import type { ObjectId } from "mongodb";

import type { PollTargetType } from "@/lib/polls";

/** One row per voter per poll (unique on targetType + targetId + userId). */
export interface PollVoteSchema {
  _id: ObjectId;
  targetType: PollTargetType;
  targetId: string;
  userId: string;
  options: number[];
  votedAt: string;
}
