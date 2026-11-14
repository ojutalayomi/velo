import React, { createContext, useContext, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import io, { Socket } from "socket.io-client";

import { useUser } from "@/app/providers/UserProvider";
import { networkMonitor, NetworkStatus } from "@/lib/network";
import { useAppDispatch } from "@/redux/hooks";
import { RootState } from "@/redux/store";
import { addOnlineUser, removeOnlineUser, setOnlineUsers } from "@/redux/utilsSlice";

interface ThrottleFunction {
  (...args: any[]): void;
}

const SocketContext = createContext<Socket | null>(null);

const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<NetworkStatus>();
  const { userdata, loading, error } = useUser();
  const { settings } = useSelector((state: RootState) => state.user);
  const dispatch = useAppDispatch();
  const [socket, setSocket] = useState<Socket | null>(null);
  const userId = userdata?._id;

  useEffect(() => {
    setStatus(networkMonitor.getNetworkStatus());
  }, []);

  useEffect(() => {
    // Only initialize the socket if userdata is loaded
    if (loading || !userId || !status?.online) return;

    fetch(process.env.NEXT_PUBLIC_SOCKET_URL || "");
    const socketIo = io(process.env.NEXT_PUBLIC_SOCKET_URL || "", {
      path: "/wxyrt",
      query: { userId },
      transports: ["websocket", "polling"],
    });

    socketIo.on("connect", () => {
      // The server replies to "register" with a full presence snapshot, so a
      // reconnect resyncs users whose status events were missed while offline.
      socketIo.emit("register", userId);
    });

    socketIo.on("userStatus", (data: { userId: string; status: "online" | "offline" }) => {
      if (!data?.userId) return;
      // The reducers dedupe, so status is dispatched unconditionally; an early
      // return on an already-known user used to swallow "offline" events.
      if (data.status === "online" && settings?.showOnlineStatus) {
        dispatch(addOnlineUser(data.userId));
      } else {
        dispatch(removeOnlineUser(data.userId));
      }
    });

    socketIo.on("onlineUsers", (ids: string[]) => {
      dispatch(setOnlineUsers(settings?.showOnlineStatus ? ids : []));
    });

    socketIo.on("disconnect", (reason: any) => {
      // console.log('Disconnected:', reason);
    });

    socketIo.on("connect_error", (err: any) => {
      // console.error('Connection Error:', err);
      if (err.message.includes("P: websocket error at tt.onError")) {
        socketIo.emit("register", userId); // Emit 'register' event with user's ID
      }
    });

    socketIo.on("error", (err: any) => {
      // console.error('Socket Error:', err);
    });

    function throttle(callback: ThrottleFunction, limit: number): ThrottleFunction {
      let waiting = false;
      return function (this: any, ...args: any[]): void {
        if (!waiting) {
          callback.apply(this, args);
          waiting = true;
          setTimeout(() => {
            waiting = false;
          }, limit);
        }
      };
    }

    const emitActivityFunction = () => {
      if (settings?.showOnlineStatus) {
        socketIo.emit("activity");
      }
    };

    const emitActivity = throttle(() => {
      emitActivityFunction();
    }, 5000);

    const emitActivity1 = () => {
      if (document.visibilityState === "visible") {
        emitActivityFunction();
      }
    };

    window.onbeforeunload = () => {
      emitActivityFunction();
    };

    document.addEventListener("mousemove", emitActivity);
    document.addEventListener("touchstart", emitActivity);
    document.addEventListener("visibilitychange", emitActivity1);

    setSocket(socketIo);

    return () => {
      document.removeEventListener("mousemove", emitActivity);
      document.removeEventListener("touchstart", emitActivity);
      document.removeEventListener("visibilitychange", emitActivity1);
      window.onbeforeunload = null;
      socketIo.disconnect(); // Ensure the socket is disconnected on cleanup
    };
  }, [dispatch, loading, settings.showOnlineStatus, status?.online, userId]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
};

export default SocketProvider;

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
