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
        this.metrics = {
            latencies: [],
            frameCount: 0,
            startTime: Date.now(),
            lastFrameTime: 0
        };
        
        this.initializeConnection();
        this.setupSocketHandlers();
    }
    
    detectPhone() {
        return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    async initializeConnection() {
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
        };
        
        this.peerConnection.oniceconnectionstatechange = () => {
            console.log('ICE connection state:', this.peerConnection.iceConnectionState);
        };
        
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('Sending ICE candidate');
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
                console.log('Received ICE candidate');
                await this.peerConnection.addIceCandidate(data.candidate);
            } catch (error) {
                console.error('Error adding ICE candidate:', error);
            }
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
            
            console.log('Camera access granted');
            
            stream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, stream);
                console.log('Added track:', track.kind);
            });
            
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            
            console.log('Sending offer to browser...');
            this.socket.emit('phone-offer', {
                offer: offer,
                roomId: this.roomId
            });
            
            document.body.innerHTML = `
                <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
                    <h2>📱 Phone Camera Active</h2>
                    <video id="localVideo" autoplay muted playsinline 
                           style="width: 100%; max-width: 400px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.2);"></video>
                    <div style="margin-top: 20px; padding: 15px; background: #e8f5e8; border-radius: 8px;">
                        <p style="margin: 0; color: #2d5a2d; font-size: 16px;">
                            ✅ <strong>Camera is streaming to browser</strong><br>
                            Check your laptop to see object detection overlays
                        </p>
                    </div>
                    <div style="margin-top: 15px; padding: 10px; background: #f0f8f0; border-radius: 5px; font-size: 14px; color: #666;">
                        Connection: <span id="status">Connecting...</span>
                    </div>
                </div>
            `;
            document.getElementById('localVideo').srcObject = stream;
            
            this.peerConnection.onconnectionstatechange = () => {
                const statusEl = document.getElementById('status');
                if (statusEl) {
                    statusEl.textContent = this.peerConnection.connectionState;
                    statusEl.style.color = this.peerConnection.connectionState === 'connected' ? 'green' : 'orange';
                }
            };
            
        } catch (error) {
            console.error('Camera setup failed:', error);
            document.body.innerHTML = `
                <div style="padding: 20px; text-align: center;">
                    <h2>❌ Camera Access Failed</h2>
                    <p>Error: ${error.message}</p>
                    <button onclick="location.reload()">Try Again</button>
                </div>
            `;
        }
    }
    
    async setupBrowserReceiver() {
        try {
            console.log('🚀 Setting up browser receiver...');
            console.log('Loading COCO-SSD model...');
            this.model = await cocoSsd.load();
            console.log('✅ Model loaded successfully');
            
            this.peerConnection.ontrack = (event) => {
                console.log('📺 Received video stream from phone!');
                const stream = event.streams[0];
                
                // CRITICAL FIX: Set srcObject and force play
                this.remoteVideo.srcObject = stream;
                this.remoteVideo.autoplay = true;
                this.remoteVideo.playsInline = true;
                
                // Force play and handle any errors
                this.remoteVideo.play().then(() => {
                    console.log('✅ Video playing successfully');
                }).catch(error => {
                    console.error('❌ Video play failed:', error);
                    // Try clicking to play
                    document.addEventListener('click', () => {
                        this.remoteVideo.play();
                    }, { once: true });
                });
                
                document.querySelector('.status').innerHTML = `
                    <div style="background: #d4edda; color: #155724; padding: 10px; border-radius: 5px;">
                        ✅ <strong>Phone connected! Video should appear below</strong>
                    </div>
                `;
                
                this.remoteVideo.onloadedmetadata = () => {
                    console.log('Video metadata loaded:', {
                        width: this.remoteVideo.videoWidth,
                        height: this.remoteVideo.videoHeight,
                        duration: this.remoteVideo.duration
                    });
                    setTimeout(() => {
                        this.setupCanvas();
                        this.startDetection();
                    }, 500);
                };
                
                // Additional debug events
                this.remoteVideo.oncanplay = () => {
                    console.log('Video can play');
                    this.remoteVideo.play();
                };
                this.remoteVideo.onplaying = () => console.log('✅ Video is now playing');
                this.remoteVideo.onloadstart = () => console.log('Video load start');
                this.remoteVideo.onerror = (e) => console.error('Video error:', e);
            };
            
            this.displayConnectionInfo();
            
        } catch (error) {
            console.error('Browser setup failed:', error);
        }
    }
    
    setupCanvas() {
        if (!this.canvas || !this.remoteVideo) {
            console.log('Canvas or video not available');
            return;
        }
        
        if (this.remoteVideo.videoWidth === 0) {
            console.log('Video dimensions not ready, retrying...');
            setTimeout(() => this.setupCanvas(), 200);
            return;
        }
        
        // Get video display dimensions
        const videoRect = this.remoteVideo.getBoundingClientRect();
        
        // Set canvas to match video display size
        this.canvas.width = videoRect.width;
        this.canvas.height = videoRect.height;
        
        // Position canvas over video
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = this.remoteVideo.offsetTop + 'px';
        this.canvas.style.left = this.remoteVideo.offsetLeft + 'px';
        this.canvas.style.width = videoRect.width + 'px';
        this.canvas.style.height = videoRect.height + 'px';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '10';
        this.canvas.style.border = '2px solid lime'; // Debug border
        
        console.log(`✅ Canvas setup complete: ${this.canvas.width}x${this.canvas.height}`);
        console.log(`Video dimensions: ${this.remoteVideo.videoWidth}x${this.remoteVideo.videoHeight}`);
    }
    
    displayConnectionInfo() {
        const qrDiv = document.getElementById('qr-code');
        if (qrDiv) {
            const currentUrl = window.location.origin;
            const isNgrok = currentUrl.includes('ngrok');
            
            qrDiv.innerHTML = `
                <div style="padding: 20px; background: #f0f0f0; border-radius: 10px; margin-bottom: 20px;">
                    <h3>📱 Connect Your Phone:</h3>
                    ${isNgrok ? 
                        `<p><strong>✅ Using ngrok:</strong> <br><code style="background: white; padding: 5px; border-radius: 3px;">${currentUrl}</code></p>` :
                        `<p><strong>Local URL:</strong> <br><code style="background: white; padding: 5px; border-radius: 3px;">${currentUrl}</code></p>
                         <p style="font-size: 12px; color: #666;">If phone can't connect, use ngrok: <code>npx ngrok http 3000</code></p>`
                    }
                    <p style="color: #666; font-size: 14px;">
                        Open the URL above on your phone's Chrome browser and allow camera access.
                    </p>
                </div>
            `;
        }
    }
    
    async startDetection() {
        let lastProcessTime = 0;
        const targetInterval = 1000 / 10; // 10 FPS
        
        console.log('🎯 Starting object detection loop...');
        
        const detectFrame = async () => {
            const now = Date.now();
            
            // Debug every 3 seconds
            if (now % 3000 < 100) {
                console.log('Video status:', {
                    readyState: this.remoteVideo.readyState,
                    videoWidth: this.remoteVideo.videoWidth,
                    videoHeight: this.remoteVideo.videoHeight,
                    paused: this.remoteVideo.paused,
                    currentTime: this.remoteVideo.currentTime
                });
            }
            
            if (now - lastProcessTime >= targetInterval && 
                this.remoteVideo.readyState >= 2 && 
                this.remoteVideo.videoWidth > 0 &&
                !this.remoteVideo.paused) {
                
                lastProcessTime = now;
                
                try {
                    const frameData = this.captureFrame();
                    if (frameData) {
                        const startInference = Date.now();
                        const detections = await this.runDetection(frameData);
                        const inferenceTime = Date.now() - startInference;
                        
                        this.drawOverlays(detections);
                        this.updateMetrics(detections.length, inferenceTime);
                        
                        if (detections.length > 0) {
                            console.log(`🎯 Found ${detections.length} objects:`, detections.map(d => `${d.label} (${(d.score*100).toFixed(1)}%)`));
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
    
    captureFrame() {
        if (!this.remoteVideo || this.remoteVideo.readyState < 2 || this.remoteVideo.videoWidth === 0) {
            return null;
        }
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = 320;
        canvas.height = 240;
        
        try {
            ctx.drawImage(this.remoteVideo, 0, 0, canvas.width, canvas.height);
            return canvas;
        } catch (error) {
            console.error('Frame capture error:', error);
            return null;
        }
    }
    
    async runDetection(canvas) {
        if (!this.model || !canvas) return [];
        
        try {
            const predictions = await this.model.detect(canvas);
            return predictions
                .filter(pred => pred.score > 0.3)
                .map(pred => ({
                    label: pred.class,
                    score: pred.score,
                    xmin: pred.bbox[0] / canvas.width,
                    ymin: pred.bbox[1] / canvas.height,
                    xmax: (pred.bbox + pred.bbox[2]) / canvas.width,
                    ymax: (pred.bbox[1] + pred.bbox[3]) / canvas.height
                }));
        } catch (error) {
            console.error('Detection error:', error);
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
            
            const colors = ['#00FF00', '#FF0000', '#0000FF', '#FFFF00', '#FF00FF'];
            const color = colors[index % colors.length];
            
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(x, y, width, height);
            
            const label = `${detection.label} (${(detection.score * 100).toFixed(1)}%)`;
            this.ctx.font = 'bold 16px Arial';
            const textMetrics = this.ctx.measureText(label);
            
            this.ctx.fillStyle = color;
            this.ctx.fillRect(x, y - 30, textMetrics.width + 10, 30);
            
            this.ctx.fillStyle = '#000';
            this.ctx.fillText(label, x + 5, y - 10);
        });
        
        const detectionEl = document.getElementById('detections-count');
        if (detectionEl) {
            detectionEl.textContent = detections.length;
        }
    }
    
    updateMetrics(detectionCount, inferenceTime) {
        this.metrics.frameCount++;
        const elapsed = (Date.now() - this.metrics.startTime) / 1000;
        const fps = this.metrics.frameCount / elapsed;
        
        document.getElementById('fps').textContent = fps.toFixed(1);
        document.getElementById('frame-count').textContent = this.metrics.frameCount;
        
        const latencyEl = document.getElementById('latency');
        if (latencyEl) {
            latencyEl.textContent = inferenceTime.toFixed(0);
        }
    }
}

window.addEventListener('load', () => {
    console.log('🚀 Initializing WebRTC Detection Client...');
    new WebRTCDetectionClient();
});
