import type { Metadata } from "next";
import UsersAdmin from "./UsersAdmin";

export const metadata: Metadata = {
  title: "Admin · Users",
  description: "Manage users.",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-4xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Admin · Users</h1>
      <UsersAdmin />
    </div>
  );
}
