# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the **NervBox Mixer** application.

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
- **Formats**: Primarily WAV files, some MP3 in fx/ folder
- **Size**: Large collection (~900+ files) would exceed GitHub limits

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