import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home",
  description: "Your Velo home feed.",
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  return children;
};

export default Layout;
