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
        
        // Phrase generation state - AABA form
        this.currentChordProgression = null;
        this.currentSection = 'A'; // A, A, B, A
        this.sectionIndex = 0;
        this.phraseA = null;
        this.phraseB = null;
        
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

    createWindSwirl(duration, volume = 0.08) {
        const now = this.audioContext.currentTime;
        
        // Create white noise buffer
        const bufferSize = this.audioContext.sampleRate * duration;
        const noiseBuffer = this.audioContext.createBuffer(2, bufferSize, this.audioContext.sampleRate);
        
        // Fill with stereo white noise
        for (let channel = 0; channel < 2; channel++) {
            const data = noiseBuffer.getChannelData(channel);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
        }
        
        const noiseSource = this.audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        
        // Bandpass filter for wind character
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = 2; // Moderate resonance
        
        // LFO for sweeping filter
        const lfo = this.audioContext.createOscillator();
        const lfoGain = this.audioContext.createGain();
        lfo.frequency.value = 0.15 + Math.random() * 0.25; // Slow sweep
        lfoGain.gain.value = 1200; // Sweep range
        
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        
        // Set initial filter frequency
        filter.frequency.value = 400 + Math.random() * 600;
        
        // Stereo panner for movement
        const panner = this.audioContext.createStereoPanner();
        const panLfo = this.audioContext.createOscillator();
        const panLfoGain = this.audioContext.createGain();
        panLfo.frequency.value = 0.1 + Math.random() * 0.15; // Slow pan
        panLfoGain.gain.value = 0.8; // Pan amount (-0.8 to +0.8)
        
        panLfo.connect(panLfoGain);
        panLfoGain.connect(panner.pan);
        
        // Gain envelope
        const gainNode = this.audioContext.createGain();
        
        // Connect: noise -> filter -> panner -> gain -> reverb
        noiseSource.connect(filter);
        filter.connect(panner);
        panner.connect(gainNode);
        gainNode.connect(this.reverbNode.input);
        
        // Swelling envelope
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume, now + duration * 0.3); // Swell in
        gainNode.gain.setValueAtTime(volume * 0.9, now + duration * 0.7);
        gainNode.gain.linearRampToValueAtTime(0, now + duration); // Fade out
        
        // Start everything
        lfo.start(now);
        lfo.stop(now + duration);
        panLfo.start(now);
        panLfo.stop(now + duration);
        noiseSource.start(now);
        noiseSource.stop(now + duration);
        
        // Cleanup
        noiseSource.onended = () => {
            gainNode.disconnect();
            filter.disconnect();
            panner.disconnect();
            lfoGain.disconnect();
            panLfoGain.disconnect();
            noiseSource.disconnect();
            this.activeSources = this.activeSources.filter(s => s.oscillator !== noiseSource);
        };
        
        this.activeSources.push({ oscillator: noiseSource, gainNode, filterNode: filter });
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

    createSwirlingBass(frequency, duration, volume = 0.15) {
        const now = this.audioContext.currentTime;
        
        // Create multiple detuned oscillators for thickness
        const oscillators = [];
        const detunes = [0, -7, 7, -12]; // Slight detuning for richness
        
        const masterGain = this.audioContext.createGain();
        
        // Sweeping filter for "swirl" effect
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.value = 4; // Resonant for more character
        
        // LFO for filter modulation (creates swirl)
        const lfo = this.audioContext.createOscillator();
        const lfoGain = this.audioContext.createGain();
        lfo.frequency.value = 0.2 + Math.random() * 0.3; // Slow swirl
        lfoGain.gain.value = 400; // Filter sweep range
        
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        
        // Set filter base frequency
        filter.frequency.value = 180 + Math.random() * 80;
        
        // Create oscillator layers
        detunes.forEach(detune => {
            const osc = this.audioContext.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.value = frequency;
            osc.detune.value = detune;
            
            osc.connect(filter);
            oscillators.push(osc);
        });
        
        filter.connect(masterGain);
        masterGain.connect(this.reverbNode.input);
        
        // Envelope
        masterGain.gain.setValueAtTime(0, now);
        masterGain.gain.linearRampToValueAtTime(volume, now + 2.0); // Slow attack
        masterGain.gain.setValueAtTime(volume * 0.9, now + duration - 3.0);
        masterGain.gain.linearRampToValueAtTime(0, now + duration);
        
        // Start everything
        lfo.start(now);
        lfo.stop(now + duration);
        
        oscillators.forEach(osc => {
            osc.start(now);
            osc.stop(now + duration);
        });
        
        // Cleanup
        oscillators[0].onended = () => {
            masterGain.disconnect();
            filter.disconnect();
            lfoGain.disconnect();
            oscillators.forEach(osc => osc.disconnect());
            this.activeSources = this.activeSources.filter(s => s.oscillator !== oscillators[0]);
        };
        
        this.activeSources.push({ oscillator: oscillators[0], gainNode: masterGain, filterNode: filter });
        
        return { oscillators, gainNode: masterGain, filterNode: filter };
    }

    createOscillator(frequency, type = 'sine', duration = 1, volume = 0.3, envelope = {}) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        // Optional low-pass filter for warmer sounds
        let filterNode = null;
        if (envelope.useFilter) {
            filterNode = this.audioContext.createBiquadFilter();
            filterNode.type = 'lowpass';
            filterNode.frequency.value = envelope.filterFreq || 800;
            filterNode.Q.value = envelope.filterQ || 1;
        }
        
        oscillator.type = type;
        oscillator.frequency.value = frequency;
        
        // Envelope: attack, decay, sustain, release
        const now = this.audioContext.currentTime;
        const attackTime = envelope.attack || 0.1;
        const decayTime = envelope.decay || 0.2;
        const sustainLevel = volume * (envelope.sustain || 0.7);
        const releaseTime = envelope.release || 0.5;
        
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume, now + attackTime);
        gainNode.gain.linearRampToValueAtTime(sustainLevel, now + attackTime + decayTime);
        gainNode.gain.setValueAtTime(sustainLevel, now + duration - releaseTime);
        gainNode.gain.linearRampToValueAtTime(0, now + duration);
        
        oscillator.connect(filterNode || gainNode);
        if (filterNode) {
            filterNode.connect(gainNode);
        }
        gainNode.connect(this.reverbNode.input);
        
        oscillator.start(now);
        oscillator.stop(now + duration);
        
        this.activeSources.push({ oscillator, gainNode, filterNode });
        
        // Clean up
        oscillator.onended = () => {
            gainNode.disconnect();
            oscillator.disconnect();
            if (filterNode) filterNode.disconnect();
            this.activeSources = this.activeSources.filter(s => s.oscillator !== oscillator);
        };
        
        return { oscillator, gainNode, filterNode };
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

    // Get functional chord progression (I-IV-V-I, etc.)
    getChordProgression() {
        const progressions = [
            [0, 3, 4, 0],     // I - IV - V - I (classic resolution)
            [0, 5, 3, 0],     // I - vi - IV - I (pop progression)
            [0, 4, 5, 0],     // I - V - vi - I 
            [0, 3, 1, 4],     // I - IV - ii - V (jazz turnaround)
            [0, 1, 4, 0],     // I - ii - V - I (strong resolution)
        ];
        
        return progressions[Math.floor(Math.random() * progressions.length)];
    }

    // Generate melodic phrase based on chord progression
    generateMelodicPhrase(chordDegrees) {
        const beatsPerChord = 4;
        const beatDuration = 60 / this.params.tempo;
        const notesPerBeat = Math.max(1, Math.floor(this.params.complexity / 3));
        
        const phrase = [];
        
        chordDegrees.forEach((degree, chordIndex) => {
            const chordTones = this.scaleGenerator.getChordTones(degree, [1, 3]);
            const passingTones = this.scaleGenerator.getPassingTones(degree, [1, 3]);
            
            // Create melodic contour for this chord
            for (let beat = 0; beat < beatsPerChord; beat++) {
                const notesInBeat = Math.random() > 0.3 ? notesPerBeat : Math.max(1, notesPerBeat - 1);
                
                for (let i = 0; i < notesInBeat; i++) {
                    const isStrongBeat = (beat % 2 === 0) && (i === 0);
                    const useChordTone = isStrongBeat || Math.random() > 0.35;
                    
                    const availableNotes = useChordTone ? chordTones : 
                        [...chordTones, ...passingTones];
                    
                    // Prefer stepwise motion for smoother melodies
                    let frequency;
                    if (phrase.length > 0 && Math.random() > 0.4) {
                        const lastFreq = phrase[phrase.length - 1].frequency;
                        const nearby = availableNotes.filter(f => 
                            Math.abs(Math.log2(f / lastFreq)) < 0.25
                        );
                        frequency = nearby.length > 0 ? 
                            nearby[Math.floor(Math.random() * nearby.length)] :
                            availableNotes[Math.floor(Math.random() * availableNotes.length)];
                    } else {
                        frequency = availableNotes[Math.floor(Math.random() * availableNotes.length)];
                    }
                    
                    const duration = beatDuration / notesInBeat;
                    const intensity = isStrongBeat ? 1.2 : (0.7 + Math.random() * 0.3);
                    
                    phrase.push({ frequency, duration, intensity });
                }
            }
        });
        
        return phrase;
    }

    // Add variation to existing phrase (for repeated A sections)
    varyPhrase(phrase) {
        return phrase.map((note, i) => {
            // Keep strong beats mostly the same
            if (i % 4 === 0 && Math.random() > 0.3) {
                return note;
            }
            
            // Vary other notes slightly
            if (Math.random() > 0.6) {
                return {
                    ...note,
                    duration: note.duration * (0.85 + Math.random() * 0.3),
                    intensity: note.intensity * (0.9 + Math.random() * 0.2)
                };
            }
            
            return note;
        });
    }

    generateMelody() {
        if (!this.isPlaying) return;
        
        const beatDuration = 60 / this.params.tempo;
        
        // Initialize chord progression if needed
        if (!this.currentChordProgression) {
            this.currentChordProgression = this.getChordProgression();
            this.phraseA = this.generateMelodicPhrase(this.currentChordProgression);
            // B section uses modified progression
            const bProgression = [...this.currentChordProgression];
            bProgression[2] = (bProgression[2] + 1) % 7; // Slight variation
            this.phraseB = this.generateMelodicPhrase(bProgression);
            this.sectionIndex = 0;
        }
        
        // AABA structure
        const sections = ['A', 'A', 'B', 'A'];
        this.currentSection = sections[this.sectionIndex % 4];
        
        let currentPhrase;
        if (this.currentSection === 'A') {
            // Vary the A phrase slightly on repetitions
            currentPhrase = this.sectionIndex === 0 ? this.phraseA : this.varyPhrase(this.phraseA);
        } else {
            currentPhrase = this.phraseB;
        }
        
        // Play the phrase
        let totalDelay = 0;
        currentPhrase.forEach((note) => {
            const delay = totalDelay;
            const volume = 0.12 * note.intensity;
            
            setTimeout(() => {
                if (this.isPlaying) {
                    const type = Math.random() > 0.5 ? 'triangle' : 'sine';
                    this.createOscillator(note.frequency, type, note.duration, volume);
                }
            }, delay * 1000);
            
            totalDelay += note.duration;
        });
        
        this.sectionIndex++;
        
        // After completing AABA, generate new progression
        if (this.sectionIndex % 4 === 0) {
            this.currentChordProgression = null;
        }
        
        const phraseDuration = totalDelay * 1000;
        setTimeout(() => this.generateMelody(), phraseDuration);
    }

    generateHarmony() {
        if (!this.isPlaying) return;
        
        // Follow the same chord progression as melody
        if (!this.currentChordProgression) {
            setTimeout(() => this.generateHarmony(), 1000);
            return;
        }
        
        const beatsPerChord = 4;
        const chordDuration = (60 / this.params.tempo) * beatsPerChord;
        
        // Play all 4 chords in progression
        this.currentChordProgression.forEach((degree, index) => {
            const delay = index * chordDuration;
            const frequencies = this.scaleGenerator.getChordFromDegree(degree, 0);
            
            setTimeout(() => {
                if (this.isPlaying && frequencies.length > 0) {
                    this.playChord(frequencies, chordDuration);
                }
            }, delay * 1000);
        });
        
        // Repeat after full progression (16 beats = 4 chords × 4 beats)
        const fullProgressionDuration = chordDuration * 4 * 1000;
        setTimeout(() => this.generateHarmony(), fullProgressionDuration);
    }

    generateAmbience() {
        if (!this.isPlaying) return;
        
        const duration = 3 + Math.random() * 2;
        const frequency = this.scaleGenerator.getRandomFrequency([0, 2]);
        
        this.createOscillator(frequency, 'sine', duration, 0.05);
        
        setTimeout(() => this.generateAmbience(), (duration * 0.7) * 1000);
    }

    createSuperSubBass(frequency, duration, volume = 0.2) {
        const now = this.audioContext.currentTime;
        
        // Ultra-low sine waves for sub bass (felt more than heard)
        const subOsc1 = this.audioContext.createOscillator();
        const subOsc2 = this.audioContext.createOscillator();
        
        subOsc1.type = 'sine';
        subOsc2.type = 'sine';
        subOsc1.frequency.value = frequency / 4; // Two octaves down
        subOsc2.frequency.value = frequency / 4;
        subOsc2.detune.value = 2; // Slight beating for movement
        
        const subGain = this.audioContext.createGain();
        
        // Very gentle LFO for subtle movement
        const lfo = this.audioContext.createOscillator();
        const lfoGain = this.audioContext.createGain();
        lfo.frequency.value = 0.1; // Very slow
        lfoGain.gain.value = 1; // Subtle pitch modulation
        
        lfo.connect(lfoGain);
        lfoGain.connect(subOsc1.detune);
        
        subOsc1.connect(subGain);
        subOsc2.connect(subGain);
        subGain.connect(this.reverbNode.input);
        
        // Deep breathing envelope
        subGain.gain.setValueAtTime(0, now);
        subGain.gain.linearRampToValueAtTime(volume, now + 3.0); // Very slow attack
        subGain.gain.setValueAtTime(volume, now + duration - 4.0);
        subGain.gain.linearRampToValueAtTime(0, now + duration);
        
        lfo.start(now);
        lfo.stop(now + duration);
        subOsc1.start(now);
        subOsc2.start(now);
        subOsc1.stop(now + duration);
        subOsc2.stop(now + duration);
        
        // Cleanup
        subOsc1.onended = () => {
            subGain.disconnect();
            subOsc1.disconnect();
            subOsc2.disconnect();
            lfoGain.disconnect();
            this.activeSources = this.activeSources.filter(s => s.oscillator !== subOsc1);
        };
        
        this.activeSources.push({ oscillator: subOsc1, gainNode: subGain });
    }

    generateBass() {
        if (!this.isPlaying) return;
        
        // Bass is present most of the time (85%)
        const shouldPlayBass = Math.random() < 0.85;
        
        if (shouldPlayBass && this.currentChordProgression) {
            // Duration varies
            const durationMultiplier = Math.random() > 0.6 ? 16 : 32; // 16 or 32 beats
            const duration = (60 / this.params.tempo) * durationMultiplier;
            
            // Get root note from current progression
            const currentChord = this.currentChordProgression[this.sectionIndex % 4];
            const frequencies = this.scaleGenerator.getChordFromDegree(currentChord || 0, -1);
            
            if (frequencies && frequencies.length > 0) {
                const rootFreq = frequencies[0];
                
                // 70% chance: swirling bass, 30% chance: go super deep
                if (Math.random() > 0.3) {
                    this.createSwirlingBass(rootFreq / 2, duration, 0.12 + Math.random() * 0.06);
                } else {
                    // Super sub bass mode - also keep a light swirl for texture
                    this.createSwirlingBass(rootFreq / 2, duration, 0.06); // Quieter swirl
                    this.createSuperSubBass(rootFreq / 2, duration, 0.18 + Math.random() * 0.08);
                }
            }
            
            // Next bass event happens after this one finishes
            setTimeout(() => this.generateBass(), duration * 1000);
        } else {
            // Short pause before next bass
            const waitTime = (60 / this.params.tempo) * (4 + Math.random() * 4); // 4-8 beats
            setTimeout(() => this.generateBass(), waitTime * 1000);
        }
    }

    generateWindSwirls() {
        if (!this.isPlaying) return;
        
        // Wind appears 35% of the time
        const shouldPlayWind = Math.random() < 0.35;
        
        if (shouldPlayWind) {
            // Variable duration - sometimes short breeze, sometimes long
            const durationBeats = Math.random() > 0.5 ? 12 : 24; // 12 or 24 beats
            const duration = (60 / this.params.tempo) * durationBeats;
            const volume = 0.06 + Math.random() * 0.04; // Subtle
            
            this.createWindSwirl(duration, volume);
            
            // Wait until this swirl finishes
            setTimeout(() => this.generateWindSwirls(), duration * 1000);
        } else {
            // Pause before next potential wind
            const waitBeats = 8 + Math.random() * 16; // 8-24 beats
            const waitTime = (60 / this.params.tempo) * waitBeats;
            setTimeout(() => this.generateWindSwirls(), waitTime * 1000);
        }
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
        this.generateBass();
        this.generateWindSwirls();
    }

    stop() {
        this.isPlaying = false;
        
        // Stop all active sources
        this.activeSources.forEach(({ oscillator, gainNode, filterNode }) => {
            try {
                oscillator.stop();
                gainNode.disconnect();
                oscillator.disconnect();
                if (filterNode) filterNode.disconnect();
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
