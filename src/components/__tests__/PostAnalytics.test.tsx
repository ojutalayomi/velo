import { act, render } from "@testing-library/react";
import { StrictMode } from "react";

import { resolvePostAnalyticsTarget } from "@/lib/postAnalyticsClient";

import PostAnalytics from "../PostAnalytics";

const sessionId = "11111111-1111-4111-8111-111111111111";
let observers: MockIntersectionObserver[] = [];
let visibility: DocumentVisibilityState;
class MockIntersectionObserver {
  target: Element | null = null;
  disconnected = false;
  constructor(private callback: IntersectionObserverCallback) {
    observers.push(this);
  }
  observe = (target: Element) => {
    this.target = target;
  };
  disconnect = () => {
    this.disconnected = true;
  };
  expose(ratio: number) {
    this.callback(
      [
        {
          target: this.target,
          isIntersecting: ratio > 0,
          intersectionRatio: ratio,
        } as IntersectionObserverEntry,
      ],
      this as unknown as IntersectionObserver
    );
  }
}
const activeObserver = () => observers.filter((observer) => !observer.disconnected).slice(-1)[0];
const bodies = () =>
  jest.mocked(fetch).mock.calls.map((call) => JSON.parse(call[1]?.body as string));
const advance = (ms: number) =>
  act(() => {
    jest.advanceTimersByTime(ms);
  });
function Detail({ id = "post-one", userId }: { id?: string; userId?: string }) {
  return (
    <div>
      <PostAnalytics postId={id} userId={userId} />
      <div>
        <article data-id={id}>Post</article>
        <article data-id="comment">Comment</article>
      </div>
    </div>
  );
}

beforeEach(() => {
  jest.useFakeTimers();
  observers = [];
  visibility = "visible";
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });
  Object.defineProperty(globalThis, "IntersectionObserver", {
    configurable: true,
    value: MockIntersectionObserver,
  });
  Object.defineProperty(crypto, "randomUUID", {
    configurable: true,
    value: jest.fn(() => sessionId),
  });
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
  Object.defineProperty(navigator, "sendBeacon", {
    configurable: true,
    value: jest.fn(() => true),
  });
});
afterEach(() => {
  jest.useRealTimers();
});

