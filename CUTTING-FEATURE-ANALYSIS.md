# Cutting Feature Analysis & Lessons Learned

## Overview
We attempted to implement a clip cutting/splitting feature with two methods:
- **S-Key**: Cut at playhead position
- **T-Key + Click**: Cut tool with visual line and click-to-cut

## What We Learned

### 1. Industry Standards for DAW Cutting Tools
- **Ableton Live**: Razor Tool (Cmd/Ctrl+E), non-destructive with original file preservation
- **FL Studio**: Slice Tool (C), cursor becomes scissors
- **Logic Pro X**: Scissor Tool (T), snap-to-grid, auto-crossfades
- **Pro Tools**: Smart Tool, contextual cutting
- **Reaper**: Split at Cursor (S), dynamic split with mouse tracking

**Common Patterns:**
- All modern DAWs preserve original AudioBuffer files
- Cuts are metadata-only changes (trimStart/trimEnd)
- Multiple cutting methods (keyboard shortcut + visual tool)
- Visual feedback (cursor change, cut line preview)

### 2. Technical Architecture Analysis

#### Current Clip Data Structure
```typescript
interface Clip {
  id: string;
  name: string;
  startTime: number;        // Timeline position
  duration: number;         // Current playback length
  offset: number;           // AudioBuffer offset
  buffer: AudioBuffer;      // Original audio data
  trimStart: number;        // Trimmed from start
  trimEnd: number;          // Trimmed from end
  originalDuration: number; // Pre-trim duration
  waveform?: string;        // Canvas data URL
}
```

#### Split Logic (Non-Destructive)
```typescript
// For split at position within clip:
const relativePosition = splitPosition - originalClip.startTime;

// Left part
const leftClip = {
  ...originalClip,
  duration: relativePosition,
  trimEnd: originalDuration - (trimStart + relativePosition)
};

// Right part  
const rightClip = {
  ...originalClip,
  id: crypto.randomUUID(),
  startTime: splitPosition,
  duration: originalDuration - relativePosition,
  trimStart: (trimStart) + relativePosition
};
```

### 3. Implementation Attempts

#### Split Method in EditorStateService
```typescript
splitClip(clipId: string, splitPosition: number): void {
  // Find clip and validate position
  // Create left and right parts with correct trim values
  // Update tracks signal
  // Regenerate waveforms
}

splitAllClipsAtPosition(position: number): void {
  // Find all clips intersecting position
  // Split each clip individually
}
```

#### UI Components Added

**Tool Bar:**
```html
<div class="tool-bar">
  <div class="tool-section">
    <button class="tool-btn cut-tool" [class.active]="cutToolActive()">
      <mat-icon>content_cut</mat-icon>
    </button>
  </div>
</div>
```

**Visual Cut Line:**
```html
<div class="cut-line" 
     *ngIf="cutToolActive && cutLinePosition !== null"
     [style.left.px]="cutLinePosition"></div>
```

#### Keyboard Shortcuts Added
- **S-Key**: `splitAtPlayhead()` - cuts all clips at current playhead
- **T-Key**: Toggle cut tool mode
- **T + Click**: Cut at clicked position

### 4. Problems Encountered

#### Position Calculation Issues
- **T-Click Position**: Scroll offset calculation was inconsistent
- **Timeline Coordinate System**: Different coordinate references between components
- **Mouse Event Handling**: Event bubbling and coordinate translation problems

#### Visual Update Problems
- **Angular Change Detection**: Clips not re-rendering after split
- **Signal Updates**: tracks() signal not triggering UI refresh
- **Waveform Regeneration**: Split clips showing incorrect waveforms
- **Duration Display**: Split clips showing original duration instead of new duration

#### Specific Bugs Found
1. **S-Key Overlap**: Left clip visually overlaps right clip after split
2. **T-Click Wrong Position**: Click position calculation ~0.02s off from expected
3. **Display Duration**: Split clips show `0:00.61` instead of `0:00.59` for example
4. **Waveform Mismatch**: Visual waveform doesn't match actual clip boundaries

### 5. Root Cause Analysis

#### The Core Issue
The mathematical split logic was **correct**:
```
Original: duration=1.069s, trimStart=0, trimEnd=0
Split at: 0.61s
Result: 
- Left: duration=0.61s, trimEnd=0.459s ✓
- Right: duration=0.459s, trimStart=0.61s ✓
```

But the **visual representation** was wrong, suggesting:
- Angular change detection not working properly
- Component references not updating
- Waveform generation using wrong parameters
- CSS width calculations using cached values

#### Position Calculation Complexity
```typescript
// Multiple coordinate systems in play:
const timelineRect = this.timelineEl.nativeElement.getBoundingClientRect();
const trackLaneRect = this.laneElement.getBoundingClientRect(); 
const scrollLeft = this.trackLanesEl?.nativeElement.scrollLeft || 0;

// Final calculation:
const x = event.clientX - rect.left + scrollLeft;
const timePosition = x / this.pxPerSecond();
```

### 6. Lessons Learned

#### What Worked
- ✅ Non-destructive approach with shared AudioBuffer
- ✅ Industry-standard UI patterns (tool palette, keyboard shortcuts)
- ✅ Mathematical split calculations
- ✅ Event-driven architecture

#### What Didn't Work
- ❌ Complex coordinate system conversions
- ❌ Manual change detection forcing
- ❌ Multiple scroll offset calculations
- ❌ Inline waveform regeneration during split

#### Angular-Specific Issues
- Signal updates not triggering component refresh
- Object reference equality causing stale renders
- Asynchronous waveform generation timing issues
- ViewChild element reference timing problems

### 7. Recommended Approach for Rollback + Restart

#### Simplified Architecture
1. **Single Coordinate System**: Use timeline-based coordinates only
2. **Explicit Change Detection**: Force component refresh after splits
3. **Deferred Waveform Generation**: Regenerate waveforms in next tick
4. **Event Delegation**: Handle all click events at audio-editor level

#### Implementation Strategy
```typescript
// Simple split at playhead only first
splitAtPlayhead(): void {
  const position = this.playhead();
  const clipsToSplit = this.findClipsAtPosition(position);
  
  // Split clips with simple logic
  for (const clip of clipsToSplit) {
    this.performSplit(clip, position);
  }
  
  // Force complete UI refresh
  this.forceRefresh();
}

// Add visual tool later
```

#### Testing Approach
1. Start with S-key only (simplest case)
2. Verify mathematical accuracy with console logs
3. Ensure visual updates work correctly
4. Add visual cutting tool as separate feature
5. Test with various clip states (trimmed, untrimmed, positioned)

## Conclusion

The cutting feature requires a ground-up rebuild with:
- Simplified coordinate handling
- Robust change detection
- Separated concerns (math vs. UI)
- Progressive enhancement approach

The current codebase has too many interacting systems for a complex feature like this. Better to start clean with lessons learned.