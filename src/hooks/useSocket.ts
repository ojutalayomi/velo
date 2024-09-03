import { useEffect, useState } from 'react'
import io, { Socket } from 'socket.io-client'

export const useSocket = () => {
  const [socket, setSocket] = useState<typeof Socket | null>(null)

  useEffect(() => {
    const socketInitializer = async () => {
      await fetch('/api/socket')
      const socketIo = io()

      setSocket(socketIo)
    }

    socketInitializer()

    return () => {
      if (socket) {
        socket.disconnect()
      }
    }
  }, [])

  return socket
}