describe("PostAnalytics DOM lifecycle", () => {
  it("credits an explicitly identified repost rather than its rendered original", () => {
    const rendered = render(
      <div>
        <PostAnalytics postId="repost-one" />
        <div>
          <article data-id="original-one" data-post-analytics-id="repost-one">
            Original content
          </article>
        </div>
      </div>
    );
    expect(activeObserver().target).toBe(rendered.container.querySelector("article"));
    act(() => activeObserver().expose(1));
    advance(1100);
    expect(bodies()[0]).toMatchObject({ postId: "repost-one", event: "view" });
  });

  it("never uses a rendered ID to override a different explicit source ID", () => {
    const rendered = render(
      <div>
        <PostAnalytics postId="original-one" />
        <div>
          <article data-id="original-one" data-post-analytics-id="repost-one">
            Original content
          </article>
        </div>
      </div>
    );
    const marker = rendered.container.querySelector("span")!;
    expect(resolvePostAnalyticsTarget(marker, "original-one")).toBeNull();
    expect(observers).toHaveLength(0);
  });
  it("observes the post article, qualifies at 50%/1s, and ignores page scrolling", async () => {
    const rendered = render(<Detail />);
    const observer = activeObserver();
    expect(observer.target).toBe(rendered.container.querySelector('article[data-id="post-one"]'));
    act(() => observer.expose(0.49));
    advance(5000);
    expect(fetch).not.toHaveBeenCalled();
    act(() => observer.expose(0.5));
    advance(999);
    expect(fetch).not.toHaveBeenCalled();
    advance(1);
    expect(bodies().map((body) => body.event)).toEqual(["view"]);
    await act(async () => {});
    act(() => window.dispatchEvent(new Event("scroll")));
    expect(navigator.sendBeacon).not.toHaveBeenCalled();
    expect(bodies().some((body) => body.event === "scroll")).toBe(false);
    rendered.unmount();
    expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);
  });

  it("pauses hidden/off-post time and resets continuous qualification", async () => {
    const rendered = render(<Detail />);
    act(() => activeObserver().expose(1));
    advance(600);
    act(() => {
      visibility = "hidden";
      document.dispatchEvent(new Event("visibilitychange"));
    });
    advance(60000);
    act(() => {
      visibility = "visible";
      document.dispatchEvent(new Event("visibilitychange"));
    });
    advance(999);
    expect(fetch).not.toHaveBeenCalled();
    advance(1);
    expect(bodies()[0].metadata.activeMs).toBe(1600);
    act(() => activeObserver().expose(0));
    advance(60000);
    act(() => activeObserver().expose(1));
    advance(8400);
    expect(bodies().map((body) => body.event)).toEqual(["view", "time"]);
    expect(bodies()[1].metadata).toEqual({ activeMs: 10000, milestoneSeconds: 10 });
    await act(async () => {});
    rendered.unmount();
  });

  it("resets per post/identity and finalizes once across pagehide plus unmount", async () => {
    const rendered = render(<Detail />);
    act(() => activeObserver().expose(1));
    advance(1000);
    await act(async () => {});
    rendered.rerender(<Detail id="post-two" />);
    expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);
    act(() => activeObserver().expose(1));
    advance(1000);
    expect(bodies().map((body) => body.postId)).toEqual(["post-one", "post-two"]);
    await act(async () => {});
    rendered.rerender(<Detail id="post-two" userId="signed-in" />);
    expect(navigator.sendBeacon).toHaveBeenCalledTimes(2);
    act(() => activeObserver().expose(1));
    advance(1000);
    await act(async () => {});
    act(() => window.dispatchEvent(new Event("pagehide")));
    act(() => window.dispatchEvent(new Event("pagehide")));
    rendered.unmount();
    expect(navigator.sendBeacon).toHaveBeenCalledTimes(3);
    expect(bodies().every((body) => !("userId" in body))).toBe(true);
  });

  it("does not emit on StrictMode replay and starts a fresh session after bfcache restore", async () => {
    const rendered = render(
      <StrictMode>
        <Detail />
      </StrictMode>
    );
    expect(fetch).not.toHaveBeenCalled();
    expect(navigator.sendBeacon).not.toHaveBeenCalled();
    act(() => activeObserver().expose(1));
    advance(1000);
    await act(async () => {});
    act(() => window.dispatchEvent(new Event("pagehide")));
    advance(60000);
    const restore = new Event("pageshow");
    Object.defineProperty(restore, "persisted", { value: true });
    act(() => window.dispatchEvent(restore));
    act(() => activeObserver().expose(1));
    advance(1000);
    expect(bodies().map((body) => body.metadata.activeMs)).toEqual([1000, 1000]);
    await act(async () => {});
    rendered.unmount();
  });

  it("waits for loaded content and fails closed without a meaningful observed target", async () => {
    const rendered = render(
      <div>
        <PostAnalytics postId="post-one" />
        <div>Loading</div>
      </div>
    );
    advance(10000);
    expect(observers).toHaveLength(0);
    expect(fetch).not.toHaveBeenCalled();
    rendered.rerender(<Detail />);
    await act(async () => {});
    expect(activeObserver().target).toBe(rendered.container.querySelector("article"));
    rendered.unmount();
  });

  it("resolves current reel and preview media without observing the marker/page shell", () => {
    const root = document.createElement("div");
    root.innerHTML =
      '<div class="relative size-full overflow-hidden"><span></span><div class="snap-x"><img /></div></div>';
    let marker = root.querySelector("span")!;
    expect(resolvePostAnalyticsTarget(marker, "post")).toBe(marker.parentElement);
    root.innerHTML =
      '<div><span></span><div><div class="media"><div aria-roledescription="carousel"><video></video></div></div></div></div>';
    marker = root.querySelector("span")!;
    expect(resolvePostAnalyticsTarget(marker, "post")).toBe(root.querySelector(".media"));
    root.innerHTML =
      '<div><span></span><div><article data-id="other"><div aria-roledescription="carousel"><img /></div></article></div></div>';
    expect(resolvePostAnalyticsTarget(root.querySelector("span")!, "post")).toBeNull();
  });

  it("retries pending event IDs with beacons and falls back to keepalive without throwing", () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("offline"));
    jest.mocked(navigator.sendBeacon).mockReturnValue(false);
    const rendered = render(<Detail />);
    act(() => activeObserver().expose(1));
    advance(1000);
    const first = bodies()[0];
    act(() => window.dispatchEvent(new Event("pagehide")));
    expect(bodies()).toHaveLength(3);
    expect(bodies()[1].eventId).toBe(first.eventId);
    expect(bodies()[2].event).toBe("engagement");
    expect(jest.mocked(fetch).mock.calls.every((call) => call[1]?.keepalive)).toBe(true);
    rendered.unmount();
  });
});
