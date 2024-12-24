'use client'
import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Heart, MessageCircle, UserPlus, Star, Bell } from 'lucide-react';

const NotificationPage: React.FC = () => {
  const router = useRouter();
  
  const notifications = [
    { type: 'like', user: 'Alex Johnson', content: 'liked your photo', time: '2m ago', isNew: true },
    { type: 'comment', user: 'Samantha Lee', content: 'commented on your post', time: '15m ago', isNew: true },
    { type: 'follow', user: 'Chris Evans', content: 'started following you', time: '1h ago', isNew: false },
    { type: 'mention', user: 'Emily White', content: 'mentioned you in a comment', time: '3h ago', isNew: false },
    { type: 'like', user: 'David Brown', content: 'liked your comment', time: '5h ago', isNew: false },
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart size={20} className="text-red-500" />;
      case 'comment': return <MessageCircle size={20} className="text-blue-500" />;
      case 'follow': return <UserPlus size={20} className="text-green-500" />;
      case 'mention': return <Star size={20} className="text-yellow-500" />;
      default: return <Bell size={20} className="text-gray-500" />;
    }
  };

  return (
    <div className="dark:bg-zinc-900 bg-gray-50 min-h-screen">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-900 p-2 flex items-center shadow-lg">
        <ArrowLeft size={24} className="cursor-pointer dark:text-slate-200 text-gray-600" onClick={() => router.push('/home')}/>
        <h1 className="dark:text-slate-200 text-xl font-semibold ml-4">Notifications</h1>
      </header>

      {/* Notification List */}
      <main className="p-4">
        {notifications.map((notification, index) => (
          <div 
            key={index}
            className={`bg-white dark:bg-zinc-900 hover:bg-slate-200 hover:dark:bg-zinc-700 cursor-pointer rounded-lg p-4 mb-3 flex items-start shadow-md dark:shadow-2xl ${notification.isNew ? 'border-l-4 border-blue-500' : ''}`}
          >
            <div className="mr-3">
              {getIcon(notification.type)}
            </div>
            <div className="flex-1">
              <p className="font-medium dark:text-slate-200">{notification.user} <span className="dark:text-slate-500 font-normal text-gray-600">{notification.content}</span></p>
              <p className=" dark:text-slate-500 text-sm text-gray-500 mt-1">{notification.time}</p>
            </div>
            {notification.isNew && (
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            )}
          </div>
        ))}
      </main>
    </div>
  );
};

export default NotificationPage;