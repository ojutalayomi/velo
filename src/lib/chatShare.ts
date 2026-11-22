/** Content of Location and Contact chat messages (stored as JSON in `content`). */

export interface SharedLocation {
  name: string;
  lat?: number;
  lng?: number;
}

export interface SharedContact {
  userId: string;
  name: string;
  username: string;
  displayPicture: string;
  verified: boolean;
}

export function parseLocationContent(content: unknown): SharedLocation | null {
  if (typeof content !== "string") return null;
  try {
    const raw = JSON.parse(content) as Partial<SharedLocation>;
    if (typeof raw.name !== "string" || !raw.name.trim()) return null;
    const hasCoords =
      typeof raw.lat === "number" && typeof raw.lng === "number" && Math.abs(raw.lat) <= 90 && Math.abs(raw.lng) <= 180;
    return { name: raw.name.trim(), ...(hasCoords ? { lat: raw.lat, lng: raw.lng } : {}) };
  } catch {
    return null;
  }
}

export function parseContactContent(content: unknown): SharedContact | null {
  if (typeof content !== "string") return null;
  try {
    const raw = JSON.parse(content) as Partial<SharedContact>;
    if (typeof raw.userId !== "string" || typeof raw.name !== "string") return null;
    return {
      userId: raw.userId,
      name: raw.name,
      username: typeof raw.username === "string" ? raw.username : "",
      displayPicture: typeof raw.displayPicture === "string" ? raw.displayPicture : "",
      verified: raw.verified === true,
    };
  } catch {
    return null;
  }
}

/** The map tile that contains a point, and where in that tile (0..1) the point falls. */
export function osmTile(lat: number, lng: number, zoom = 15) {
  const n = 2 ** zoom;
  const x = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  return { zoom, x: Math.floor(x), y: Math.floor(y), fx: x - Math.floor(x), fy: y - Math.floor(y) };
}

export const mapsLink = (location: SharedLocation) =>
  location.lat !== undefined && location.lng !== undefined
    ? `https://www.openstreetmap.org/?mlat=${location.lat}&mlon=${location.lng}#map=16/${location.lat}/${location.lng}`
    : `https://www.openstreetmap.org/search?query=${encodeURIComponent(location.name)}`;
