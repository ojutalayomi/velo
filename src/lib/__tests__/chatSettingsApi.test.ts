import { putChatSettings, saveChatSettings } from "../chatSettingsApi";
import chatReducer, { patchChatSettings } from "../../redux/chatSlice";

const patch = patchChatSettings;

afterEach(() => {
  // @ts-expect-error cleanup of the stubbed global
  delete global.fetch;
});

describe("putChatSettings", () => {
  it("sends only the changed settings to the chat's settings route", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    expect(await putChatSettings("c1", { isMuted: true })).toBeNull();
    expect(global.fetch).toHaveBeenCalledWith("/api/chats/c1/settings", expect.objectContaining({ method: "PUT", body: '{"isMuted":true}' }));
  });

  it("explains a refusal or a lost connection", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "Invalid value for wallpaper" }) });
    expect(await putChatSettings("c1", { wallpaper: "x" })).toBe("Invalid value for wallpaper");
    global.fetch = jest.fn().mockRejectedValue(new Error("down"));
    expect(await putChatSettings("c1", { isMuted: true })).toMatch(/offline/);
  });
});

describe("saveChatSettings", () => {
  const dispatch = jest.fn();
  beforeEach(() => dispatch.mockClear());

  it("changes the screen first and keeps the change when saving works", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    const error = await saveChatSettings({ dispatch, patch, chatId: "c1", previous: { isMuted: false }, updates: { isMuted: true } });
    expect(error).toBeNull();
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(patch({ chatId: "c1", updates: { isMuted: true } }));
  });

  it("puts the screen back when saving fails", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "nope" }) });
    const error = await saveChatSettings({ dispatch, patch, chatId: "c1", previous: { wallpaper: "preset:sky" }, updates: { wallpaper: "preset:mint" } });
    expect(error).toBe("nope");
    expect(dispatch).toHaveBeenNthCalledWith(1, patch({ chatId: "c1", updates: { wallpaper: "preset:mint" } }));
    expect(dispatch).toHaveBeenNthCalledWith(2, patch({ chatId: "c1", updates: { wallpaper: "preset:sky" } }));
  });
});

describe("patchChatSettings", () => {
  const withSettings = () =>
    chatReducer(undefined, { type: "chat/setSettings", payload: { c1: { isMuted: false, wallpaper: "" }, c2: { isMuted: false } } });

  it("changes one chat's settings and leaves the others", () => {
    const before = withSettings();
    const after = chatReducer(before, patchChatSettings({ chatId: "c1", updates: { isMuted: true } }));
    expect(after.settings.c1).toMatchObject({ isMuted: true, wallpaper: "" });
    expect(after.settings.c2).toBe(before.settings.c2);
  });

  it("ignores a chat it has no settings for", () => {
    const before = withSettings();
    expect(chatReducer(before, patchChatSettings({ chatId: "zz", updates: { isMuted: true } })).settings).toEqual(before.settings);
  });
});
