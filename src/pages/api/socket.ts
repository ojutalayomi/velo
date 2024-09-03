import { Server as NetServer } from 'http'
import { NextApiRequest } from 'next'
import { Server as ServerIO } from 'socket.io'

export const config = {
  api: {
    bodyParser: false,
  },
}

interface ServerIOWithSocket extends ServerIO {
  server?: NetServer
}

const SocketHandler = (req: NextApiRequest, res: any) => {
  if (!res.socket.server.io) {
    console.log('Socket is initializing')
    const io: ServerIOWithSocket = new ServerIO(res.socket.server)
    res.socket.server.io = io

    io.on('connection', (socket) => {
      console.log('New client connected')
      socket.on('send-message', (msg: string) => {
        io.emit('receive-message', msg)
      })
      socket.on('addChat', (chat: string) => {
        io.emit('receive-chat', chat)
      })
    })
  }
  res.end()
}

export default SocketHandler