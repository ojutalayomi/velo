import { mergeSender, storedSender } from "@/lib/senderProfile";

describe("storedSender", () => {
  it("keeps only the id", () => {
    expect(storedSender({ id: "u1", name: "Ada", verified: true } as { id: string })).toEqual({ id: "u1" });
  });
});

describe("mergeSender", () => {
  it("shows the current account, not an old copy", () => {
    const stored = { id: "u1", name: "Old Name", username: "old", displayPicture: "old.png", verified: true };
    expect(mergeSender(stored, { name: "New Name", username: "new", displayPicture: "new.png", verified: false })).toEqual({
      id: "u1",
      name: "New Name",
      username: "new",
      displayPicture: "new.png",
      verified: false,
    });
  });

  it("builds the name from first and last name when there is no display name", () => {
    expect(mergeSender({ id: "u1" }, { firstname: "Ada", lastname: "Lovelace" }).name).toBe("Ada Lovelace");
  });

  it("falls back to the stored copy when the account is gone", () => {
    expect(mergeSender({ id: "u1", name: "Ada", username: "ada" }, null)).toMatchObject({ id: "u1", name: "Ada", username: "ada" });
  });

  it("labels a sender with no account and no stored copy", () => {
    expect(mergeSender({ id: "u1" }, undefined).name).toBe("Deleted user");
  });
});

import { resolveSender } from "@/lib/senderProfile";

describe("resolveSender", () => {
  const stored = { id: "u1", name: "Old", username: "old", displayPicture: "old.png", verified: true };

  it("prefers the member's current profile over the copy on the message", () => {
    const profiles = { u1: { name: "New", username: "new", displayPicture: "new.png", verified: false } };
    expect(resolveSender(stored, profiles)).toEqual({ id: "u1", name: "New", username: "new", displayPicture: "new.png", verified: false });
  });

  it("shows a removed picture and a revoked badge as removed", () => {
    const profiles = { u1: { name: "New", username: "new", displayPicture: "", verified: false } };
    expect(resolveSender(stored, profiles)).toMatchObject({ displayPicture: "", verified: false });
  });

  it("falls back to the message's copy for someone who is not in the profiles", () => {
    expect(resolveSender(stored, { other: { name: "X", username: "x", displayPicture: "", verified: false } })).toEqual(stored);
    expect(resolveSender(stored, undefined)).toEqual(stored);
  });

  it("copes with a missing sender", () => {
    expect(resolveSender(undefined, {})).toBeUndefined();
  });
});
