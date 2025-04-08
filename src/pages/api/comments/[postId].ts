import { getMongoClient } from '@/lib/mongodb';
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handle(req: NextApiRequest, res: NextApiResponse){
    if(req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

    try {
        const token = req.query.postId;
        const pass = decodeURIComponent(req.cookies.user ? req.cookies.user : '').replace(/"/g, '');
        // await client.connect();
        console.log('Server is ready for work');

        // Get the collection
        const client = await getMongoClient();
        const collection = client.db('mydb').collection('Users');
        const commentsCollection = client.db('mydb').collection('Posts_Comments');


        // console.log('165', tokenn)
        const comments = await commentsCollection.find({ ParentId: token }).toArray();
        const user = await collection.findOne({ loginToken: pass });
        if (comments) {
            comments.map(async (comment) => {
                // console.log(comment)
                const usr = await collection.findOne({ username: comment.Username });
                comment.DisplayPicture = usr?.displayPicture;
            })

            if (user) {
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