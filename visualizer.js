// Audio Visualizer
class AudioVisualizer {
    constructor(canvas, audioEngine) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.audioEngine = audioEngine;
        this.animationId = null;
        this.isRunning = false;
        
        // Set canvas resolution
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        this.width = rect.width;
        this.height = rect.height;
    }

    start() {
        this.isRunning = true;
        this.draw();
    }

    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        this.clear();
    }

    clear() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    draw() {
        if (!this.isRunning) return;

        this.animationId = requestAnimationFrame(() => this.draw());

        const dataArray = this.audioEngine.getAnalyserData();
        if (!dataArray) return;

        // Clear with fade effect
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw waveform
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = 'rgba(102, 126, 234, 0.8)';
        this.ctx.beginPath();

        const sliceWidth = this.width / dataArray.length;
        let x = 0;

        for (let i = 0; i < dataArray.length; i++) {
            const v = dataArray[i] / 128.0;
            const y = (v * this.height) / 2;

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        this.ctx.lineTo(this.width, this.height / 2);
        this.ctx.stroke();

        // Draw secondary waveform with different color
        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = 'rgba(118, 75, 162, 0.6)';
        this.ctx.beginPath();

        x = 0;
        for (let i = 0; i < dataArray.length; i++) {
            const v = dataArray[i] / 128.0;
            const y = this.height - (v * this.height) / 2;

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        this.ctx.lineTo(this.width, this.height / 2);
        this.ctx.stroke();

        // Draw particles based on audio data
        this.drawParticles(dataArray);
    }

    drawParticles(dataArray) {
        const particleCount = 5;
        const sampleStep = Math.floor(dataArray.length / particleCount);

        for (let i = 0; i < particleCount; i++) {
            const index = i * sampleStep;
            const value = dataArray[index] / 255.0;
            const intensity = Math.abs(value - 0.5) * 2;

            if (intensity > 0.1) {
                const x = (i / particleCount) * this.width;
                const y = this.height / 2;
                const radius = intensity * 20;

                const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
                gradient.addColorStop(0, `rgba(102, 126, 234, ${intensity * 0.5})`);
                gradient.addColorStop(1, 'rgba(102, 126, 234, 0)');

                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.arc(x, y, radius, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioVisualizer;
}
