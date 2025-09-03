"use client";
import { useState, useEffect } from 'react'
import { subscribeUser, unsubscribeUser, sendNotification } from './actions'
import { urlBase64ToUint8Array } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
 
function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [message, setMessage] = useState('')
 
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)
      registerServiceWorker()
    }
  }, [])
 
  async function registerServiceWorker() {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    })
    const sub = await registration.pushManager.getSubscription()
    setSubscription(sub)
  }
 
  async function subscribeToPush() {
    try {
      // Check if service worker is ready
      if (!navigator.serviceWorker.ready) {
        console.error('Service worker not ready');
        return;
      }
  
      const registration = await navigator.serviceWorker.ready;
      
      // Request notification permission first
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.error('Notification permission denied');
        return;
      }
  
      // Subscribe to push
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''
        ),
      });
  
      // Validate subscription
      if (!sub) {
        console.error('Failed to subscribe to push');
        return;
      }
  
      setSubscription(sub);
      const serializedSub = JSON.parse(JSON.stringify(sub));
      await subscribeUser(serializedSub);
    // console.log('Successfully subscribed to push notifications');
    } catch (error) {
      console.error('Push subscription error:', error);
    }
  }
 
  async function unsubscribeFromPush() {
    try {
      if (!subscription) {
        console.warn('No subscription to unsubscribe from');
        return;
      }
  
      await subscription.unsubscribe();
      const subscriptionWithKeys = {
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime,
        keys: {
          p256dh: subscription.toJSON().keys?.p256dh ?? '',
          auth: subscription.toJSON().keys?.auth ?? '',
        },
      };
      await unsubscribeUser(subscriptionWithKeys);
      setSubscription(null);
    // console.log('Successfully unsubscribed from push notifications');
    } catch (error) {
      console.error('Push unsubscription error:', error);
    }
  }
 
  async function sendTestNotification() {
    if (subscription) {
      await sendNotification(message)
      setMessage('')
    }
  }
 
  if (!isSupported) {
    return <p>Push notifications are not supported in this browser.</p>
  }
 
  return (
    <div className="flex flex-col gap-2 items-center overflow-hidden w-full">
      <h3>Push Notifications</h3>
      {subscription ? (
        <>
          <p>You are subscribed to push notifications.</p>
          <Button onClick={unsubscribeFromPush}>Unsubscribe</Button>
          <Input
            type="text"
            placeholder="Enter notification message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <Button onClick={sendTestNotification}>Send Test</Button>
        </>
      ) : (
        <>
          <p>You are not subscribed to push notifications.</p>
          <Button onClick={subscribeToPush}>Subscribe</Button>
        </>
      )}
    </div>
  )
}

function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
 
  useEffect(() => {
    // Improved iOS detection
    const isIOSDevice = () => {
      const ua = window.navigator.userAgent;
      const isIPad = !!ua.match(/iPad/i);
      const isIPhone = !!ua.match(/iPhone/i);
      const isIPod = !!ua.match(/iPod/i);
      return isIPad || isIPhone || isIPod;
    };

    // Check if running as PWA
    const isStandaloneMode = () => {
      return window.matchMedia('(display-mode: standalone)').matches ||
             (window.navigator as any).standalone ||
             document.referrer.includes('android-app://');
    };

    setIsIOS(isIOSDevice());
    setIsStandalone(isStandaloneMode());

    // Listen for standalone mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = (e: MediaQueryListEvent) => setIsStandalone(e.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  if (isStandalone) return null;

  return (
    <div className="flex flex-col gap-4 items-center p-4">
      <h3 className="text-lg font-semibold">Install App</h3>
      {isIOS ? (
        <div className="flex flex-col items-center text-center space-y-2">
          <p className="text-sm">To install this app on your iOS device:</p>
          <ol className="list-decimal text-left text-sm pl-4 space-y-1">
            <li>Tap the share button <span className="inline-block">⎋</span></li>
            <li>Scroll down and tap &quot;Add to Home Screen&quot; <span className="inline-block">➕</span></li>
            <li>Tap &quot;Add&quot; in the top right</li>
          </ol>
        </div>
      ) : (
        <Button 
          onClick={() => setShowIOSPrompt(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Add to Home Screen
        </Button>
      )}
    </div>
  );
}
 
export default function Page() {
  return (
    <div className="h-screen flex flex-col justify-center items-center w-full">
      <Card>
        <CardHeader>
          <CardTitle>Push Notification</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <PushNotificationManager />
          <InstallPrompt />
        </CardContent>
        <CardFooter><p>...</p></CardFooter>
      </Card>
    </div>
  )
}