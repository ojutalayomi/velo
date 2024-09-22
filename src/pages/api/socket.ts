import { Server as NetServer } from 'http'
import { NextApiRequest, NextApiResponse } from 'next'
import { Server as ServerIO, Socket } from 'socket.io'
import { Socket as NetSocket } from 'net';
import { GroupMessageAttributes, MessageAttributes, NewChat_ } from '@/lib/types/type';
import { MongoClient, ObjectId, ServerApiVersion } from 'mongodb';
import Redis from 'ioredis';

export const config = {
  api: {
    bodyParser: false,
  },
}

const uri = process.env.MONGOLINK ? process.env.MONGOLINK : '';
let client: MongoClient;
const MONGODB_DB = 'mydb';
const ONLINE_USERS_KEY = 'online_users';
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

const func = async (_id: string): Promise<any> => {
  const chats = await client.db(MONGODB_DB).collection('chats').find({ 
    'participants.id': _id,
    'chatType': 'Groups'
  }).toArray()
  return chats;
}

const redis = new Redis(process.env.REDIS_URL || '');

const SocketHandler = (req: NextApiRequest, res: NextApiResponseWithSocket) => {
  if (!res.socket.server.io) {
    const id = req.query.id as string;
    // console.log('Socket is initializing');
    
    try {
      io = new ServerIO(res.socket.server, {
        path: '/api/socket',
        transports: ['websocket', 'polling'],
        pingTimeout: 60000, // Increase ping timeout to 60 seconds
      });
      io.setMaxListeners(20); // Adjust the number as needed
      res.socket.server.io = io;

      // Set max listeners to avoid memory leak warnings

      const BATCH_INTERVAL = 5000; // 5 seconds
      const statusUpdates = new Map();

      setInterval(() => {
        if (statusUpdates.size > 0) {
          io.emit('batchUserStatus', Array.from(statusUpdates));
          statusUpdates.clear();
        }
      }, BATCH_INTERVAL);

      io.on('connection', async (socket: UserSocket) => {
        // console.log('New client connected');

        // Initialize MongoDB connection
        if (!client) {
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
          // console.log("Mongoconnection: You successfully connected to MongoDB!");
        }

        socket.on('register', async (userId: string) => {
          if (userId) {
            const isAlreadyConnected = await redis.sismember(ONLINE_USERS_KEY, userId);
            if (!isAlreadyConnected) {
              // console.log(`Registering user: ${userId}`);
              await redis.sadd(ONLINE_USERS_KEY, userId);
              socket.userId = userId;
              socket.join(`user:${userId}`);
              const groups = await func(userId);
              groups.forEach((group: any) => {
                socket.join(`group:${group._id.toString()}`);
                // console.log(`User ${userId} joined group:${group._id.toString()}`);
              });
              // console.log(`User ${userId} registered and joined room user:${userId}`);

              // Update user's online status
              await updateUserOnlineStatus(userId, true);
            } else {
              // Leave every room the user is present in
              const rooms = Array.from(socket.rooms);
              rooms.forEach(room => {
                socket.leave(room);
              });
              // console.log(`User ${userId} left all rooms`);

              await redis.del(`user:${userId}:online`);
              // console.log(`User ${userId} already registered`);
              socket.join(`user:${userId}`);
              const groups = await func(userId);
              groups.forEach((group: any) => {
                socket.join(`group:${group._id.toString()}`);
                // console.log(`User ${userId} joined group:${group._id.toString()}`);
              });
            }
          }
        });

        // Implement heartbeat mechanism
        const heartbeat = setInterval(async () => {
          if (socket.userId) {
            await updateUserOnlineStatus(socket.userId, true);
          }
        }, HEARTBEAT_INTERVAL);

        socket.on('disconnect', async () => {
          clearInterval(heartbeat);
          if (socket.userId) {
            await redis.srem(ONLINE_USERS_KEY, socket.userId);
            await updateUserOnlineStatus(socket.userId, false);
            // console.log(`User ${socket.userId} disconnected`);
          }
          // Remove all listeners for this socket
          socket.removeAllListeners();
        });

        socket.on('leaveChat', (chatId: string) => {
          socket.leave(chatId)
          // console.log(`Client ${socket.id} left chat: ${chatId}`)
        })

        socket.on('addChat', async (data: NewChat_) => {
          // Ensure participants are unique to avoid multiple emissions
          const uniqueParticipants = new Set(data.chat.participants.map(participant => participant.id));
          uniqueParticipants.forEach(participantId => {
            io.to(`user:${participantId}`).emit('newChat', data);
          });
        })

        socket.on('chatMessage', async (data: MessageAttributes | GroupMessageAttributes) => {
          // console.log('Message received:', data)
          
          // Save message to database (pseudo-code)
          // await saveMessageToDatabase(data)

          if ('messageType' in data && data.messageType === 'Groups') {
            // For group messages, emit to the group room
            io.to(`group:${data.receiverId}`).emit('newMessage', data);
          } else {
            // For individual messages, emit to sender and receiver
            if ('senderId' in data) {
              io.to(`user:${data.senderId}`).emit('newMessage', data);
            }
            if ('receiverId' in data && data.receiverId) {
              io.to(`user:${data.receiverId}`).emit('newMessage', data);
            }
          }
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
            // console.log(`Members in chat ${chatId}:`, members);
            socket.emit('roomMembers', { chatId, members });
          } else {
            // console.log(`Chat ${chatId} not found`);
            socket.emit('roomMembers', { chatId, members: [] });
          }
        });
        
        socket.on('joinChat', (data: { chatId: string }) => {
          const { chatId } = data;
          socket.join(`group:${chatId}`);
          // console.log(`User ${socket.id} joined group:${chatId}`);
          io.to(`group:${chatId}`).emit('groupAnnouncement', { chatId, userId: socket.userId });
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
  const currentStatus = await redis.get(`user:${userId}:online`);
  
  if (isOnline && currentStatus !== 'true') {
    await redis.set(`user:${userId}:online`, 'true', 'EX', USER_TIMEOUT);
    io.to(`user:${userId}`).emit('userStatus', { userId, status: 'online' });
  } else if (!isOnline && currentStatus !== null) {
    await redis.del(`user:${userId}:online`);
    io.to(`user:${userId}`).emit('userStatus', { userId, status: 'offline' });
  }
}

export default SocketHandler