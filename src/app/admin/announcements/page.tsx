import type { Metadata } from "next";
import AnnouncementsAdmin from "./AnnouncementsAdmin";

export const metadata: Metadata = {
  title: "Admin · Announcements",
  description: "Manage announcements.",
  robots: { index: false, follow: false },
};

export default function AnnouncementsPage() {
  return (
    <div className="mx-auto max-w-4xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Admin · Announcements</h1>
      <AnnouncementsAdmin />
    </div>
  );
}
