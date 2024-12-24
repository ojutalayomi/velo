'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import io, { Socket } from 'socket.io-client';
import { Provider } from "react-redux";
import { store } from "@/redux/store";
import { useHotkeys } from 'react-hotkeys-hook';
import { useUser } from '@/hooks/useUser';
import { PostData } from '@/templates/PostProps';
import { getStatus, getPosts } from '@/components/getStatus';
import { useDispatch, useSelector } from 'react-redux';
import { setPosts, setLoading, setError } from '@/redux/postsSlice';
import { RootState } from '@/redux/store';

export type Theme = 'light' | 'dark' | 'system'

export interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const SocketContext = createContext<Socket | null>(null);

const PostsContext = createContext<{ success: string[] | null, setReload: React.Dispatch<React.SetStateAction<boolean>> } | undefined>(undefined);

const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userdata, loading, error } = useUser();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Only initialize the socket if userdata is loaded
    if (loading && !userdata?._id) return;

    fetch(process.env.NEXT_PUBLIC_SOCKET_URL || '')
    const socketIo = io(process.env.NEXT_PUBLIC_SOCKET_URL || '', {
      path: '/wxyrt',
      transports: ['websocket', 'polling']
    });

    socketIo.on('connect', () => {
      console.log('Connected'); // Log the connection status message
      if (userdata?._id) {
        socketIo.emit('register', userdata._id); // Emit 'register' event with user's ID
        console.log('Registered with ID:', userdata._id);
      } else {
        console.log('User ID is not available for registration');
      }
    });

    socketIo.on('disconnect', (reason: any) => {
      console.log('Disconnected:', reason);
    });

    socketIo.on('connect_error', (err: any) => {
      console.error('Connection Error:', err);
      if(err.message.includes("P: websocket error at tt.onError") && userdata?._id){
        socketIo.emit('register', userdata._id); // Emit 'register' event with user's ID
        console.log('Registered with ID:', userdata._id);
      }
    });

    socketIo.on('error', (err: any) => {
      console.error('Socket Error:', err);
    });

    setSocket(socketIo);

    return () => {
      socketIo.disconnect(); // Ensure the socket is disconnected on cleanup
    };
  }, [loading, userdata]); // Add loading and userdata as dependencies

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
};

const PostsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const dispatch = useDispatch();
  const [success, setSuccess] = useState<string[] | null>(null);
  const [reload, setReload] = useState<boolean>(false);

  useEffect(() => {
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
  }, [reload]);

  return <PostsContext.Provider value={{ success, setReload }}>{children}</PostsContext.Provider>;
};

const Providers: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('light');

  useHotkeys('cmd+m', () => {
    // console.log('Cmmd');
    let thm = '' as 'light' | 'dark' | 'system';
    theme === 'light' ? thm = 'dark' : thm = 'light'; 
    setTheme(thm);
  });

  useHotkeys('ctrl+m', () => {
    // console.log('Cmmd');
    let thm = '' as 'light' | 'dark' | 'system';
    theme === 'light' ? thm = 'dark' : thm = 'light'; 
    setTheme(thm);
  });

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') as Theme | null
    if (storedTheme) {
      setTheme(storedTheme)
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark')
    }
  }, [])

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  return (

    <Provider store={store}>
      <SocketProvider>
        <PostsProvider>
          <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
          </ThemeContext.Provider>
        </PostsProvider>
      </SocketProvider>
    </Provider>
  )
}
export default Providers;

export const usePosts = () => {
  const context = useContext(PostsContext);
  if (context === undefined) {
    throw new Error('usePosts must be used within a PostsProvider')
  }
  return context
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a SocketProvider')
  }
  return context
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}