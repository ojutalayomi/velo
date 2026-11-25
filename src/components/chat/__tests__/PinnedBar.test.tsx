import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PinnedBar } from "@/components/chat/PinnedBar";

const mockEmit = jest.fn();
let mockState: unknown;

jest.mock("sonner", () => ({ toast: { error: jest.fn(), info: jest.fn() } }));
jest.mock("react-redux", () => ({ useSelector: (fn: (s: unknown) => unknown) => fn(mockState) }));
jest.mock("@/app/providers/SocketProvider", () => ({ useSocket: () => ({ emit: mockEmit }) }));
jest.mock("@/app/providers/UserProvider", () => ({ useUser: () => ({ userdata: { _id: "me" } }) }));

beforeAll(() => {
  window.matchMedia = ((q: string) =>
    ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }) as unknown as MediaQueryList) as typeof window.matchMedia;
  Element.prototype.scrollIntoView = jest.fn();
});

function setState(type: string, adminIds: string[], pins: string[]) {
  mockState = {
    chat: {
      conversations: [
        { id: "c1", type, adminIds, pinnedMessages: pins.map((messageId) => ({ messageId, pinnedBy: "x", pinnedAt: "" })) },
      ],
      messages: [
        { _id: "m1", content: "first pinned", messageType: "Text" },
        { _id: "m2", content: "second pinned", messageType: "Text" },
      ],
    },
  };
}

describe("PinnedBar", () => {
  it("renders nothing without pins", () => {
    setState("DM", [], []);
    const { container } = render(<PinnedBar chatId="c1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows one pin with its position and cycles on tap", async () => {
    setState("DM", [], ["m1", "m2"]);
    render(<PinnedBar chatId="c1" />);
    expect(screen.getByText("Pinned 1 of 2")).toBeInTheDocument();
    expect(screen.getByText("first pinned")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Pinned message 1 of 2/ }));
    expect(screen.getByText("Pinned 2 of 2")).toBeInTheDocument();
    expect(screen.getByText("second pinned")).toBeInTheDocument();
  });

  it("lets admins unpin from the list but not ordinary group members", async () => {
    setState("Group", ["me"], ["m1"]);
    const { unmount } = render(<PinnedBar chatId="c1" />);
    await userEvent.click(screen.getByRole("button", { name: "All pinned messages" }));
    await userEvent.click(await screen.findByRole("button", { name: "Unpin" }));
    expect(mockEmit).toHaveBeenCalledWith("unpinMessage", { chatId: "c1", messageId: "m1" }, expect.any(Function));
    unmount();

    setState("Group", ["other"], ["m1"]);
    render(<PinnedBar chatId="c1" />);
    await userEvent.click(screen.getByRole("button", { name: "All pinned messages" }));
    expect(screen.queryByRole("button", { name: "Unpin" })).toBeNull();
  });
});
