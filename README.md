# WebRTC Real-Time Object Detection

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)](https://nodejs.org/)
[![Socket.IO](https://img.shields.io/badge/socket.io-v4.7.2-blue)](https://socket.io/)

A production-ready application for real-time object detection using WebRTC and TensorFlow.js, designed for high-performance video processing and analysis.

## Overview

This project enables real-time object detection by streaming video from a phone's camera to a browser using WebRTC. The system can operate in two modes:
- **WASM Mode** (Default): Object detection runs in the browser using TensorFlow.js
- **Server Mode**: Object detection runs on the server (useful for more powerful models)

### Key Features
- 📱 Phone-to-browser video streaming using WebRTC
- 🔍 Real-time object detection using TensorFlow.js COCO-SSD model
- 📊 Live performance metrics (FPS, latency, detection count)
- 🎯 Support for both browser-side and server-side detection
- 📈 Built-in benchmarking tools
- 🎨 Modern, responsive UI for both phone and browser

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm (comes with Node.js)
- Modern web browser (Chrome recommended)
- Smartphone with a camera

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Harshnama123/WEBRTC-Object-Detection.git
cd webrtc-detection
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

### Running the Application

1. **On your computer:**
   - Open Chrome and navigate to: `http://localhost:3000`
   - You'll see the detection interface waiting for a phone connection

2. **On your phone:**
   - If on the same network:
     - Open Chrome and enter your computer's local IP with port 3000
     - Example: `http://192.168.1.100:3000`
   - If on different network:
     - Install ngrok: `npm install -g ngrok`
     - Run: `ngrok http 3000`
     - Open the provided ngrok URL on your phone

3. **Using the App:**
   - Allow camera access on your phone
   - Point your phone's camera at objects
   - Watch real-time detections appear on your computer screen

## 🏗️ Project Structure
```
webrtc-detection/
├── frontend/           # Frontend web application
│   ├── index.html     # Main HTML page with UI
│   ├── client.js      # WebRTC and detection logic
│   ├── style.css      # Modern UI styling
│   └── models/        # WASM models directory
├── backend/           # Backend server
│   ├── server.js      # Express & WebRTC signaling
│   └── detection.js   # Server-side detection logic
├── bench/            # Benchmarking tools
│   └── run_bench.sh  # Performance testing
├── start.sh         # Startup script
├── package.json     # Dependencies
└── README.md        # Documentation
```

## 🔧 Configuration

### Configuration Options

#### Detection Modes

1. **WASM Mode** (Default)
   ```bash
   # Start server in WASM mode
   npm start
   ```
   - Browser-side detection using TensorFlow.js
   - Lower latency, reduced server load
   - Suitable for most use cases

2. **Server Mode**
   ```bash
   # Start server in backend processing mode
   DETECTION_MODE=server npm start
   ```
   - Server-side detection processing
   - Higher accuracy potential
   - Suitable for powerful backend servers

#### Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port number | 3000 |
| `DETECTION_MODE` | Processing mode (wasm/server) | wasm |
| `NODE_ENV` | Environment (development/production) | development |

### Performance Benchmarking

The project includes comprehensive benchmarking tools to measure system performance across different modes and configurations.

#### Available Benchmark Commands

```bash
# Run default benchmark (WASM mode, 30 seconds)
npm run benchmark

# Specific mode benchmarks
npm run benchmark-wasm     # Browser-side detection
npm run benchmark-server   # Server-side detection

# Quick test (5 seconds, WASM mode)
npm run test
```

#### Benchmark Parameters
- **Duration**: Default 30 seconds (configurable)
- **Modes**: WASM (browser-side) or Server (backend processing)
- **Metrics Collected**:
  - End-to-end latency (median and P95)
  - Server processing time
  - Frame processing rate (FPS)
  - Total frames processed
  - Network bandwidth utilization
  - Detection accuracy and confidence scores

#### Running Benchmarks

1. Start the server:
```bash
npm start
```

2. In a new terminal, run the benchmark:
```bash
npm run benchmark
```

3. View results in the generated `metrics.json` file:
```json
{
  "mode": "wasm",
  "test_duration_seconds": 30,
  "median_e2e_latency": 150,
  "p95_e2e_latency": 250,
  "median_server_latency": 50,
  "processed_fps": 12.5,
  "total_frames": 375,
  "uplink_kbps": 1500,
  "downlink_kbps": 500,
  "timestamp": "2025-08-21T10:00:00.000Z"
}
```

#### Interpreting Results
- **E2E Latency**: Time from frame capture to detection display
- **Server Latency**: Processing time on server (server mode only)
- **FPS**: Frames processed per second
- **Bandwidth**: Network usage for video streaming

## 📝 Technical Details

### WebRTC Flow
1. Signaling server establishes connection between phone and browser
2. Phone streams camera feed to browser
3. Browser processes frames for object detection
4. Results displayed in real-time

### Detection Process
- Frames are captured at 12 FPS (configurable)
- Resolution downscaled to 320x240 for performance
- TensorFlow.js COCO-SSD model detects common objects
- Results displayed with bounding boxes and confidence scores

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License
This project is licensed under the MIT License.

## ❓ Troubleshooting

### Troubleshooting Guide

#### Connection Issues
1. **WebRTC Connection Fails**
   - Verify both devices are on the same network
   - Check browser compatibility (Chrome recommended)
   - Ensure proper STUN/TURN server configuration
   - Use ngrok for testing across networks

2. **Camera Access Problems**
   - Grant camera permissions in browser settings
   - Verify camera works in other applications
   - Try a different browser or device
   - Check for conflicting applications using the camera

3. **Performance Issues**
   - Monitor CPU usage and network bandwidth
   - Check benchmark results for bottlenecks
   - Consider switching detection modes
   - Optimize video resolution and frame rate

#### Benchmark Troubleshooting
1. **Benchmark Script Fails**
   ```bash
   # Verify Node.js version
   node --version  # Should be ≥ 14.0.0

   # Check dependencies
   npm install

   # Run with debug output
   DEBUG=* npm run benchmark
   ```

2. **Error Messages**
   - `Error: ENOENT`: Verify file paths and permissions
   - `Socket connection failed`: Check server status
   - `WebRTC negotiation failed`: Verify network connectivity

3. **Invalid Metrics**
   - Ensure server is running before benchmark
   - Check for network interference
   - Verify browser console for errors
   - Monitor system resources during test
