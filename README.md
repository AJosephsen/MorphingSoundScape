# MorphingSoundScape 🎵

Generative audio music soundscapes in JavaScript using the Web Audio API. Create evolving, algorithmically-generated ambient music that morphs in real-time based on your parameter adjustments.

## Features

- **Generative Music Engine**: Automatically creates melodies, harmonies, and ambient textures
- **Multiple Musical Scales**: Pentatonic, Major, Minor, Dorian, Phrygian, and Chromatic
- **Real-time Parameter Control**:
  - Complexity (density of notes)
  - Tempo (BPM)
  - Harmonic Density
  - Reverb amount
  - Master Volume
- **Audio Visualization**: Real-time waveform display with particle effects
- **Web Audio API**: Pure JavaScript implementation with no external audio dependencies

## How It Works

The system uses three generative layers:

1. **Melody Layer**: Generates random melodic phrases based on the selected scale and complexity
2. **Harmony Layer**: Creates chord progressions that change at musical intervals
3. **Ambience Layer**: Adds sustained pad sounds for atmospheric texture

All layers respect the selected musical scale, ensuring harmonic coherence while maintaining variation.

## Getting Started

### Quick Start

1. Open the project folder in your terminal
2. Start a local web server:
   ```bash
   npm start
   # or
   python3 -m http.server 8000
   ```
3. Open your browser to `http://localhost:8000`
4. Click "Start Soundscape" to begin

### Browser Requirements

- Modern browser with Web Audio API support (Chrome, Firefox, Safari, Edge)
- Audio output enabled

## Usage

1. **Start/Stop**: Use the control buttons to start or stop the soundscape
2. **Adjust Parameters**: Move sliders in real-time to morph the sound:
   - **Complexity**: More notes and busier patterns
   - **Tempo**: Speed of the musical phrases
   - **Harmonic Density**: Number of simultaneous harmonic layers
   - **Reverb**: Spatial depth and ambience
   - **Volume**: Overall output level
3. **Change Scales**: Select different musical scales for different moods:
   - Pentatonic: Simple, pleasant, Asian-influenced
   - Major: Bright, happy
   - Minor: Dark, melancholic
   - Dorian: Jazz-like, sophisticated
   - Phrygian: Exotic, Spanish-influenced
   - Chromatic: Experimental, atonal

## Technical Architecture

### Files

- **index.html**: Main UI structure
- **styles.css**: Visual styling with glassmorphism effects
- **main.js**: Application initialization and event handling
- **audio-engine.js**: Core audio generation using Web Audio API
- **scales.js**: Musical scale definitions and frequency calculations
- **visualizer.js**: Real-time audio visualization using Canvas API

### Key Classes

- `AudioEngine`: Manages Web Audio API context, synthesis, and effects
- `ScaleGenerator`: Handles musical scales and frequency calculations
- `AudioVisualizer`: Creates real-time visual representation of the audio

## Customization

### Adding New Scales

Edit `scales.js` and add your scale to the `SCALES` object:

```javascript
const SCALES = {
    myScale: [0, 2, 5, 7, 10], // Your scale intervals
    // ... existing scales
};
```

### Adjusting Sound Character

In `audio-engine.js`, modify the oscillator types and envelope parameters:

```javascript
const types = ['sine', 'triangle', 'sawtooth']; // Waveforms
const attackTime = 0.1;  // Note fade-in
const releaseTime = 0.5; // Note fade-out
```

## Future Enhancements

- Save/load presets
- MIDI output support
- Recording and export functionality
- Additional effect types (delay, chorus, etc.)
- Rhythm pattern sequencing
- Multi-track layering

## License

MIT License - Feel free to use and modify for your projects!
