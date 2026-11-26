/* eslint-disable @next/next/no-img-element */
import { ExternalLink, MapPin } from "lucide-react";

import { mapsLink, osmTile, SharedLocation } from "@/lib/chatShare";

/** A shared place: a map thumbnail with a pin (when there are coordinates) that opens in a map. */
export function LocationCard({ location }: { location: SharedLocation }) {
  const hasCoords = location.lat !== undefined && location.lng !== undefined;
  const tile = hasCoords ? osmTile(location.lat as number, location.lng as number) : null;

  return (
    <a
      href={mapsLink(location)}
      target="_blank"
      rel="noopener noreferrer"
      className="block w-[240px] max-w-full overflow-hidden rounded-xl border border-gray-200 bg-white transition-colors hover:bg-gray-50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700/70"
    >
      {tile ? (
        <div className="relative h-32 w-full overflow-hidden bg-gray-100 dark:bg-neutral-700">
          {/* One OpenStreetMap tile, centred on the point (tiles are 256px; shown at 2x for a wider view). */}
          <img
            src={`https://tile.openstreetmap.org/${tile.zoom}/${tile.x}/${tile.y}.png`}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="absolute max-w-none"
            style={{
              width: 512,
              height: 512,
              left: `calc(50% - ${tile.fx * 512}px)`,
              top: `calc(50% - ${tile.fy * 512}px)`,
            }}
          />
          <MapPin className="absolute left-1/2 top-1/2 size-7 -translate-x-1/2 -translate-y-full fill-red-500 text-white drop-shadow-sm" />
          <span className="absolute bottom-0 right-0 bg-white/80 px-1 text-[9px] text-gray-600">© OpenStreetMap</span>
        </div>
      ) : (
        <div className="flex h-16 items-center justify-center bg-brand/10 text-brand">
          <MapPin className="size-7" />
        </div>
      )}
      <div className="flex items-center gap-2 p-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{location.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Location</p>
        </div>
        <ExternalLink className="size-4 shrink-0 text-gray-500" />
      </div>
    </a>
  );
}
