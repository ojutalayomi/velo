import { hasBotHandle, isBotAccount } from "@/lib/botAccount";

describe("isBotAccount", () => {
  it("trusts a stored account type, else falls back to the name or username", () => {
    expect(isBotAccount({ accountType: "bot" })).toBe(true);
    expect(isBotAccount({ accountType: "human", name: "Robotics Bot" })).toBe(false);
    expect(isBotAccount({ name: "Velo", username: "velo_bot" })).toBe(true);
    expect(isBotAccount({ name: "Ada", username: "ada" })).toBe(false);
    expect(isBotAccount(null)).toBe(false);
  });
});

describe("hasBotHandle", () => {
  it("matches a standalone bot word only", () => {
    expect(hasBotHandle("Help Bot")).toBe(true);
    expect(hasBotHandle(undefined, "velo.bot")).toBe(true);
    expect(hasBotHandle("Abbott", "robotics")).toBe(false);
  });
});
