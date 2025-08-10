# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚡ Critical Instructions

### German Feedback Requirements
1. **Objektives Feedback**: Gib immer Feedback, das auf überprüfbaren Fakten und Daten basiert. Vermeide subjektive Meinungen, es sei denn, sie werden ausdrücklich angefordert.
2. **Sicherheit bei Zustimmung**: Bestätige nur dann, dass ich richtig liege, wenn du zu 100% sicher bist, dass die Information korrekt ist. Bei Zweifeln äußere diese klar, anstatt zuzustimmen, um Verwirrung zu vermeiden.
3. **Nachfragen bei Unklarheiten**: Wenn eine Aussage mehrdeutig oder unklar ist, frage nach Klarstellung, bevor du Feedback gibst. Das stellt sicher, dass deine Antwort auf korrektem Verständnis basiert.
4. **Beispiele zur Verdeutlichung**: Gib beim Feedback Beispiele an, um deine Punkte zu veranschaulichen. Das hilft beim Verständnis des Kontexts und der Begründung.
5. **Edge Cases**: Bei unvollständigen oder widersprüchlichen Informationen skizziere die möglichen Auswirkungen und schlage alternative Perspektiven oder Lösungen vor.

### Development Constraints
- **niemals starten ...nur bauen** - Never run `npm start`, only build
- **niemals issues schließen oder commiten ohne befehl dazu** - Never close issues or commit without explicit command
- Sound files (900+ .wav/.mp3 files) excluded from Git
- No ESLint/TSLint configuration available
- Directory restructuring completed (audio/ folder organized into components/, services/, utils/, models/)

## Commands

- `npm start` - Start development server with auto-open browser (DO NOT USE)
- `npm run build` - Create production build
- `npm run build:prod` - Production build with optimizations
- `npm run watch` - Build in watch mode for development
- `npm run scan-sounds` - Regenerate sound library catalog from src/assets/sounds/
- `npm test` - Run unit tests (no tests implemented)

## Architecture

### Standalone Angular 18 Application
- **No NgModules** - Components use standalone: true and import dependencies directly
- **Angular Signals** - All state management uses signals instead of RxJS subjects
- **Computed signals** - For derived state calculations
- **Bootstrap** - Uses `bootstrapApplication()` in main.ts, no app.module.ts
- **State Management** - EditorStateService centralizes all editor state as signals

### Audio Processing Pipeline
**AudioEngineService** (audio-engine.service.ts) handles:
- Web Audio API context management (48kHz sample rate)
- Sample-accurate playback scheduling using AudioBufferSourceNodes
- Audio decoding via `decodeAudioData()`
- WAV export via OfflineAudioContext
- MP3 export using @breezystack/lamejs encoder
- Clip trimming with precise sample-based calculations
- Gain nodes for track mixing and panning

### Track/Clip System
**Data Model** (models.ts):
- Tracks contain clips with AudioBuffer, position, duration
- Clips support trimming (trimStart/trimEnd preserve original audio)
- Each clip has unique ID for selection/manipulation
- Waveform generation cached per clip
- Support for `originalDuration` property

**Timeline Coordinates** (timeline.util.ts):
- Pixel-to-time conversion via pxPerSecond signal
- Supports zoom via Ctrl+scroll wheel
- Critical for drag/drop and playhead positioning

### File Structure
```
src/app/audio/
├── components/         # UI components with index.ts for clean imports
│   ├── audio-editor.component.*     # Main UI and state management
│   ├── sound-browser.component.*    # Sound library UI
│   ├── clip.component.*            # Individual clip UI
│   ├── track.component.*           # Track UI
│   ├── track-header.component.*    # Track controls
│   ├── track-lane.component.*      # Track clip container
│   └── dialogs/                    # Material dialogs for save/load
├── services/          # Business logic services with index.ts
│   ├── audio-engine.service.ts     # Web Audio API operations
│   ├── sound-library.service.ts    # Audio asset management
│   ├── editor-state.service.ts     # Centralized state
│   ├── arrangement-storage.service.ts  # Save/load arrangements
│   ├── default-arrangement.service.ts  # Default pattern generation
│   └── waveform.service.ts         # Waveform generation
├── models/            # TypeScript interfaces with index.ts
│   ├── models.ts                   # Core interfaces
│   └── lamejs.d.ts                 # MP3 encoder types
├── utils/             # Helper utilities with index.ts
│   ├── timeline.util.ts            # Pixel/time conversion
│   └── sound-library.ts            # Generated catalog
└── data/              
    └── arrangement-patterns.ts      # Predefined patterns

src/assets/sounds/     # Audio files (excluded from Git)
├── drums/            # Drum samples
├── bass/             # Bass samples
├── synth/            # Synthesizer sounds
└── fx/               # Sound effects

scripts/
└── scan-sounds.js    # Generates sound library catalog
```

