import type { Metadata } from "next";
import ReportsQueue from "./ReportsQueue";

export const metadata: Metadata = {
  title: "Admin · Reports",
  description: "Review user reports.",
  robots: { index: false, follow: false },
};

export default function ReportsPage() {
  return (
    <div className="mx-auto max-w-4xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Admin · Reports</h1>
      <ReportsQueue />
    </div>
  );
}
