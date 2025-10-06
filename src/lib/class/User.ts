/* eslint-disable no-unused-vars */
import { serialize } from "cookie";
import { SignJWT } from "jose";
import { ObjectId } from "mongodb";
import { NextApiResponse } from "next";
import { UAParser } from "ua-parser-js";

import { MongoDBClient } from "../mongodb";
import { ChatParticipant, ChatType, NewChatSettings } from "../types/type";
import { User, Theme, AccountType } from "../types/user";

export interface UserSchema extends User {
  _id: ObjectId;
  password: string;
  password_reset_time?: string;
  signUpCount?: number;
  resetToken?: string;
  resetTokenExpiry?: number;
  confirmationToken?: string;
  loginToken?: string;
  noOfUpdates?: number;
}

/**
 * Represents a user object based on the provided MongoDB document structure.
 */
export class SocialMediaUser implements UserSchema {
  private isNull: boolean;
  // MONGODB METADATA
  public readonly _id: ObjectId;

  // CORE IDENTITY & AUTHENTICATION
  public readonly userId: string; // Used internally and consistently
  public username: string; // Unique public handle
  public email: string;
  public password: string; // The hashed password (named 'password' in JSON)
  public readonly time: string; // Initial creation time (named 'time' in JSON)
  public lastLogin: string;
  public password_reset_time: string | undefined;
  public resetAttempts: number;
  public confirmationToken: string | undefined;
  public isEmailConfirmed: boolean;
  public loginToken: string | undefined;
  public resetToken: string | undefined;
  public resetTokenExpiry: number | undefined;
  public lastResetAttempt: Record<string, string> | undefined;
  public providers: Record<string, any>; // For third-party auth (e.g., Google, Facebook)
  public signUpCount: number;

  // PUBLIC PROFILE INFORMATION
  public name: string; // Full display name (matches 'Google Gemini')
  public firstname: string;
  public lastname: string;
  public bio: string;
  public displayPicture: string; // URL for profile photo
  public coverPhoto: string; // URL for banner/cover image
  public website: string;
  public location: string;
  public dob: string; // Date of birth (string, likely empty if not set)

  // SOCIAL METRICS & STATUS
  public followers: number; // Count of followers
  public following: number; // Count of accounts this user follows
  public noOfUpdates: number; // Count of posts/updates
  public lastUpdate: any[]; // Array for tracking update history/metadata
  public isPrivate: boolean; // Account visibility setting
  public verified: boolean; // A boolean flag for verified status

  // FRONTEND/THEME PREFERENCES
  public theme: Theme;

  // UI/RELATIONSHIP STATES (Often calculated on-the-fly, but stored here)
  public isFollowing: boolean; // Indicates if the *requesting* user follows this user

  // EXTENDED FIELD (Inferred from object context)
  public readonly accountType: AccountType = AccountType.HUMAN;
  // You could infer 'ORGANIZATION' based on 'Google Gemini' name and content

  constructor(data: UserSchema) {
    this.isNull = data === null || data === undefined;
    this._id = data._id || new ObjectId();
    this.userId = data.userId;
    this.username = data.username;
    this.email = data.email;
    this.password = data.password;
    this.time = data.time;
    this.lastLogin = data.lastLogin || "";

    // Profile
    this.name = data.name;
    this.firstname = data.firstname;
    this.lastname = data.lastname;
    this.bio = data.bio || "";
    this.displayPicture = data.displayPicture || "";
    this.coverPhoto = data.coverPhoto || "";
    this.website = data.website || "";
    this.location = data.location || "";
    this.dob = data.dob || "";

    // Metrics
    this.followers = data.followers || 0;
    this.following = data.following || 0;
    this.noOfUpdates = data.noOfUpdates || 0;
    this.lastUpdate = data.lastUpdate || [];
    this.isPrivate = data.isPrivate || false;
    this.verified = data.verified || false;

    // Auth & Status
    this.confirmationToken = data.confirmationToken;
    this.isEmailConfirmed = data.isEmailConfirmed || false;
    this.loginToken = data.loginToken;
    this.resetToken = data.resetToken;
    this.resetTokenExpiry = data.resetTokenExpiry;
    this.lastResetAttempt = data.lastResetAttempt;
    this.password_reset_time = data.password_reset_time;
    this.resetAttempts = data.resetAttempts || 0;
    this.providers = data.providers;
    this.signUpCount = data.signUpCount || 0;

    // Preferences
    this.theme = data.theme ?? ("system" as Theme);
    this.isFollowing = data.isFollowing || false;

    // Inferred/Default Type
    this.accountType = this.inferAccountType(data);
  }

  // A helper function to infer the account type
  private inferAccountType(data: UserSchema): AccountType {
    if (data.name.toLowerCase().includes("bot") || data.username.toLowerCase().includes("bot")) {
      return AccountType.BOT;
    } else if (data.verified && data.website) {
      // A common pattern for brands/public figures
      return AccountType.ORGANIZATION;
    } else {
      return AccountType.HUMAN;
    }
  }

  /**
   * Check if the user is null
   * @returns boolean
   */
  public isUserNull() {
    return this.isNull;
  }

