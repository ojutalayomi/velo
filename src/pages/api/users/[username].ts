import { verifyToken } from '@/lib/auth';
import { MongoDBClient } from '@/lib/mongodb';
import { Payload } from '@/lib/types/type';
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        const { username } = req.query;

        try {
            const cookie = decodeURIComponent(req.cookies.velo_12 ? req.cookies.velo_12 : '').replace(/"/g, '');
            const payload = await verifyToken(cookie);
            const db = await new MongoDBClient().init();
            const users = db.users();
            const followers = db.followers();

            // Find user
            const user = await users.findOne({ username: username });
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            if (payload) {
                if (user?._id.toString() !== payload._id) {
                    const isFollowing = await followers.findOne({ followerId: (payload as unknown as Payload)._id, followedId: user?._id.toString() });
                    if (isFollowing) {
                        user.isFollowing = true;
                    }
                }
            }

            // Remove sensitive information
            const { password, confirmationToken, resetToken, resetTokenExpiry, loginToken, ...sanitizedUser } = user;
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