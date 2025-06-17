'use server'
 
import { MongoDBClient } from '@/lib/mongodb'
import webpush, { PushSubscription } from 'web-push'
 
webpush.setVapidDetails(
  '<mailto:noreply.noow@gmail.com>',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)
 
let subscription: PushSubscription | null = null
 
export async function subscribeUser(sub: PushSubscription) {
  subscription = sub
  const db = await new MongoDBClient().init()
  db.subscriptions().insertOne({ data: sub })
  return { success: true }
}
 
export async function unsubscribeUser(sub: PushSubscription) {
  const db = await new MongoDBClient().init()
  const result = await db.subscriptions().deleteOne({ data: sub })
  if (result.deletedCount > 0) {
    subscription = null
    return { success: true }
  } else {
    return { success: false, error: 'Failed to unsubscribe' }
  }
}
 
export async function sendNotification(message: string) {
  if (!subscription) {
    throw new Error('No subscription available')
  }
 
  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: 'Test Notification',
        body: message,
        icon: '/notifications.png',
      })
    )
    return { success: true }
  } catch (error) {
    console.error('Error sending push notification:', error)
    return { success: false, error: 'Failed to send notification' }
  }
}