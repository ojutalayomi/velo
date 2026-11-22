import { parseInternalLink } from "@/lib/internalLink";

const origins = ["https://velo.app", "http://localhost:3000"];
const parse = (url: string) => parseInternalLink(url, origins);

describe("parseInternalLink", () => {
  it("ignores other sites and junk", () => {
    expect(parse("https://example.com/ada")).toBeNull();
    expect(parse("https://velo.app.evil.com/ada")).toBeNull();
    expect(parse("not a url")).toBeNull();
  });

  it("recognises posts, profiles, invites and chats", () => {
    expect(parse("https://velo.app/ada/posts/p1")?.target).toEqual({ kind: "post", username: "ada", id: "p1" });
    expect(parse("http://localhost:3000/ada")?.target).toEqual({ kind: "profile", username: "ada" });
    expect(parse("https://velo.app/invite/tok")?.target).toEqual({ kind: "invite", token: "tok" });
    expect(parse("https://velo.app/chats/group/g1")?.target).toEqual({ kind: "group", id: "g1" });
    expect(parse("https://velo.app/chats/c1")?.target).toEqual({ kind: "chat", id: "c1" });
  });

  it("treats app pages as pages, not usernames, and keeps the query for navigation", () => {
    expect(parse("https://velo.app/explore?q=a")).toEqual({ path: "/explore?q=a", target: { kind: "page" } });
    expect(parse("https://velo.app/chats/new")?.target).toEqual({ kind: "page" });
  });
});
