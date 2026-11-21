import { isBotAccount } from "@/lib/botAccount";

describe("isBotAccount", () => {
  it("trusts a stored account type, else falls back to the name or username", () => {
    expect(isBotAccount({ accountType: "bot" })).toBe(true);
    expect(isBotAccount({ accountType: "human", name: "Robotics Bot" })).toBe(false);
    expect(isBotAccount({ name: "Velo", username: "velo_bot" })).toBe(true);
    expect(isBotAccount({ name: "Ada", username: "ada" })).toBe(false);
    expect(isBotAccount(null)).toBe(false);
  });
});
