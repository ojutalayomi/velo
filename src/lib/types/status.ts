import { ObjectId } from "mongodb";

export type StatusMediaType = "image" | "video";
export type StatusVisibility = "followers" | "everyone";

export interface StatusSchema {
  _id: ObjectId;
  userId: string;
  mediaUrl: string;
  mediaKey: string;
  mediaType: StatusMediaType;
  caption: string;
  createdAt: string;
  expiresAt: string;
  visibility: StatusVisibility;
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

export interface StatusCreateInput {
  mediaUrl: string;
  mediaKey: string;
  mediaType: StatusMediaType;
  caption?: string;
  visibility?: StatusVisibility;
}

