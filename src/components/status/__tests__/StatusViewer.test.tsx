import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StatusViewer } from "@/components/status/StatusViewer";
import { fetchStatusViewers, markStatusViewed, replyToStatus, setStatusLiked } from "@/lib/statusApi";
import { toast } from "sonner";
import type { StatusClient, StatusGroup } from "@/lib/types/status";

const mockDispatch = jest.fn();
const mockPush = jest.fn();
let mockUserId = "me";

jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("@/redux/hooks", () => ({ useAppDispatch: () => mockDispatch }));
jest.mock("@/app/providers/UserProvider", () => ({
  useUser: () => ({ userdata: { _id: mockUserId } }),
}));
jest.mock("@/components/VerificationComponent", () => ({ Statuser: () => null }));
jest.mock("@/lib/statusApi", () => ({
  deleteStatus: jest.fn(),
  markStatusViewed: jest.fn().mockResolvedValue(undefined),
  setStatusLiked: jest.fn(),
  replyToStatus: jest.fn(),
  fetchStatusViewers: jest.fn(),
}));

const status = (over: Partial<StatusClient> = {}): StatusClient => ({
  _id: "s1",
  userId: "owner",
  mediaUrl: "",
  mediaKey: "",
  mediaType: "text",
  text: "Hello world",
  background: "ocean",
  caption: "",
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 3600_000).toISOString(),
  visibility: "followers",
  mentions: [],
  viewed: false,
  viewers: [],
  viewCount: 0,
  likeCount: 0,
  liked: false,
  ...over,
});

const group = (...statuses: StatusClient[]): StatusGroup => ({
  user: { _id: "owner", name: "Ada Lovelace", username: "ada", displayPicture: "", verified: false },
  statuses,
  hasUnviewed: true,
  latestAt: statuses[0].createdAt,
});

function setup(groups: StatusGroup[], onClose = jest.fn()) {
  render(<StatusViewer groups={groups} initialGroupIndex={0} initialStatusIndex={0} onClose={onClose} />);
  return onClose;
}

