import type { Metadata,Viewport } from "next";
import { Inter } from "next/font/google";
import '../../styles/accounts.css';
import React, {useState} from "react";
import Image from 'next/image';
import { UserProvider } from '@auth0/nextjs-auth0/client';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Accounts | Velo",
  description: "Created by Ayomide",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode;}>) {

    return (
        <div className='secondary font-sans'>
            <div className='containeer'>
              <div className='velo'>
                <div className='brandname'>
                  <Image src='/velo9.png' height={300} width={300} alt='brand logo'/>
                  <abbr title="Velo is?">Velo</abbr>
                </div>
              </div>
              <div className='sub-container'>
                {children}
              </div>
            </div>
        </div>
    )
}
