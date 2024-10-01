import { useEffect, useState, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import { useUser } from './useUser';

type ID = {
  id: string;
};

export const useSocket = () => {
  const { userdata, loading, error, refetchUser } = useUser();
  const [socket, setSocket] = useState<typeof Socket | null>(null);

  useEffect(() => {
    const socketInitializer = async () => {
      // await fetch('/api/socket')
      const socketIo = io('http://localhost:8080',{
        path: '/wxyrt',
        // transports: ['websocket', 'polling'],
      })

      const handleConnect = (text: string) => {
        // This event listener is triggered when the socket connection is established.
        // It logs the connection status message to the console and emits a 'register' event to the server,
        // passing the user's ID to register them on the server-side.
        socketIo.on('connect', () => {
          console.log(text) // Log the connection status message
          socketIo.emit('register', userdata._id); // Emit 'register' event with user's ID
        })
      }

      handleConnect('Connected to server');
      
      if (socketIo.connected) {
        console.log('Attempting to register with ID:', userdata._id)
        socketIo.emit('register', userdata._id);
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
        socket.disconnect()
      }
    }
  }, [userdata._id])

  return socket;
};
