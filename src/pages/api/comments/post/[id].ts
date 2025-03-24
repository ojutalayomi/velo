import type { NextApiRequest, NextApiResponse } from 'next'
import mongoose from 'mongoose'
import { getMongoDb } from '@/lib/mongodb';

function secretKeyy(){
  const secretKey = new mongoose.Types.ObjectId();
  return secretKey;
}

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {

    // Connect to MongoDB
    const db = await getMongoDb();
    const collection = db.collection('Users');
    const post = db.collection('Posts');
    const commentsCollection = db.collection('Posts(Comments)');
    const likes = db.collection('Posts(Likes)');
    const shares = db.collection('Posts(Shares)');
    const bookmarks = db.collection('Posts(Bookmarks)');
    const array = [likes, shares, bookmarks];

    // Retrieve user and post data
    const key = decodeURIComponent(req.cookies.user || '').replace(/"/g, '');
    const time = new Date().toLocaleString();
    const user = await collection.findOne({ loginToken: key });
    const comments = await post.findOne({ PostID: req.query.id });

    if (!user || !comments) {
      return res.status(404).json({ message: "User or Post not found" });
    }

    // Create a new comment
    const newComment = {
      _id: new mongoose.Types.ObjectId(),
      ParentId: req.query.id,
      DisplayPicture: user.displayPicture || '',
      NameOfPoster: `${user.firstname ?? ''} ${user.lastname ?? ''}`.trim(),
      Verified: user.Verified ?? false,
      TimeOfPost: time,
      Visibility: 'Everyone',
      Caption: req.body.caption ?? '',
      Image: req.body.attachment ?? [],
      NoOfLikes: 0,
      Liked: false,
      NoOfComment: 0,
      NoOfShares: 0,
      NoOfBookmarks: 0,
      Bookmarked: false,
      Username: user.username || '',
      PostID: secretKeyy(),
      Code: 'none',
      WhoCanComment: 'Everyone',
      Type: 'comment'
    };

    // Save the new comment and update the post
    await commentsCollection.insertOne(newComment);

    await post.updateOne({ PostID: req.query.id }, { $set: { NoOfComment: comments.NoOfComment + 1 } });

    for (let i: number = 0; i < array.length; i++) {
      await array[i].insertOne({ _id: newComment.PostID, [`${array[i]}`]: [] });
    }

    res.json({ message: "Comment sent", data: newComment });
  } catch (err) {
    console.error('Error processing form data:', err);
    res.status(500).json({ error: 'Error processing form data' });
  }
};