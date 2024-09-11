import { useEffect, useState, useRef } from 'react';
import io, { Socket } from 'socket.io-client';

type ID = {
  id: string;
};

export const useSocket = (id: string,chatid = '') => {
  const [socket, setSocket] = useState<typeof Socket | null>(null);
  const retries = useRef(3);

  useEffect(() => {
    const socketInitializer = async () => {
      await fetch('/api/socket')
      const socketIo = io({
        path: '/api/socket',
        transports: ['websocket', 'polling'],
      })

      const handleConnect = (text: string) => {
        socketIo.on('connect', () => {
          console.log(text)
          socketIo.emit('register', id);
        })
      }

      handleConnect('Connected to server');
      
      if (socketIo.connected) {
        console.log('Attempting to register with ID:', id)
        socketIo.emit('register', id);
      } else {
        handleConnect('Socket not connected, waiting...')
      }

      // Subscribe to friends' status updates
      const friendIds: string[] = []; // TODO: Fetch friend IDs from your state or API
      friendIds.forEach(friendId => {
        socketIo.emit('subscribeToUser', friendId);
      });

      setSocket(socketIo)
    }

    socketInitializer()

    return () => {
      if (socket) {
        socket?.emit('leaveChat', id)
        socket.disconnect()
      }
    }
  }, [id])

  return socket;
};
