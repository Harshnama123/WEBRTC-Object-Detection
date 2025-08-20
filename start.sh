#!/bin/bash

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start the server
echo "Starting WebRTC Object Detection server..."
echo "Open http://localhost:3000 on your laptop"
echo "Then scan the QR code with your phone"

npm start
