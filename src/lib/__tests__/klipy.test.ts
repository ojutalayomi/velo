import { isKlipyUrl, klipyRequestUrl, normalizeKlipyResponse, parseKlipyContent } from "@/lib/klipy";

// Shape per https://docs.klipy.com (GIF/Sticker search): data.data[].file.{hd,md,sm,xs}.{gif,webp,jpg,webm}.
const file = (host: string) => ({
  md: { webp: { url: `https://${host}/md.webp`, width: 300, height: 200 }, gif: { url: `https://${host}/md.gif` } },
  sm: { webp: { url: `https://${host}/sm.webp`, width: 150, height: 100 } },
});

describe("klipy", () => {
  it("builds trending and search URLs with the key in the path", () => {
    const base = { page: 2, customerId: "c1" };
    const trending = klipyRequestUrl("gifs", { ...base, q: "  " }, "KEY");
    expect(trending).toMatch(/^https:\/\/api\.klipy\.com\/api\/v1\/KEY\/gifs\/trending\?/);
    expect(trending).toContain("page=2");
    const search = klipyRequestUrl("stickers", { ...base, q: "hello world" }, "KEY");
    expect(search).toContain("/stickers/search?");
    expect(search).toContain("q=hello+world");
    expect(search).toContain("customer_id=c1");
  });

  it("keeps results in order, picks webp, and skips entries without usable files", () => {
    const page = normalizeKlipyResponse({
      result: true,
      data: {
        has_next: true,
        data: [
          { slug: "a", title: "A", file: file("static.klipy.com") },
          { slug: "b", title: "B", file: file("evil.com") }, // not a KLIPY host: dropped
          { title: "no slug", file: file("static.klipy.com") },
          { slug: "c", title: "C", file: file("static1.klipy.com") },
        ],
      },
    });
    expect(page.hasNext).toBe(true);
    expect(page.items.map((i) => i.slug)).toEqual(["a", "c"]);
    expect(page.items[0]).toMatchObject({ url: "https://static.klipy.com/md.webp", previewUrl: "https://static.klipy.com/sm.webp", width: 300, height: 200 });
    expect(normalizeKlipyResponse(null)).toEqual({ items: [], hasNext: false });
  });

  it("only accepts KLIPY hosts", () => {
    expect(isKlipyUrl("https://static.klipy.com/x")).toBe(true);
    expect(isKlipyUrl("https://klipy.com.evil.com/x")).toBe(false);
    expect(isKlipyUrl("http://static.klipy.com/x")).toBe(false);
    expect(parseKlipyContent(JSON.stringify({ url: "https://evil.com/x.gif" }))).toBeNull();
    expect(parseKlipyContent(JSON.stringify({ url: "https://static.klipy.com/x.webp", slug: "s" }))?.slug).toBe("s");
  });
});
