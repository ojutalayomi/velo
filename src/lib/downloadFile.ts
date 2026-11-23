import { saveAs } from "file-saver";

import { cacheMedia, getCachedMediaUrl } from "@/lib/mediaCache";

/**
 * Download a chat file. A copy saved earlier is used first, so it still works offline; otherwise
 * it downloads from the network and a copy is kept for next time.
 */
export async function downloadFile(url: string, filename: string): Promise<void> {
  const saved = await getCachedMediaUrl(url);
  if (saved) {
    saveAs(saved, filename);
    setTimeout(() => URL.revokeObjectURL(saved), 60_000);
    return;
  }
  saveAs(url, filename);
  void cacheMedia(url, "file").then((blob) => {
    if (blob) URL.revokeObjectURL(blob);
  });
}
