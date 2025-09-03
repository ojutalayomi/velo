import { addInteractionFlags } from '@/lib/apiUtils';
import { verifyToken } from '@/lib/auth';
import { MongoDBClient } from '@/lib/mongodb';
import { Payload } from '@/lib/types/type';
import { ObjectId } from 'mongodb';
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handle(req: NextApiRequest, res: NextApiResponse){
    if(req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

    try {
        const postId = req.query.postId;
        const cookie = decodeURIComponent(req.cookies.velo_12 ? req.cookies.velo_12 : '').replace(/"/g, '');
        const payload = await verifyToken(cookie as unknown as string) as unknown as Payload;
        // await client.connect();
      // console.log('Server is ready for work');

        // Get the collection
        const db = await new MongoDBClient().init();
        const collection = db.users();
        const commentsCollection = db.postsComments();


        // console.log('165', postId)
        const comments = await commentsCollection.find({ ParentId: postId }).toArray();
        const user = payload ? await collection.findOne({ _id: new ObjectId(payload._id) }) : null;
        if (comments) {
            comments.map(async (comment) => {
                // console.log(comment)
                const usr = await collection.findOne({ username: comment.Username });
                comment.DisplayPicture = usr?.displayPicture || '';
            })

            if (user) {
                await addInteractionFlags(db, comments, user._id.toString())
                res.status(200).json({ comments, message: "Success" });
            } else {
                res.status(200).json({ comments, messge: "Sign in" });
            }


        } else {
            // Return an error message if no comment is not found
            res.status(404).json("No comments");
        }
    } catch (err) {
        console.error('Error: ', err);
        res.status(500).json({ error: err });
    }
}