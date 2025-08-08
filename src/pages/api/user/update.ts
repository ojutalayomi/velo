import type { NextApiRequest, NextApiResponse } from 'next'
import { MongoDBClient } from '@/lib/mongodb'
import { verifyToken } from '@/lib/auth'
import { Payload } from '@/lib/types/type'
import { ObjectId } from 'mongodb'

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method Not Allowed' })
  }

  try {
    // Authentication
    const cookie = decodeURIComponent(req.cookies.velo_12 ? req.cookies.velo_12 : '').replace(/"/g, '')
    const payload = await verifyToken(cookie) as unknown as Payload
    if (!payload) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const { name, bio, location, website, displayPicture, coverPhoto } = req.body

    // Initialize database connection
    const db = await new MongoDBClient().init()
    const users = db.users()

    // Get current user data to update lastUpdate array
    const currentUser = await users.findOne({ _id: new ObjectId(payload._id) })
    const lastUpdate = currentUser?.lastUpdate || []
    lastUpdate.push(new Date().toISOString())

    // Update user profile
    const result = await users.updateOne(
      { _id: new ObjectId(payload._id) },
      {
        $set: {
          name: name || '',
          bio: bio || '',
          location: location || '',
          website: website || '',
          displayPicture: displayPicture || '',
          coverPhoto: coverPhoto || '',
          lastUpdate,
          noOfUpdates: (currentUser?.noOfUpdates || 0) + 1
        }
      }
    )

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Get updated user data
    const updatedUser = await users.findOne(
      { _id: new ObjectId(payload._id) },
      {
        projection: {
          password: 0,
          confirmationToken: 0,
          signUpCount: 0,
          lastLogin: 0,
          loginToken: 0,
          theme: 0,
          password_reset_time: 0,
          lastResetAttempt: 0,
          resetAttempts: 0,
          resetToken: 0,
          resetTokenExpiry: 0
        }
      }
    )

    return res.status(200).json({ data: updatedUser, message: 'Profile updated successfully' })
  } catch (error) {
    console.error('Error updating user:', error)
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}
