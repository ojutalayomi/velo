import { useEffect, useState, useRef } from 'react';
import io, { Socket } from 'socket.io-client';

type ID = {
  id: string;
};

export const useSocket = (id: string) => {
  const [socket, setSocket] = useState<typeof Socket | null>(null);
  const retries = useRef(3);

  useEffect(() => {
    const socketInitializer = async () => {

      await fetch('/api/socket')
      const socketIo = io({
        path: '/api/socket',
        transports: ['websocket', 'polling'],
      })

      socketIo.on('connect', () => {
        console.log('Connected to server')
      })
      
      if (socketIo.connected) {
        console.log('Attempting to register with ID:', id)
        socketIo.emit('register', id)
      } else {
        console.log('Socket not connected, waiting...')
        socketIo.on('connect', () => {
          console.log('Attempting to register with ID:', id)
          socketIo.emit('register', id)
        })
      }

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

  /*useEffect(() => {
    const socketInitializer = async () => {
      const path = '/api/socket';
      await fetch(path);

      // const fetchInit = async () => {
      //   if (retries.current > 0) {
      //     await fetch(path);
      //     retries.current -= 1;
      //   }
      // };

      // await fetchInit();
      const socketIo = io({
        path: '/api/socketio',
        transports: ['websocket', 'polling'],
      });

      socketIo.on('connect_error', async (err: any) => {
        console.error('Socket connection error:', err);
        if (retries.current > 0) {
          // await fetchInit();
          setTimeout(() => socketIo.connect(), 5000);
        }
      });

      socketIo.on('disconnect', (reason: any) => {
        console.log('Socket disconnected:', reason);
        if (reason === 'io server disconnect') {
          // The disconnection was initiated by the server, reconnect manually
          socketIo.connect();
        }
        // else the socket will automatically try to reconnect
      });

      setSocket(socketIo);
    };

    socketInitializer();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);*/

  return socket;
};
