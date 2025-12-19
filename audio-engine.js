// Web Audio API Engine for Generative Music
class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.reverbNode = null;
        this.analyser = null;
        this.activeSources = [];
        this.isPlaying = false;
        this.scaleGenerator = new ScaleGenerator();
        
        // Parameters
        this.params = {
            complexity: 5,
            tempo: 120,
            harmony: 4,
            reverb: 0.3,
            volume: 0.7
        };
    }

    async initialize() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create master gain node
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = this.params.volume;
        
        // Create analyser for visualization
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        
        // Create reverb
        await this.createReverb();
        
        // Connect chain: reverb -> masterGain -> analyser -> destination
        this.reverbNode.connect(this.masterGain);
        this.masterGain.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
    }

    async createReverb() {
        const convolver = this.audioContext.createConvolver();
        const reverbGain = this.audioContext.createGain();
        const dryGain = this.audioContext.createGain();
        
        // Create impulse response for reverb
        const rate = this.audioContext.sampleRate;
        const length = rate * 3; // 3 seconds
        const impulse = this.audioContext.createBuffer(2, length, rate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
            }
        }
        
        convolver.buffer = impulse;
        
        // Create reverb mix
        reverbGain.gain.value = this.params.reverb;
        dryGain.gain.value = 1 - this.params.reverb;
        
        // Create a mixer node
        const mixer = this.audioContext.createGain();
        mixer.gain.value = 1;
        
        // Connect: input -> dry -> mixer
        //                -> convolver -> wet -> mixer
        this.reverbNode = {
            input: this.audioContext.createGain(),
            connect: function(destination) {
                mixer.connect(destination);
            }
        };
        
        this.reverbNode.input.connect(dryGain);
        this.reverbNode.input.connect(convolver);
        dryGain.connect(mixer);
        convolver.connect(reverbGain);
        reverbGain.connect(mixer);
        
        this.reverbGain = reverbGain;
        this.dryGain = dryGain;
    }

    createOscillator(frequency, type = 'sine', duration = 1, volume = 0.3) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = type;
        oscillator.frequency.value = frequency;
        
        // Envelope: attack, decay, sustain, release
        const now = this.audioContext.currentTime;
        const attackTime = 0.1;
        const decayTime = 0.2;
        const sustainLevel = volume * 0.7;
        const releaseTime = 0.5;
        
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume, now + attackTime);
        gainNode.gain.linearRampToValueAtTime(sustainLevel, now + attackTime + decayTime);
        gainNode.gain.setValueAtTime(sustainLevel, now + duration - releaseTime);
        gainNode.gain.linearRampToValueAtTime(0, now + duration);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.reverbNode.input);
        
        oscillator.start(now);
        oscillator.stop(now + duration);
        
        this.activeSources.push({ oscillator, gainNode });
        
        // Clean up
        oscillator.onended = () => {
            gainNode.disconnect();
            oscillator.disconnect();
            this.activeSources = this.activeSources.filter(s => s.oscillator !== oscillator);
        };
        
        return { oscillator, gainNode };
    }

    playNote(frequency, duration = 1) {
        const types = ['sine', 'triangle', 'sawtooth'];
        const type = types[Math.floor(Math.random() * types.length)];
        const volume = 0.1 + (Math.random() * 0.2);
        
        this.createOscillator(frequency, type, duration, volume);
    }

    playChord(frequencies, duration = 2) {
        const volume = 0.15 / frequencies.length; // Normalize volume
        frequencies.forEach(freq => {
            this.createOscillator(freq, 'sine', duration, volume);
        });
    }

    generateMelody() {
        if (!this.isPlaying) return;
        
        const notesPerBar = Math.floor(this.params.complexity / 2) + 2;
        const beatDuration = 60 / this.params.tempo;
        
        for (let i = 0; i < notesPerBar; i++) {
            const delay = i * beatDuration;
            const duration = beatDuration * (0.5 + Math.random() * 1.5);
            const frequency = this.scaleGenerator.getRandomFrequency([1, 3]);
            
            setTimeout(() => {
                if (this.isPlaying) {
                    this.playNote(frequency, duration);
                }
            }, delay * 1000);
        }
        
        const barDuration = notesPerBar * beatDuration * 1000;
        setTimeout(() => this.generateMelody(), barDuration);
    }

    generateHarmony() {
        if (!this.isPlaying) return;
        
        const chordChangeDuration = (60 / this.params.tempo) * 4 * (5 - Math.floor(this.params.harmony / 2));
        
        const frequencies = this.scaleGenerator.getChordFrequencies(0);
        this.playChord(frequencies, chordChangeDuration);
        
        setTimeout(() => this.generateHarmony(), chordChangeDuration * 1000);
    }

    generateAmbience() {
        if (!this.isPlaying) return;
        
        const duration = 3 + Math.random() * 2;
        const frequency = this.scaleGenerator.getRandomFrequency([0, 2]);
        
        this.createOscillator(frequency, 'sine', duration, 0.05);
        
        setTimeout(() => this.generateAmbience(), (duration * 0.7) * 1000);
    }

    start() {
        if (this.isPlaying) return;
        
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        this.isPlaying = true;
        this.generateMelody();
        this.generateHarmony();
        this.generateAmbience();
    }

    stop() {
        this.isPlaying = false;
        
        // Stop all active sources
        this.activeSources.forEach(({ oscillator, gainNode }) => {
            try {
                oscillator.stop();
                gainNode.disconnect();
                oscillator.disconnect();
            } catch (e) {
                // Already stopped
            }
        });
        
        this.activeSources = [];
    }

    setParameter(param, value) {
        switch(param) {
            case 'volume':
                this.params.volume = value;
                if (this.masterGain) {
                    this.masterGain.gain.linearRampToValueAtTime(
                        value,
                        this.audioContext.currentTime + 0.1
                    );
                }
                break;
            case 'reverb':
                this.params.reverb = value;
                if (this.reverbGain && this.dryGain) {
                    this.reverbGain.gain.linearRampToValueAtTime(
                        value,
                        this.audioContext.currentTime + 0.1
                    );
                    this.dryGain.gain.linearRampToValueAtTime(
                        1 - value,
                        this.audioContext.currentTime + 0.1
                    );
                }
                break;
            default:
                this.params[param] = value;
        }
    }

    setScale(scaleName) {
        this.scaleGenerator.setScale(scaleName);
    }

    getAnalyserData() {
        if (!this.analyser) return null;
        
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteTimeDomainData(dataArray);
        
        return dataArray;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioEngine;
}
