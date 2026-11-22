/**
 * KLIPY GIFs and stickers. Per KLIPY's integration rules: requests are made from the user's
 * browser (never proxied), media is loaded from the URLs KLIPY returns (never copied or rebuilt),
 * and results are shown in the order given. See https://docs.klipy.com
 */

export type KlipyKind = "gifs" | "stickers";

export interface KlipyItem {
  slug: string;
  title: string;
  /** The file shown in chat. */
  url: string;
  /** A smaller file for the picker grid. */
  previewUrl?: string;
  width?: number;
  height?: number;
}

const API = "https://api.klipy.com/api/v1";

export const klipyAppKey = () => process.env.NEXT_PUBLIC_KLIPY_APP_KEY ?? "";
export const klipyEnabled = () => klipyAppKey() !== "";

const KLIPY_URL = /^https:\/\/([a-z0-9-]+\.)*klipy\.com\//i;
export const isKlipyUrl = (value: unknown): value is string => typeof value === "string" && KLIPY_URL.test(value);

type Format = { url?: unknown; width?: unknown; height?: unknown };
type FileSet = Record<string, Record<string, Format | undefined> | undefined>;

/** First available file, trying each size then each format in the order given. */
function pickFile(file: FileSet | undefined, sizes: string[], formats: string[]) {
  for (const size of sizes) {
    for (const format of formats) {
      const candidate = file?.[size]?.[format];
      if (candidate && isKlipyUrl(candidate.url)) {
        const num = (value: unknown) => (typeof value === "number" && value > 0 ? value : undefined);
        return { url: candidate.url as string, width: num(candidate.width), height: num(candidate.height) };
      }
    }
  }
  return null;
}

/** webp animates everywhere that matters and keeps transparency; gif is the fallback. */
const CHAT_SIZES = ["md", "sm", "hd", "xs"];
const GRID_SIZES = ["sm", "xs", "md", "hd"];
const FORMATS = ["webp", "gif"];

export interface KlipyPage {
  items: KlipyItem[];
  hasNext: boolean;
}

/** Reads a search/trending response (`data.data[]`, each with `file.{size}.{format}.url`). */
export function normalizeKlipyResponse(json: unknown): KlipyPage {
  const body = (json ?? {}) as { data?: { data?: unknown[]; has_next?: boolean } };
  const rows = Array.isArray(body.data?.data) ? body.data.data : [];
  const items: KlipyItem[] = [];
  for (const row of rows) {
    const r = row as { slug?: unknown; title?: unknown; file?: FileSet };
    const full = pickFile(r.file, CHAT_SIZES, FORMATS);
    if (!full || typeof r.slug !== "string") continue;
    const preview = pickFile(r.file, GRID_SIZES, FORMATS);
    items.push({
      slug: r.slug,
      title: typeof r.title === "string" ? r.title : "",
      url: full.url,
      previewUrl: preview?.url,
      width: full.width,
      height: full.height,
    });
  }
  return { items, hasNext: body.data?.has_next === true };
}

export function klipyRequestUrl(
  kind: KlipyKind,
  { q, page, customerId, perPage = 24 }: { q: string; page: number; customerId: string; perPage?: number },
  appKey = klipyAppKey()
) {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    customer_id: customerId,
    content_filter: "medium",
  });
  const query = q.trim();
  if (query) params.set("q", query);
  return `${API}/${encodeURIComponent(appKey)}/${kind}/${query ? "search" : "trending"}?${params}`;
}

export async function fetchKlipy(
  kind: KlipyKind,
  input: { q: string; page: number; customerId: string },
  signal?: AbortSignal
): Promise<KlipyPage> {
  const res = await fetch(klipyRequestUrl(kind, input), { signal });
  if (!res.ok) throw new Error(res.status === 429 ? "Too many requests. Try again in a moment." : "Could not load GIFs");
  return normalizeKlipyResponse(await res.json());
}

/** Tells KLIPY a result was shared (it improves their ranking); failures are ignored. */
export function reportKlipyShare(kind: KlipyKind, slug: string, customerId: string, q: string) {
  void fetch(`${API}/${encodeURIComponent(klipyAppKey())}/${kind}/share/${encodeURIComponent(slug)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customer_id: customerId, q }),
  }).catch(() => undefined);
}

/** A stable anonymous id for KLIPY: a hash of the user id, so no account id leaves the app. */
export async function klipyCustomerId(userId: string): Promise<string> {
  try {
    const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`velo:${userId}`));
    return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return "anonymous";
  }
}

export function parseKlipyContent(content: unknown): KlipyItem | null {
  if (typeof content !== "string") return null;
  try {
    const raw = JSON.parse(content) as Partial<KlipyItem>;
    if (!isKlipyUrl(raw.url)) return null;
    return {
      slug: typeof raw.slug === "string" ? raw.slug : "",
      title: typeof raw.title === "string" ? raw.title : "",
      url: raw.url,
      previewUrl: isKlipyUrl(raw.previewUrl) ? raw.previewUrl : undefined,
      width: typeof raw.width === "number" ? raw.width : undefined,
      height: typeof raw.height === "number" ? raw.height : undefined,
    };
  } catch {
    return null;
  }
}
