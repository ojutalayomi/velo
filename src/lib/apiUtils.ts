import { Document } from 'bson';
import { Db, WithId } from 'mongodb';


/**
 * Add interaction flags (Liked, Shared, Bookmarked) to posts for a specific user.
 */
export async function addInteractionFlags(db: Db, posts: WithId<Document>[], userId: string) {
  const collectionsMap = {
    Likes: 'Liked',
    Shares: 'Shared',
    Bookmarks: 'Bookmarked',
  };

  await Promise.all(
    posts.map(async (post) => {
      await Promise.all(
        Object.entries(collectionsMap).map(async ([collectionName, field]) => {
          const collection = db.collection(`Posts_${collectionName}`);
          const result = await collection.findOne({ postId: post.PostID, userId: userId });

          if (result) {
            post[field] = true;
          }
        })
      );
    })
  );
}