### Sound Library System
**SoundLibraryService** (sound-library.service.ts):
- Categories auto-detected from folder structure and filenames
- Preloads essential sounds on startup
- Lazy loading with caching for performance
- Generated catalog via `npm run scan-sounds`
- Categories: Drums, Bass, Synth, FX with searchable tags

### Component Communication Pattern
- **AudioEditorComponent** owns all state
- Child components receive signals as inputs and emit events
- Services injected directly where needed
- No EventEmitters - uses signal updates instead
- Audio service manages Web Audio API directly

### Dependencies
- **@angular/core**: v18.2.0 - Standalone components with signals
- **@angular/material**: v18.2.0 - UI components
- **@breezystack/lamejs**: v1.2.7 - MP3 encoding
- **Web Audio API**: Native browser API
- **HTML5 Canvas**: Waveform visualization

## Git Configuration

### Commit Message Format
Use conventional prefixes with single-line messages:
- `fix:` - Bug fixes
- `feat:` - New features  
- `refactor:` - Code restructuring
- `chore:` - Maintenance tasks
- `docs:` - Documentation
- `style:` - Code formatting
- `test:` - Tests

**Kein Claude Footer** - No automatic Claude signatures in commits

### Important Git Commands
```bash
# Configure local user (GitHub noreply format)
git config --local user.name "USERNAME"
git config --local user.email "USERNAME@users.noreply.github.com"

# Handle large files
git rm -r --cached .angular/ dist/ "src/assets/sounds/"

# Recovery from git reset --hard
git reflog
git checkout <commit-hash> -- <files>
```

### Sound Files Management
- 900+ audio files in src/assets/sounds/ (excluded from Git via .gitignore)
- Primarily WAV files, some MP3 in fx/ folder
- Run `npm run scan-sounds` after adding/removing files
- Categories auto-detected from folder structure
- Must deploy sound files separately in production
- Consider CDN or external storage for audio assets

## Key Implementation Details

### Playback System
- Uses `AudioContext.currentTime` for sample-accurate scheduling
- Never use setTimeout/setInterval for audio timing
- Clip trimming uses exact sample positions for precision
- Minimal delay (0.01s) for highest precision

### Drag & Drop Operations
- Real-time clip movement with overlap detection
- Clips can be dragged between tracks and timeline positions
- Track switching supported
- Track drop zones activate on drag hover

### Export Functionality  
- WAV: OfflineAudioContext renders full arrangement
- MP3: @breezystack/lamejs encodes PCM data
- Both formats support full mix with gain/pan

### Keyboard Shortcuts
- Space: Play/pause
- Delete: Remove selected clip
- Ctrl+C/V: Copy/paste clips
- Ctrl+scroll: Zoom timeline

### Default Pattern
- Auto-generates 90s hip-hop beat pattern on startup
- Uses categorized samples from sound library
- Demonstrates all track/clip functionality

### Arrangement Storage
- Local storage for saving/loading complete arrangements
- Preserves all clip properties including trim settings
- Material dialogs for save/load UI

### GitHub Issues Management
```bash
gh issue list                          # List all open issues
gh issue view <number>                  # View specific issue
gh issue create --title "Bug: ..."     # Create new issue
gh issue comment <number> --body "..." # Add comment

# Link issues to commits/PRs
git commit -m "Fix: ... Fixes #<number>"
gh pr create --title "Fix #<number>: ..."
```

## Performance Notes
- Large audio file collection requires lazy loading
- Waveform generation cached per clip
- Batch audio decoding with error handling
- File import supports drag-and-drop or file input

## Testing Approach
Currently no tests implemented. When adding tests:
- Use Angular's default testing setup (Jasmine/Karma)
- Test signal updates and computed values
- Mock AudioContext for service tests
- Test timeline utility functions independently