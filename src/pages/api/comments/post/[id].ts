import type { NextApiRequest, NextApiResponse } from 'next'
import express, { Request, Response } from 'express';
import { MongoClient, ServerApiVersion } from 'mongodb'
import mongoose from 'mongoose'
// import Post from '../../../../templates/mogooseTemp'
import { postUpload } from '../../../../models/s3.upload';

// interface ExtendedNextRequest extends NextRequest {
//   files?: {
//     ImagesOrVideos?: Express.Multer.File[];
//   };
// }

interface reqFiles {
  fieldname: string,
  originalname: string,
  encoding: string,
  mimetype: string,
  size: number,
  bucket: string,
  key: string,
  acl: string,
  contentType: string,
  contentDisposition: null,
  contentEncoding: null,
  storageClass: string,
  serverSideEncryption: null,
  metadata: [Object],
  location: string,
  etag: string,
  versionId: undefined
}

interface reqq {
  ImagesOrVideos: reqFiles[]
}

function secretKeyy(){
  const secretKey = new mongoose.Types.ObjectId();
  return secretKey;
}

const uri = process.env.MONGOLINK || '';
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true
  },
  connectTimeoutMS: 60000,
  maxPoolSize: 10
});

// const handle = createRouter<NextRequest, NextResponse>();

// .use(postUpload.fields([{ name: 'ImagesOrVideos', maxCount: 4 }]))
// postUpload.fields([{ name: 'ImagesOrVideos', maxCount: 4 }])

const post = async (req: Request | any, res: Response) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  // console.log('line 65\n',req.files,req.body)

  try {
    // console.log('line 67\n',req.files,req.body)
    const { id } = req.query;
    let filename: string[] = [];

    // Handle file uploads
    await new Promise((resolve, reject) => {
      postUpload.fields([{ name: 'ImagesOrVideos', maxCount: 4 }])(req, res, (err) => {
        if (err) {
          return reject(err);
        }
        if (req.files && req.files.ImagesOrVideos) {
          filename = req.files.ImagesOrVideos.map((file: { key: any; }) => (file.key));
          // console.log(req.files.ImagesOrVideos);
        } else {
          console.log('No files uploaded.');
        }
        
        resolve(null);
      });
    });
    // console.log('line 83\n',req.files,'<next>',req.body);
    const { caption } = req.body;
    // console.log('Line 90\n',filename)

    // Connect to MongoDB
    const db = client.db('mydb');
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
    const comments = await post.findOne({ PostID: id });

    if (!user || !comments) {
      return res.status(404).json({ message: "User or Post not found" });
    }

    // Create a new comment
    const postid = secretKeyy();
    const newComment = {
      _id: new mongoose.Types.ObjectId(),
      ParentId: id,
      DisplayPicture: user.displayPicture || '',
      NameOfPoster: `${user.firstname ?? ''} ${user.lastname ?? ''}`.trim(),
      Verified: user.Verified ?? false,
      TimeOfPost: time,
      Visibility: 'Everyone',
      Caption: caption ?? '',
      Image: filename,
      NoOfLikes: 0,
      Liked: false,
      NoOfComment: 0,
      NoOfShares: 0,
      NoOfBookmarks: 0,
      Bookmarked: false,
      Username: user.username || '',
      PostID: postid,
      Code: 'none',
      WhoCanComment: 'Everyone',
      Type: 'comment'
    };

    // Save the new comment and update the post
    await commentsCollection.insertOne(newComment);
    await post.updateOne({ PostID: id }, { $set: { NoOfComment: comments.NoOfComment + 1 } });
    for (let i: number = 0; i < array.length; i++) {
      await array[i].insertOne({ _id: postid, [`${array[i]}`]: [] });
    }

    res.json({ message: "Comment sent", data: newComment });
  } catch (err) {
    console.error('Error processing form data:', err);
    res.status(500).json({ error: 'Error processing form data' });
  }
};


export const config = {
  api: {
    bodyParser: false, // Disables body parsing, as it is handled by Multer
  },
};

export default post;