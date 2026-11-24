import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { MediaViewer } from "@/components/chat/MediaViewer";
import type { Attachment } from "@/lib/types/type";

const mockDownload = jest.fn();
jest.mock("@/lib/downloadFile", () => ({ downloadFile: (...a: unknown[]) => mockDownload(...a) }));
jest.mock("@/components/chat/CachedMedia", () => ({
  CachedMedia: ({ url, children }: { url?: string; children: (src: string, save: () => void) => React.ReactNode }) => (
    <>{children(url ?? "", () => {})}</>
  ),
}));

beforeAll(() => {
  const noop = () => {};
  class Observer {
    observe = noop;
    unobserve = noop;
    disconnect = noop;
  }
  Object.assign(window, { ResizeObserver: Observer, IntersectionObserver: Observer });
  window.matchMedia =
    window.matchMedia ||
    ((query: string) =>
      ({ matches: false, media: query, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop }) as unknown as MediaQueryList);
  Element.prototype.scrollIntoView = noop;
});

const files = [
  { name: "a.png", type: "image/png", url: "https://s3/a.png", size: 2048 },
  { name: "b.mp4", type: "video/mp4", url: "https://s3/b.mp4", size: 4096 },
  { name: "c.pdf", type: "application/pdf", url: "https://s3/c.pdf", size: 10 },
] as Attachment[];

describe("MediaViewer", () => {
  it("shows nothing while closed", () => {
    render(<MediaViewer files={files} open={false} index={0} onOpenChange={() => {}} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens full screen on the requested file with a counter", () => {
    render(<MediaViewer files={files} open index={0} onOpenChange={() => {}} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("a.png")).toBeInTheDocument();
    expect(screen.getAllByText(/1 of 3/).length).toBeGreaterThan(0);
    expect(screen.getByAltText("a.png")).toHaveAttribute("src", "https://s3/a.png");
  });

  it("downloads the active file", async () => {
    render(<MediaViewer files={files} open index={0} onOpenChange={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Download" }));
    expect(mockDownload).toHaveBeenCalledWith("https://s3/a.png", "a.png");
  });

  it("closes from the close button", async () => {
    const onOpenChange = jest.fn();
    render(<MediaViewer files={files} open index={0} onOpenChange={onOpenChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("hides the bars when the picture is tapped", async () => {
    render(<MediaViewer files={files} open index={0} onOpenChange={() => {}} />);
    const header = screen.getByRole("banner");
    expect(header).not.toHaveClass("opacity-0");
    await userEvent.click(screen.getByRole("button", { name: "Show or hide controls" }));
    expect(header).toHaveClass("opacity-0");
  });

  it("offers a thumbnail for every file when there are several", () => {
    render(<MediaViewer files={files} open index={0} onOpenChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Show b.mp4" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show c.pdf" })).toBeInTheDocument();
  });

  it("has no counter or thumbnails for a single file", () => {
    render(<MediaViewer files={[files[0]]} open index={0} onOpenChange={() => {}} />);
    expect(screen.queryByText(/ of /)).toBeNull();
    expect(screen.queryByRole("button", { name: /^Show a.png/ })).toBeNull();
  });
});
