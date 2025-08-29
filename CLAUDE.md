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
- **Full ESLint + Prettier setup** - Strict TypeScript linting with auto-fix capabilities
- **Strict Angular Templates** - strictTemplates enabled for maximum type safety
- Directory restructuring completed (audio/ folder organized into components/, services/, utils/, models/)

## Commands

- `npm start` - Start development server with auto-open browser (DO NOT USE)
- `npm run build` - Create production build
- `npm run build:prod` - Production build with optimizations
- `npm run watch` - Build in watch mode for development
- `npm run scan-sounds` - Regenerate sound library catalog from src/assets/sounds/
- `npm run lint` - Run ESLint to check for code quality issues
- `npm run lint:fix` - Run ESLint with auto-fix to resolve fixable issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting without making changes
- `npm test` - Run unit tests (no tests implemented)
- `npm run e2e` - Run end-to-end tests with Playwright
- `npm run e2e:ui` - Run e2e tests with UI mode
- `npm run e2e:debug` - Run e2e tests in debug mode

## Architecture

### Standalone Angular 20 Application
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

**Timeline Coordinates** (timeline.service.ts):
- Pixel-to-time conversion via pxPerSecond signal
- Supports zoom via Ctrl+scroll wheel
- Critical for drag/drop and playhead positioning

