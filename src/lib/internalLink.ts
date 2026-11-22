/** Recognises links that point back into this app, so chat can open them without a page reload. */

export type InternalTarget =
  | { kind: "post"; username: string; id: string }
  | { kind: "profile"; username: string }
  | { kind: "invite"; token: string }
  | { kind: "group"; id: string }
  | { kind: "chat"; id: string }
  | { kind: "page" };

export interface InternalLink {
  /** Path plus query/hash, ready for router navigation. */
  path: string;
  target: InternalTarget;
}

/** Top-level routes that are pages, not usernames. */
const RESERVED = new Set([
  "about", "account", "accounts", "admin", "api", "auth", "bookmarks", "chats", "compose",
  "developers", "explore", "favicon.ico", "feedback", "general", "hashtag", "help-support", "home",
  "invite", "jobs", "locations", "notifications", "postgres", "press", "privacy", "search",
  "sitemap.xml", "robots.txt", "terms", "trending",
]);

export function parseInternalLink(url: string, origins: string[]): InternalLink | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const own = origins.map((origin) => {
    try {
      return new URL(origin).origin;
    } catch {
      return "";
    }
  });
  if (!own.includes(parsed.origin)) return null;

  const path = `${parsed.pathname}${parsed.search}${parsed.hash}` || "/";
  const parts = parsed.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  const [first, second, third] = parts;

  let target: InternalTarget = { kind: "page" };
  if (first === "invite" && second && parts.length === 2) target = { kind: "invite", token: second };
  else if (first === "chats" && second === "group" && third && parts.length === 3) target = { kind: "group", id: third };
  else if (first === "chats" && second && second !== "group" && second !== "new" && parts.length === 2) {
    target = { kind: "chat", id: second };
  } else if (first && !RESERVED.has(first)) {
    if (parts.length === 1) target = { kind: "profile", username: first };
    else if (second === "posts" && third && parts.length === 3) target = { kind: "post", username: first, id: third };
  }
  return { path, target };
}
