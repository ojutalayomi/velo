import { Db, MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import {
  Attachment,
  AttachmentSchema,
  ChatDataServer,
  ChatParticipant,
  ChatSettings,
  MessageSchema,
  PostSchema,
  Reaction,
  ReadReceipt,
  UserData,
  UserSettings,
} from "./types/type";
import { IResult } from "ua-parser-js";

export interface FollowersSchema {
  followerId: string;
  followedId: string;
  time: string;
  follow?: true;
}

export interface TokensSchema {
  _id: ObjectId;
  userId: string;
  token: string;
  deviceInfo: IResult;
  createdAt: string;
  expiresAt: string;
}

export interface VideoSchema {
  _id: ObjectId;
  userId: string;
  video: string;
}

const uri = process.env.MONGOLINK || "";

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    deprecationErrors: true,
  },
  connectTimeoutMS: 60000,
  socketTimeoutMS: 60000,
  maxPoolSize: 50,
  minPoolSize: 5,
  maxIdleTimeMS: 60000,
  waitQueueTimeoutMS: 30000,
};

function ensureClientPromise(): Promise<MongoClient> {
  if (!clientPromise) {
    if (!uri) {
      throw new Error("Please add your MongoDB URI to .env");
    }
    if (process.env.NODE_ENV === "development") {
      const globalWithMongo = global as typeof globalThis & {
        _mongoClientPromise?: Promise<MongoClient>;
      };
      if (!globalWithMongo._mongoClientPromise) {
        client = new MongoClient(uri, options);
        globalWithMongo._mongoClientPromise = client.connect();
      }
      clientPromise = globalWithMongo._mongoClientPromise;
    } else {
      client = new MongoClient(uri, options);
      clientPromise = client.connect();
    }
  }
  return clientPromise!;
}

export async function getMongoClient() {
  const promise = ensureClientPromise();
  if (!client || !client.connect) {
    client = await promise;
  }
  return client;
}
/**
 * Client class for interacting with MongoDB collections
 */
export class MongoDBClient {
  private client!: MongoClient;
  private db!: Db;

  /**
   * Creates a new MongoDB client instance
   * @param dbName Database name from env vars or empty string
   */
  constructor(private dbName: string = process.env.MONGODB_DATABASE || "") {}

  /**
   * Initializes the MongoDB connection
   * @returns This client instance
   */
  async init() {
    this.client = await getMongoClient();
    this.db = this.client.db(this.dbName || undefined);
    return this;
  }

  /**
   * Gets the MongoDB database instance
   * @returns The database instance
   */
  async getDb() {
    return this.db;
  }

  /**
   * Gets the followers collection
   * @returns Collection for storing follower relationships
   */
  followers() {
    return this.db.collection<FollowersSchema>("Followers");
  }

  /**
   * Gets the posts collection
   * @returns Collection for storing user posts
   */
  posts() {
    return this.db.collection<PostSchema>("Posts");
  }

  /**
   * Gets the post bookmarks collection
   * @returns Collection for storing bookmarked posts
   */
  postsBookmarks() {
    return this.db.collection<PostSchema>("Posts_Bookmarks");
  }

  /**
   * Gets the post comments collection
   * @returns Collection for storing post comments
   */
  postsComments() {
    return this.db.collection<PostSchema>("Posts_Comments");
  }

  /**
   * Gets the post likes collection
   * @returns Collection for storing post likes
   */
  postsLikes() {
    return this.db.collection<PostSchema>("Posts_Likes");
  }

  /**
   * Gets the post shares collection
   * @returns Collection for storing shared posts
   */
  postsShares() {
    return this.db.collection<PostSchema>("Posts_Shares");
  }

  /**
   * Gets the tokens collection
   * @returns Collection for storing authentication tokens
   */
  tokens() {
    return this.db.collection<TokensSchema>("Tokens");
  }

  /**
   * Gets the user feedback collection
   * @returns Collection for storing user feedback
   */
  userFeedback() {
    return this.db.collection("User_Feedback");
  }

  /**
   * Gets the users collection
   * @returns Collection for storing user profiles
   */
  users() {
    return this.db.collection<UserData>("Users");
  }

  /**
   * Gets the videos collection
   * @returns Collection for storing video content
   */
  videos() {
    return this.db.collection<VideoSchema>("Videos");
  }

  /**
   * Gets the chat messages collection
   * @returns Collection for storing chat messages
   */
  chatMessages() {
    return this.db.collection<MessageSchema>("Chat_Messages");
  }

  /**
   * Gets the chat settings collection
   * @returns Collection for storing chat configuration
   */
  chatSettings() {
    return this.db.collection<ChatSettings>("Chat_Settings");
  }

  /**
   * Gets the chat participants collection
   * @returns Collection for storing chat member info
   */
  chatParticipants() {
    return this.db.collection<ChatParticipant>("Chat_Participants");
  }

  /**
   * Gets the chats collection
   * @returns Collection for storing chat metadata
   */
  chats() {
    return this.db.collection<ChatDataServer>("Chats");
  }

  /**
   * Gets the chat reactions collection
   * @returns Collection for storing message reactions
   */
  chatReactions() {
    return this.db.collection<Reaction>("Chat_Reactions");
  }

  /**
   * Gets the read receipts collection
   * @returns Collection for storing message read status
   */
  readReceipts() {
    return this.db.collection<ReadReceipt>("Chat_Read_Receipts");
  }

  /**
   * Gets the user settings collection
   * @returns Collection for storing user preferences
   */
  userSettings() {
    return this.db.collection<UserSettings>("User_Settings");
  }

  /**
   * Gets the subscriptions collection
   * @returns Collection for storing subscription data
   */
  subscriptions() {
    return this.db.collection("Subscriptions");
  }

  /**
   * Gets the files collection
   * @returns Collection for storing files
   */
  files() {
    return this.db.collection<AttachmentSchema>("Files");
  }
}

// For testing purposes
export async function closeMongoConnection() {
  if (client) {
    await client.close();
    client = null;
  }
}

export default clientPromise as unknown as Promise<MongoClient> | null;
