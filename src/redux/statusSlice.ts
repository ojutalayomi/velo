import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import type { StatusClient, StatusGroup, StatusViewerClient } from "@/lib/types/status";

interface StatusState {
  groups: StatusGroup[];
  loading: boolean;
  error: string | null;
}

const initialState: StatusState = {
  groups: [],
  loading: false,
  error: null,
};

function sortGroups(groups: StatusGroup[]) {
  return [...groups].sort((a, b) => Date.parse(b.latestAt) - Date.parse(a.latestAt));
}

function recomputeGroup(group: StatusGroup): StatusGroup {
  const statuses = [...group.statuses].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)
  );
  return {
    ...group,
    statuses,
    latestAt: statuses[statuses.length - 1]?.createdAt ?? group.latestAt,
    hasUnviewed: statuses.some((status) => !status.viewed),
  };
}

const statusSlice = createSlice({
  name: "status",
  initialState,
  reducers: {
    setStatusLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setStatusError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setStatusGroups: (state, action: PayloadAction<StatusGroup[]>) => {
      state.groups = sortGroups(action.payload.map(recomputeGroup));
      state.loading = false;
      state.error = null;
    },
    upsertStatusGroup: (state, action: PayloadAction<StatusGroup>) => {
      const incoming = recomputeGroup(action.payload);
      const index = state.groups.findIndex((group) => group.user._id === incoming.user._id);
      if (index === -1) {
        state.groups = sortGroups([...state.groups, incoming]);
        return;
      }

      const existing = state.groups[index];
      const byId = new Map<string, StatusClient>();
      for (const status of existing.statuses) byId.set(status._id, status);
      for (const status of incoming.statuses) byId.set(status._id, status);
      state.groups[index] = recomputeGroup({
        ...existing,
        ...incoming,
        statuses: Array.from(byId.values()),
      });
      state.groups = sortGroups(state.groups);
    },
    removeStatus: (state, action: PayloadAction<{ statusId: string; ownerId: string }>) => {
      const { statusId, ownerId } = action.payload;
      state.groups = state.groups
        .map((group) =>
          group.user._id !== ownerId
            ? group
            : recomputeGroup({
                ...group,
                statuses: group.statuses.filter((status) => status._id !== statusId),
              })
        )
        .filter((group) => group.statuses.length > 0);
    },
    markViewedLocal: (
      state,
      action: PayloadAction<{ statusId: string; viewer: StatusViewerClient }>
    ) => {
      const { statusId, viewer } = action.payload;
      state.groups = state.groups.map((group) =>
        recomputeGroup({
          ...group,
          statuses: group.statuses.map((status) => {
            if (status._id !== statusId) return status;
            const viewers = status.viewers.some((v) => v.userId === viewer.userId)
              ? status.viewers
              : [...status.viewers, viewer];
            return { ...status, viewed: true, viewers };
          }),
        })
      );
    },
    addViewerToOwnedStatus: (
      state,
      action: PayloadAction<{ statusId: string; viewer: StatusViewerClient }>
    ) => {
      const { statusId, viewer } = action.payload;
      state.groups = state.groups.map((group) => ({
        ...group,
        statuses: group.statuses.map((status) => {
          if (status._id !== statusId) return status;
          if (status.viewers.some((v) => v.userId === viewer.userId)) return status;
          return { ...status, viewers: [...status.viewers, viewer] };
        }),
      }));
    },
  },
});

export const {
  setStatusLoading,
  setStatusError,
  setStatusGroups,
  upsertStatusGroup,
  removeStatus,
  markViewedLocal,
  addViewerToOwnedStatus,
} = statusSlice.actions;

export default statusSlice.reducer;