  /**
   * Get the client safe data of the user
   * @returns UserSchema
   */
  public getClientSafeData() {
    return {
        _id: this._id,
        userId: this.userId,
        username: this.username,
        name: this.name,
        bio: this.bio,
        displayPicture: this.displayPicture,
        coverPhoto: this.coverPhoto,
        website: this.website,
        location: this.location,
        followers: this.followers,
        following: this.following,
        noOfUpdates: this.noOfUpdates,
        isPrivate: this.isPrivate,
        verified: this.verified,
        isFollowing: this.isFollowing,
        accountType: this.accountType,
    };
  }

  /**
   * Get all the data of the user
   * @returns UserSchema
   */
  private getAllData(): UserSchema {
    return {
        _id: this._id,
        userId: this.userId,
        username: this.username,
        email: this.email,
        password: this.password,
        time: this.time,
        lastLogin: this.lastLogin,
        confirmationToken: this.confirmationToken || "",
        isEmailConfirmed: this.isEmailConfirmed,
        loginToken: this.loginToken || "",
        resetToken: this.resetToken || "",
        resetTokenExpiry: this.resetTokenExpiry || undefined,
        lastResetAttempt: this.lastResetAttempt || undefined,
        password_reset_time: this.password_reset_time || "",
        resetAttempts: this.resetAttempts,
        providers: this.providers,
        signUpCount: this.signUpCount,
        theme: this.theme,
        isFollowing: this.isFollowing,
        accountType: this.accountType,
        name: this.name,
        firstname: this.firstname,
        lastname: this.lastname,
        bio: this.bio,
        displayPicture: this.displayPicture,
        coverPhoto: this.coverPhoto,
        website: this.website,
        location: this.location,
        dob: this.dob,
        followers: this.followers,
        following: this.following,
        noOfUpdates: this.noOfUpdates,
        lastUpdate: this.lastUpdate,
        isPrivate: this.isPrivate,
        verified: this.verified,
    };
  }

  /**
   * Store the user in the database
   * @param db
   * @returns UserSchema
   */
  public async storeInDB(db: MongoDBClient) {
    await db.users().insertOne(this.getAllData());
    return this.getClientSafeData();
  }

  /**
   * Create a personal chat for the user
   * @param db
   * @returns
   */
  public async createPersonalChatForUser(db: MongoDBClient) {
    if (this.isUserNull()) {
      throw new Error("User _id is required to create a personal chat");
    }
    const userIdStr = this._id.toString();
    const userName = typeof this.name === "string" ? this.name : "";
    const userDisplayPicture = typeof this.displayPicture === "string" ? this.displayPicture : "";
    const newID = new ObjectId();

    const chatSettings: NewChatSettings = {
      _id: new ObjectId(),
      chatId: newID.toString(),
      isMuted: false,
      isPinned: false,
      isArchived: false,
      notificationSound: "",
      notificationVolume: 0,
      wallpaper: "",
      theme: "light",
      members: [userIdStr],
      isBlocked: false,
      lastSeen: new Date().toISOString(),
    };

    const chat = {
      _id: newID,
      name: { [userIdStr]: userName },
      chatType: "Personal" as ChatType,
      groupDescription: "",
      groupDisplayPicture: "",
      verified: false,
      adminIds: [userIdStr],
      isPrivate: false,
      inviteLink: "",
      timestamp: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      lastMessageId: "",
    };

    const participant: ChatParticipant = {
      _id: new ObjectId(),
      unreadCount: 0,
      favorite: false,
      pinned: false,
      deleted: false,
      archived: false,
      chatSettings,
      displayPicture: userDisplayPicture,
      userId: userIdStr,
      chatId: chat._id.toString(),
      chatType: "Personal",
    };

    await db.chats().insertOne(chat);
    await db.chatParticipants().insertOne(participant);

    return chat;
  }

  /**
   * Set the session for the user
   * @param db
   * @param userAgent - User agent string for device detection
   * @param api - API type ("app" or "page")
   * @param res - NextApiResponse for pages API
   * @param setCookie - Function to set cookies (for app router)
   * @returns
   */
  public async setSession(
    db: MongoDBClient,
    userAgent?: string,
    api?: "app" | "page",
    res?: NextApiResponse,
    setCookie?: (name: string, value: string, options: any) => void
  ) {
    const tokenCollection = db.tokens();
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const token = await new SignJWT({ _id: this._id.toString() })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("15d")
      .sign(secret);

    // Extract device information
    const uaString = userAgent || "";
    const parser = new UAParser(uaString);
    const deviceInfo = parser.getResult();

    await tokenCollection.insertOne({
      _id: new ObjectId(),
      userId: this._id.toString(),
      token,
      deviceInfo,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    });

    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: (process.env.NODE_ENV !== "development" ? "strict" : "none") as "strict" | "none",
      maxAge: 3600 * 24 * 15,
      path: "/",
    };

    if (api === "page") {
      res?.setHeader("Set-Cookie", serialize("velo_12", token, cookieOptions));
      return;
    }

    if (setCookie) {
      setCookie("velo_12", token, cookieOptions);
    }
  }
}
