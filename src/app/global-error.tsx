'use client'
import Sidebar from '@/components/Sidebar';
import Bottombar from '@/components/Bottombar';
import Root from '@/components/Root';
import { useState } from 'react';
 
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
    const [activeRoute, setActiveRoute] = useState<string>('home');
    const [isMoreShown, setMoreStatus] = useState(false);

    const handleClickMore = (command: string) => {
        command === 'close' ? setMoreStatus(false) : setMoreStatus(true);
    };
    
  return (
    <html>
      <body>
        <div id='root'>
            <Sidebar isMoreShown={isMoreShown} activeRoute={activeRoute} setActiveRoute={setActiveRoute} setMoreStatus={setMoreStatus} />
            <Bottombar isMoreShown={isMoreShown} activeRoute={activeRoute} setActiveRoute={setActiveRoute} setMoreStatus={setMoreStatus} />
            <Root activeRoute={activeRoute} setActiveRoute={setActiveRoute} setMoreStatus={setMoreStatus} />
            <div id='detail' className={activeRoute === 'home' || activeRoute === '' ? 'h-hide' : ''}  onClick={() => handleClickMore('close')}>
                <h2>Something went wrong!</h2>
                <button onClick={() => reset()}>Try again</button>
            </div>
        </div>
      </body>
    </html>
  )
}