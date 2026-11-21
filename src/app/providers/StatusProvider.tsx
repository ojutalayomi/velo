import React, { createContext, ReactNode, useCallback, useContext, useEffect } from "react";

import { useSocket } from "@/app/providers/SocketProvider";
import { useUser } from "@/app/providers/UserProvider";
import { fetchStatusGroups } from "@/lib/statusApi";
import type { StatusGroup } from "@/lib/types/status";
import { useAppDispatch } from "@/redux/hooks";
import {
  addViewerToOwnedStatus,
  markViewedLocal,
  removeStatus,
  setStatusError,
  setStatusGroups,
  setStatusLoading,
  upsertStatusGroup,
} from "@/redux/statusSlice";

type StatusContextValue = {
  refreshStatuses: () => Promise<void>;
};

const StatusContext = createContext<StatusContextValue | undefined>(undefined);

const StatusProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch();
  const socket = useSocket();
  const { userdata, loading } = useUser();

  const refreshStatuses = useCallback(async () => {
    if (!userdata?._id) return;
    dispatch(setStatusLoading(true));
    try {
      const groups = await fetchStatusGroups();
      dispatch(setStatusGroups(groups));
    } catch (error) {
      dispatch(setStatusError((error as Error).message));
      dispatch(setStatusLoading(false));
    }
  }, [dispatch, userdata?._id]);

  useEffect(() => {
    if (!loading && userdata?._id) {
      refreshStatuses();
    }
  }, [loading, refreshStatuses, userdata?._id]);

  useEffect(() => {
    if (!socket) return;

    const handleCreated = (data: { group?: StatusGroup }) => {
      if (!data.group) return;
      // The owner never sees their own statuses as unviewed (this covers their other devices).
      const mine = data.group.user._id === userdata?._id;
      dispatch(
        upsertStatusGroup(
          mine
            ? { ...data.group, statuses: data.group.statuses.map((s) => ({ ...s, viewed: true })) }
            : data.group
        )
      );
    };
    const handleDeleted = (data: { statusId: string; ownerId: string }) => {
      dispatch(removeStatus(data));
    };
    const handleViewed = (data: {
      statusId: string;
      ownerId: string;
      viewerId: string;
      viewedAt: string;
    }) => {
      const viewer = { userId: data.viewerId, viewedAt: data.viewedAt };
      // This account viewed it on another device: clear the ring here too.
      if (data.viewerId === userdata?._id) dispatch(markViewedLocal({ statusId: data.statusId, viewer }));
      else dispatch(addViewerToOwnedStatus({ statusId: data.statusId, viewer }));
    };

    socket.on("statusCreated", handleCreated);
    socket.on("statusDeleted", handleDeleted);
    socket.on("statusViewed", handleViewed);

    return () => {
      socket.off("statusCreated", handleCreated);
      socket.off("statusDeleted", handleDeleted);
      socket.off("statusViewed", handleViewed);
    };
  }, [dispatch, socket, userdata?._id]);

  return <StatusContext.Provider value={{ refreshStatuses }}>{children}</StatusContext.Provider>;
};

export default StatusProvider;

export const useStatusActions = () => {
  const context = useContext(StatusContext);
  if (context === undefined) {
    throw new Error("useStatusActions must be used within a StatusProvider");
  }
  return context;
};
