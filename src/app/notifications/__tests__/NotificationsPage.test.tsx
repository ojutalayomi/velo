import { act, configure, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";

import NotificationPage from "@/app/notifications/page";
import type { NotificationActor, NotificationGroup } from "@/lib/types/type";

configure({ asyncUtilTimeout: 5000 });
jest.setTimeout(20000);

const mockDispatch = jest.fn();
const mockPush = jest.fn();
const mockRouter = { push: mockPush };

const mockSocket = {
  handlers: new Map<string, (payload?: unknown) => void>(),
  on: jest.fn((event: string, handler: (payload?: unknown) => void) => {
    mockSocket.handlers.set(event, handler);
  }),
  off: jest.fn((event: string) => {
    mockSocket.handlers.delete(event);
  }),
};

jest.mock("@/app/providers/SocketProvider", () => ({
  useSocket: () => mockSocket,
}));

jest.mock("@/app/providers/UserProvider", () => ({
  useUser: () => ({ userdata: { _id: "u1" } }),
}));

const mockSaveFeed = jest.fn();
const mockLoadFeed = jest.fn();
jest.mock("@/lib/feedCache", () => ({
  saveFeed: (...args: unknown[]) => mockSaveFeed(...args),
  loadFeed: (...args: unknown[]) => mockLoadFeed(...args),
}));

jest.mock("@/redux/hooks", () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock("@/hooks/useNavigateWithHistory", () => ({
  useNavigateWithHistory: () => jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}));

jest.mock("@/components/PushNotificationSettings", () => () => null);
jest.mock("@/components/NotificationPreferencesCard", () => () => null);

const alex: NotificationActor = {
  id: "a1",
  name: "Alex Johnson",
  username: "alex",
  displayPicture: "",
  verified: true,
};

const sam: NotificationActor = {
  id: "a2",
  name: "Sam Lee",
  username: "sam",
  displayPicture: "",
  verified: false,
};

function group(overrides: Partial<NotificationGroup> = {}): NotificationGroup {
  return {
    groupKey: "like:post:p1",
    type: "like",
    targetType: "post",
    targetId: "p1",
    url: "/alex/posts/p1",
    latestAt: new Date().toISOString(),
    count: 2,
    actorCount: 2,
    unread: true,
    actors: [alex, sam],
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: async () => body,
  } as Response);
}

const fetchMock = jest.fn();

function installFetch(data: NotificationGroup[]) {
  fetchMock.mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);

    if (url.includes("/api/notifications/read")) {
      return jsonResponse({ success: true, modified: 2, unreadCount: 0 });
    }

    const parsed = new URL(url, "http://localhost");
    const tab = parsed.searchParams.get("tab");
    const filtered =
      tab === "mentions"
        ? data.filter((item) => item.type === "mention")
        : tab === "verified"
          ? data.filter((item) => item.actors.some((actor) => actor.verified))
          : data;

    return jsonResponse({
      data: filtered,
      pagination: { skip: 0, limit: 30, hasMore: false },
      unreadCount: 2,
    });
  });
}

function requestUrls() {
  return fetchMock.mock.calls.map(([input]) => String(input));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSocket.handlers.clear();
  global.fetch = fetchMock as unknown as typeof fetch;
  mockSaveFeed.mockResolvedValue(true);
  mockLoadFeed.mockResolvedValue(null);
});

describe("Notifications page", () => {
  it("renders grouped rows and marks the inbox read once", async () => {
    installFetch([group()]);

    render(<NotificationPage />);

    expect(
      await screen.findByText("Alex Johnson and Sam Lee liked your post")
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(requestUrls()).toContain("/api/notifications/read");
    });
    expect(requestUrls().filter((url) => url === "/api/notifications/read")).toHaveLength(1);

    const readCall = fetchMock.mock.calls.find(([input]) =>
      String(input).includes("/api/notifications/read")
    );
    const init = readCall?.[1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({
      before: expect.any(String),
    });
  });

  it("requests the mentions tab when it is selected", async () => {
    installFetch([group()]);
    const user = userEvent.setup();

    render(<NotificationPage />);
    await screen.findByText("Alex Johnson and Sam Lee liked your post");

    await user.click(screen.getByRole("tab", { name: "Mentions" }));

    await waitFor(() => {
      expect(
        requestUrls().some((url) => url.includes("tab=mentions"))
      ).toBe(true);
    });
    expect(await screen.findByText("No mentions yet.")).toBeInTheDocument();
  });

  it("shows the empty state for the active tab", async () => {
    installFetch([]);
    render(<NotificationPage />);

    expect(await screen.findByText("You're all caught up.")).toBeInTheDocument();
  });

  it("merges live notification events into the list", async () => {
    installFetch([group({ actors: [alex], actorCount: 1, count: 1 })]);
    render(<NotificationPage />);

    expect(await screen.findByText("Alex Johnson liked your post")).toBeInTheDocument();

    const handler = mockSocket.handlers.get("notification:new");
    expect(handler).toBeDefined();

    await act(async () => {
      handler?.({
        notification: {
          groupKey: "like:post:p1",
          type: "like",
          targetType: "post",
          targetId: "p1",
          url: "/alex/posts/p1",
          createdAt: new Date().toISOString(),
          actor: sam,
        },
        unreadCount: 3,
      });
    });

    expect(
      await screen.findByText("Alex Johnson and Sam Lee liked your post")
    ).toBeInTheDocument();
  });

  it("redirects to login when the API returns 401", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: "Unauthorized" }, 401));

    render(<NotificationPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/accounts/login");
    });
  });

  it("saves the first page of each tab for offline use", async () => {
    installFetch([group()]);
    render(<NotificationPage />);
    await screen.findByText("Alex Johnson and Sam Lee liked your post");
    expect(mockSaveFeed).toHaveBeenCalledWith(
      "notifications:all",
      "u1",
      [expect.objectContaining({ groupKey: "like:post:p1" })],
      expect.anything()
    );
  });

  it("shows the saved list when offline and does not mark it read", async () => {
    mockLoadFeed.mockResolvedValue({ data: [group()], pagination: {}, savedAt: 1 });
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<NotificationPage />);
    expect(await screen.findByText("Alex Johnson and Sam Lee liked your post")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Showing what was saved");
    expect(requestUrls().some((u) => u.includes("/read"))).toBe(false);
  });

  it("says so when offline with nothing saved", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<NotificationPage />);
    expect(await screen.findByText("Could not load notifications.")).toBeInTheDocument();
  });
});
