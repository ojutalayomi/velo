import { shouldSendOnEnter } from "@/app/chats/ChatTextarea";

const key = (over: Partial<{ key: string; shiftKey: boolean; ctrlKey: boolean; metaKey: boolean; isComposing: boolean }> = {}) => ({
  key: "Enter",
  shiftKey: false,
  ctrlKey: false,
  metaKey: false,
  ...over,
  nativeEvent: { isComposing: over.isComposing ?? false } as KeyboardEvent,
});

describe("shouldSendOnEnter", () => {
  it("sends on Enter with a desktop keyboard, but not with Shift or while composing", () => {
    expect(shouldSendOnEnter(key(), false)).toBe(true);
    expect(shouldSendOnEnter(key({ shiftKey: true }), false)).toBe(false);
    expect(shouldSendOnEnter(key({ isComposing: true }), false)).toBe(false);
    expect(shouldSendOnEnter(key({ key: "a" }), false)).toBe(false);
  });

  it("lets Enter start a new line on touch devices; only Ctrl/Cmd+Enter sends", () => {
    expect(shouldSendOnEnter(key(), true)).toBe(false);
    expect(shouldSendOnEnter(key({ ctrlKey: true }), true)).toBe(true);
    expect(shouldSendOnEnter(key({ metaKey: true }), true)).toBe(true);
  });
});
