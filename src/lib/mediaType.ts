/**
 * Single source of truth for "is this media URL an image?" — used by the explore UI
 * and, as a Mongo-compatible regex, by /api/explore for server-side photo/video filtering.
 */
const IMAGE_EXTENSIONS = "png|jpe?g|gif|webp|bmp|svg|tiff?|avif";
const IMAGE_HOSTS =
  "images\\.unsplash\\.com|i\\.imgur\\.com|cdn\\.pixabay\\.com|lh[0-9]+\\.googleusercontent\\.com|pbs\\.twimg\\.com";

/** Regex source (PCRE + JS compatible) matching image URLs. */
export const IMAGE_URL_PATTERN = `(^[^?#]*\\.(${IMAGE_EXTENSIONS})([-_]\\w+)?([?#].*)?$)|(^https?://(${IMAGE_HOSTS}))`;

const IMAGE_URL_RE = new RegExp(IMAGE_URL_PATTERN, "i");

export function isImageUrl(url: string): boolean {
  return IMAGE_URL_RE.test(url);
}
