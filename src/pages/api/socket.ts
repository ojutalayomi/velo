import { Server as NetServer } from 'http'
import { NextApiRequest, NextApiResponse } from 'next'
import { Server as ServerIO } from 'socket.io'
import { Socket as NetSocket } from 'net';
import { MessageAttributes, NewChat_ } from '@/lib/types/type';

export const config = {
  api: {
    bodyParser: false,
  },
}

interface ServerIOWithSocket extends ServerIO {
  server?: NetServer
}
type NextApiResponseWithSocket = NextApiResponse & {
  socket: NetSocket & {
    server: NetServer & {
      io?: ServerIO;
    };
  };
};

const SocketHandler = (req: NextApiRequest, res: NextApiResponseWithSocket) => {
  if (!res.socket.server.io) {
    const id = req.query.id as string;
    console.log('Socket is initializing');
    // const path = id+'-chat';
    // console.log(path)
    
    try {
      const io = new ServerIO(res.socket.server, {
        path: '/api/socket',
        transports: ['websocket', 'polling'],
        pingTimeout: 60000, // Increase ping timeout to 60 seconds
      });
      res.socket.server.io = io;

      io.on('connection', (socket) => {
        console.log('New client connected')

        socket.on('register', (userId: string) => {
          if(userId){
            console.log(`Received register event for user: ${userId}`)
            socket.join(`user:${userId}`)
            console.log(`User ${userId} registered and joined room user:${userId}`)
            socket.emit('registerAck', `Registration successful for user ${userId}`)
          }
        })
    
        socket.on('leaveChat', (chatId: string) => {
          socket.leave(chatId)
          console.log(`Client ${socket.id} left chat: ${chatId}`)
        })

        socket.on('addChat', async (data: NewChat_) => {
          console.log('Data received:', data)

          // Emit to sender's room
          io.to(`user:${data.chat.participants[0]}`).emit('newChat', data)
    
          // Emit to receiver's room
          if(data.chat.participants[1]) io.to(`user:${data.chat.participants[1]}`).emit('newChat', data)
        })

        socket.on('chatMessage', async (data: MessageAttributes) => {
          // console.log('Message received:', data)
          
          // Save message to database (pseudo-code)
          // await saveMessageToDatabase(data)
    
          // Emit to sender's room
          io.to(`user:${data.senderId}`).emit('newMessage', data)
    
          // Emit to receiver's room
          if(data.receiverId) io.to(`user:${data.receiverId}`).emit('newMessage', data)
        })

        socket.on('userOnline', (userId: string) => {
          io.emit('userStatus', { userId, status: 'online' });
        });

        socket.on('userOffline', (userId: string) => {
          io.emit('userStatus', { userId, status: 'offline' });
        });

        socket.on('typing', (data: { userId: string, chatId: string }) => {
          socket.to(`user:${data.userId}`).emit('userTyping', data);
        });

        socket.on('stopTyping', (data: { userId: string, chatId: string }) => {
          socket.to(`user:${data.userId}`).emit('userStopTyping', data);
        });

        socket.on('disconnect', (reason) => {
          console.log('Client disconnected:', reason);
        });

        socket.on('error', (error) => {
          console.error('Socket error:', error);
        });
      })

      io.engine.on("connection_error", (err) => {
        console.log(err.req);      // the request object
        console.log(err.code);     // the error code, for example 1
        console.log(err.message);  // the error message, for example "Session ID unknown"
        console.log(err.context);  // some additional error context
      });

    } catch (error) {
      console.error('Failed to initialize socket:', error);
      res.status(500).end();
      return;
    }
  }
  res.end()
}

export default SocketHandler