import { createRateLimiter } from "@/lib/rateLimit";

describe("createRateLimiter", () => {
  it("blocks after the limit and recovers when the window passes", () => {
    const check = createRateLimiter(2, 1000);
    expect(check("a", 0).allowed).toBe(true);
    expect(check("a", 100).allowed).toBe(true);
    const blocked = check("a", 200);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(1);
    expect(check("b", 200).allowed).toBe(true); // keys are independent
    expect(check("a", 1001).allowed).toBe(true);
  });
});
