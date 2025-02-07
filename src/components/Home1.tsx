"use client";
import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import Posts from '@/templates/posts';
import { RefreshCw } from 'lucide-react';
import { RootState } from '@/redux/store';
import { usePosts } from '@/app/providers';
import { Skeleton } from './ui/skeleton';

const Homepage: React.FC = () => {
    const { posts, loading, error } = useSelector((state: RootState) => state.posts);
    const { success, setReload } = usePosts();
    const homeRef = useRef<HTMLDivElement>(null);
    const scrollPositionRef = useRef(0);
    const [isClient, setIsClient] = useState(false);
    
    // Handle scroll event
    const handleScroll = () => {
        if (homeRef.current) {
            scrollPositionRef.current = homeRef.current.scrollTop;
            localStorage.setItem('homeScrollPosition', scrollPositionRef.current.toString());
        }
    };

    // Set initial client state and restore scroll position
    useEffect(() => {
        setIsClient(true);
        const savedPosition = localStorage.getItem('homeScrollPosition');
        if (homeRef.current && savedPosition) {
            const position = parseInt(savedPosition);
            // Small delay to ensure content is rendered
            setTimeout(() => {
                homeRef.current?.scrollTo({
                    top: position,
                    behavior: 'instant' // Changed from 'smooth' for more reliable positioning
                });
            }, 100);
        }
    }, []);

    return (
        <div 
            onScroll={handleScroll} 
            ref={homeRef} 
            id='home' 
            className='dark:text-slate-200'
        >
            <header className='dark:bg-zinc-900 bg-gray-50 shadow-md sticky top-0 w-full z-[5]'>
                <div className='flex justify-center py-3 w-full'>
                    <h1>Velo</h1>
                </div>
            </header>

            <div className='pre-status mt-2'>
                <div className='status'>
                    {loading && (
                        [7].map(i => (
                            <div key={"ui"+i} className="flex items-center w-full h-[10%]">
                                <Skeleton className="size-8 rounded-full ring-2 ring-brand" />
                            </div>
                        ))
                    )}
                    {!loading && success && success.length > 0 && (
                        success.map((status: string, index: number) => (
                            <div 
                                key={index} 
                                id={`status-${index}`} 
                                className='status-child' 
                                style={{ 
                                    backgroundImage: `url(https://s3.amazonaws.com/profile-display-images/${status})`
                                }} 
                            />
                        ))
                    )}
                    {!loading && error && <RefreshCw size={30}/>}
                </div>
            </div>

            <div className='h3 dark:!text-slate-200'>
                <h3>Connect with friends and the world around you on noow.</h3>
            </div>

            <>
                {loading ? (
                    [6].map(i => (
                        <div key={"ux"+i} className="flex flex-col space-y-3">
                            <Skeleton className="h-[125px] w-[250px] rounded-xl" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-[250px]" />
                                <Skeleton className="h-4 w-[200px]" />
                            </div>
                        </div>
                    ))
                ) : posts && posts.length ? (
                    posts.map(post => (
                        <Posts key={post._id} postData={post}/>
                    ))
                ) : error && (
                    <div className='flex flex-col items-center justify-center w-full h-3/4'>
                        <RefreshCw 
                            className='cursor-pointer' 
                            size={30} 
                            onClick={() => setReload(true)}
                        />
                        <h1>Reload</h1>
                    </div>
                )}
            </>
        </div>
    );
};

export default Homepage;