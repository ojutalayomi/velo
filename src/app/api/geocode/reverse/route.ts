import { NextResponse } from "next/server";

import { getAuthenticatedUserId } from "@/lib/statusServer";

interface NominatimAddress {
  neighbourhood?: string;
  suburb?: string;
  village?: string;
  town?: string;
  city?: string;
  county?: string;
  state?: string;
  country?: string;
}

/** Turns coordinates into a short place label such as "Yaba, Lagos, Nigeria". */
export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const params = new URL(request.url).searchParams;
    const lat = Number(params.get("lat"));
    const lng = Number(params.get("lng"));
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return NextResponse.json({ message: "Invalid coordinates" }, { status: 400 });
    }

    // ~100 m precision is plenty for a place label and avoids sharing an exact position.
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("zoom", "14");
    url.searchParams.set("lat", lat.toFixed(3));
    url.searchParams.set("lon", lng.toFixed(3));

    const res = await fetch(url, {
      headers: { "User-Agent": "Velo/1.0", "Accept-Language": "en" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return NextResponse.json({ message: "Lookup failed" }, { status: 502 });

    const body = (await res.json()) as { address?: NominatimAddress; display_name?: string };
    const a = body.address ?? {};
    const parts = [
      a.neighbourhood || a.suburb || a.village || a.town || a.city || a.county,
      a.city || a.state,
      a.country,
    ].filter((part, i, all): part is string => Boolean(part) && all.indexOf(part) === i);
    const name = parts.join(", ") || body.display_name?.split(",").slice(0, 2).join(",").trim() || "";
    if (!name) return NextResponse.json({ message: "No place found" }, { status: 404 });

    return NextResponse.json({ data: { name, lat: Number(lat.toFixed(3)), lng: Number(lng.toFixed(3)) } });
  } catch (error) {
    console.error("[api/geocode/reverse] failed:", error);
    return NextResponse.json({ message: "Lookup failed" }, { status: 502 });
  }
}
