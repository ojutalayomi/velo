"use client";

import { useCallback, useEffect } from "react";

import { useSocket } from "@/app/providers/SocketProvider";
import { useUser } from "@/app/providers/UserProvider";
import { useAppDispatch } from "@/redux/hooks";
import { setUnreadCount } from "@/redux/notificationSlice";

interface NotificationCountPayload {
  unreadCount?: number;
}

export default function NotificationLiveSync() {
  const { userdata } = useUser();
  const socket = useSocket();
  const dispatch = useAppDispatch();
  const userId = userdata?._id;

  const applyCount = useCallback(
    (value: unknown) => {
      if (typeof value === "number" && Number.isFinite(value)) {
        dispatch(setUnreadCount(value));
      }
    },
    [dispatch]
  );

  const refresh = useCallback(async () => {
    if (!userId) {
      dispatch(setUnreadCount(0));
      return;
    }

    try {
      const response = await fetch("/api/notifications/unread-count", { cache: "no-store" });
      if (!response.ok) return;

      const body = (await response.json()) as NotificationCountPayload;
      applyCount(body.unreadCount);
    } catch {
      // Badge resyncs on the next socket connect or page load.
    }
  }, [applyCount, dispatch, userId]);

  useEffect(() => {
    if (userId) {
      refresh();
    } else {
      dispatch(setUnreadCount(0));
    }
  }, [dispatch, refresh, userId]);

  useEffect(() => {
    if (!socket) return;

    const handleCount = (payload: NotificationCountPayload) => applyCount(payload?.unreadCount);

    socket.on("notification:new", handleCount);
    socket.on("notification:removed", handleCount);
    socket.on("connect", refresh);

    return () => {
      socket.off("notification:new", handleCount);
      socket.off("notification:removed", handleCount);
      socket.off("connect", refresh);
    };
  }, [applyCount, refresh, socket]);

  return null;
}
