import type { Metadata } from "next";
import Login from "../../../components/Login";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your Velo account.",
};

export default function HomePage() {
  return <Login />;
}
