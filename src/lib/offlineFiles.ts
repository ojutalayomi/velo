import { toast } from "sonner";

/**
 * Files are sent as raw bytes over the socket, so they need a connection (plain text can wait in
 * the outbox instead). When files are about to be sent offline, say so and return true: the
 * caller must then stop and leave everything as it is, so the person can try again online.
 */
export function blockFilesWhenOffline(fileCount: number): boolean {
  if (fileCount <= 0 || typeof navigator === "undefined" || navigator.onLine) return false;
  toast.error("You're offline", { description: "Files can only be sent when you're online." });
  return true;
}
