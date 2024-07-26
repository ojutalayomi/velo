'use client'
import { useUser } from '@auth0/nextjs-auth0/client';
import Sidebar from '@/components/Sidebar';
import Bottombar from '@/components/Bottombar';
import Root from '@/components/Root';
import ErrorBoundary from '@/components/ErrorBoundary';
import Error from './error';
import { useState, useCallback, useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from '../redux/store';
import { usePathname, useRouter } from 'next/navigation';
import Loading from './loading'; 
// import { useactiveRoute } from 'next/navigation';

interface ClientComponentsProps {
    children: React.ReactNode;
}

const ClientComponents = ({children}: ClientComponentsProps) => {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useUser();
    const path = pathname?.replace('/','') || '';
    const [activeRoute, setActiveRouteState] = useState<string>(path);
    const [isMoreShown, setMoreStatus] = useState(false);
    const [error, setError] = useState(null);
    const [load,setLoad] = useState<boolean>(false);

    useEffect(() => {
        setLoad(false)
    }, [pathname]);

    const setActiveRoute = useCallback((route: string) => {
        setActiveRouteState(route);
    }, []);
  
    const handleReset = () => {
      setError(null);
    };
    
    const handleClickMore = (command: string) => {
      command === 'close' ? setMoreStatus(false) : setMoreStatus(true);
    };

    return(
        <>
            <Provider store={store}>
                <Sidebar setLoad={setLoad} isMoreShown={isMoreShown} activeRoute={activeRoute} setActiveRoute={setActiveRoute} setMoreStatus={setMoreStatus} />
                <Root activeRoute={activeRoute} setActiveRoute={setActiveRoute} setMoreStatus={setMoreStatus} />
                {/* <pre data-testid="client-component">{JSON.stringify(user, null, 2)}</pre>; */}
                <div id='detail' className={`${pathname === '/home' ? 'hidden' : ''} tablets:block`}  onClick={() => handleClickMore('close')}>
                    <ErrorBoundary fallback={<Error error={error} reset={handleReset} />}>
                        {load ? <Loading /> : children}
                    </ErrorBoundary>
                </div>
                <Bottombar setLoad={setLoad} isMoreShown={isMoreShown} activeRoute={activeRoute} setActiveRoute={setActiveRoute} setMoreStatus={setMoreStatus} />
            </Provider>
        </>
    )
}
export default ClientComponents;