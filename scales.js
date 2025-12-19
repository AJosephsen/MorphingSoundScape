// Musical scales and note definitions
const SCALES = {
    pentatonic: [0, 2, 4, 7, 9],           // C D E G A
    major: [0, 2, 4, 5, 7, 9, 11],         // C D E F G A B
    minor: [0, 2, 3, 5, 7, 8, 10],         // C D Eb F G Ab Bb
    dorian: [0, 2, 3, 5, 7, 9, 10],        // C D Eb F G A Bb
    phrygian: [0, 1, 3, 5, 7, 8, 10],      // C Db Eb F G Ab Bb
    chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] // All notes
};

class ScaleGenerator {
    constructor(baseFrequency = 261.63) { // C4
        this.baseFrequency = baseFrequency;
        this.currentScale = 'pentatonic';
    }

    setScale(scaleName) {
        if (SCALES[scaleName]) {
            this.currentScale = scaleName;
        }
    }

    getFrequency(semitone) {
        // Equal temperament: f = f0 * 2^(n/12)
        return this.baseFrequency * Math.pow(2, semitone / 12);
    }

    getScaleFrequencies(octaves = 3) {
        const scale = SCALES[this.currentScale];
        const frequencies = [];

        for (let octave = 0; octave < octaves; octave++) {
            for (let note of scale) {
                const semitone = note + (octave * 12);
                frequencies.push(this.getFrequency(semitone));
            }
        }

        return frequencies;
    }

    getRandomFrequency(octaveRange = [0, 3]) {
        const scale = SCALES[this.currentScale];
        const [minOctave, maxOctave] = octaveRange;
        
        const octave = Math.floor(Math.random() * (maxOctave - minOctave + 1)) + minOctave;
        const noteIndex = Math.floor(Math.random() * scale.length);
        const semitone = scale[noteIndex] + (octave * 12);
        
        return this.getFrequency(semitone);
    }

    getChordFrequencies(rootOctave = 1, chordType = 'triad') {
        const scale = SCALES[this.currentScale];
        const frequencies = [];
        
        if (chordType === 'triad' && scale.length >= 3) {
            // Root, third, fifth
            const indices = [0, 2, 4].map(i => i % scale.length);
            for (let index of indices) {
                const semitone = scale[index] + (rootOctave * 12);
                frequencies.push(this.getFrequency(semitone));
            }
        }
        
        return frequencies;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SCALES, ScaleGenerator };
}
