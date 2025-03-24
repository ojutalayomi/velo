import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getStatus, getPosts } from '@/lib/getStatus';
import { useDispatch } from 'react-redux';
import { setPosts, setLoading, setError } from '@/redux/postsSlice';
import { NetworkStatus, networkMonitor } from '@/lib/network';

const PostsContext = createContext<{ success: string[] | null, setReload: React.Dispatch<React.SetStateAction<boolean>> } | undefined>(undefined);

const PostsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [status, setStatus] = useState<NetworkStatus>()
    const dispatch = useDispatch();
    const [success, setSuccess] = useState<string[] | null>(null);
    const [reload, setReload] = useState<boolean>(false);

    useEffect(() => {
        setStatus(networkMonitor.getNetworkStatus())
        console.log(networkMonitor.getNetworkStatus())
    }, [])

    useEffect(() => {
        if(!status?.online) return;
        const fetchData1 = async () => {
            dispatch(setLoading(true));

            try {
                const statusResponse = await getStatus();
                setSuccess(statusResponse);
            } catch (error) {
                setError((error as Error).message);
            } finally {
                setLoading(false);
            }
        };

        const fetchData2 = async () => {
            dispatch(setLoading(true));

            try {
                const postsResponse = await getPosts();
                dispatch(setPosts(postsResponse));
            } catch (error) {
                dispatch(setError((error as Error).message));
            } finally {
                dispatch(setLoading(false));
            }
        };

        fetchData1();
        fetchData2();
        if (reload) {
            fetchData1();
            fetchData2();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reload, status]);

    return <PostsContext.Provider value={{ success, setReload }}>{children}</PostsContext.Provider>;
};

export default PostsProvider

export const usePosts = () => {
  const context = useContext(PostsContext);
  if (context === undefined) {
    throw new Error('usePosts must be used within a PostsProvider')
  }
  return context
};