import { withAuthor, withoutAuthor } from "../postAuthor";

describe("withAuthor", () => {
  const stored = { UserId: "u1", NameOfPoster: "Old Name", Username: "old", DisplayPicture: "old.png", Verified: false };

  it("prefers the current account over the stored copy", () => {
    const post = withAuthor(stored, { name: "New Name", username: "new", displayPicture: "new.png", verified: true });
    expect(post).toMatchObject({ NameOfPoster: "New Name", Username: "new", DisplayPicture: "new.png", Verified: true });
  });

  it("builds the name from first and last name when there is no name", () => {
    expect(withAuthor({ UserId: "u1" }, { firstname: "Ada", lastname: "Obi", username: "ada" }).NameOfPoster).toBe("Ada Obi");
  });

  it("keeps the stored copy when the account is gone", () => {
    expect(withAuthor(stored, null)).toMatchObject({ NameOfPoster: "Old Name", Username: "old" });
  });

  it("labels a deleted account that left no copy", () => {
    expect(withAuthor({ UserId: "u1" }, null).NameOfPoster).toBe("Deleted user");
  });
});

describe("withoutAuthor", () => {
  it("drops only the author fields", () => {
    const saved = withoutAuthor({ UserId: "u1", Caption: "hi", NameOfPoster: "A", Username: "a", DisplayPicture: "", Verified: true });
    expect(saved).toEqual({ UserId: "u1", Caption: "hi" });
  });
});
