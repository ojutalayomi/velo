import { getMongoClient } from '@/lib/mongodb';
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        const { username } = req.query;

        try {
            const mongoClient = await getMongoClient();
            const db = mongoClient.db('mydb');
            const users = db.collection('Users');

            // Find user
            const user = await users.findOne({ username: username });
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Remove sensitive information
            const sanitizedUser = { ...user };
            delete sanitizedUser.password;
            delete sanitizedUser.confirmationToken;
            delete sanitizedUser.resetToken;
            delete sanitizedUser.resetTokenExpiry;
            delete sanitizedUser.loginToken;
            delete sanitizedUser.lastResetAttempt;

            return res.status(200).json(sanitizedUser);

        } catch (error) {
            console.error('Error:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
        // Remove the client.close() from finally block
    } else {
        res.status(405).json({ message: 'Method Not Allowed' });
    }
}