### File Structure
```
src/app/
├── app.component.ts                 # Root application component
├── shell/                          # Application shell components
│   ├── shell.component.*           # Main shell layout
│   ├── project-management.component.ts  # Project management UI
│   ├── content-creation.component.ts    # Content creation UI
│   └── export-controls.component.ts     # Export functionality UI
└── audio/                          # Audio-specific modules
    ├── arrangements/               # Arrangement management
    │   ├── components/
    │   │   └── dialogs/           # Save/load/confirmation dialogs
    │   │       ├── confirm-dialog.component.ts
    │   │       ├── load-arrangement-dialog.component.ts
    │   │       ├── recording-dialog.component.ts
    │   │       └── save-arrangement-dialog.component.ts
    │   └── services/              # Arrangement business logic
    │       ├── arrangement-storage.service.ts  # Local storage management
    │       ├── arrangement.service.ts          # Arrangement operations
    │       └── default-arrangement.service.ts  # Default pattern generation
    ├── audio-engine/              # Core audio processing
    │   └── services/              # Audio-related services
    │       ├── audio-engine.service.ts     # Web Audio API operations
    │       ├── clip-factory.service.ts     # Clip creation logic
    │       ├── file-import.service.ts      # File import handling
    │       ├── recording.service.ts        # Audio recording
    │       └── waveform.service.ts         # Waveform visualization
    ├── data/                      # Static data and patterns
    │   └── arrangement-patterns.ts         # Predefined arrangement patterns
    ├── editor/                    # Main editor components and state
    │   ├── components/            # Editor UI components
    │   │   ├── audio-editor.component.*   # Main editor component (1246 lines)
    │   │   ├── bottom-panel.component.*   # Bottom control panel
    │   │   └── loop-region.component.ts   # Loop region visualization
    │   └── services/              # Editor state management
    │       ├── bottom-panel.service.ts    # Bottom panel state
    │       └── editor-state.service.ts    # Centralized editor state
    ├── shared/                    # Shared models and utilities
    │   ├── models/                # TypeScript interfaces
    │   │   ├── models.ts          # Core data models
    │   │   └── lamejs.d.ts        # MP3 encoder type definitions
    │   └── utils/                 # Utility functions
    │       ├── sound-library.ts   # Generated sound catalog
    │       └── timeline.util.ts   # Timeline utility functions
    ├── sound-browser/             # Sound library and browser
    │   ├── components/            # Sound browser UI
    │   │   ├── preview-clip.component.ts   # Audio preview component
    │   │   └── sound-browser.component.*  # Main sound browser
    │   └── services/              # Sound library management
    │       └── sound-library.service.ts   # Sound asset management
    └── timeline/                  # Timeline and track components
        ├── components/            # Timeline UI components
        │   ├── clip.component.*           # Individual clip rendering
        │   ├── track.component.*          # Track container component
        │   ├── track-header.component.*   # Track controls and info
        │   └── track-lane.component.*     # Track clip container
        └── services/              # Timeline services
            ├── drag-handlers.ts           # Drag event handling
            ├── interaction-coordinator.service.ts  # Drag coordination
            ├── mobile-interaction.service.ts       # Mobile touch support
            ├── timeline.service.ts                 # Timeline coordinate system
            ├── unified-drag.service.ts             # Unified drag operations
            └── virtual-drag.service.ts             # Virtual drag handling

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
- **@angular/core**: v20.1.6 - Standalone components with signals
- **@angular/material**: v20.1.5 - UI components
- **@breezystack/lamejs**: v1.2.7 - MP3 encoding
- **angular-eslint**: v20.1.1 - Angular-specific ESLint rules
- **eslint**: v9.29.0 - JavaScript/TypeScript linting
- **prettier**: v3.6.2 - Code formatting
- **typescript-eslint**: v8.34.1 - TypeScript ESLint integration  
- **typescript**: v5.8.3 - Latest TypeScript with enhanced type checking
- **@playwright/test**: v1.54.2 - End-to-end testing framework
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

## Code Quality & Development Workflow

### TypeScript & Angular Strict Mode
- **TypeScript strict mode** enabled in `tsconfig.json`
- **Angular strictTemplates** enabled in `tsconfig.app.json` for maximum type safety
- **strictInjectionParameters** and **strictInputAccessModifiers** enforced
- All code is fully type-safe with zero `any` types

### ESLint Configuration
- **ESLint 9.x** with TypeScript support via `@typescript-eslint`
- **Angular ESLint** rules for component and template best practices
- **Prettier integration** for consistent code formatting
- **Auto-fix capabilities** for most common issues

### Development Best Practices
- **Always run linting** before commits: `npm run lint`
- **Use auto-fix** to resolve fixable issues: `npm run lint:fix`
- **Format code** consistently: `npm run format`
- **Build verification** required: `npm run build`
- **No `any` types** - All code must be properly typed
- **Template type checking** enforced via strictTemplates

### Quality Gates
```bash
# Before committing changes, run these commands:
npm run lint          # Check for linting errors
npm run lint:fix      # Auto-fix what's possible
npm run format        # Format code consistently
npm run build         # Verify build succeeds
```

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

## Development Workflow
- **Type Safety First**: All code must be properly typed, no `any` types allowed
- **Lint Before Commit**: Always run `npm run lint` before committing
- **Build Verification**: Ensure `npm run build` succeeds before committing
- **Template Safety**: strictTemplates catches template errors at compile time
- **Consistent Formatting**: Use `npm run format` to maintain code style

## Testing Approach
Currently no tests implemented. When adding tests:
- Use Angular's default testing setup (Jasmine/Karma)
- Test signal updates and computed values
- Mock AudioContext for service tests
- Test timeline utility functions independently

## Architecture Issues Identified

### Critical Issues
- **AudioEditorComponent God Component**: 1246 lines violating Single Responsibility Principle
- **Memory Leaks**: DOM event listeners without cleanup in ngOnDestroy
- **Direct DOM Manipulation**: Bypassing Angular's change detection system
- **Missing OnPush Strategy**: No change detection optimization despite signal-based architecture

### Service Architecture Concerns
- **Circular Dependencies**: Services injecting each other creating tight coupling
- **Inconsistent Import Patterns**: Mixed relative/absolute import strategies
- **Missing Facade Pattern**: Direct service access from components creates tight coupling

### Performance Issues
- **Unbatched Signal Updates**: Multiple signal updates triggering excessive change detection
- **Bundle Size**: 2-3MB without lazy loading for web audio application
- **Missing Virtual Scrolling**: Performance bottleneck with 900+ audio files

### Agent Usage Guidelines
- **GitHub Issues**: Use github-issue-manager agent for all issue-related operations
- **Build Operations**: Use build-checker agent for all build verification tasks
- **Architecture Analysis**: Use angular-architecture-auditor for comprehensive code reviews