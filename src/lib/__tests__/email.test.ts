import { generateEmailHtml } from "@/lib/email";

describe("generateEmailHtml", () => {
  it("renders the greeting, heading and message", () => {
    const html = generateEmailHtml({
      subject: "Welcome",
      firstname: "Ada",
      lastname: "Lovelace",
      heading: "Hello there",
      message: "Glad you're here.",
    });
    expect(html).toContain("<title>Welcome</title>");
    expect(html).toContain("Hi Ada Lovelace,");
    expect(html).toContain("Hello there");
    expect(html).toContain("Glad you&#039;re here.");
  });

  it("escapes values so user input cannot inject markup", () => {
    const html = generateEmailHtml({ firstname: "<script>x</script>", imageSrc: 'a"b', imageAlt: '"><b>' });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain('src="a"b"');
  });

  it("hides the button unless display is set, and shows it with the link and label", () => {
    expect(generateEmailHtml({ link: "https://x.test/go", Click: "Go" })).not.toContain(`class="btn-link"`);
    const shown = generateEmailHtml({ display: "block", link: "https://x.test/go?a=1&b=2", Click: "Go" });
    expect(shown).toContain('href="https://x.test/go?a=1&amp;b=2"');
    expect(shown).toContain(">Go</a>");
  });

  it("omits the image panel when there is no image", () => {
    expect(generateEmailHtml({})).not.toContain(`class="hero-panel"`);
    expect(generateEmailHtml({ imageSrc: "https://x.test/i.png" })).toContain('src="https://x.test/i.png"');
  });
});
