#!/bin/bash

# Create bench directory if it doesn't exist
mkdir -p bench

# Default values
DURATION=30
MODE="wasm"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --duration)
      DURATION="$2"
      shift 2
      ;;
    --mode)
      MODE="$2" 
      shift 2
      ;;
    *)
      echo "Unknown option $1"
      echo "Usage: ./bench/run_bench.sh --duration 30 --mode wasm"
      exit 1
      ;;
  esac
done

echo "🔄 Running benchmark for ${DURATION}s in ${MODE} mode..."
echo "📊 Make sure your demo is running and phone is connected"

# Start benchmark collection
node -e "
const io = require('socket.io-client');
const fs = require('fs');

console.log('🔌 Connecting to server...');
const socket = io('http://localhost:3000');

socket.on('connect', () => {
    console.log('✅ Connected to server');
    console.log('📊 Starting benchmark collection...');
    
    // Start benchmark
    socket.emit('start-benchmark', ${DURATION});
    
    setTimeout(() => {
        console.log('⏰ Benchmark duration completed');
        
        // Check if metrics.json was created
        if (fs.existsSync('metrics.json')) {
            const metrics = JSON.parse(fs.readFileSync('metrics.json', 'utf8'));
            console.log('✅ Benchmark Results:');
            console.log('  Mode:', metrics.mode);
            console.log('  Duration:', metrics.test_duration_seconds + 's');
            console.log('  Median E2E Latency:', metrics.median_e2e_latency + 'ms');
            console.log('  P95 E2E Latency:', metrics.p95_e2e_latency + 'ms');
            console.log('  Processed FPS:', metrics.processed_fps);
            console.log('  Uplink:', metrics.uplink_kbps + 'kbps');
            console.log('  Downlink:', metrics.downlink_kbps + 'kbps');
            console.log('📁 Full metrics saved to metrics.json');
        } else {
            console.log('❌ metrics.json not found. Make sure the demo is running.');
        }
        
        process.exit(0);
    }, (${DURATION} + 2) * 1000);
});

socket.on('disconnect', () => {
    console.log('❌ Disconnected from server');
    process.exit(1);
});
" 

echo "✅ Benchmark complete. Check metrics.json"
