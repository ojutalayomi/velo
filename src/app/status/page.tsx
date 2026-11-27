import { redirect } from "next/navigation";

/**
 * /status is only ever an address the app puts in the bar while a status is on screen. Opened
 * directly (a reload, a copied link) there is nothing to show, so go home.
 */
export default function StatusPage() {
  redirect("/home");
}
