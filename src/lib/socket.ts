import { io, Socket } from 'socket.io-client';

// Initialize socket connection once
let socket: Socket | undefined;

export function getSocketInstance(userId: string) {
    if (!socket) {
        socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || '', {
            path: '/wxyrt',
            transports: ['websocket', 'polling'],
            query: { userId }
        });
    } else if (socket.io.opts?.query?.userId !== userId) {
        socket.io.opts.query = { userId };
        socket.disconnect().connect(); // Reconnect with new userId
    }
    return socket;
}