import type { Metadata } from "next";
import ForgotPassword from "../../../components/ForgotPassword";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Reset your Velo password.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ForgotPassword />;
}
