import type { Metadata } from "next";
import ResetPassword from "../../../components/ResetPassword";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Choose a new password for your Velo account.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ResetPassword />;
}
