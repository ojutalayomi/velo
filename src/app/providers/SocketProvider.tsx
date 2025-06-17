import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import io, { Socket } from 'socket.io-client';
import { RootState } from '@/redux/store';
import { useAppDispatch } from '@/redux/hooks';
import { useUser } from '@/app/providers/UserProvider';
import { useSelector } from 'react-redux';
import { addOnlineUser, removeOnlineUser } from '@/redux/utilsSlice';
import { networkMonitor, NetworkStatus } from '@/lib/network';

interface ThrottleFunction {
  (...args: any[]): void;
}

const SocketContext = createContext<Socket | null>(null);

const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [status, setStatus] = useState<NetworkStatus>()
    const { userdata, loading, error } = useUser();
    const { onlineUsers } = useSelector((state: RootState) => state.utils);
    const dispatch = useAppDispatch()
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
        setStatus(networkMonitor.getNetworkStatus())
    }, [])

    useEffect(() => {
        // Only initialize the socket if userdata is loaded
        if (loading || !userdata?._id || !status?.online) return;

        fetch(process.env.NEXT_PUBLIC_SOCKET_URL || '')
        const socketIo = io(process.env.NEXT_PUBLIC_SOCKET_URL || '', {
            path: '/wxyrt',
            query: { userId: userdata._id },
            transports: ['websocket', 'polling']
        });

        socketIo.on('connect', () => {
            console.log('Connected'); // Log the connection status message
            if (userdata?._id) {
                socketIo.emit('register', userdata._id); // Emit 'register' event with user's ID
                // console.log('Registered with ID:', userdata._id);
            } else {
                console.log('User ID is not available for registration');
            }
        });

        socketIo.on('userStatus', (data) => {
        // console.log('User status updated:', data);
        // Update UI with new status
            if(onlineUsers.includes(data.userId)) return
            if(data.status === 'online'){
                dispatch(addOnlineUser(data.userId))
            } else {
                dispatch(removeOnlineUser(data.userId))
            }
        });

        socketIo.on('disconnect', (reason: any) => {
            console.log('Disconnected:', reason);
        });

        socketIo.on('connect_error', (err: any) => {
            // console.error('Connection Error:', err);
            if(err.message.includes("P: websocket error at tt.onError") && userdata?._id){
                socketIo.emit('register', userdata._id); // Emit 'register' event with user's ID
                // console.log('Registered with ID:', userdata._id);
            }
        });

        socketIo.on('error', (err: any) => {
            // console.error('Socket Error:', err);
        });


        function throttle(callback: ThrottleFunction, limit: number): ThrottleFunction {
            let waiting = false;
            return function (this: any, ...args: any[]): void {
                if (!waiting) {
                    callback.apply(this, args);
                    waiting = true;
                    setTimeout(() => {
                        waiting = false;
                    }, limit);
                }
            };
        }
        
        const emitActivity = throttle(() => {
            socketIo.emit('activity');
        }, 5000);

        const emitActivity1 = () => {
            if (document.visibilityState === 'visible') {
                socketIo.emit('activity');
            }
        }

        window.onbeforeunload = ()=> {
            socketIo.emit('activity');
        }
        
        document.addEventListener('mousemove', emitActivity);
        document.addEventListener('touchstart', emitActivity);
        document.addEventListener('visibilitychange', emitActivity1);

        setSocket(socketIo);

        return () => {
            document.removeEventListener('mousemove', emitActivity);
            document.removeEventListener('touchstart', emitActivity);
            document.removeEventListener('visibilitychange', emitActivity1);
            socketIo.disconnect(); // Ensure the socket is disconnected on cleanup
        };
    }, [loading, userdata]); // Add loading and userdata as dependencies

    return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
};

export default SocketProvider

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
};