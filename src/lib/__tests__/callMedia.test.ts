import { describeMediaError } from "@/lib/call/callPeer";

const err = (name: string, message = "") => Object.assign(new Error(message), { name });

describe("describeMediaError", () => {
  it("separates a system-level block from a site-level one", () => {
    const system = describeMediaError(err("NotAllowedError", "Permission denied by system"), "camera");
    expect(system.permission).toBe(true);
    expect(system.message).toMatch(/system privacy settings/);
    expect(describeMediaError(err("NotAllowedError", "Permission denied"), "camera").message).toMatch(/site settings/);
  });

  it("names the device and explains a busy or missing one", () => {
    expect(describeMediaError(err("NotReadableError"), "camera")).toEqual({
      permission: false,
      message: "The camera is in use by another app or tab. Close it and try again.",
    });
    expect(describeMediaError(err("NotFoundError"), "microphone").message).toBe("No microphone was found on this device.");
  });
});
