import { configureStore } from "@reduxjs/toolkit";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";

import MessageTab from "@/app/chats/MessageTab";
import { privateReplyQuote } from "@/lib/privateReply";
import chatReducer, { setConversations, setMessages } from "@/redux/chatSlice";
import userReducer from "@/redux/userSlice";
import utilsReducer from "@/redux/utilsSlice";

const push = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/chats/group/g1",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));
jest.mock("@/app/providers/SocketProvider", () => ({ useSocket: () => ({ emit: jest.fn() }) }));
jest.mock("@/app/providers/UserProvider", () => ({ useUser: () => ({ userdata: { _id: "me", username: "me" } }) }));
jest.mock("@/lib/toast", () => ({ toast: Object.assign(jest.fn(), { error: jest.fn(), success: jest.fn() }) }));
jest.mock("@/components/ForwardDialog", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/LinkPreview", () => ({ LinkPreview: () => null }));
jest.mock("@/components/Markdown", () => ({ Markdown: ({ children }: { children: string }) => <>{children}</> }));
jest.mock("@/components/chat/ViewOnce", () => ({ ViewOnceBubble: () => null }));
jest.mock("../FilesView", () => ({ MediaCollage: () => null }));
jest.mock("../ReactionsInfo", () => ({ ReactionsInfo: () => null }));

const groupMessage = (sender: string) =>
  ({
    _id: "m1",
    chatId: "g1",
    chatType: "Group",
    messageType: "Text",
    content: "Who has the notes?",
    sender: { id: sender, name: "Ada" },
    attachments: [],
    timestamp: new Date().toISOString(),
    status: "sent",
    isRead: {},
    reactions: [],
  }) as never;

function renderTab(message: never) {
  const store = configureStore({ reducer: { chat: chatReducer, utils: utilsReducer, user: userReducer } as never });
  store.dispatch(
    setConversations([
      { id: "g1", type: "Group", name: "Study group", adminIds: [], participants: ["me", "ada"] },
      { id: "dm1", type: "DM", name: "Ada", adminIds: [], participants: ["me", "ada"] },
    ] as never)
  );
  store.dispatch(setMessages([message]));
  render(
    <Provider store={store}>
      <MessageTab message={message} setQuote={jest.fn()} />
    </Provider>
  );
  return store;
}

const openOptions = async () => {
  await userEvent.click(screen.getAllByRole("button", { name: "Open message options", hidden: true })[0]);
};

beforeAll(() => {
  window.matchMedia = ((query: string) =>
    ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {} }) as unknown as MediaQueryList) as typeof window.matchMedia;
});

beforeEach(() => jest.clearAllMocks());

describe("Reply privately", () => {
  it("is offered on another member's group message, and opens the existing DM with it quoted", async () => {
    const store = renderTab(groupMessage("ada"));
    await openOptions();
    await userEvent.click((await screen.findAllByRole("button", { name: /Reply privately/ }))[0]);
    expect(push).toHaveBeenCalledWith("/chats/dm1");
    const pending = (store.getState() as { utils: { pendingPrivateReply: unknown } }).utils.pendingPrivateReply;
    expect(pending).toEqual({ messageId: "m1", target: "dm1" });
    const { messages } = (store.getState() as { chat: { messages: never[] } }).chat;
    expect(privateReplyQuote(pending as never, "dm1", messages)?.message.content).toBe("Who has the notes?");
  });

  it("goes to the new-chat screen when there is no DM yet", async () => {
    const store = configureStore({ reducer: { chat: chatReducer, utils: utilsReducer, user: userReducer } as never });
    store.dispatch(setConversations([{ id: "g1", type: "Group", name: "Study group", adminIds: [], participants: ["me", "ada"] }] as never));
    store.dispatch(setMessages([groupMessage("ada")]));
    render(
      <Provider store={store}>
        <MessageTab message={groupMessage("ada")} setQuote={jest.fn()} />
      </Provider>
    );
    await openOptions();
    await userEvent.click((await screen.findAllByRole("button", { name: /Reply privately/ }))[0]);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/chats/new?otherId=ada"));
    expect((store.getState() as { utils: { pendingPrivateReply: unknown } }).utils.pendingPrivateReply).toEqual({
      messageId: "m1",
      target: "new:ada",
    });
  });

  it("is not offered on your own message", async () => {
    renderTab(groupMessage("me"));
    await openOptions();
    expect((await screen.findAllByRole("button", { name: /Copy message/ })).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /Reply privately/ })).toBeNull();
  });
});

describe("A reply that quotes a message from the group", () => {
  it("shows the quoted message and the group it came from in the DM", async () => {
    const store = configureStore({ reducer: { chat: chatReducer, utils: utilsReducer, user: userReducer } as never });
    store.dispatch(
      setConversations([
        { id: "g1", type: "Group", name: "Study group", adminIds: [], participants: ["me", "ada"], profiles: { ada: { name: "Ada", username: "ada", displayPicture: "", verified: false } } },
        { id: "dm1", type: "DM", name: "Ada", adminIds: [], participants: ["me", "ada"] },
      ] as never)
    );
    const reply = {
      ...(groupMessage("me") as object),
      _id: "m2",
      chatId: "dm1",
      chatType: "DM",
      content: "I do, sending now",
      quotedMessageId: "m1",
    } as never;
    store.dispatch(setMessages([groupMessage("ada"), reply]));
    render(
      <Provider store={store}>
        <MessageTab message={reply} setQuote={jest.fn()} />
      </Provider>
    );
    expect(await screen.findByText("Who has the notes?")).toBeTruthy();
    expect(screen.getByText(/in Study group/)).toBeTruthy();
    expect(screen.getByText("I do, sending now")).toBeTruthy();
  });
});
