import { WithId } from "mongodb";
import { MongoDBClient } from "./mongodb";
import { PostSchema } from "./types/type";

/**
 * Add interaction flags (Liked, Shared, Bookmarked, IsFollowing) to posts for a specific user.
 */
export async function addInteractionFlags(
  db: MongoDBClient,
  posts: WithId<PostSchema>[],
  userId: string
) {
  const collectionsMap = {
    Likes: "Liked",
    Shares: "Shared",
    Bookmarks: "Bookmarked",
    IsFollowing: "IsFollowing",
  };

  await Promise.all(
    posts.map(async (post) => {
      await Promise.all(
        Object.entries(collectionsMap).map(async ([collectionName, field]) => {
          const collection =
            post.UserId === userId && collectionName === "IsFollowing"
              ? null
              : collectionName === "IsFollowing"
                ? db.followers()
                : (db as any)[`posts${collectionName}`]();

          if (!collection) return;

          const result = async () => {
            if (collectionName === "IsFollowing") {
              if (post.UserId === userId) return;
              return collection.findOne({ followerId: userId, followedId: post.UserId });
            }
            if (collectionName === "Shares") {
              return collection.findOne({ OriginalPostId: post.PostID, UserId: userId });
            }
            return collection.findOne({ postId: post.PostID, userId: userId });
          };

          if (await result()) {
            (post as any)[field] = true;
          }
        })
      );
    })
  );
}
