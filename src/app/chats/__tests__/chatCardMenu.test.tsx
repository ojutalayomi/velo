import { configureStore } from "@reduxjs/toolkit";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";

import ChatListPage from "@/app/chats/ChatListPage";
import { toast } from "@/lib/toast";
import { setUserBlocked } from "@/lib/userRelations";
import chatReducer from "@/redux/chatSlice";
import userReducer from "@/redux/userSlice";
import utilsReducer from "@/redux/utilsSlice";

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn() }), usePathname: () => "/chats" }));
jest.mock("next/link", () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));
jest.mock("@/app/providers/SocketProvider", () => ({ useSocket: () => ({ emit: jest.fn() }) }));
jest.mock("@/app/providers/UserProvider", () => ({ useUser: () => ({ userdata: { _id: "me" } }) }));
jest.mock("@/components/call/callContext", () => ({ useOptionalCall: () => null }));
jest.mock("@/components/DeleteChatDialog", () => ({ __esModule: true, default: () => null }));
jest.mock("@/lib/toast", () => ({ toast: Object.assign(jest.fn(), { error: jest.fn(), success: jest.fn() }) }));
jest.mock("@/lib/userRelations", () => ({ setUserBlocked: jest.fn(), setUserMuted: jest.fn() }));
jest.mock("@/components/ReportDialog", () => ({
  __esModule: true,
  default: ({ open, type, targetId, title }: { open: boolean; type: string; targetId: string; title: string }) =>
    open ? <div role="dialog" aria-label="report">{`${title}|${type}|${targetId}`}</div> : null,
}));
jest.mock("usehooks-ts", () => ({ useMediaQuery: () => false }));

const chat = (over: Record<string, unknown>) =>
  ({
    id: "c1",
    type: "DM",
    name: "Ada",
    adminIds: [],
    lastMessage: "hi",
    timestamp: "",
    unread: 0,
    displayPicture: "",
    description: "",
    verified: false,
    favorite: false,
    pinned: false,
    deleted: false,
    archived: false,
    lastUpdated: new Date().toISOString(),
    participants: ["me", "ada"],
    online: false,
    isTypingList: [],
    ...over,
  }) as never;

function renderList(c: never) {
  const store = configureStore({ reducer: { chat: chatReducer, utils: utilsReducer, user: userReducer } as never });
  render(
    <Provider store={store}>
      <ChatListPage filteredChats={() => [c]} />
    </Provider>
  );
}

const mockBlocked = (ids: string[]) =>
  (global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ blockedUserIds: ids }) }));

const openMenu = async () => {
  fireEvent.contextMenu(screen.getByRole("heading", { name: /./ }));
  await screen.findAllByRole("menuitem");
};
const items = () => screen.getAllByRole("menuitem").map((el) => el.textContent);

beforeEach(() => {
  jest.clearAllMocks();
  (setUserBlocked as jest.Mock).mockResolvedValue(null);
  mockBlocked([]);
});
afterEach(() => {
  // @ts-expect-error cleanup of the stubbed global
  delete global.fetch;
});

describe("chat list card menu", () => {
  it("offers Block and Report on a DM", async () => {
    renderList(chat({}));
    await openMenu();
    expect(items()).toEqual(expect.arrayContaining(["Block", "Report"]));
  });

  it("asks before blocking, then blocks the other person", async () => {
    renderList(chat({}));
    await openMenu();
    await userEvent.click(screen.getByRole("menuitem", { name: "Block" }));
    expect(setUserBlocked).not.toHaveBeenCalled();
    expect(await screen.findByText("Block Ada?")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Block" }));
    await waitFor(() => expect(setUserBlocked).toHaveBeenCalledWith("ada", true));
    expect(toast).toHaveBeenCalledWith("Blocked Ada.");
  });

  it("shows Unblock for someone already blocked, and unblocks at once", async () => {
    mockBlocked(["ada"]);
    renderList(chat({}));
    await openMenu();
    await waitFor(() => expect(items()).toContain("Unblock"));
    await userEvent.click(screen.getByRole("menuitem", { name: "Unblock" }));
    await waitFor(() => expect(setUserBlocked).toHaveBeenCalledWith("ada", false));
  });

  it("opens the report form for the other person", async () => {
    renderList(chat({}));
    await openMenu();
    await userEvent.click(screen.getByRole("menuitem", { name: "Report" }));
    expect(await screen.findByRole("dialog", { name: "report" })).toHaveTextContent("Report Ada|user|ada");
  });

  it("reports a group as a group, and offers no Block there", async () => {
    renderList(chat({ id: "g1", type: "Group", name: "Study group", participants: ["me", "ada", "bo"] }));
    await openMenu();
    expect(items()).not.toContain("Block");
    await userEvent.click(screen.getByRole("menuitem", { name: "Report" }));
    expect(await screen.findByRole("dialog", { name: "report" })).toHaveTextContent("Report Study group|group|g1");
  });

  it("offers neither on your own chat", async () => {
    renderList(chat({ type: "Personal", name: "Me", participants: ["me"] }));
    await openMenu();
    expect(items()).not.toContain("Block");
    expect(items()).not.toContain("Report");
  });
});
