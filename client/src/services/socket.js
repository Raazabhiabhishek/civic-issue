import { io } from 'socket.io-client'

let socket = null
let activeToken = ''

export const connectSocket = ({ token, userId }) => {
  if (!token) return null

  if (!socket || activeToken !== token) {
    if (socket) {
      socket.disconnect()
    }

    socket = io('/', {
      auth: { token },
      transports: ['websocket'],
      withCredentials: true,
    })
    activeToken = token
  }

  if (userId && socket.connected) {
    socket.emit('joinUserRoom', userId)
  }

  socket.off('connect')
  socket.on('connect', () => {
    if (userId) socket.emit('joinUserRoom', userId)
  })

  return socket
}

export const getSocket = () => socket

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
    activeToken = ''
  }
}
