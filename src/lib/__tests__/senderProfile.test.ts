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
