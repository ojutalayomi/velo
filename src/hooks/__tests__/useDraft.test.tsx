import { act, renderHook } from "@testing-library/react";

import { readDraft, useDraft, writeDraft } from "@/hooks/useDraft";

describe("useDraft", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
  });
  afterEach(() => jest.useRealTimers());

  it("updates instantly but saves to localStorage only after typing pauses", () => {
    const spy = jest.spyOn(Storage.prototype, "setItem");
    const { result } = renderHook(() => useDraft("chat:a"));
    act(() => result.current[1]("h"));
    act(() => result.current[1]("hi"));
    expect(result.current[0]).toBe("hi");
    expect(spy).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(600);
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("velo:draft:chat:a")).toBe("hi");
    spy.mockRestore();
  });

  it("clears the saved draft immediately", () => {
    writeDraft("chat:b", "hello");
    jest.advanceTimersByTime(600);
    expect(localStorage.getItem("velo:draft:chat:b")).toBe("hello");
    writeDraft("chat:b", "");
    expect(localStorage.getItem("velo:draft:chat:b")).toBeNull();
    expect(readDraft("chat:b")).toBe("");
  });

  it("only wakes components watching that draft", () => {
    let renders = 0;
    renderHook(() => {
      renders++;
      return useDraft("chat:c");
    });
    const before = renders;
    act(() => writeDraft("chat:other", "x"));
    expect(renders).toBe(before);
  });
});
