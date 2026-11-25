import { ObjectId } from "mongodb";

/** `text` and `audio` (a voice note) statuses have no photo or video; `text` has no file at all. */
export type StatusMediaType = "image" | "video" | "audio" | "text";
export type StatusVisibility = "followers" | "everyone";

export interface StatusMention {
  userId: string;
  username: string;
}

export interface StatusSchema {
  _id: ObjectId;
  userId: string;
  /** Empty for a text status. */
  mediaUrl: string;
  mediaKey: string;
  mediaType: StatusMediaType;
  caption: string;
  /** The words of a text status. */
  text?: string;
  /** A `STATUS_BACKGROUNDS` id, for a text status. */
  background?: string;
  /** Length of a voice status, in seconds. */
  durationSec?: number;
  createdAt: string;
  expiresAt: string;
  /** Date-typed copy of `expiresAt`, used by the TTL index. */
  expiresAtDate?: Date;
  /** Always "followers": statuses are only visible to people who follow the owner. */
  visibility: StatusVisibility;
  mentions?: StatusMention[];
}

export interface StatusViewerSchema {
  _id: ObjectId;
  statusId: string;
  ownerId: string;
  viewerId: string;
  viewedAt: string;
}

export interface StatusLikeSchema {
  _id: ObjectId;
  statusId: string;
  ownerId: string;
  userId: string;
  createdAt: string;
}

export interface StatusViewerClient {
  userId: string;
  viewedAt: string;
}

export interface StatusClient {
  _id: string;
  userId: string;
  mediaUrl: string;
  mediaKey: string;
  mediaType: StatusMediaType;
  caption: string;
  text?: string;
  background?: string;
  durationSec?: number;
  createdAt: string;
  expiresAt: string;
  visibility: StatusVisibility;
  mentions: StatusMention[];
  viewed: boolean;
  /** Who viewed it. Only the owner gets this list; everyone else gets `[]` (see `viewCount`). */
  viewers: StatusViewerClient[];
  viewCount: number;
  likeCount: number;
  /** Whether the signed-in user liked it. */
  liked: boolean;
}

/** One row of the owner's "viewed by" list. */
export interface StatusViewerDetail {
  userId: string;
  name: string;
  username: string;
  displayPicture: string;
  verified: boolean;
  viewedAt: string;
  liked: boolean;
}

export interface StatusUserClient {
  _id: string;
  name: string;
  username: string;
  displayPicture: string;
  verified: boolean;
}

export interface StatusGroup {
  user: StatusUserClient;
  statuses: StatusClient[];
  hasUnviewed: boolean;
  latestAt: string;
}

export interface StatusCreateItem {
  mediaType: StatusMediaType;
  mediaUrl?: string;
  mediaKey?: string;
  text?: string;
  background?: string;
  durationSec?: number;
}

/**
 * One caption shared by up to 10 photos or videos, or a single text or voice status; created
 * together or not at all.
 */
export interface StatusCreateInput extends StatusCreateItem {
  items?: StatusCreateItem[];
  caption?: string;
}

