'use client'
import Sidebar from '@/components/Sidebar';
import Bottombar from '@/components/Bottombar';
import Root from '@/components/Root';
import ErrorBoundary from '@/components/ErrorBoundary';
import Error from './error';
import { useState, useCallback } from 'react';
import { Provider } from 'react-redux';
import { store } from '../redux/store';
// import { useactiveRoute } from 'next/navigation';

interface ClientComponentsProps {
    children: React.ReactNode;
}

const ClientComponents = ({children}: ClientComponentsProps) => {
    const [activeRoute, setActiveRouteState] = useState<string>('home');
    const [isMoreShown, setMoreStatus] = useState(false);
    const [error, setError] = useState(null);

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
                <Sidebar isMoreShown={isMoreShown} activeRoute={activeRoute} setActiveRoute={setActiveRoute} setMoreStatus={setMoreStatus} />
                <Root activeRoute={activeRoute} setActiveRoute={setActiveRoute} setMoreStatus={setMoreStatus} />
                <div id='detail' className={activeRoute === 'home' || activeRoute === '' ? 'h-hide' : ''}  onClick={() => handleClickMore('close')}>
                    <ErrorBoundary fallback={<Error error={error} reset={handleReset} />}>
                        {children}
                    </ErrorBoundary>
                </div>
                <Bottombar isMoreShown={isMoreShown} activeRoute={activeRoute} setActiveRoute={setActiveRoute} setMoreStatus={setMoreStatus} />
            </Provider>
        </>
    )
}
export default ClientComponents;