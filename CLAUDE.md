# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm start` - Start development server with auto-open browser
- `npm run build` - Create production build
- `npm run watch` - Build in watch mode for development
- `npm test` - Run unit tests (basic setup only, no tests implemented)

### Important: No linting commands configured
The project currently has no ESLint or TSLint setup. When making changes, ensure TypeScript compilation succeeds via `npm run build`.

## Architecture

### Core Design: Standalone Angular 18 with Signals
This is a modern Angular 18 application using:
- **Standalone components** (no NgModules) - Components import dependencies directly
- **Angular Signals** for reactive state management instead of traditional RxJS subjects
- **Computed signals** for derived state
- **No app.module.ts** - Bootstrap via `bootstrapApplication()` in main.ts

### Audio Processing Architecture
The audio functionality is centralized in `AudioEngineService` which:
- Manages a single Web Audio API AudioContext (48kHz)
- Handles audio decoding via `decodeAudioData()`
- Schedules AudioBufferSourceNodes for playback
- Implements offline rendering for WAV export
- Uses gain nodes for track mixing and panning

### Key Architectural Patterns

1. **Signal-Based State Management**
   - All component state uses Angular signals (`signal()`, `computed()`)
   - Avoids traditional EventEmitters where possible
   - Example: `selectedClipId = signal<string | null>(null)`

2. **Timeline Coordinate System**
   - Conversion between pixels and time via `pxPerSecond` signal
   - Utility functions in `timeline.util.ts` handle all conversions
   - Critical for drag operations and playhead positioning

3. **Track/Clip Data Model**
   - Tracks contain clips with position, duration, and audio buffer
   - Each clip has unique ID for selection and manipulation
   - Clips store decoded AudioBuffer, not raw file data

4. **Component Communication**
   - Parent component (`AudioEditorComponent`) manages all state
   - Child components would receive signals as inputs
   - Audio service injected directly where needed

### File Structure Focus
```
src/app/audio/ - All audio editor functionality
├── audio-editor.component.* - Main UI and state management
├── audio-engine.service.ts - Web Audio API operations
├── models.ts - TypeScript interfaces (Track, Clip, etc.)
└── timeline.util.ts - Pixel/time conversion utilities
```

### Critical Implementation Details

1. **Playback Scheduling**: Uses `AudioContext.currentTime` for precise timing, not setTimeout/setInterval
2. **Drag Operations**: Store initial mouse position and clip position to calculate deltas
3. **WAV Export**: Uses OfflineAudioContext to render audio faster than real-time
4. **File Import**: Drag-and-drop or file input, then decode with Web Audio API
5. **Zoom**: Ctrl+wheel modifies `pxPerSecond` signal, triggering UI updates

### Testing Approach
Currently no tests implemented. When adding tests:
- Use Angular's default testing setup (Jasmine/Karma)
- Test signal updates and computed values
- Mock AudioContext for service tests
- Test timeline utility functions independently