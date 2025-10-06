/**
 * Client-safe user types that don't import server-side dependencies
 */

import { ObjectId } from "bson";

/**
 * Defines the possible types of accounts.
 * Based on the JSON, we assume this is an ORGANIZATION.
 */

export enum AccountType {
  // eslint-disable-next-line no-unused-vars
  HUMAN = "human",
  // eslint-disable-next-line no-unused-vars
  ORGANIZATION = "organization",
  // eslint-disable-next-line no-unused-vars
  BOT = "bot",
}

export type Theme = "system" | "light" | "dark";

export interface UserData {
  _id?: ObjectId | string | undefined;
  bio?: string;
  confirmationToken?: string;
  coverPhoto?: string;
  dob?: string;
  displayPicture: string;
  email: string;
  firstname: string;
  followers?: number;
  following?: number;
  isEmailConfirmed?: boolean;
  isFollowing?: boolean;
  isPrivate?: boolean;
  lastLogin?: string;
  lastname: string;
  lastResetAttempt?: {
    [x: string]: string;
  };
  lastSeen?: string;
  lastUpdate?: string[];
  location?: string;
  name: string;
  providers: Record<
    string,
    {
      id: string | undefined;
      lastUsed: string;
    }
  >;
  resetAttempts?: number;
  theme?: Theme;
  time: string;
  userId: string;
  username: string;
  verified: boolean;
  website?: string;
  accountType: AccountType;
}

export interface UserDataPartial extends Partial<UserData> {
  displayPicture: string;
}
