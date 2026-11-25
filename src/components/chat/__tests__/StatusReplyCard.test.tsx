import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StatusReplyCard, statusReplySummary } from "@/components/chat/StatusReplyCard";
import type { StatusReplyPreview } from "@/lib/types/status";

let mockGroups: unknown[] = [];

jest.mock("react-redux", () => ({
  useSelector: (selector: (s: unknown) => unknown) => selector({ status: { groups: mockGroups } }),
}));
jest.mock("@/components/status/StatusViewer", () => ({
  StatusViewer: ({ initialStatusIndex }: { initialStatusIndex: number }) => (
    <div role="dialog">viewer at {initialStatusIndex}</div>
  ),
}));

const reply = (over: Partial<StatusReplyPreview> = {}): StatusReplyPreview => ({
  statusId: "s1",
  ownerId: "owner",
  mediaType: "text",
  text: "Good morning",
  background: "ocean",
  expiresAt: new Date(Date.now() + 3600_000).toISOString(),
  ...over,
});

beforeEach(() => {
  mockGroups = [{ user: { _id: "owner" }, statuses: [{ _id: "other" }, { _id: "s1" }] }];
});

describe("statusReplySummary", () => {
  it("says what the status was", () => {
    expect(statusReplySummary(reply())).toBe("Good morning");
    expect(statusReplySummary(reply({ mediaType: "audio", text: undefined }))).toBe("Voice status");
    expect(statusReplySummary(reply({ mediaType: "image", text: undefined }))).toBe("Photo status");
    expect(statusReplySummary(reply({ mediaType: "video", text: undefined }))).toBe("Video status");
    expect(statusReplySummary(reply({ mediaType: "image", text: undefined, caption: "sunset" }))).toBe("sunset");
  });
});

describe("StatusReplyCard", () => {
  it("tells the owner it is a reply to their status, and opens it at the right place", async () => {
    render(<StatusReplyCard reply={reply()} myId="owner" own={false} />);
    expect(screen.getByText("Replied to your status")).toBeInTheDocument();
    expect(screen.getByText("Good morning")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Open status/ }));
    expect(screen.getByRole("dialog")).toHaveTextContent("viewer at 1");
  });

  it("is just 'Status' for the person who replied", () => {
    render(<StatusReplyCard reply={reply()} myId="fan" own />);
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("is disabled and says so once the status has expired", () => {
    render(
      <StatusReplyCard
        reply={reply({ expiresAt: new Date(Date.now() - 1000).toISOString() })}
        myId="owner"
        own={false}
      />
    );
    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByText("Status expired")).toBeInTheDocument();
  });

  it("is disabled when the status isn't loaded on this device", () => {
    mockGroups = [];
    render(<StatusReplyCard reply={reply()} myId="owner" own={false} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
