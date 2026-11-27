import { act, render } from "@testing-library/react";
import React, { useRef } from "react";

import { IDLE_MS, isNearBottom, useMessageListScroll } from "../useMessageListScroll";

describe("isNearBottom", () => {
  it("is true within 100px of the bottom", () => {
    expect(isNearBottom({ scrollTop: 900, scrollHeight: 1500, clientHeight: 550 })).toBe(true);
    expect(isNearBottom({ scrollTop: 100, scrollHeight: 1500, clientHeight: 550 })).toBe(false);
  });
});

describe("useMessageListScroll", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => setTimeout(() => cb(0), 0) as unknown as number);
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const setup = (scrollTop: number) => {
    const onNear = jest.fn();
    const loadOlder = jest.fn();
    const atBottom = { current: true };
    let handler: () => void = () => {};
    const Probe = () => {
      const ref = useRef<HTMLDivElement>(null);
      handler = useMessageListScroll({ boxRef: ref, atBottomRef: atBottom, onNearBottomChange: onNear, loadOlder });
      return <div ref={ref} data-testid="box" />;
    };
    const { getByTestId } = render(<Probe />);
    const box = getByTestId("box");
    Object.defineProperties(box, {
      scrollTop: { value: scrollTop, writable: true },
      scrollHeight: { value: 5000 },
      clientHeight: { value: 600 },
    });
    return { onNear, loadOlder, atBottom, fire: () => act(() => { handler(); jest.advanceTimersByTime(1); }) };
  };

  it("loads older messages only after scrolling goes idle", () => {
    const { loadOlder, fire } = setup(100);
    fire();
    act(() => { jest.advanceTimersByTime(IDLE_MS - 10); });
    expect(loadOlder).not.toHaveBeenCalled();
    fire(); // still scrolling: the timer restarts
    act(() => { jest.advanceTimersByTime(IDLE_MS - 10); });
    expect(loadOlder).not.toHaveBeenCalled();
    act(() => { jest.advanceTimersByTime(20); });
    expect(loadOlder).toHaveBeenCalledTimes(1);
  });

  it("does nothing near the bottom and reports the bottom state only on change", () => {
    const { loadOlder, onNear, atBottom, fire } = setup(4400);
    fire();
    fire();
    act(() => { jest.advanceTimersByTime(500); });
    expect(loadOlder).not.toHaveBeenCalled();
    expect(onNear).toHaveBeenCalledTimes(1);
    expect(atBottom.current).toBe(true);
  });
});
