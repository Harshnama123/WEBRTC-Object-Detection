# WebRTC Detection Project

This project implements real-time object detection using WebRTC and machine learning models.

## Structure
```
webrtc-detection/
├── frontend/           # Frontend web application
│   ├── index.html     # Main HTML page
│   ├── client.js      # WebRTC and client-side logic
│   ├── style.css      # Styling
│   └── models/        # WASM models directory
├── backend/           # Backend server
│   ├── server.js      # Express server
│   └── detection.js   # Detection logic
├── bench/            # Benchmarking tools
│   └── run_bench.sh  # Benchmark script
├── start.sh         # Startup script
├── package.json     # Project dependencies
└── README.md        # This file
```

## Setup
1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```
or
```bash
./start.sh
```

3. Open your browser to `http://localhost:3000`

## Features
- Real-time video streaming using WebRTC
- Object detection using WASM models
- Simple and intuitive UI
