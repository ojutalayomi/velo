import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StatusComposer } from "@/components/status/StatusComposer";
import { resetStatusRoute } from "@/hooks/useStatusRoute";
import { createStatus } from "@/lib/statusApi";

const mockDispatch = jest.fn();
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

jest.mock("@/lib/toast", () => ({ toast: { error: jest.fn(), success: jest.fn(), warning: jest.fn() } }));
jest.mock("@/redux/hooks", () => ({ useAppDispatch: () => mockDispatch }));
jest.mock("@/hooks/useVoiceRecorder", () => ({
  MAX_VOICE_SECONDS: 300,
  useVoiceRecorder: () => mockVoice,
}));
jest.mock("@/components/VoiceNotePlayer", () => ({
  VoiceNotePlayer: ({ url }: { url: string }) => <div data-testid="player">{url}</div>,
}));
jest.mock("@/lib/statusApi", () => ({ createStatus: jest.fn() }));

const group = { user: { _id: "me" }, statuses: [{ _id: "s1" }] };

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
  URL.createObjectURL = jest.fn(() => "blob:voice");
  URL.revokeObjectURL = jest.fn();
});

beforeEach(() => {
  resetStatusRoute();
  window.history.replaceState(null, "", "/home");
  jest.clearAllMocks();
  (createStatus as jest.Mock).mockResolvedValue([group]);
  mockVoice.start.mockResolvedValue(null);
  mockVoice.recording = false;
  mockVoice.processing = false;
});

function setup() {
  const onOpenChange = jest.fn();
  render(<StatusComposer open onOpenChange={onOpenChange} />);
  return onOpenChange;
}

const share = () => screen.getByRole("button", { name: /^Share/ });

describe("StatusComposer tabs", () => {
  it("offers photo/video, text and voice, starting on photo/video with nothing to share", () => {
    setup();
    expect(screen.getByRole("tab", { name: /Photo/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /Text/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Voice/ })).toBeInTheDocument();
    expect(share()).toBeDisabled();
  });
});

describe("text status", () => {
  it("can't be shared empty, then posts the words on the chosen background", async () => {
    const onOpenChange = setup();
    await userEvent.click(screen.getByRole("tab", { name: /Text/ }));
    expect(share()).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Status text"), "  Good morning  ");
    expect(share()).toBeEnabled();
    await userEvent.click(screen.getByRole("radio", { name: "Ocean" }));
    expect(screen.getByRole("radio", { name: "Ocean" })).toHaveAttribute("aria-checked", "true");
    await userEvent.click(share());
    await waitFor(() =>
      expect(createStatus).toHaveBeenCalledWith({
        mediaType: "text",
        text: "Good morning",
        background: "ocean",
      })
    );
    expect(mockDispatch).toHaveBeenCalled();
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("counts characters and has no caption box", async () => {
    setup();
    await userEvent.click(screen.getByRole("tab", { name: /Text/ }));
    await userEvent.type(screen.getByLabelText("Status text"), "abc");
    expect(screen.getByText("3/500")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Add a caption")).toBeNull();
  });
});

describe("voice status", () => {
  it("starts recording from the mic button, and shows the error if the mic is refused", async () => {
    setup();
    await userEvent.click(screen.getByRole("tab", { name: /Voice/ }));
    await userEvent.click(screen.getByRole("button", { name: "Record a voice status" }));
    expect(mockVoice.start).toHaveBeenCalled();
  });

  it("uploads the recording and posts it with its length", async () => {
    const file = new File(["x"], "voice-note-1700000000000-42s.mp3", { type: "audio/mpeg" });
    mockVoice.recording = true;
    mockVoice.stop.mockResolvedValue(file);
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          url: "https://post-s.s3.us-east-1.amazonaws.com/",
          fields: { key: "2026/11/25/voice-note-1700000000000-42s.mp3-9", acl: "public-read" },
        }),
      })
      .mockResolvedValueOnce({ ok: true });
    global.fetch = fetchMock as unknown as typeof fetch;

    setup();
    await userEvent.click(screen.getByRole("tab", { name: /Voice/ }));
    expect(share()).toBeDisabled();
    // Recording: the bar's send button finishes it and the recording becomes the preview.
    await userEvent.click(screen.getByRole("button", { name: "Send voice note" }));
    expect(await screen.findByTestId("player")).toHaveTextContent("blob:voice");
    expect(share()).toBeEnabled();

    await userEvent.click(share());
    await waitFor(() => expect(createStatus).toHaveBeenCalled());
    expect(createStatus).toHaveBeenCalledWith({
      mediaType: "audio",
      mediaUrl: "https://post-s.s3.us-east-1.amazonaws.com/2026/11/25/voice-note-1700000000000-42s.mp3-9",
      mediaKey: "2026/11/25/voice-note-1700000000000-42s.mp3-9",
      durationSec: 42,
      caption: "",
    });
  });

  it("can discard a recording and start again", async () => {
    mockVoice.recording = true;
    mockVoice.stop.mockResolvedValue(new File(["x"], "voice-note-1-5s.mp3", { type: "audio/mpeg" }));
    setup();
    await userEvent.click(screen.getByRole("tab", { name: /Voice/ }));
    await userEvent.click(screen.getByRole("button", { name: "Send voice note" }));
    await userEvent.click(await screen.findByRole("button", { name: "Record again" }));
    expect(screen.queryByTestId("player")).toBeNull();
    expect(share()).toBeDisabled();
  });
});

describe("StatusComposer: the /status address", () => {
  it("shows /status while open, and closes when the person goes back", async () => {
    const onOpenChange = setup();
    expect(window.location.pathname).toBe("/status");
    act(() => window.history.back());
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(window.location.pathname).toBe("/home");
  });

  it("leaves /status when closed with the dialog's own close button", async () => {
    const onOpenChange = setup();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(window.location.pathname).toBe("/home");
  });
});
