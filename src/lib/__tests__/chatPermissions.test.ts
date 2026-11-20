import { canSendMessage, checkAdminChange } from "@/lib/chatPermissions";

describe("canSendMessage", () => {
  const base = { chatType: "Group", onlyAdminsCanSend: true, adminIds: ["a"], userId: "m" };

  it("blocks non-admins only when a group is restricted", () => {
    expect(canSendMessage(base)).toBe(false);
    expect(canSendMessage({ ...base, userId: "a" })).toBe(true);
    expect(canSendMessage({ ...base, onlyAdminsCanSend: false })).toBe(true);
    expect(canSendMessage({ ...base, onlyAdminsCanSend: undefined })).toBe(true);
  });

  it("never restricts non-group chats", () => {
    expect(canSendMessage({ ...base, chatType: "DM" })).toBe(true);
  });
});

describe("checkAdminChange", () => {
  const base = { adminIds: ["a", "b"], isTargetMember: true, callerId: "a", targetId: "m", makeAdmin: true };

  it("lets an admin promote a member", () => {
    expect(checkAdminChange(base)).toEqual({ ok: true, noop: false });
  });

  it("treats redundant changes as no-ops", () => {
    expect(checkAdminChange({ ...base, targetId: "b" })).toEqual({ ok: true, noop: true });
    expect(checkAdminChange({ ...base, makeAdmin: false })).toEqual({ ok: true, noop: true });
  });

  it("lets an admin demote another admin or themselves while one remains", () => {
    expect(checkAdminChange({ ...base, targetId: "b", makeAdmin: false })).toEqual({ ok: true, noop: false });
    expect(checkAdminChange({ ...base, targetId: "a", makeAdmin: false })).toEqual({ ok: true, noop: false });
  });

  it("refuses to demote the last admin", () => {
    expect(
      checkAdminChange({ ...base, adminIds: ["a"], targetId: "a", makeAdmin: false })
    ).toMatchObject({ ok: false, status: 409 });
  });

  it("rejects non-admin callers and non-members", () => {
    expect(checkAdminChange({ ...base, callerId: "m" })).toMatchObject({ ok: false, status: 403 });
    expect(checkAdminChange({ ...base, isTargetMember: false })).toMatchObject({ ok: false, status: 404 });
  });
});
