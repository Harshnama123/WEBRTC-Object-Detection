const io = require('socket.io-client');
const fs = require('fs');

// Parse command line arguments
const args = process.argv.slice(2);
let duration = 30;
let mode = 'wasm';

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--duration' && args[i + 1]) {
        duration = parseInt(args[i + 1]);
        i++;
    }
    if (args[i] === '--mode' && args[i + 1]) {
        mode = args[i + 1];
        i++;
    }
}

console.log(`🔄 Starting benchmark for ${duration}s in ${mode} mode...`);
console.log('📊 Make sure your demo is running and phone is connected');

// Connect to the running server
console.log('🔌 Connecting to server...');
const socket = io('http://localhost:3000');

socket.on('connect', () => {
    console.log('✅ Connected to server');
    console.log('📊 Starting benchmark collection...');
    
    // Start benchmark
    socket.emit('start-benchmark', duration);
    
    setTimeout(() => {
        console.log('⏰ Benchmark duration completed');

        // Check if metrics.json was created
        if (fs.existsSync('metrics.json')) {
            try {
                // Read and trim the file to avoid parse errors from trailing whitespace
                const rawData = fs.readFileSync('metrics.json', 'utf8').trim();
                console.log('--- Raw metrics.json content ---');
                console.log(rawData);
                console.log('--- End of file content ---');
                const metrics = JSON.parse(rawData);
                console.log('✅ Benchmark Results:');
                console.log('  Mode:', metrics.mode);
                console.log('  Duration:', metrics.test_duration_seconds + 's');
                console.log('  Median E2E Latency:', metrics.median_e2e_latency + 'ms');
                console.log('  P95 E2E Latency:', metrics.p95_e2e_latency + 'ms');
                console.log('  Processed FPS:', metrics.processed_fps);
                console.log('  Uplink:', metrics.uplink_kbps + 'kbps');
                console.log('  Downlink:', metrics.downlink_kbps + 'kbps');
                console.log('📁 Full metrics saved to metrics.json');
            } catch (parseError) {
                console.error('❌ JSON parsing error:', parseError.message);
                const erroredContent = fs.readFileSync('metrics.json', 'utf8');
                console.log('Raw file content causing error:');
                console.log(erroredContent);
            }
        } else {
            console.log('❌ metrics.json not found. Make sure the demo is running.');
        }

        socket.disconnect();
        process.exit(0);
    }, (duration + 2) * 1000);
});

socket.on('disconnect', () => {
    console.log('❌ Disconnected from server');
});

socket.on('connect_error', (error) => {
    console.log('❌ Connection failed:', error.message);
    console.log('💡 Make sure the server is running with: npm start');
    process.exit(1);
});
