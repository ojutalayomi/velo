import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ForwardDialog from "@/components/ForwardDialog";

const mockEmit = jest.fn();
let mockState: unknown;

jest.mock("@/lib/toast", () => ({ toast: { error: jest.fn(), success: jest.fn(), warning: jest.fn() } }));
jest.mock("react-redux", () => ({ useSelector: (fn: (s: unknown) => unknown) => fn(mockState) }));
jest.mock("@/app/providers/SocketProvider", () => ({
  useSocket: () => ({ timeout: () => ({ emit: mockEmit }) }),
}));
jest.mock("@/app/providers/UserProvider", () => ({ useUser: () => ({ userdata: { _id: "me" } }) }));

beforeAll(() => {
  window.matchMedia = ((q: string) =>
    ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }) as unknown as MediaQueryList) as typeof window.matchMedia;
});

function setup(messageType: string, ids = ["m1"]) {
  mockState = {
    chat: {
      conversations: [{ id: "c1", name: "Ada", adminIds: [], lastUpdated: "2026-01-01", displayPicture: "" }],
      messages: [
        { _id: "m1", messageType, content: "hello", attachments: messageType === "Text" ? [] : ["k"] },
        { _id: "m2", messageType: "Text", content: "two", attachments: [] },
      ],
    },
  };
  const onForwarded = jest.fn();
  render(<ForwardDialog messageIds={ids} open onOpenChange={jest.fn()} onForwarded={onForwarded} />);
  return onForwarded;
}

describe("ForwardDialog my status row", () => {
  it("is offered for one text, photo, video or voice message", () => {
    setup("Text");
    expect(screen.getByRole("button", { name: /My status/ })).toBeInTheDocument();
  });

  it("is not offered for other kinds or for several messages", () => {
    setup("Poll");
    expect(screen.queryByRole("button", { name: /My status/ })).toBeNull();
  });

  it("is not offered for a multi-message selection", () => {
    setup("Text", ["m1", "m2"]);
    expect(screen.queryByRole("button", { name: /My status/ })).toBeNull();
  });

  it("adds only to status without touching the socket, never sending the stand-in id", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as unknown as typeof fetch;
    const onForwarded = setup("Text");
    await userEvent.click(screen.getByRole("button", { name: /My status/ }));
    await userEvent.click(screen.getByRole("button", { name: /^Forward/ }));
    await waitFor(() => expect(onForwarded).toHaveBeenCalled());
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/statuses/forward",
      expect.objectContaining({ body: JSON.stringify({ messageId: "m1" }) })
    );
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it("sends chats over the socket and status over the API together", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as unknown as typeof fetch;
    mockEmit.mockImplementation((_e, _p, cb) => cb(null, { ok: true, results: [{ chatId: "c1", ok: true }] }));
    const onForwarded = setup("Text");
    await userEvent.click(screen.getByRole("button", { name: /My status/ }));
    await userEvent.click(screen.getByRole("button", { name: /Ada/ }));
    await userEvent.click(screen.getByRole("button", { name: /^Forward/ }));
    await waitFor(() => expect(onForwarded).toHaveBeenCalled());
    expect(mockEmit).toHaveBeenCalledWith("forwardMessages", { messageIds: ["m1"], chatIds: ["c1"] }, expect.any(Function));
  });
});
