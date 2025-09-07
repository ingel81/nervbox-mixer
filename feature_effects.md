# Audio Effects Feature Implementation

## Overview
Implementation of audio effects for clips using Tuna.js library in the Nervbox Mixer application. This feature allows applying effects like echo and pitch shift to individual audio clips during playback.

## Problem Statement
User wanted to add audio effects (echo, pitch shift, etc.) to individual clips in the mixer. The requirement was to have effects applied per-clip during playback using the Tuna.js Web Audio effects library.

## Implementation Journey

### 1. Initial Setup - Tuna.js Integration

#### First Attempt: NPM Package
- Installed Tuna.js via npm: `npm install tunajs`
- Added to `angular.json` scripts array:
```json
"scripts": [
  "node_modules/tunajs/tuna-min.js"
]
```
**Result**: Failed - Tuna.js not loading, `typeof Tuna === 'undefined'`

#### Second Attempt: CDN
- Modified `src/index.html` to load from CDN:
```html
<script src="https://cdn.jsdelivr.net/npm/tunajs@1.0.1/tuna-min.js"></script>
```
**Result**: Rejected by user - "nein, kein cdn"

#### Third Attempt: Local Assets (SUCCESSFUL)
- Downloaded `tuna-min.js` directly to `src/assets/js/`
- Added to `index.html`:
```html
<script src="assets/js/tuna-min.js"></script>
```
**Result**: Success - Tuna.js loaded properly

### 2. Circular Dependency Issue

**Error**: `NG0200: Circular dependency in DI detected for AudioEngineService`

**Cause**: 
- `AudioEngineService` was injecting `EffectsService`
- `EffectsService` was injecting `AudioEngineService`

**Solution**:
- Removed `AudioEngineService` injection from `EffectsService`
- Added `setAudioContext()` method to pass context from `AudioEngineService`:

```typescript
// effects.service.ts
setAudioContext(context: AudioContext) {
  this._audioContext = context;
  this.initializeTuna();
}

// audio-engine.service.ts
get audioContext(): AudioContext {
  if (!this.ctx) {
    this.ctx = new AudioContext({ sampleRate: 48000 });
    // ...
    this.effectsService.setAudioContext(this.ctx);
  }
  return this.ctx;
}
```

### 3. Effects Not Being Applied - The Main Issue

#### Symptom
- Effects buttons worked and settings were saved
- During playback, console showed: "⚠️ Clip has no ID, skipping effects"
- Effects were never applied to audio

#### Debugging Process

**Step 1**: Added extensive console logging
```typescript
console.log('🎵 Processing clip:', c.id, 'has ID?', !!c.id);
```

**Step 2**: Traced clip ID through playback chain
- Checked `seekTo()` method
- Checked `interaction-coordinator.service.ts` 
- Checked `getPlayableClips()` method

**Step 3**: Found the root cause
The `getPlayableClips()` method was missing the `id` property when mapping clips:

```typescript
// BROKEN CODE - missing id
private getPlayableClips() {
  return this.tracks()
    .filter(t => !t.muted)
    .flatMap(track =>
      track.clips.map(clip => ({
        // id: clip.id, // THIS WAS MISSING!
        buffer: clip.buffer,
        startTime: clip.startTime,
        // ... other properties
      }))
    );
}
```

#### The Fix
Added the missing `id` property to all three playback paths:

1. **getPlayableClips()** method:
```typescript
.flatMap(track =>
  track.clips.map(clip => ({
    id: clip.id, // ADDED THIS
    buffer: clip.buffer,
    startTime: clip.startTime,
    duration: clip.duration,
    offset: clip.offset,
    gain: track.gain,
    pan: track.pan,
    muted: track.muted,
    trimStart: clip.trimStart,
    trimEnd: clip.trimEnd
  }))
)
```

2. **seekTo()** method:
```typescript
.map(c => ({
  id: c.id, // ADDED THIS
  buffer: c.buffer,
  // ... rest of properties
}))
```

3. **interaction-coordinator.service.ts** (already had it):
```typescript
clips.push({
  id: clip.id, // Already present
  buffer: clip.buffer,
  // ... rest of properties
});
```

## Final Implementation

### Files Created/Modified

#### 1. `effects.service.ts` (NEW)
- Manages effect configurations per clip
- Creates Tuna.js effect nodes
- Chains effects to audio source nodes
- Provides effect presets

#### 2. `audio-engine.service.ts` (MODIFIED)
- Integrated effects during playback
- Checks for clip ID and applies effects:
```typescript
if (c.id) {
  const lastNode = this.effectsService.applyEffectsToSource(src, c.id);
  lastNode.connect(gain).connect(pan).connect(this.masterGain!);
} else {
  src.connect(gain).connect(pan).connect(this.masterGain!);
}
```

#### 3. `clip.component.ts` (MODIFIED)
- Added UI buttons for Echo and Pitch effects
- Toggle methods to enable/disable effects
- Visual feedback for active effects

#### 4. `audio-editor.component.ts` (MODIFIED)
- Fixed clip ID propagation in playback methods
- Ensured all clips have IDs when sent to audio engine

## Effect Presets Implemented

### Echo Effect
```typescript
echo: {
  feedback: 0.5,
  delayTime: 300,
  wetLevel: 0.5,
  dryLevel: 1,
  cutoff: 2000,
  bypass: 0
}
```

### Pitch Shift (Octave Up)
```typescript
octaveUp: {
  pitch: 2.0,
  feedback: 0,
  wetLevel: 1,
  dryLevel: 0,
  bypass: 0
}
```

## Lessons Learned

1. **Always check data flow completely**: The issue wasn't with the effects system but with missing data (clip IDs) in the playback chain.

2. **Circular dependencies in Angular**: Can be resolved by passing dependencies through methods rather than constructor injection.

3. **Loading external libraries in Angular**: Local assets folder is more reliable than npm scripts array for global libraries.

4. **Debug systematically**: Adding console logs at every step helped identify exactly where data was being lost.

## Current Status
- Effects system is functional
- Clips can have echo and pitch shift effects
- Effects are applied during playback
- This is test implementation that will be rolled back and reimplemented properly later

## Future Considerations
- Add more effect types (chorus, phaser, filter, etc.)
- Create proper UI for effect parameters
- Add effect presets management
- Consider effect automation/envelopes
- Optimize effect chain performance