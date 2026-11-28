/** @jest-environment node */
import handle from "@/pages/api/admin/users";

const updateOne = jest.fn();
const findOne = jest.fn();
const deleteMany = jest.fn();
const emit = jest.fn();
const clearCache = jest.fn();

jest.mock("mongodb", () => ({
  ObjectId: class {
    constructor(public value: string) {}
    static isValid(input: string): boolean {
      return /^[0-9a-f]{24}$/.test(input);
    }
  },
}));
jest.mock("@/lib/admin", () => ({
  requireAdmin: async () => ({ _id: "admin1" }),
  logAdminAction: jest.fn(),
}));
jest.mock("@/lib/mongodb", () => ({
  MongoDBClient: class {
    async init() {
      return { users: () => ({ findOne, updateOne }), tokens: () => ({ deleteMany }) };
    }
  },
}));
jest.mock("@/lib/socket", () => ({ emitViaSocketServer: (...a: unknown[]) => emit(...a) }));
jest.mock("@/lib/suspension", () => ({ clearSuspensionCache: (...a: unknown[]) => clearCache(...a) }));

const target = "64b7f0c2a1b2c3d4e5f60718";

function call(action: string) {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn(), setHeader: jest.fn() };
  return handle({ method: "PATCH", body: { id: target, action } } as never, res as never).then(() => res);
}

beforeEach(() => {
  [updateOne, findOne, deleteMany, emit, clearCache].forEach((m) => m.mockReset());
  findOne.mockResolvedValue({ _id: target, role: "user", username: "bob" });
  jest.spyOn(console, "error").mockImplementation(() => {});
});

describe("admin suspend", () => {
  it("locks the user out everywhere: sessions deleted, answer forgotten, live connections dropped", async () => {
    const res = await call("suspend");
    expect(updateOne).toHaveBeenCalledWith(expect.anything(), { $set: { suspended: true } });
    expect(deleteMany).toHaveBeenCalledWith({ userId: target });
    expect(clearCache).toHaveBeenCalledWith(target);
    expect(emit).toHaveBeenCalledWith("admin1", "account:suspended", { userId: target });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("still succeeds when the socket server cannot be reached", async () => {
    emit.mockRejectedValue(new Error("down"));
    const res = await call("suspend");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(deleteMany).toHaveBeenCalled();
  });

  it("unsuspending forgets the answer but doesn't touch sessions or sockets", async () => {
    await call("unsuspend");
    expect(clearCache).toHaveBeenCalledWith(target);
    expect(deleteMany).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });

  it("verify doesn't affect sessions", async () => {
    await call("verify");
    expect(deleteMany).not.toHaveBeenCalled();
  });
});