beforeAll(() => {
  window.matchMedia = ((query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
  window.HTMLMediaElement.prototype.play = jest.fn().mockResolvedValue(undefined);
  window.HTMLMediaElement.prototype.pause = jest.fn();
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUserId = "me";
});

describe("StatusViewer: what it shows", () => {
  it("shows a text status on its background", () => {
    setup([group(status())]);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Status from Ada Lovelace" })).toBeInTheDocument();
  });

  it("shows a voice status with its length", () => {
    setup([group(status({ mediaType: "audio", mediaUrl: "https://x/a.mp3", durationSec: 75, text: undefined }))]);
    expect(screen.getByText(/1:15/)).toBeInTheDocument();
    expect(document.querySelector("audio")).toHaveAttribute("src", "https://x/a.mp3");
  });

  it("records the view for someone else's status, but not for your own", () => {
    setup([group(status())]);
    expect(markStatusViewed).toHaveBeenCalledWith("s1");
  });
});

describe("StatusViewer: likes", () => {
  it("likes at once and keeps the server's answer", async () => {
    (setStatusLiked as jest.Mock).mockResolvedValue({ liked: true, likeCount: 5 });
    setup([group(status({ likeCount: 4 }))]);
    const heart = screen.getByRole("button", { name: "Like status" });
    expect(heart).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(heart);
    expect(setStatusLiked).toHaveBeenCalledWith("s1", true);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Unlike status" })).toHaveAttribute("aria-pressed", "true")
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { statusId: "s1", liked: true, likeCount: 5 } })
    );
  });

  it("unlikes a liked status", async () => {
    (setStatusLiked as jest.Mock).mockResolvedValue({ liked: false, likeCount: 0 });
    setup([group(status({ liked: true, likeCount: 1 }))]);
    await userEvent.click(screen.getByRole("button", { name: "Unlike status" }));
    expect(setStatusLiked).toHaveBeenCalledWith("s1", false);
    await waitFor(() => expect(screen.getByRole("button", { name: "Like status" })).toBeInTheDocument());
  });

  it("puts the heart back when the request fails", async () => {
    (setStatusLiked as jest.Mock).mockRejectedValue(new Error("nope"));
    setup([group(status())]);
    await userEvent.click(screen.getByRole("button", { name: "Like status" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Like status" })).toBeInTheDocument());
  });
});

describe("StatusViewer: the owner's view", () => {
  beforeEach(() => {
    mockUserId = "owner";
  });

  it("shows counts, not a like button, and never records its own view", () => {
    setup([group(status({ viewCount: 12, likeCount: 3 }))]);
    expect(screen.getByRole("button", { name: /12 views/ })).toBeInTheDocument();
    expect(screen.getByLabelText("3 likes")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Like status/ })).toBeNull();
    expect(markStatusViewed).not.toHaveBeenCalled();
  });

  it("opens the viewed-by list with names and who liked", async () => {
    (fetchStatusViewers as jest.Mock).mockResolvedValue([
      {
        userId: "u1",
        name: "Grace Hopper",
        username: "grace",
        displayPicture: "",
        verified: false,
        viewedAt: new Date().toISOString(),
        liked: true,
      },
      {
        userId: "u2",
        name: "Alan Turing",
        username: "alan",
        displayPicture: "",
        verified: false,
        viewedAt: new Date().toISOString(),
        liked: false,
      },
    ]);
    setup([group(status({ viewCount: 2 }))]);
    await userEvent.click(screen.getByRole("button", { name: /2 views/ }));
    expect(fetchStatusViewers).toHaveBeenCalledWith("s1");
    expect(await screen.findByText("Grace Hopper")).toBeInTheDocument();
    expect(screen.getByText("Alan Turing")).toBeInTheDocument();
    expect(screen.getByText("Viewed by 2")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Liked")).toHaveLength(1);
  });

  it("says so when nobody has viewed it yet", async () => {
    (fetchStatusViewers as jest.Mock).mockResolvedValue([]);
    setup([group(status())]);
    await userEvent.click(screen.getByRole("button", { name: /0 views/ }));
    expect(await screen.findByText("No views yet.")).toBeInTheDocument();
  });
});

describe("StatusViewer: moving and pausing", () => {
  it("goes to the next status on a tap, and closes after the last", async () => {
    const onClose = setup([group(status({ _id: "a", text: "First" }), status({ _id: "b", text: "Second" }))]);
    expect(screen.getByText("First")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Next status" }));
    expect(screen.getByText("Second")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Next status" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("moves with the arrow keys", async () => {
    setup([group(status({ _id: "a", text: "First" }), status({ _id: "b", text: "Second" }))]);
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByText("Second")).toBeInTheDocument();
    await userEvent.keyboard("{ArrowLeft}");
    expect(screen.getByText("First")).toBeInTheDocument();
  });

  it("moves on by itself after the status has been up long enough", () => {
    jest.useFakeTimers();
    try {
      setup([group(status({ _id: "a", text: "First" }), status({ _id: "b", text: "Second" }))]);
      act(() => {
        jest.advanceTimersByTime(7000);
      });
      expect(screen.getByText("Second")).toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  it("stands still while the screen is pressed and held", () => {
    jest.useFakeTimers();
    try {
      setup([group(status({ _id: "a", text: "First" }), status({ _id: "b", text: "Second" }))]);
      const sheet = screen.getByRole("dialog");
      act(() => {
        sheet.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 0 }));
      });
      act(() => {
        jest.advanceTimersByTime(20000);
      });
      expect(screen.getByText("First")).toBeInTheDocument();
      act(() => {
        sheet.dispatchEvent(new MouseEvent("pointerup", { bubbles: true }));
      });
      act(() => {
        jest.advanceTimersByTime(7000);
      });
      expect(screen.getByText("Second")).toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });
});

describe("StatusViewer: replying", () => {
  beforeEach(() => {
    (replyToStatus as jest.Mock).mockResolvedValue({ chatId: "chat-1", messageId: "m1" });
  });

  it("has a reply box on someone else's status", () => {
    setup([group(status())]);
    expect(screen.getByLabelText("Reply to Ada Lovelace")).toBeInTheDocument();
  });

  it("has no reply box on your own status", () => {
    mockUserId = "owner";
    setup([group(status())]);
    expect(screen.queryByLabelText("Reply to Ada Lovelace")).toBeNull();
  });

  it("sends the reply, clears the box and offers to open the chat", async () => {
    setup([group(status())]);
    const box = screen.getByLabelText("Reply to Ada Lovelace");
    await userEvent.type(box, "  Love this  ");
    await userEvent.click(screen.getByRole("button", { name: "Send reply" }));
    expect(replyToStatus).toHaveBeenCalledWith("s1", "Love this");
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(box).toHaveValue("");
    const options = (toast.success as jest.Mock).mock.calls[0][1];
    options.action.onClick();
    expect(mockPush).toHaveBeenCalledWith("/chats/chat-1");
  });

  it("sends on Enter, and shows the server's reason when it fails", async () => {
    (replyToStatus as jest.Mock).mockRejectedValue(new Error("You can't reply to this status"));
    setup([group(status())]);
    await userEvent.type(screen.getByLabelText("Reply to Ada Lovelace"), "hello{Enter}");
    expect(replyToStatus).toHaveBeenCalledWith("s1", "hello");
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("You can't reply to this status"));
  });

  it("sends a quick emoji while the box is focused", async () => {
    setup([group(status())]);
    expect(screen.queryByRole("group", { name: "Quick reactions" })).toBeNull();
    await userEvent.click(screen.getByLabelText("Reply to Ada Lovelace"));
    await userEvent.click(screen.getByRole("button", { name: "🔥" }));
    expect(replyToStatus).toHaveBeenCalledWith("s1", "🔥");
  });

  it("keeps the status still while you type, and arrow keys move the cursor, not the status", async () => {
    jest.useFakeTimers();
    try {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      setup([group(status({ _id: "a", text: "First" }), status({ _id: "b", text: "Second" }))]);
      await user.click(screen.getByLabelText("Reply to Ada Lovelace"));
      await user.keyboard("{ArrowRight}");
      act(() => {
        jest.advanceTimersByTime(20000);
      });
      expect(screen.getByText("First")).toBeInTheDocument();
      await user.tab(); // leaves the box: playing again
      act(() => {
        jest.advanceTimersByTime(7000);
      });
      expect(screen.getByText("Second")).toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });
});
