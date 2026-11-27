/* eslint-disable @next/next/no-img-element */
import { KlipyItem } from "@/lib/klipy";

/** A GIF or sticker, loaded straight from KLIPY (its terms: no copies, no rewritten URLs). */
export function GifMessage({ item, sticker }: { item: KlipyItem; sticker: boolean }) {
  const max = sticker ? 160 : 240;
  const ratio = item.width && item.height ? item.width / item.height : undefined;

  return (
    <div className="relative" style={{ width: ratio ? Math.min(max, item.width ?? max) : max, maxWidth: "100%" }}>
      <img
        src={item.url}
        alt={item.title || (sticker ? "Sticker" : "GIF")}
        loading="lazy"
        decoding="async"
        width={item.width}
        height={item.height}
        className="block h-auto w-full rounded-lg"
        style={ratio ? { aspectRatio: String(ratio) } : undefined}
      />
      {!sticker && (
        <span className="absolute bottom-1 left-1 rounded bg-black/55 px-1 text-[9px] font-semibold tracking-wide text-white">
          GIF · KLIPY
        </span>
      )}
    </div>
  );
}
