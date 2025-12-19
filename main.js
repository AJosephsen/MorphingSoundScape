// Main application logic
let audioEngine = null;
let visualizer = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
});

function setupEventListeners() {
    // Control buttons
    document.getElementById('startBtn').addEventListener('click', startSoundscape);
    document.getElementById('stopBtn').addEventListener('click', stopSoundscape);

    // Parameter controls
    setupParameter('complexity', (value) => {
        audioEngine?.setParameter('complexity', value);
        document.getElementById('complexityValue').textContent = value;
    });

    setupParameter('tempo', (value) => {
        audioEngine?.setParameter('tempo', value);
        document.getElementById('tempoValue').textContent = value;
    });

    setupParameter('harmony', (value) => {
        audioEngine?.setParameter('harmony', value);
        document.getElementById('harmonyValue').textContent = value;
    });

    setupParameter('reverb', (value) => {
        const normalizedValue = value / 100;
        audioEngine?.setParameter('reverb', normalizedValue);
        document.getElementById('reverbValue').textContent = value;
    });

    setupParameter('volume', (value) => {
        const normalizedValue = value / 100;
        audioEngine?.setParameter('volume', normalizedValue);
        document.getElementById('volumeValue').textContent = value;
    });

    // Scale buttons
    document.querySelectorAll('.scale-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.scale-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const scale = btn.getAttribute('data-scale');
            audioEngine?.setScale(scale);
        });
    });
}

function setupParameter(id, callback) {
    const element = document.getElementById(id);
    element.addEventListener('input', (e) => {
        callback(parseInt(e.target.value));
    });
}

async function startSoundscape() {
    try {
        // Initialize audio engine if not already done
        if (!audioEngine) {
            audioEngine = new AudioEngine();
            await audioEngine.initialize();

            // Initialize visualizer
            const canvas = document.getElementById('visualCanvas');
            visualizer = new AudioVisualizer(canvas, audioEngine);
        }

        // Set initial parameters from UI
        audioEngine.setParameter('complexity', parseInt(document.getElementById('complexity').value));
        audioEngine.setParameter('tempo', parseInt(document.getElementById('tempo').value));
        audioEngine.setParameter('harmony', parseInt(document.getElementById('harmony').value));
        audioEngine.setParameter('reverb', parseInt(document.getElementById('reverb').value) / 100);
        audioEngine.setParameter('volume', parseInt(document.getElementById('volume').value) / 100);

        // Start audio and visualization
        audioEngine.start();
        visualizer.start();

        // Update UI
        document.getElementById('startBtn').disabled = true;
        document.getElementById('stopBtn').disabled = false;

    } catch (error) {
        console.error('Error starting soundscape:', error);
        alert('Failed to start audio. Please make sure your browser supports Web Audio API.');
    }
}

function stopSoundscape() {
    audioEngine?.stop();
    visualizer?.stop();

    // Update UI
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
}

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden && audioEngine?.isPlaying) {
        // Optionally pause when tab is hidden
        // stopSoundscape();
    }
});
