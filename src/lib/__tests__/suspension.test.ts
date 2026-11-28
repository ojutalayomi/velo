/** @jest-environment node */

import { verifyToken, verifyTokenIgnoringSuspension } from "../auth";
import { clearSuspensionCache, isUserSuspended, SUSPENSION_CACHE_MS } from "../suspension";

const findOne = jest.fn();
jest.mock("jose", () => ({
  SignJWT: class {},
  jwtVerify: async (token: string) => {
    if (!token.startsWith("valid:")) throw new Error("bad token");
    return { payload: { _id: token.slice(6) } };
  },
}));
jest.mock("bson", () => ({ ObjectId: class {} }));
jest.mock("next/headers", () => ({ cookies: jest.fn(), headers: jest.fn() }));
jest.mock("next-auth/providers/google", () => jest.fn());
jest.mock("next-auth/providers/facebook", () => jest.fn());
jest.mock("uuid", () => ({ v4: () => "id" }));
jest.mock("../class/User", () => ({ SocialMediaUser: class {}, UserSchema: class {} }));
// The real driver is ESM-only, which jest can't load; the rules under test only need these two.
jest.mock("mongodb", () => ({
  ObjectId: class {
    constructor(public value: string) {}
    static isValid(input: string): boolean {
      return /^[0-9a-f]{24}$/.test(input);
    }
  },
}));
jest.mock("@/lib/mongodb", () => ({
  MongoDBClient: class {
    async init() {
      return { users: () => ({ findOne }) };
    }
  },
}));

const id = "64b7f0c2a1b2c3d4e5f60718";

beforeEach(() => {
  findOne.mockReset();
  clearSuspensionCache();
  process.env.JWT_SECRET = "test-secret";
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

// "valid:<id>" stands for a correctly signed token for that user; anything else fails verification.
const tokenFor = async (userId: string) => `valid:${userId}`;

describe("isUserSuspended", () => {
  it("reads the flag, and remembers the answer for a short while", async () => {
    findOne.mockResolvedValue({ suspended: true });
    expect(await isUserSuspended(id)).toBe(true);
    expect(await isUserSuspended(id)).toBe(true);
    expect(findOne).toHaveBeenCalledTimes(1);
  });

  it("asks again when told to, or after the window", async () => {
    findOne.mockResolvedValue({ suspended: false });
    await isUserSuspended(id);
    findOne.mockResolvedValue({ suspended: true });
    expect(await isUserSuspended(id)).toBe(false);
    expect(await isUserSuspended(id, { fresh: true })).toBe(true);

    clearSuspensionCache(id);
    findOne.mockResolvedValue({ suspended: false });
    const now = Date.now();
    await isUserSuspended(id);
    jest.spyOn(Date, "now").mockReturnValue(now + SUSPENSION_CACHE_MS + 1);
    findOne.mockResolvedValue({ suspended: true });
    expect(await isUserSuspended(id)).toBe(true);
  });

  it("clearing the remembered answer makes a new suspension count at once", async () => {
    findOne.mockResolvedValue({});
    expect(await isUserSuspended(id)).toBe(false);
    findOne.mockResolvedValue({ suspended: true });
    clearSuspensionCache(id);
    expect(await isUserSuspended(id)).toBe(true);
  });

  it("does not lock anyone out when the database is down or the id is junk", async () => {
    findOne.mockRejectedValue(new Error("down"));
    expect(await isUserSuspended(id)).toBe(false);
    expect(await isUserSuspended("not-an-id")).toBe(false);
  });
});

describe("verifyToken", () => {
  it("accepts a signed-in user", async () => {
    findOne.mockResolvedValue({ suspended: false });
    expect(await verifyToken(await tokenFor(id))).toMatchObject({ _id: id });
  });

  it("rejects a suspended user's valid session", async () => {
    findOne.mockResolvedValue({ suspended: true });
    const token = await tokenFor(id);
    expect(await verifyToken(token)).toBeNull();
    // The profile route still needs to read it, to say why.
    expect(await verifyTokenIgnoringSuspension(token)).toMatchObject({ _id: id });
  });

  it("rejects a forged token", async () => {
    expect(await verifyToken("junk")).toBeNull();
  });
});
