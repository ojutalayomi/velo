import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StatusViewer } from "@/components/status/StatusViewer";
import { resetStatusRoute } from "@/hooks/useStatusRoute";
import {
  fetchStatusViewers,
  markStatusViewed,
  replyToStatus,
  replyToStatusWithVoice,
  setStatusLiked,
} from "@/lib/statusApi";
import { toast } from "@/lib/toast";
import type { StatusClient, StatusGroup } from "@/lib/types/status";

const mockDispatch = jest.fn();
const mockPush = jest.fn();
let mockUserId = "me";

jest.mock("@/lib/toast", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));
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
  replyToStatusWithVoice: jest.fn(),
  fetchStatusViewers: jest.fn(),
}));

const mockVoice = {
  recording: false,
  paused: false,
  processing: false,
  seconds: 0,
  previewUrl: null as string | null,
  start: jest.fn(),
  stop: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  cancel: jest.fn(),
};
jest.mock("@/hooks/useVoiceRecorder", () => ({
  MAX_VOICE_SECONDS: 300,
  useVoiceRecorder: () => mockVoice,
}));
jest.mock("@/app/providers/SocketProvider", () => ({ useSocket: () => ({ emit: jest.fn() }) }));

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
  // jsdom has no PointerEvent, so synthetic pointer events would arrive without coordinates.
  if (!window.PointerEvent) {
    class PointerEventPolyfill extends MouseEvent {
      pointerId: number;
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 0;
      }
    }
    window.PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent;
  }
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
  resetStatusRoute();
  window.history.replaceState(null, "", "/home");
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
    await waitFor(() => expect(onClose).toHaveBeenCalled());
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

describe("StatusViewer: voice replies", () => {
  beforeEach(() => {
    mockVoice.recording = false;
    mockVoice.processing = false;
    mockVoice.start.mockResolvedValue(null);
    (replyToStatusWithVoice as jest.Mock).mockResolvedValue({ chatId: "chat-1" });
  });

  it("offers a mic when the box is empty, and starts recording", async () => {
    setup([group(status())]);
    await userEvent.click(screen.getByRole("button", { name: "Record a voice reply" }));
    expect(mockVoice.start).toHaveBeenCalled();
  });

  it("hides the mic once there are words to send", async () => {
    setup([group(status())]);
    await userEvent.type(screen.getByLabelText("Reply to Ada Lovelace"), "hi");
    expect(screen.queryByRole("button", { name: "Record a voice reply" })).toBeNull();
  });

  it("sends the recording as a reply and offers to open the chat", async () => {
    const file = new File(["x"], "voice-note-1-3s.mp3", { type: "audio/mpeg" });
    mockVoice.recording = true;
    mockVoice.stop.mockResolvedValue(file);
    setup([group(status())]);
    await userEvent.click(screen.getByRole("button", { name: "Send voice note" }));
    await waitFor(() =>
      expect(replyToStatusWithVoice).toHaveBeenCalledWith(expect.objectContaining({ statusId: "s1", file }))
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Voice reply sent", expect.anything()));
  });

  it("shows the reason when the reply is refused", async () => {
    mockVoice.recording = true;
    mockVoice.stop.mockResolvedValue(new File(["x"], "voice-note-1-3s.mp3", { type: "audio/mpeg" }));
    (replyToStatusWithVoice as jest.Mock).mockRejectedValue(new Error("This status is no longer available"));
    setup([group(status())]);
    await userEvent.click(screen.getByRole("button", { name: "Send voice note" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("This status is no longer available"));
  });
});

describe("StatusViewer: the /status address", () => {
  const one = () => [group(status({ _id: "a", text: "First" }))];

  it("puts /status in the address bar while it is open, and takes it out when it closes", async () => {
    const onClose = setup(one());
    expect(window.location.pathname).toBe("/status");
    await userEvent.click(screen.getByRole("button", { name: "Close status" }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(window.location.pathname).toBe("/home");
  });

  it("closes when the person goes back", async () => {
    const onClose = setup(one());
    expect(window.location.pathname).toBe("/status");
    act(() => window.history.back());
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(window.location.pathname).toBe("/home");
  });

  it("gives the address back when it is removed some other way", async () => {
    const { unmount } = render(
      <StatusViewer groups={one()} initialGroupIndex={0} initialStatusIndex={0} onClose={jest.fn()} />
    );
    expect(window.location.pathname).toBe("/status");
    unmount();
    await waitFor(() => expect(window.location.pathname).toBe("/home"));
  });
});

describe("StatusViewer: dragging down", () => {
  const drag = (viewer: HTMLElement, to: number, from = 100) => {
    fireEvent.pointerDown(viewer, { pointerId: 1, button: 0, clientX: 150, clientY: from });
    fireEvent.pointerMove(viewer, { pointerId: 1, clientX: 152, clientY: to });
    fireEvent.pointerUp(viewer, { pointerId: 1, clientX: 152, clientY: to });
  };

  it("closes and leaves /status when pulled far enough down", async () => {
    const onClose = setup([group(status())]);
    drag(screen.getByTestId("status-viewer"), 320);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(window.location.pathname).toBe("/home");
  });

  it("springs back, and stays open, when the pull is short", async () => {
    const onClose = setup([group(status())]);
    const viewer = screen.getByTestId("status-viewer");
    drag(viewer, 150);
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(onClose).not.toHaveBeenCalled();
    expect(viewer.style.transform).toBe("");
    expect(window.location.pathname).toBe("/status");
  });

  it("does not treat a sideways swipe as a drag", async () => {
    const onClose = setup([group(status())]);
    const viewer = screen.getByTestId("status-viewer");
    fireEvent.pointerDown(viewer, { pointerId: 1, button: 0, clientX: 40, clientY: 100 });
    fireEvent.pointerMove(viewer, { pointerId: 1, clientX: 300, clientY: 160 });
    fireEvent.pointerUp(viewer, { pointerId: 1, clientX: 300, clientY: 160 });
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(onClose).not.toHaveBeenCalled();
  });
});
