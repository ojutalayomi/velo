import React from 'react';
import ClientComponents from './clientComps';

const Layout = ({ children }: { children: React.ReactNode }) => {
    return (
        <ClientComponents>
            {children}
        </ClientComponents>
    );
};

export default Layout;
