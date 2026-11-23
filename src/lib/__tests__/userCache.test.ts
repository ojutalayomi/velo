import { clearCachedUser, readCachedUser, USER_CACHE_TTL_MS, writeCachedUser } from "@/lib/userCache";
import type { UserData } from "@/lib/types/user";

const user = { _id: "u1", name: "Ada" } as unknown as UserData;
const store = (data: unknown, timestamp: number) =>
  localStorage.setItem("userData", JSON.stringify({ data, timestamp }));

beforeEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});

describe("userCache", () => {
  it("round-trips a freshly written user", () => {
    writeCachedUser(user);
    expect(readCachedUser()).toEqual(user);
  });

  it("treats an old entry as expired online, but still offers it when asked to ignore expiry", () => {
    store(user, Date.now() - USER_CACHE_TTL_MS - 1);

    expect(readCachedUser()).toBeNull();
    expect(readCachedUser({ ignoreExpiry: true })).toEqual(user);
  });

  it("returns null when nothing is saved", () => {
    expect(readCachedUser()).toBeNull();
    expect(readCachedUser({ ignoreExpiry: true })).toBeNull();
  });

  it.each([
    ["corrupt JSON", () => localStorage.setItem("userData", "{not json")],
    ["no data", () => store(undefined, Date.now())],
    ["data without an _id", () => store({ name: "x" }, Date.now())],
    ["an empty _id", () => store({ _id: "" }, Date.now())],
  ])("never returns a damaged entry (%s)", (_label, setup) => {
    setup();
    expect(readCachedUser()).toBeNull();
    expect(readCachedUser({ ignoreExpiry: true })).toBeNull();
  });

  it("clearCachedUser removes it, even when expiry is ignored", () => {
    writeCachedUser(user);
    clearCachedUser();

    expect(readCachedUser({ ignoreExpiry: true })).toBeNull();
    expect(localStorage.getItem("userData")).toBeNull();
  });

  it("does not throw when localStorage is unavailable", () => {
    jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    jest.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("denied");
    });

    expect(readCachedUser()).toBeNull();
    expect(() => writeCachedUser(user)).not.toThrow();
    expect(() => clearCachedUser()).not.toThrow();
  });
});
