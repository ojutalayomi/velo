import React from 'react';
import ClientComponents from './clientComps';
import type { Metadata,Viewport } from "next";

export const metadata: Metadata = {
  title: "Home | Velo",
  description: "Homepage of Velo. Created by Ayomide",
};

const Layout = ({ children }: { children: React.ReactNode }) => {
    return children;
};

export default Layout;
