import { Server as NetServer } from 'http'
import { NextApiRequest, NextApiResponse } from 'next'
import { Server as ServerIO, Socket } from 'socket.io'
import { Socket as NetSocket } from 'net';
import { MessageAttributes, NewChat_ } from '@/lib/types/type';
import { MongoClient, ServerApiVersion } from 'mongodb';
import Redis from 'ioredis';
import { FireExtinguisher } from 'lucide-react';

export const config = {
  api: {
    bodyParser: false,
  },
}

const uri = process.env.MONGOLINK ? process.env.MONGOLINK : '';
let client: MongoClient;
const MONGODB_DB = 'mydb';
const ONLINE_USERS_COLLECTION = 'OnlineUsers';
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const USER_TIMEOUT = 60; // 60 seconds
let io: ServerIO;

interface ServerIOWithSocket extends ServerIO {
  server?: NetServer
}

type UserSocket = Socket & { userId?: string };

type NextApiResponseWithSocket = NextApiResponse & {
  socket: NetSocket & {
    server: NetServer & {
      io?: ServerIO;
    };
  };
};

const redis = new Redis(process.env.REDIS_URL || '');

const SocketHandler = (req: NextApiRequest, res: NextApiResponseWithSocket) => {
  if (!res.socket.server.io) {
    const id = req.query.id as string;
    console.log('Socket is initializing');
    
    try {
      io = new ServerIO(res.socket.server, {
        path: '/api/socket',
        transports: ['websocket', 'polling'],
        pingTimeout: 60000, // Increase ping timeout to 60 seconds
      });
      res.socket.server.io = io;

      const BATCH_INTERVAL = 5000; // 5 seconds
      const statusUpdates = new Map();

      setInterval(() => {
        if (statusUpdates.size > 0) {
          io.emit('batchUserStatus', Array.from(statusUpdates));
          statusUpdates.clear();
        }
      }, BATCH_INTERVAL);

      io.on('connection', async (socket: UserSocket) => {
        console.log('New client connected');

        // Initialize MongoDB connection
        /*if (!client) {
          client = new MongoClient(uri, {
            serverApi: {
              version: ServerApiVersion.v1,
              strict: true,
              deprecationErrors: true
            },
            connectTimeoutMS: 60000,
            maxPoolSize: 10
          });
          await client.connect();
          console.log("Mongoconnection: You successfully connected to MongoDB!");
        }*/

        socket.on('register', async (userId: string) => {
          if (userId) {
            console.log(`Received register event for user: ${userId}`);
            socket.join(`user:${userId}`);
            console.log(`User ${userId} registered and joined room user:${userId}`);
            socket.emit('registerAck', `Registration successful for user ${userId}`);

            // Update user's online status
            await updateUserOnlineStatus(userId, true);
          }
        });

        // Implement heartbeat mechanism
        const heartbeat = setInterval(async () => {
          if (socket.rooms.has(`user:${socket.id}`)) {
            await updateUserOnlineStatus(socket.id, true);
          }
        }, HEARTBEAT_INTERVAL);

        socket.on('disconnect', async (reason) => {
          clearInterval(heartbeat);
          if (socket.rooms.has(`user:${socket.id}`)) {
            await updateUserOnlineStatus(socket.id, false);
            console.log('Client disconnected:', reason);
          }
        });

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
          if (data.receiverId) io.to(`user:${data.receiverId}`).emit('newMessage', data)
        })

        socket.on('typing', (data: { userId: string, to: string, chatId: string }) => {
          io.to(`user:${data.to}`).emit('userTyping', data);
          // console.log('userTyping', data);
        });

        socket.on('stopTyping', (data: { userId: string, to: string, chatId: string }) => {
          io.to(`user:${data.to}`).emit('userStopTyping', data);
          // console.log('userStopTyping', data);
        });

        socket.on('error', (error) => {
          console.error('Socket error:', error);
        });

        socket.on('subscribeToUser', async (userId: string) => {
          socket.join(`user:${userId}`);
          const isOnline = await redis.get(`user:${userId}:online`);
          socket.emit('userStatus', { userId, status: isOnline ? 'online' : 'offline' });
        });

        socket.on('getRoomMembers', (chatId: string) => {
          const room = io.sockets.adapter.rooms.get(chatId);
          if (room) {
            const members = Array.from(room);
            console.log(`Members in chat ${chatId}:`, members);
            socket.emit('roomMembers', { chatId, members });
          } else {
            console.log(`Chat ${chatId} not found`);
            socket.emit('roomMembers', { chatId, members: [] });
          }
        });
        socket.on('joinChat', (data: { chatId: string, userId: string, friendId: string }) => {
          const { chatId, userId, friendId } = data;
          socket.join(chatId);
          // console.log(`User ${userId} joined chat: ${chatId}`);
          // console.log(`User ${friendId} was added to the chat: ${chatId}`);

          const room = io.sockets.adapter.rooms.get(chatId);
          if (room) {
            const members = Array.from(room);
            console.log(`Members in chat ${chatId}:`, members);
          } else {
            console.log(`Chat ${chatId} not found`);
          }
          // Notify other users in the chat room
          socket.to(chatId).emit('userJoined', { chatId, userId, friendId });
          
          // Optionally, you can emit a confirmation to the user who joined
          socket.emit('joinedChat', { chatId, userId, friendId });
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

async function updateUserOnlineStatus(userId: string, isOnline: boolean) {
  if (isOnline) {
    await redis.set(`user:${userId}:online`, 'true', 'EX', USER_TIMEOUT);
    io.to(`user:${userId}`).emit('userStatus', { userId, status: 'online' });
  } else {
    await redis.del(`user:${userId}:online`);
    io.to(`user:${userId}`).emit('userStatus', { userId, status: 'offline' });
  }
}

export default SocketHandler