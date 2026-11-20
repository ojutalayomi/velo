/** Whether `userId` may post in a chat. Groups can be restricted to admins only. */
export function canSendMessage(params: {
  chatType?: string;
  onlyAdminsCanSend?: boolean;
  adminIds?: string[];
  userId: string;
}): boolean {
  if (params.chatType !== "Group" || !params.onlyAdminsCanSend) return true;
  return Boolean(params.adminIds?.includes(params.userId));
}

export type AdminChangeCheck =
  | { ok: true; noop: boolean }
  | { ok: false; status: 403 | 404 | 409; error: string };

/** Validates promoting or demoting a group member; the route applies it atomically. */
export function checkAdminChange(params: {
  adminIds: string[];
  isTargetMember: boolean;
  callerId: string;
  targetId: string;
  makeAdmin: boolean;
}): AdminChangeCheck {
  const { adminIds, callerId, targetId, makeAdmin } = params;

  if (!adminIds.includes(callerId)) {
    return { ok: false, status: 403, error: "Only group admins can change admin roles" };
  }
  if (!params.isTargetMember) {
    return { ok: false, status: 404, error: "That user is not a member of this group" };
  }

  const isAdmin = adminIds.includes(targetId);
  if (makeAdmin) return { ok: true, noop: isAdmin };
  if (!isAdmin) return { ok: true, noop: true };
  if (adminIds.length <= 1) {
    return { ok: false, status: 409, error: "A group needs at least one admin" };
  }
  return { ok: true, noop: false };
}
