import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ViewOnceBubble } from "@/components/chat/ViewOnce";

const mockEmit = jest.fn();
jest.mock("@/lib/toast", () => ({ toast: { error: jest.fn() } }));
jest.mock("@/app/providers/SocketProvider", () => ({
  useSocket: () => ({ timeout: () => ({ emit: mockEmit }) }),
}));

const base = { _id: "m1", messageType: "Image", viewOnce: true, viewOnceOpenedBy: [] as string[], chatType: "DM" };
const renderBubble = (message = base, userId = "me", senderId = "you") =>
  render(<ViewOnceBubble message={message} userId={userId} senderId={senderId} time="10:00" />);

describe("ViewOnceBubble", () => {
  it("invites the recipient to open it, then shows the photo with no way to save it", async () => {
    mockEmit.mockImplementation((_e, _p, cb) => cb(null, { ok: true, url: "https://files/x?sig=1", expiresInSeconds: 60 }));
    renderBubble();
    await userEvent.click(screen.getByRole("button", { name: /View once photo/ }));
    expect(mockEmit).toHaveBeenCalledWith("openViewOnce", { messageId: "m1" }, expect.any(Function));
    const img = await screen.findByAltText("View once photo");
    expect(img).toHaveAttribute("src", "https://files/x?sig=1");
    expect(img).toHaveAttribute("draggable", "false");
  });

  it("uses a video player without download controls for videos", async () => {
    mockEmit.mockImplementation((_e, _p, cb) => cb(null, { ok: true, url: "https://files/v", expiresInSeconds: 300 }));
    const { baseElement } = renderBubble({ ...base, messageType: "Video" });
    await userEvent.click(screen.getByRole("button", { name: /View once video/ }));
    await waitFor(() => expect(baseElement.querySelector("video")).not.toBeNull());
    expect(baseElement.querySelector("video")?.getAttribute("controlslist")).toContain("nodownload");
  });

  it("can't be opened again once opened or expired", () => {
    const { unmount } = renderBubble({ ...base, viewOnceOpenedBy: ["me"] });
    expect(screen.getByText("Opened")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Opened" })).toBeDisabled();
    unmount();
    renderBubble({ ...base, viewOnceGone: true } as typeof base);
    expect(screen.getByRole("button", { name: "No longer available" })).toBeDisabled();
  });

  it("tells the sender whether it was opened, and never offers to open it", () => {
    const { unmount } = renderBubble(base, "me", "me");
    expect(screen.getByText("Not opened yet")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeDisabled();
    unmount();
    renderBubble({ ...base, viewOnceOpenedBy: ["you"] }, "me", "me");
    expect(screen.getByText("Your photo was opened")).toBeInTheDocument();
  });

  it("stays closed and says so when the server refuses", async () => {
    mockEmit.mockImplementation((_e, _p, cb) => cb(null, { ok: false, error: "You have already opened this" }));
    renderBubble();
    await userEvent.click(screen.getByRole("button", { name: /View once photo/ }));
    expect(screen.queryByAltText("View once photo")).toBeNull();
  });
});
