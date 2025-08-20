const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');

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

// Detection mode (can be 'wasm' or 'server')
const MODE = process.env.DETECTION_MODE || 'wasm';

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
    
    // Handle server-mode frame processing
    socket.on('process-frame', async (data) => {
        if (MODE === 'server') {
            try {
                const inference_ts = Date.now();
                
                // Simulate server-side detection (replace with actual ML inference)
                const detections = await processFrameServerSide(data.imageData);
                
                const result = {
                    frame_id: data.frame_id,
                    capture_ts: data.capture_ts,
                    recv_ts: data.recv_ts,
                    inference_ts: inference_ts,
                    detections: detections
                };
                
                socket.emit('detection-result', result);
            } catch (error) {
                console.error('Server detection error:', error);
            }
        }
    });
    
    // Handle benchmark commands
    socket.on('start-benchmark', (duration) => {
        console.log(`📊 Starting benchmark for ${duration} seconds`);
        socket.emit('start-benchmark', duration);
    });
    
    socket.on('save-metrics', (metrics) => {
        console.log('💾 Saving metrics to metrics.json');
        fs.writeFileSync(path.join(__dirname, '../metrics.json'), JSON.stringify(metrics, null, 2));
        console.log('✅ Metrics saved successfully');
    });
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        clients.delete(socket.id);
    });
});

// Simulate server-side object detection (replace with actual ML model)
async function processFrameServerSide(imageData) {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Mock detection results
    return [
        {
            label: "person",
            score: 0.85,
            xmin: 0.1,
            ymin: 0.1,
            xmax: 0.8,
            ymax: 0.9
        }
    ];
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Detection mode: ${MODE}`);
    console.log(`📱 For phone access, use your local IP or ngrok`);
});
