import React, { createContext, useContext, useEffect, useState } from "react";
import io, { Socket } from "socket.io-client";

import { useUser } from "@/app/providers/UserProvider";
import { networkMonitor, NetworkStatus } from "@/lib/network";
import { getSocketToken } from "@/lib/socketToken";
import { useAppDispatch } from "@/redux/hooks";
import { updateSettings } from "@/redux/userSlice";
import { addOnlineUser, removeOnlineUser, setOnlineUsers } from "@/redux/utilsSlice";

interface ThrottleFunction {
  (...args: any[]): void;
}

const SocketContext = createContext<Socket | null>(null);

const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // True once the browser has been online at least once. It stays true when the connection drops:
  // socket.io reconnects by itself, so the socket is only created, never torn down, by this.
  const [hasBeenOnline, setHasBeenOnline] = useState(false);
  const { userdata, loading, error } = useUser();
  const dispatch = useAppDispatch();
  const [socket, setSocket] = useState<Socket | null>(null);
  const userId = userdata?._id;

  // Follow the connection, not just its state at load: a page opened offline must get its
  // socket once the network returns (without one, queued messages could never be sent).
  useEffect(
    () =>
      networkMonitor.subscribe((status: NetworkStatus) => {
        if (status.online) setHasBeenOnline(true);
      }),
    []
  );

  // Load the saved privacy settings once the user is known (they are stored server-side).
  useEffect(() => {
    if (loading || !userId) return;
    fetch("/api/user/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (body?.data) dispatch(updateSettings(body.data));
      })
      .catch(() => {});
  }, [dispatch, loading, userId]);

  useEffect(() => {
    // Only initialize the socket if userdata is loaded
    if (loading || !userId || !hasBeenOnline) return;

    fetch(process.env.NEXT_PUBLIC_SOCKET_URL || "");
    const socketIo = io(process.env.NEXT_PUBLIC_SOCKET_URL || "", {
      path: "/wxyrt",
      query: { userId },
      // A function, so every reconnect sends a fresh token.
      auth: (done) => {
        void getSocketToken().then((token) => done(token ? { token } : {}));
      },
      transports: ["websocket", "polling"],
    });

    socketIo.on("connect", () => {
      // The server replies to "register" with a full presence snapshot, so a
      // reconnect resyncs users whose status events were missed while offline.
      socketIo.emit("register", userId);
    });

    socketIo.on("userStatus", (data: { userId: string; status: "online" | "offline" }) => {
      if (!data?.userId) return;
      // The server already reports users who hide their online status as offline.
      // The reducers dedupe, so status is dispatched unconditionally.
      if (data.status === "online") {
        dispatch(addOnlineUser(data.userId));
      } else {
        dispatch(removeOnlineUser(data.userId));
      }
    });

    socketIo.on("onlineUsers", (ids: string[]) => {
      dispatch(setOnlineUsers(ids));
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
      socketIo.emit("activity");
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
  }, [dispatch, loading, hasBeenOnline, userId]);

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
