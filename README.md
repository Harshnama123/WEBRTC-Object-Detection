# WebRTC Real-Time Object Detection

A modern web application that performs real-time object detection on video streams from mobile devices using WebRTC and TensorFlow.js.

## 🌟 Overview

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

### Changing Detection Mode
- Default mode is WASM (browser-side detection)
- To use server mode, set environment variable:
```bash
export DETECTION_MODE=server
npm start
```

### Running Benchmarks
```bash
npm run benchmark
```
This will generate performance metrics including:
- End-to-end latency
- Server processing time
- FPS
- Bandwidth usage

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

### Common Issues
1. **Camera not working:**
   - Ensure camera permissions are granted
   - Try refreshing the page

2. **Connection fails:**
   - Check if both devices are on same network
   - Try using ngrok for remote connections

3. **Poor performance:**
   - Try WASM mode for faster processing
   - Ensure good network connectivity
