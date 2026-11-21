import { ObjectId } from "mongodb";

export type StatusMediaType = "image" | "video";
export type StatusVisibility = "followers" | "everyone";

export interface StatusMention {
  userId: string;
  username: string;
}

export interface StatusSchema {
  _id: ObjectId;
  userId: string;
  mediaUrl: string;
  mediaKey: string;
  mediaType: StatusMediaType;
  caption: string;
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
  createdAt: string;
  expiresAt: string;
  visibility: StatusVisibility;
  mentions: StatusMention[];
  viewed: boolean;
  viewers: StatusViewerClient[];
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
  mediaUrl: string;
  mediaKey: string;
  mediaType: StatusMediaType;
}

/** One caption shared by up to 10 media items; created together or not at all. */
export interface StatusCreateInput extends StatusCreateItem {
  items?: StatusCreateItem[];
  caption?: string;
}

