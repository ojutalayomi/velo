import type { NextApiRequest, NextApiResponse } from 'next'
import { MongoClient, ServerApiVersion } from 'mongodb'

const uri = process.env.MONGOLINK ? process.env.MONGOLINK : '';
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true
    },
    connectTimeoutMS: 60000,
    maxPoolSize: 10
});

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        const { username } = req.query;

        try {
            await client.connect();
            const db = client.db('mydb');
            const users = db.collection('Users');

            // Find user
            const user = await users.findOne({ username: username });
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Remove sensitive information
            delete user.password;
            delete user.confirmationToken;
            delete user.resetToken;
            delete user.resetTokenExpiry;
            delete user.loginToken;
            delete user.lastResetAttempt;

            return res.status(200).json(user);

        } catch (error) {
            console.error('Error:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        } finally {
            await client.close();
        }
    } else {
        res.status(405).json({ message: 'Method Not Allowed' });
    }
}
