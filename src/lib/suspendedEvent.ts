/** Window event raised when this account is found to be suspended (socket, or any request). */
export const SUSPENDED_EVENT = "velo:suspended";

export function announceSuspended() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SUSPENDED_EVENT));
}
