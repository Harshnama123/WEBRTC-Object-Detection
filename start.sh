#!/bin/bash

# Default values
MODE="${MODE:-wasm}"
NGROK=false

# Parse command line arguments
while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --ngrok)
      NGROK=true
      shift
      ;;
    --mode)
      MODE="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: ./start.sh [--mode wasm|server] [--ngrok]"
      exit 1
      ;;
  esac
done

echo "🚀 Starting WebRTC Object Detection Demo"
echo "📊 Mode: $MODE"

# Export environment variable for the application
export DETECTION_MODE="$MODE"

# Auto-install dependencies if missing
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Install socket.io-client for benchmarking if missing
if [ ! -d "node_modules/socket.io-client" ]; then
    echo "📦 Installing socket.io-client for benchmarking..."
    npm install socket.io-client
fi

# Start ngrok if requested
if [ "$NGROK" = true ]; then
    echo "🌐 Starting ngrok tunnel..."
    
    # Check if ngrok is available
    if ! command -v ngrok >/dev/null 2>&1; then
        echo "📦 Installing ngrok globally..."
        npm install -g ngrok
    fi
    
    # Start ngrok in background
    ngrok http 3000 &
    NGROK_PID=$!
    sleep 3
    
    echo "🔗 Ngrok tunnel started!"
    echo "📱 Use this URL on your phone:"
    
    # Try to get ngrok URL
    if command -v curl >/dev/null 2>&1 && command -v jq >/dev/null 2>&1; then
        curl -s http://127.0.0.1:4040/api/tunnels | jq -r '.tunnels[0].public_url'
    else
        echo "   Check http://127.0.0.1:4040 for the ngrok URL"
    fi
    
    # Cleanup on exit
    trap "kill $NGROK_PID 2>/dev/null" EXIT
fi

echo "🎯 Starting server in $MODE mode..."
echo ""
echo "📱 Phone Instructions:"
echo "   1. Open the URL below on your phone's Chrome browser"
echo "   2. Allow camera access when prompted"
echo "   3. Watch live object detection on your laptop!"
echo ""
echo "💻 Laptop URL: http://localhost:3000"
echo ""

# Start the server
npm start
