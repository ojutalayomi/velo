import { toast } from "@/lib/toast";

import { blockFilesWhenOffline } from "@/lib/offlineFiles";

jest.mock("@/lib/toast", () => ({ toast: { error: jest.fn() } }));

const setOnline = (online: boolean) =>
  Object.defineProperty(navigator, "onLine", { value: online, configurable: true });

beforeEach(() => jest.clearAllMocks());

describe("blockFilesWhenOffline", () => {
  it("blocks and explains when files are sent offline", () => {
    setOnline(false);
    expect(blockFilesWhenOffline(1)).toBe(true);
    expect(toast.error).toHaveBeenCalledWith("You're offline", expect.objectContaining({ description: expect.any(String) }));
  });

  it("lets files through online", () => {
    setOnline(true);
    expect(blockFilesWhenOffline(2)).toBe(false);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("never blocks plain text, even offline", () => {
    setOnline(false);
    expect(blockFilesWhenOffline(0)).toBe(false);
    expect(toast.error).not.toHaveBeenCalled();
  });
});
