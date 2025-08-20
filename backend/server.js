const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Serve static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Store client sessions
const clients = new Map();

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        clients.set(socket.id, { roomId, type: 'unknown' });
        console.log(`Client ${socket.id} joined room ${roomId}`);
    });
    
    socket.on('phone-offer', (data) => {
        console.log('📱 Received offer from phone:', socket.id);
        clients.set(socket.id, { ...clients.get(socket.id), type: 'phone' });
        socket.to(data.roomId).emit('phone-offer', {
            offer: data.offer,
            phoneId: socket.id
        });
    });
    
    socket.on('browser-answer', (data) => {
        console.log('💻 Received answer from browser:', socket.id);
        clients.set(socket.id, { ...clients.get(socket.id), type: 'browser' });
        io.to(data.phoneId).emit('browser-answer', {
            answer: data.answer,
            browserId: socket.id
        });
    });
    
    socket.on('ice-candidate', (data) => {
        console.log('🧊 ICE candidate from:', socket.id);
        if (data.targetId) {
            io.to(data.targetId).emit('ice-candidate', {
                candidate: data.candidate,
                fromId: socket.id
            });
        } else {
            socket.broadcast.emit('ice-candidate', {
                candidate: data.candidate,
                fromId: socket.id
            });
        }
    });
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        clients.delete(socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📱 For phone access, use your local IP or ngrok`);
});
