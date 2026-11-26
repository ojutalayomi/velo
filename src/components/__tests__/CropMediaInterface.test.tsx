import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import CropMediaInterface from "@/components/CropMediaInterface";

jest.mock("@/lib/toast", () => ({ toast: { info: jest.fn(), error: jest.fn() } }));

beforeAll(() => {
  class Observer {
    constructor(private cb: () => void) {}
    observe() {
      this.cb();
    }
    unobserve() {}
    disconnect() {}
  }
  Object.assign(window, { ResizeObserver: Observer });
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, value: 400 });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, value: 500 });
  URL.createObjectURL = jest.fn(() => "blob:photo");
  URL.revokeObjectURL = jest.fn();
});

const photo = new File(["x"], "photo.jpg", { type: "image/jpeg" });

function setup(setFiles = jest.fn()) {
  render(
    <CropMediaInterface files={[photo]} setFiles={setFiles} imageIndex={0}>
      <button>open editor</button>
    </CropMediaInterface>
  );
  return setFiles;
}

async function openAndLoad() {
  await userEvent.click(screen.getByRole("button", { name: "open editor" }));
  const hidden = document.querySelector("img.hidden") as HTMLImageElement;
  Object.defineProperty(hidden, "naturalWidth", { configurable: true, value: 800 });
  Object.defineProperty(hidden, "naturalHeight", { configurable: true, value: 600 });
  fireEvent.load(hidden);
}

describe("CropMediaInterface", () => {
  it("opens full screen from the caller's own button", async () => {
    setup();
    expect(screen.queryByRole("dialog")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "open editor" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Edit photo")).toBeInTheDocument();
  });

  it("switches between the tools", async () => {
    setup();
    await openAndLoad();
    expect(screen.getByRole("radiogroup", { name: "Crop shape" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Adjust" }));
    expect(screen.getByText("Brightness")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Filters" }));
    expect(screen.getByRole("radiogroup", { name: "Filter" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Text" }));
    expect(screen.getByRole("button", { name: "Add text" })).toBeInTheDocument();
  });

  it("adds, edits and removes a text overlay", async () => {
    setup();
    await openAndLoad();
    await userEvent.click(screen.getByRole("button", { name: "Text" }));
    await userEvent.click(screen.getByRole("button", { name: "Add text" }));
    expect(screen.getByRole("button", { name: "Text: Your text" })).toBeInTheDocument();
    const input = screen.getByRole("textbox", { name: "Text" });
    await userEvent.clear(input);
    await userEvent.type(input, "Hello");
    expect(screen.getByRole("button", { name: "Text: Hello" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Delete text" }));
    expect(screen.queryByRole("button", { name: /^Text: / })).toBeNull();
  });

  it("closing without saving leaves the file list alone", async () => {
    const setFiles = setup();
    await openAndLoad();
    await userEvent.click(screen.getByRole("button", { name: "Cancel editing" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(setFiles).not.toHaveBeenCalled();
  });

  it("Done with no edits just closes", async () => {
    const setFiles = setup();
    await openAndLoad();
    await userEvent.click(screen.getByRole("button", { name: /Done/ }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(setFiles).not.toHaveBeenCalled();
  });

  it("Reset is available only after a change, and a new session starts clean", async () => {
    setup();
    await openAndLoad();
    const reset = screen.getByRole("button", { name: "Reset" });
    expect(reset).toBeDisabled();
    await userEvent.click(screen.getByRole("radio", { name: "Square" }));
    expect(reset).toBeEnabled();
    await userEvent.click(screen.getByRole("button", { name: "Cancel editing" }));
    await openAndLoad();
    expect(screen.getByRole("button", { name: "Reset" })).toBeDisabled();
  });
});
