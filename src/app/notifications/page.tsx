"use client";
import { ArrowLeft, Bell, Heart, MessageCircle, Star, UserPlus } from "lucide-react";
import React from "react";

import PushNotificationSettings from "@/components/PushNotificationSettings";
import { useNavigateWithHistory } from "@/hooks/useNavigateWithHistory";

const NotificationPage: React.FC = () => {
  const navigate = useNavigateWithHistory();

  const notifications = [
    {
      type: "like",
      user: "Alex Johnson",
      content: "liked your photo",
      time: "2m ago",
      isNew: true,
    },
    {
      type: "comment",
      user: "Samantha Lee",
      content: "commented on your post",
      time: "15m ago",
      isNew: true,
    },
    {
      type: "follow",
      user: "Chris Evans",
      content: "started following you",
      time: "1h ago",
      isNew: false,
    },
    {
      type: "mention",
      user: "Emily White",
      content: "mentioned you in a comment",
      time: "3h ago",
      isNew: false,
    },
    {
      type: "like",
      user: "David Brown",
      content: "liked your comment",
      time: "5h ago",
      isNew: false,
    },
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case "like":
        return <Heart size={20} className="text-red-500" />;
      case "comment":
        return <MessageCircle size={20} className="text-blue-500" />;
      case "follow":
        return <UserPlus size={20} className="text-green-500" />;
      case "mention":
        return <Star size={20} className="text-yellow-500" />;
      default:
        return <Bell size={20} className="text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900">
      {/* Header */}
      <header className="flex items-center bg-white p-2 shadow-lg dark:bg-zinc-900">
        <ArrowLeft
          size={24}
          className="cursor-pointer text-gray-600 dark:text-slate-200"
          onClick={() => navigate()}
        />
        <h1 className="ml-4 text-xl font-semibold dark:text-slate-200">Notifications</h1>
      </header>

      {/* Notification List */}
      <main className="space-y-3 p-4">
        <PushNotificationSettings />
        {notifications.map((notification, index) => (
          <div
            key={index}
            className={`mb-3 flex cursor-pointer items-start rounded-lg bg-white p-4 shadow-md hover:bg-slate-200 dark:bg-zinc-900 dark:shadow-2xl hover:dark:bg-zinc-700 ${notification.isNew ? "border-l-4 border-blue-500" : ""}`}
          >
            <div className="mr-3">{getIcon(notification.type)}</div>
            <div className="flex-1">
              <p className="font-medium dark:text-slate-200">
                {notification.user}{" "}
                <span className="font-normal text-gray-600 dark:text-slate-500">
                  {notification.content}
                </span>
              </p>
              <p className=" mt-1 text-sm text-gray-500 dark:text-slate-500">{notification.time}</p>
            </div>
            {notification.isNew && <div className="size-2 rounded-full bg-blue-500" />}
          </div>
        ))}
      </main>
    </div>
  );
};

export default NotificationPage;
