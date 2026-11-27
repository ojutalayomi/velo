import { configureStore } from "@reduxjs/toolkit";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";

import WallpaperPicker from "@/components/chat/WallpaperPicker";
import chatReducer from "@/redux/chatSlice";
import userReducer from "@/redux/userSlice";
import utilsReducer from "@/redux/utilsSlice";

const mockError = jest.fn();
jest.mock("@/lib/toast", () => ({ toast: { error: (...a: unknown[]) => mockError(...a), success: jest.fn() } }));
jest.mock("usehooks-ts", () => ({ useMediaQuery: () => true }));
const mockUpload = jest.fn();
jest.mock("@/lib/wallpaperUpload", () => ({ uploadWallpaper: (...a: unknown[]) => mockUpload(...a) }));

function setup(wallpaper = "") {
  const store = configureStore({
    reducer: { chat: chatReducer, utils: utilsReducer, user: userReducer },
    preloadedState: undefined,
  });
  store.dispatch({ type: "chat/setSettings", payload: { c1: { isMuted: false, wallpaper } } });
  render(
    <Provider store={store}>
      <WallpaperPicker chatId="c1" open onOpenChange={() => {}} />
    </Provider>,
  );
  return store;
}

beforeEach(() => {
  mockError.mockReset();
  mockUpload.mockReset();
  global.fetch = jest.fn().mockResolvedValue({ ok: true });
});

describe("WallpaperPicker", () => {
  it("marks the current choice and saves a new one", async () => {
    const store = setup("");
    expect(screen.getByRole("radio", { name: "Wallpaper: Default" })).toHaveAttribute("aria-checked", "true");
    await userEvent.click(screen.getByRole("radio", { name: "Wallpaper: Sky" }));
    await waitFor(() => expect(store.getState().chat.settings.c1.wallpaper).toBe("preset:sky"));
    expect(global.fetch).toHaveBeenCalledWith("/api/chats/c1/settings", expect.objectContaining({ body: '{"wallpaper":"preset:sky"}' }));
    expect(screen.getByRole("radio", { name: "Wallpaper: Sky" })).toHaveAttribute("aria-checked", "true");
  });

  it("goes back to the default", async () => {
    const store = setup("preset:sky");
    await userEvent.click(screen.getByRole("radio", { name: "Wallpaper: Default" }));
    await waitFor(() => expect(store.getState().chat.settings.c1.wallpaper).toBe(""));
  });

  it("keeps the old wallpaper and says why when saving fails", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "nope" }) });
    const store = setup("preset:sky");
    await userEvent.click(screen.getByRole("radio", { name: "Wallpaper: Default" }));
    await waitFor(() => expect(mockError).toHaveBeenCalledWith("nope"));
    expect(store.getState().chat.settings.c1.wallpaper).toBe("preset:sky");
  });

  it("refuses a file that isn't an image without uploading", async () => {
    setup();
    const input = screen.getByLabelText("Choose a wallpaper photo") as HTMLInputElement;
    await userEvent.upload(input, new File(["x"], "a.txt", { type: "text/plain" }), { applyAccept: false });
    expect(mockError).toHaveBeenCalledWith(expect.stringMatching(/image/));
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("uploads a photo and uses it", async () => {
    const url = "https://post-s.s3.us-east-1.amazonaws.com/bg.png";
    mockUpload.mockResolvedValue(url);
    const store = setup();
    await userEvent.upload(screen.getByLabelText("Choose a wallpaper photo"), new File(["x"], "bg.png", { type: "image/png" }));
    await waitFor(() => expect(store.getState().chat.settings.c1.wallpaper).toBe(url));
    expect(await screen.findByRole("radio", { name: "Wallpaper: Your photo" })).toBeInTheDocument();
  });
});
