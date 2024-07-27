'use client'
import React, { useEffect } from "react";
import {usePathname} from 'next/navigation';

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode;}>) {
  const pathname = usePathname();
  useEffect(() => {
    const event = new KeyboardEvent('keydown', {
      key: 'm',
      ctrlKey: true,
    });
  
    pathname?.includes('accounts') && document.dispatchEvent(event);
  }, [pathname]);
    return (
        <>
            {children}
        </>
    )
}
