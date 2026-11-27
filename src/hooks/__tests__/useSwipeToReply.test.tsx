import { fireEvent, render } from "@testing-library/react";

import { SWIPE_THRESHOLD, useSwipeToReply } from "@/hooks/useSwipeToReply";

function Row({ enabled = true, onTrigger }: { enabled?: boolean; onTrigger: () => void }) {
  const { rowRef, iconRef } = useSwipeToReply({ enabled, onTrigger });
  return (
    <div ref={rowRef} data-testid="row">
      <span ref={iconRef} data-testid="icon" />
      <p data-testid="text">hello</p>
      <input data-testid="slider" />
    </div>
  );
}

const touch = (el: Element, type: "touchstart" | "touchmove" | "touchend", x: number, y: number) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  const points = type === "touchend" ? [] : [{ clientX: x, clientY: y }];
  Object.defineProperty(event, "touches", { value: points });
  Object.defineProperty(event, "changedTouches", { value: [{ clientX: x, clientY: y }] });
  el.dispatchEvent(event);
  return event;
};

const swipe = (el: Element, from: [number, number], to: [number, number]) => {
  touch(el, "touchstart", ...from);
  const move = touch(el, "touchmove", ...to);
  touch(el, "touchend", ...to);
  return move;
};

describe("useSwipeToReply", () => {
  it("quotes on a long swipe to the right without blocking scrolling", () => {
    const onTrigger = jest.fn();
    const { getByTestId } = render(<Row onTrigger={onTrigger} />);
    const move = swipe(getByTestId("text"), [100, 200], [100 + SWIPE_THRESHOLD + 30, 204]);
    expect(onTrigger).toHaveBeenCalledTimes(1);
    // Passive listener: it never cancels the browser's own scrolling.
    expect(move.defaultPrevented).toBe(false);
  });

  it("follows the finger and shows the icon while swiping", () => {
    const { getByTestId } = render(<Row onTrigger={() => {}} />);
    const row = getByTestId("row");
    touch(row, "touchstart", 100, 200);
    touch(row, "touchmove", 140, 201);
    expect(row.style.transform).toBe("translateX(40px)");
    expect(Number(getByTestId("icon").style.opacity)).toBeGreaterThan(0);
  });

  it("does nothing for a short swipe, which springs back", () => {
    const onTrigger = jest.fn();
    const { getByTestId } = render(<Row onTrigger={onTrigger} />);
    swipe(getByTestId("text"), [100, 200], [130, 201]);
    expect(onTrigger).not.toHaveBeenCalled();
    expect(getByTestId("row").style.transform).toBe("");
  });

  it("leaves vertical scrolling alone", () => {
    const onTrigger = jest.fn();
    const { getByTestId } = render(<Row onTrigger={onTrigger} />);
    const move = swipe(getByTestId("text"), [100, 200], [140, 320]);
    expect(onTrigger).not.toHaveBeenCalled();
    expect(move.defaultPrevented).toBe(false);
  });

  it("ignores swipes to the left", () => {
    const onTrigger = jest.fn();
    const { getByTestId } = render(<Row onTrigger={onTrigger} />);
    swipe(getByTestId("text"), [200, 200], [90, 201]);
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it("ignores swipes that start on a control with its own gesture, or at the screen's left edge", () => {
    const onTrigger = jest.fn();
    const { getByTestId } = render(<Row onTrigger={onTrigger} />);
    swipe(getByTestId("slider"), [100, 200], [260, 201]);
    swipe(getByTestId("text"), [5, 200], [160, 201]);
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it("does nothing when disabled (selection mode, deleted message)", () => {
    const onTrigger = jest.fn();
    const { getByTestId } = render(<Row enabled={false} onTrigger={onTrigger} />);
    swipe(getByTestId("text"), [100, 200], [260, 201]);
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it("does not turn the end of a swipe into a tap on the message", () => {
    const { getByTestId } = render(<Row onTrigger={() => {}} />);
    const onClick = jest.fn();
    const row = getByTestId("row");
    row.parentElement?.addEventListener("click", onClick);
    swipe(getByTestId("text"), [100, 200], [200, 201]);
    fireEvent.click(getByTestId("text"));
    expect(onClick).not.toHaveBeenCalled();
  });
});
