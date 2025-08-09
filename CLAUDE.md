# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the **NervBox Mixer** application.

## Commands

### Development
- `npm start` - Start development server with auto-open browser
- `npm run build` - Create production build
- `npm run watch` - Build in watch mode for development
- `npm test` - Run unit tests (basic setup only, no tests implemented)
- `npm run scan-sounds` - Regenerate sound library catalog from files in src/assets/sounds/

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
- Schedules AudioBufferSourceNodes for playback with precise timing
- Implements offline rendering for both WAV and MP3 export (using @breezystack/lamejs)
- Uses gain nodes for track mixing and panning
- Supports clip trimming with sample-accurate positioning

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
   - Support for clip trimming with `trimStart`, `trimEnd`, and `originalDuration` properties
   - Built-in waveform generation and caching for visual feedback

4. **Component Communication**
   - Parent component (`AudioEditorComponent`) manages all state
   - Child components (`SoundBrowserComponent`) receive signals as inputs  
   - Audio service injected directly where needed
   - Sound library service manages preloaded audio assets

5. **Sound Library System**
   - `SoundLibraryService` provides categorized audio samples
   - Automatic scanning via `scan-sounds.js` script generates TypeScript definitions
   - Lazy loading with caching of frequently used sounds
   - Categories: Drums, Bass, Synth, FX with searchable tags

### File Structure Focus
```
src/app/audio/ - All audio editor functionality
├── audio-editor.component.* - Main UI and state management
├── audio-engine.service.ts - Web Audio API operations and export
├── sound-browser.component.ts - Sound library UI component
├── sound-library.service.ts - Audio asset management
├── sound-library.ts - Generated catalog (via scan-sounds script)
├── arrangement-storage.service.ts - Save/load arrangements
├── models.ts - TypeScript interfaces (Track, Clip, etc.)
├── timeline.util.ts - Pixel/time conversion utilities
└── lamejs.d.ts - MP3 encoder type definitions

src/assets/sounds/ - Audio sample library
├── drums/ - Drum samples (kicks, snares, hi-hats)
├── bass/ - Bass samples 
├── synth/ - Synthesizer sounds
└── fx/ - Sound effects and vocal samples

scripts/
└── scan-sounds.js - Generates sound library catalog
```

### Critical Implementation Details

1. **Playback Scheduling**: Uses `AudioContext.currentTime` with sample-accurate timing, not setTimeout/setInterval
2. **Drag Operations**: Real-time clip movement with overlap detection and track switching
3. **Clip Trimming**: Sample-accurate trimming with waveform regeneration
4. **Export Formats**: Uses OfflineAudioContext for WAV, @breezystack/lamejs for MP3 
5. **File Import**: Drag-and-drop or file input, batch decoding with error handling
6. **Zoom**: Ctrl+wheel modifies `pxPerSecond` signal, triggering UI updates
7. **Default Pattern**: Auto-generates 90s hip-hop beat pattern on startup with categorized samples
8. **Keyboard Shortcuts**: Space (play/pause), Ctrl+C/V (copy/paste), Delete (remove clip)
9. **Arrangement Storage**: Local storage for saving/loading complete arrangements
10. **Sound Library**: Dynamic catalog generation with category filtering and search

### Dependencies & Key Libraries

- **@angular/core**: v18.2.0 - Standalone components with signals
- **@angular/material**: v18.2.0 - UI components (toolbar, buttons, sliders)
- **@breezystack/lamejs**: v1.2.7 - MP3 encoding for audio export
- **Web Audio API**: Native browser API for audio processing
- **HTML5 Canvas**: For waveform visualization generation

### Testing Approach
Currently no tests implemented. When adding tests:
- Use Angular's default testing setup (Jasmine/Karma)
- Test signal updates and computed values
- Mock AudioContext for service tests
- Test timeline utility functions independently
- Test sound library scanning and categorization

## Git Repository Setup

### Repository Details
- **Remote URL**: SSH connection to GitHub repository
- **Branch**: `main`
- **Local Git User**: Use GitHub noreply email format to avoid privacy issues

### Important Git Commands Used
```bash
# Initialize repository and connect to remote
git init
git remote add origin git@github.com:USERNAME/REPOSITORY.git
git branch -M main

# Configure local user (avoids GitHub email privacy issues)
git config --local user.name "USERNAME"
git config --local user.email "USERNAME@users.noreply.github.com"

# Handle large files and cleanup
git rm -r --cached .angular/ dist/ "src/assets/sounds/"
git reset --soft HEAD~1  # Undo last commit but keep changes
git checkout c2bfed5 -- src/ *.json  # Restore files from specific commit

# Recovery from git reset --hard
git reflog  # Shows commit history including reset operations
git checkout <commit-hash> -- <files>  # Restore files from old commits
```

### .gitignore Configuration
The repository excludes:
- Angular build artifacts (`/dist/`, `/.angular/`)
- Sound files (`*.wav`, `*.mp3`) - kept locally but not committed
- Node modules and dependencies
- Environment files

### Sound Files Management
- **Location**: `src/assets/sounds/` (bass/, drums/, synth/, fx/)
- **Status**: Local files maintained, excluded from Git via .gitignore
- **Formats**: Primarily WAV files, some MP3 in fx/ folder (900+ files)
- **Size**: Large collection would exceed GitHub limits
- **Management**: Use `npm run scan-sounds` after adding/removing files
- **Categories**: Automatically detected from folder structure and filenames

### Recovery Notes
- When Git shows "files lost", check `git reflog` for commit history
- Use `git checkout <commit> -- <path>` to restore specific files
- VS Code may show file changes in Timeline/Local History as backup
- Always verify .gitignore before committing large file sets

### Deployment Notes
- Sound files must be deployed separately to production
- Consider using CDN or external storage for audio assets
- Build process: `npm run build` creates `/dist` folder
- Dev server: `npm start` includes auto-browser opening
- Ensure sound library is regenerated after deployment: `npm run scan-sounds`

## Development Workflow

### Adding New Audio Samples
1. Place audio files (.wav, .mp3) in appropriate `src/assets/sounds/` subdirectory
2. Run `npm run scan-sounds` to update the sound library catalog
3. Restart dev server to see changes in the sound browser
4. Categories are auto-detected from folder structure and filenames

### Common Development Tasks
- **Audio Engine**: Modify `audio-engine.service.ts` for playback/export changes
- **UI Components**: Main editor in `audio-editor.component.ts`
- **Data Models**: Update interfaces in `models.ts`
- **Timeline Logic**: Coordinate conversion utilities in `timeline.util.ts`
- **Sound Management**: Library service in `sound-library.service.ts`