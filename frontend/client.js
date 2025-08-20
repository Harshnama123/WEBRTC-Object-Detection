class WebRTCDetectionClient {
    constructor() {
        this.socket = io();
        this.peerConnection = null;
        this.localVideo = document.getElementById('localVideo');
        this.remoteVideo = document.getElementById('remoteVideo');
        this.canvas = document.getElementById('overlay');
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.model = null;
        this.isPhone = this.detectPhone();
        this.roomId = 'detection-room-1';
        this.peerId = null;
        this.currentDetections = [];
        this.frameId = 0;
        this.frameQueue = [];
        this.maxQueueSize = 3; // Frame thinning as required by task
        this.metrics = {
            latencies: [],
            frameCount: 0,
            startTime: Date.now(),
            lastFrameTime: 0,
            detectionResults: [], // Store results with timestamps
            bandwidth: { uplink: 0, downlink: 0 }
        };
        this.benchmarkMode = false;
        this.mode = new URLSearchParams(window.location.search).get('mode') || 'wasm';
        
        this.initializeConnection();
        this.setupSocketHandlers();
        this.setupBandwidthMonitoring();
    }
    
    detectPhone() {
        return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    updateStatus(status, message) {
        const indicator = document.getElementById('status-indicator');
        if (!indicator) return;
        
        indicator.className = `status-indicator status-${status}`;
        
        const icons = {
            connecting: 'fas fa-circle-notch fa-spin',
            connected: 'fas fa-check-circle',
            error: 'fas fa-exclamation-triangle'
        };
        
        indicator.innerHTML = `<i class="${icons[status]}"></i>${message}`;
    }
    
    async initializeConnection() {
        this.updateStatus('connecting', 'Initializing...');
        
        this.peerConnection = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun.cloudflare.com:3478' }
            ],
            iceCandidatePoolSize: 10
        });
        
        this.peerConnection.onconnectionstatechange = () => {
            console.log('Connection state:', this.peerConnection.connectionState);
            if (this.peerConnection.connectionState === 'connected') {
                this.updateStatus('connected', 'Live & Detecting');
                const recordingEl = document.getElementById('recording-indicator');
                if (recordingEl) recordingEl.style.display = 'block';
            }
        };
        
        this.peerConnection.oniceconnectionstatechange = () => {
            console.log('ICE connection state:', this.peerConnection.iceConnectionState);
        };
        
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.emit('ice-candidate', {
                    candidate: event.candidate,
                    targetId: this.peerId,
                    roomId: this.roomId
                });
            }
        };
        
        this.socket.emit('join-room', this.roomId);
        
        if (this.isPhone) {
            await this.setupPhoneStream();
        } else {
            await this.setupBrowserReceiver();
        }
    }
    
    setupSocketHandlers() {
        this.socket.on('phone-offer', async (data) => {
            if (!this.isPhone) {
                console.log('Received offer from phone');
                this.peerId = data.phoneId;
                this.updateStatus('connecting', 'Phone connecting...');
                
                try {
                    await this.peerConnection.setRemoteDescription(data.offer);
                    const answer = await this.peerConnection.createAnswer();
                    await this.peerConnection.setLocalDescription(answer);
                    
                    this.socket.emit('browser-answer', {
                        answer: answer,
                        phoneId: data.phoneId,
                        roomId: this.roomId
                    });
                    
                    console.log('Sent answer to phone');
                } catch (error) {
                    console.error('Error handling offer:', error);
                    this.updateStatus('error', 'Connection failed');
                }
            }
        });
        
        this.socket.on('browser-answer', async (data) => {
            if (this.isPhone) {
                console.log('Received answer from browser');
                this.peerId = data.browserId;
                
                try {
                    await this.peerConnection.setRemoteDescription(data.answer);
                    console.log('Set remote description successfully');
                } catch (error) {
                    console.error('Error handling answer:', error);
                }
            }
        });
        
        this.socket.on('ice-candidate', async (data) => {
            try {
                await this.peerConnection.addIceCandidate(data.candidate);
            } catch (error) {
                console.error('Error adding ICE candidate:', error);
            }
        });
        
        // Handle server-mode detection results
        this.socket.on('detection-result', (data) => {
            if (this.mode === 'server') {
                this.handleServerDetectionResult(data);
            }
        });
        
        // Handle benchmark commands
        this.socket.on('start-benchmark', (duration) => {
            this.startBenchmark(duration);
        });
        
        this.socket.on('stop-benchmark', () => {
            this.stopBenchmark();
        });
    }
    
    async setupPhoneStream() {
        try {
            console.log('Setting up phone camera...');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    width: { ideal: 640, max: 1280 },
                    height: { ideal: 480, max: 720 },
                    frameRate: { ideal: 15, max: 30 }
                },
                audio: false
            });
            
            stream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, stream);
            });
            
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            
            this.socket.emit('phone-offer', {
                offer: offer,
                roomId: this.roomId
            });
            
            // Modern phone UI
            document.body.innerHTML = `
                <div style="min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; padding: 20px;">
                    <div style="background: white; border-radius: 20px; padding: 30px; max-width: 400px; width: 100%; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
                        <div style="color: #4f46e5; font-size: 48px; margin-bottom: 20px;">
                            <i class="fas fa-video"></i>
                        </div>
                        <h2 style="color: #1f2937; margin-bottom: 20px; font-family: 'Segoe UI', sans-serif;">Camera Active</h2>
                        <video id="localVideo" autoplay muted playsinline 
                               style="width: 100%; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); margin-bottom: 20px;"></video>
                        <div style="background: #ecfdf5; padding: 20px; border-radius: 12px; margin-bottom: 15px;">
                            <p style="color: #065f46; margin: 0; font-weight: 500;">
                                ✅ Streaming to laptop browser
                            </p>
                        </div>
                        <div style="color: #6b7280; font-size: 14px;">
                            Mode: <span style="font-weight: 500; color: #4f46e5;">${this.mode.toUpperCase()}</span><br>
                            Status: <span id="status" style="font-weight: 500;">Connecting...</span>
                        </div>
                    </div>
                </div>
            `;
            document.getElementById('localVideo').srcObject = stream;
            
        } catch (error) {
            console.error('Camera setup failed:', error);
        }
    }
    
    async setupBrowserReceiver() {
        try {
            this.updateStatus('connecting', 'Loading AI model...');
            console.log('Loading COCO-SSD model...');
            
            if (this.mode === 'wasm') {
                this.model = await cocoSsd.load();
                console.log('✅ WASM Model loaded successfully');
            }
            
            this.updateStatus('connecting', 'Waiting for phone...');
            
            this.peerConnection.ontrack = (event) => {
                console.log('📺 Received video stream from phone!');
                const stream = event.streams[0];
                
                this.remoteVideo.srcObject = stream;
                this.remoteVideo.autoplay = true;
                this.remoteVideo.playsInline = true;
                
                // Hide placeholder
                const placeholder = document.getElementById('video-placeholder');
                if (placeholder) placeholder.style.display = 'none';
                
                this.remoteVideo.play().then(() => {
                    console.log('✅ Video playing successfully');
                    this.updateStatus('connected', `Live & Detecting (${this.mode.toUpperCase()})`);
                }).catch(error => {
                    console.error('❌ Video play failed:', error);
                });
                
                this.remoteVideo.onloadedmetadata = () => {
                    setTimeout(() => {
                        this.setupCanvas();
                        this.startDetection();
                    }, 500);
                };
            };
            
            this.displayConnectionInfo();
            
        } catch (error) {
            console.error('Browser setup failed:', error);
            this.updateStatus('error', 'Setup failed');
        }
    }
    
    setupCanvas() {
        if (!this.canvas || !this.remoteVideo || this.remoteVideo.videoWidth === 0) {
            setTimeout(() => this.setupCanvas(), 200);
            return;
        }
        
        const containerRect = this.remoteVideo.getBoundingClientRect();
        this.canvas.width = containerRect.width;
        this.canvas.height = containerRect.height;
        
        console.log(`✅ Canvas setup complete: ${this.canvas.width}x${this.canvas.height}`);
    }
    
    displayConnectionInfo() {
        const qrDiv = document.getElementById('qr-code');
        const currentUrl = window.location.origin;
        const isNgrok = currentUrl.includes('ngrok');
        
        if (qrDiv) {
            qrDiv.innerHTML = `
                <div class="url-display">${currentUrl}${this.mode === 'server' ? '?mode=server' : ''}</div>
                <div class="connection-info">
                    <div style="margin-bottom: 10px;">
                        <strong>Mode:</strong> <span style="color: #4f46e5; font-weight: 600;">${this.mode.toUpperCase()}</span>
                        ${this.mode === 'wasm' ? '(Browser-side AI)' : '(Server-side AI)'}
                    </div>
                    ${isNgrok ? 
                        '<i class="fas fa-check-circle" style="color: #10b981; margin-right: 5px;"></i>Using ngrok tunnel - phone can connect from anywhere' :
                        '<i class="fas fa-wifi" style="color: #f59e0b; margin-right: 5px;"></i>Make sure your phone and laptop are on the same WiFi network'
                    }
                    <br><br>
                    <strong>Instructions:</strong> Open this URL in your phone's Chrome browser and allow camera access.
                </div>
            `;
        }
    }
    
    async startDetection() {
        let lastProcessTime = 0;
        const targetInterval = 1000 / 12; // 12 FPS as required by task
        
        console.log(`🎯 Starting object detection in ${this.mode} mode...`);
        
        const detectFrame = async () => {
            const now = Date.now();
            
            if (now - lastProcessTime >= targetInterval && 
                this.remoteVideo.readyState >= 2 && 
                this.remoteVideo.videoWidth > 0 &&
                !this.remoteVideo.paused) {
                
                lastProcessTime = now;
                this.frameId++;
                
                try {
                    // CRITICAL: Implement exact timestamp tracking as per task requirements
                    const capture_ts = Date.now(); // When frame was captured
                    const frameData = this.captureFrame();
                    
                    if (frameData) {
                        if (this.mode === 'wasm') {
                            await this.processFrameWASM(frameData, capture_ts);
                        } else {
                            await this.processFrameServer(frameData, capture_ts);
                        }
                    }
                } catch (error) {
                    console.error('Detection error:', error);
                }
            }
            
            requestAnimationFrame(detectFrame);
        };
        
        detectFrame();
    }
    
    async processFrameWASM(frameData, capture_ts) {
        const recv_ts = Date.now(); // When frame was received for processing
        const startInference = Date.now();
        const detections = await this.runDetection(frameData);
        const inference_ts = Date.now(); // When inference completed
        const overlay_display_ts = Date.now(); // When overlay is displayed
        
        // Create the EXACT JSON format required by task
        const detectionResult = {
            frame_id: this.frameId,
            capture_ts: capture_ts,
            recv_ts: recv_ts,
            inference_ts: inference_ts,
            detections: detections
        };
        
        // Calculate required latencies
        const e2e_latency = overlay_display_ts - capture_ts;
        const server_latency = inference_ts - recv_ts;
        const network_latency = recv_ts - capture_ts;
        
        this.currentDetections = detections;
        this.drawOverlays(detections);
        this.updateMetrics(detections.length, e2e_latency, server_latency, network_latency);
        this.updateDetectionList(detections);
        
        // Store for benchmarking
        this.storeDetectionResult(detectionResult, e2e_latency, server_latency, network_latency);
    }
    
    async processFrameServer(frameData, capture_ts) {
        // Send frame to server for processing
        const canvas = frameData;
        canvas.toBlob(blob => {
            const reader = new FileReader();
            reader.onload = () => {
                this.socket.emit('process-frame', {
                    frame_id: this.frameId,
                    capture_ts: capture_ts,
                    recv_ts: Date.now(),
                    imageData: reader.result
                });
            };
            reader.readAsDataURL(blob);
        });
    }
    
    handleServerDetectionResult(data) {
        const overlay_display_ts = Date.now();
        const e2e_latency = overlay_display_ts - data.capture_ts;
        const server_latency = data.inference_ts - data.recv_ts;
        const network_latency = data.recv_ts - data.capture_ts;
        
        this.currentDetections = data.detections;
        this.drawOverlays(data.detections);
        this.updateMetrics(data.detections.length, e2e_latency, server_latency, network_latency);
        this.updateDetectionList(data.detections);
        
        this.storeDetectionResult(data, e2e_latency, server_latency, network_latency);
    }
    
    captureFrame() {
        if (!this.remoteVideo || this.remoteVideo.readyState < 2 || this.remoteVideo.videoWidth === 0) {
            return null;
        }
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Downscale to 320x240 as required by task for low-resource mode
        canvas.width = 320;
        canvas.height = 240;
        
        try {
            ctx.drawImage(this.remoteVideo, 0, 0, canvas.width, canvas.height);
            return canvas;
        } catch (error) {
            return null;
        }
    }
    
    async runDetection(canvas) {
        if (!this.model || !canvas) return [];
        
        try {
            const predictions = await this.model.detect(canvas);
            return predictions
                .filter(pred => pred.score > 0.4)
                .map(pred => ({
                    label: pred.class,
                    score: pred.score,
                    xmin: pred.bbox[0] / canvas.width,
                    ymin: pred.bbox[1] / canvas.height,
                    xmax: (pred.bbox + pred.bbox[2]) / canvas.width,
                    ymax: (pred.bbox[1] + pred.bbox[3]) / canvas.height
                }));
        } catch (error) {
            return [];
        }
    }
    
    drawOverlays(detections) {
        if (!this.ctx || !this.canvas) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        detections.forEach((detection, index) => {
            const x = detection.xmin * this.canvas.width;
            const y = detection.ymin * this.canvas.height;
            const width = (detection.xmax - detection.xmin) * this.canvas.width;
            const height = (detection.ymax - detection.ymin) * this.canvas.height;
            
            const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];
            const color = colors[index % colors.length];
            
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(x, y, width, height);
            
            const label = `${detection.label} ${(detection.score * 100).toFixed(0)}%`;
            this.ctx.font = 'bold 14px Segoe UI';
            const textMetrics = this.ctx.measureText(label);
            
            this.ctx.fillStyle = color;
            this.ctx.fillRect(x, y - 25, textMetrics.width + 12, 25);
            
            this.ctx.fillStyle = 'white';
            this.ctx.fillText(label, x + 6, y - 8);
        });
    }
    
    updateDetectionList(detections) {
        const listContainer = document.getElementById('detection-list');
        if (!listContainer) return;
        
        if (detections.length === 0) {
            listContainer.innerHTML = '<div class="no-detections">No objects detected yet. Point your phone camera at people, objects, or items around you.</div>';
            return;
        }
        
        const uniqueDetections = detections.reduce((acc, detection) => {
            const existing = acc.find(d => d.label === detection.label);
            if (!existing || detection.score > existing.score) {
                acc = acc.filter(d => d.label !== detection.label);
                acc.push(detection);
            }
            return acc;
        }, []);
        
        listContainer.innerHTML = uniqueDetections
            .sort((a, b) => b.score - a.score)
            .map(detection => `
                <div class="detection-item">
                    <span class="detection-name">${detection.label}</span>
                    <span class="detection-confidence">${(detection.score * 100).toFixed(1)}%</span>
                </div>
            `).join('');
    }
    
    updateMetrics(detectionCount, e2e_latency, server_latency, network_latency) {
        this.metrics.frameCount++;
        const elapsed = (Date.now() - this.metrics.startTime) / 1000;
        const fps = this.metrics.frameCount / elapsed;
        
        this.animateValue('fps', fps.toFixed(1));
        this.animateValue('frame-count', this.metrics.frameCount);
        this.animateValue('detections-count', detectionCount);
        this.animateValue('latency', e2e_latency.toFixed(0));
    }
    
    animateValue(id, newValue) {
        const element = document.getElementById(id);
        if (element) {
            element.style.transform = 'scale(1.1)';
            element.textContent = newValue;
            setTimeout(() => {
                element.style.transform = 'scale(1)';
            }, 150);
        }
    }
    
    storeDetectionResult(detectionResult, e2e_latency, server_latency, network_latency) {
        this.metrics.detectionResults.push({
            ...detectionResult,
            e2e_latency,
            server_latency,
            network_latency,
            timestamp: Date.now()
        });
        
        // Keep only last 1000 measurements
        if (this.metrics.detectionResults.length > 1000) {
            this.metrics.detectionResults = this.metrics.detectionResults.slice(-1000);
        }
    }
    
    setupBandwidthMonitoring() {
        setInterval(async () => {
            if (this.peerConnection) {
                try {
                    const stats = await this.peerConnection.getStats();
                    let bytesReceived = 0;
                    let bytesSent = 0;
                    
                    stats.forEach(report => {
                        if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
                            bytesReceived += report.bytesReceived || 0;
                        }
                        if (report.type === 'outbound-rtp' && report.mediaType === 'video') {
                            bytesSent += report.bytesSent || 0;
                        }
                    });
                    
                    this.metrics.bandwidth.downlink = Math.round((bytesReceived * 8) / 1024); // kbps
                    this.metrics.bandwidth.uplink = Math.round((bytesSent * 8) / 1024); // kbps
                } catch (error) {
                    console.error('Bandwidth monitoring error:', error);
                }
            }
        }, 1000);
    }
    
    startBenchmark(duration) {
        console.log(`🔄 Starting benchmark for ${duration} seconds...`);
        this.benchmarkMode = true;
        this.metrics.detectionResults = [];
        this.metrics.startTime = Date.now();
        this.metrics.frameCount = 0;
        
        setTimeout(() => {
            this.stopBenchmark();
        }, duration * 1000);
    }
    
    stopBenchmark() {
        console.log('📊 Stopping benchmark and generating metrics...');
        this.benchmarkMode = false;
        
        const metrics = this.generateMetricsJSON();
        
        // Send metrics to server for saving
        this.socket.emit('save-metrics', metrics);
        
        // Also make available for download
        window.benchmarkMetrics = metrics;
        console.log('✅ Metrics available in window.benchmarkMetrics');
    }
    
    generateMetricsJSON() {
        if (this.metrics.detectionResults.length === 0) {
            return {
                error: 'No detection results available',
                mode: this.mode,
                duration_seconds: 0
            };
        }
        
        const e2e_latencies = this.metrics.detectionResults.map(r => r.e2e_latency).sort((a, b) => a - b);
        const server_latencies = this.metrics.detectionResults.map(r => r.server_latency).sort((a, b) => a - b);
        
        const medianIndex = Math.floor(e2e_latencies.length / 2);
        const p95Index = Math.floor(e2e_latencies.length * 0.95);
        
        const elapsed = (Date.now() - this.metrics.startTime) / 1000;
        const fps = this.metrics.frameCount / elapsed;
        
        return {
            mode: this.mode,
            test_duration_seconds: elapsed,
            median_e2e_latency: e2e_latencies[medianIndex] || 0,
            p95_e2e_latency: e2e_latencies[p95Index] || 0,
            median_server_latency: server_latencies[medianIndex] || 0,
            processed_fps: parseFloat(fps.toFixed(2)),
            total_frames: this.metrics.frameCount,
            uplink_kbps: this.metrics.bandwidth.uplink,
            downlink_kbps: this.metrics.bandwidth.downlink,
            timestamp: new Date().toISOString()
        };
    }
}

window.addEventListener('load', () => {
    console.log('🚀 Initializing WebRTC Detection Client...');
    window.detectionClient = new WebRTCDetectionClient();
});


