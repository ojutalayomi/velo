import { notFound } from "next/navigation";

import { getAdminUser, hasAdminStepUp } from "@/lib/admin";

import AdminNav from "./AdminNav";
import StepUp from "./StepUp";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Non-admins get a 404 so the area's existence isn't revealed.
  const admin = await getAdminUser();
  if (!admin) notFound();

  // Admins must also have passed a recent passkey check.
  if (!(await hasAdminStepUp(admin._id))) {
    return (
      <div className="h-screen max-h-screen w-full flex-1 overflow-auto">
        <StepUp />
      </div>
    );
  }

  return (
    <div className="h-screen max-h-screen w-full flex-1 overflow-auto">
      <AdminNav />
      {children}
    </div>
  );
}
