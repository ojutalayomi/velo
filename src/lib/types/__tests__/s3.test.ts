import { s3ObjectUrl } from "@/lib/types/s3";

const base = "https://profile-display-images.s3.us-east-1.amazonaws.com/";

describe("s3ObjectUrl", () => {
  it("keeps plain keys readable", () => {
    expect(s3ObjectUrl(base, "2026/11/25/IMG_1.jpg-7")).toBe(`${base}2026/11/25/IMG_1.jpg-7`);
  });

  it("encodes spaces and URL-significant characters, but not the slashes", () => {
    const url = s3ObjectUrl(base, "2026/11/25/Screenshot 2026 #1 100%?.png-7");
    expect(url).toBe(`${base}2026/11/25/Screenshot%202026%20%231%20100%25%3F.png-7`);
    expect(url).toMatch(/^https?:\/\/\S+$/);
    expect(new URL(url).pathname).toBe("/2026/11/25/Screenshot%202026%20%231%20100%25%3F.png-7");
  });
});
