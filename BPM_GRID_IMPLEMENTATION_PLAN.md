# BPM Grid System - Detaillierter Implementierungsplan

## Executive Summary
Implementation eines BPM-basierten Grid-Systems mit visueller Darstellung und Snap-to-Grid Funktionalität für präzise musikalische Clip-Positionierung im Nervbox-Mixer.

## Inhaltsverzeichnis
1. [Aktuelle Situation](#aktuelle-situation)
2. [Phase 1: BPM & Grid-Konfiguration](#phase-1-bpm--grid-konfiguration)
3. [Phase 2: Grid-Visualisierung](#phase-2-grid-visualisierung)
4. [Phase 3: Snap-Integration](#phase-3-snap-integration)
5. [Phase 4: UI Controls](#phase-4-ui-controls)
6. [Kritische Stellen & Risikominimierung](#kritische-stellen--risikominimierung)
7. [Test-Strategie](#test-strategie)
8. [Implementierungsreihenfolge](#implementierungsreihenfolge)

---

## Aktuelle Situation

### Bestehende Grid-Funktionalität
- **EditorStateService** (`src/app/audio/editor/services/editor-state.service.ts`):
  - `snapToGrid` Signal (Zeile 29, default: false)
  - `gridResolution` Signal (Zeile 30, default: 0.25 Sekunden)
  - `snapLoopMarkerToGrid()` Methode (Zeile 310-315) für Loop-Marker
  
- **TimelineService** (`src/app/audio/timeline/services/timeline.service.ts`):
  - `snapToGrid()` Methode (Zeile 112) mit fixem Grid (0.25s)
  - `getGridLines()` Methode (Zeile 117-126, derzeit ungenutzt)
  
- **InteractionCoordinatorService** (`src/app/audio/timeline/services/interaction-coordinator.service.ts`):
  - Nutzt `snapLoopMarkerToGrid()` für Loop-Region-Dragging (Zeilen 139, 155)

### Kritische Dependencies
1. **Drag-System Hierarchie**:
   - `UnifiedDragService` → `VirtualDragService` → `DragHandlers`
   - Clip-Dragging verwendet Transform-basierte Bewegung für Performance
   
2. **Timeline-Koordinaten**:
   - `TimelineService` verwaltet px↔seconds Konversion
   - `pxPerSecond` Signal steuert Zoom-Level
   
3. **Clip-Positionierung**:
   - Direkte Manipulation von `clip.startTime` Eigenschaft
   - Waveform-Regenerierung bei Position-Änderungen
   
4. **Loop-Region**:
   - Bereits Grid-Snap implementiert für Loop-Markers
   - Transform-basierte visuelle Updates während Dragging

---

## Phase 1: BPM & Grid-Konfiguration

### 1.1 EditorStateService erweitern
**Datei**: `src/app/audio/editor/services/editor-state.service.ts`

#### Neue Signals hinzufügen (nach Zeile 30):
```typescript
// BPM & Musical Grid Configuration
bpm = signal(90); // Default Hip-Hop tempo
timeSignature = signal({ numerator: 4, denominator: 4 });
gridSubdivision = signal<'bar' | '1/2' | '1/4' | '1/8' | '1/16'>('1/4');

// Computed values für Grid-Berechnung
beatDuration = computed(() => 60 / this.bpm());
barDuration = computed(() => this.beatDuration() * this.timeSignature().numerator);

gridSpacing = computed(() => {
  const beat = this.beatDuration();
  const bar = this.barDuration();
  const subdivisions = {
    'bar': bar,           // Ganze Takte (z.B. 4 Beats bei 4/4)
    '1/2': beat * 2,     // Halbe Noten  
    '1/4': beat,         // Viertelnoten (Standard)
    '1/8': beat / 2,     // Achtelnoten
    '1/16': beat / 4     // Sechzehntelnoten
  };
  return subdivisions[this.gridSubdivision()];
});

// Helper für Beat-Nummer Berechnung
getBeatNumber(timePosition: number): number {
  return Math.floor(timePosition / this.beatDuration());
}

getBarNumber(timePosition: number): number {
  return Math.floor(timePosition / this.barDuration());
}
```

#### Methoden aktualisieren (ersetze Zeile 310-315):
```typescript
snapPositionToGrid(position: number): number {
  if (!this.snapToGrid()) return position;
  const spacing = this.gridSpacing(); // Nutzt jetzt BPM-basierte Berechnung
  return Math.round(position / spacing) * spacing;
}

// Alte snapLoopMarkerToGrid für Kompatibilität behalten
snapLoopMarkerToGrid(time: number): number {
  return this.snapPositionToGrid(time);
}

// Neue Methode für Snap-Threshold (magnetisches Snapping)
snapWithThreshold(position: number, threshold = 0.1): number {
  if (!this.snapToGrid()) return position;
  
  const spacing = this.gridSpacing();
  const snappedPosition = Math.round(position / spacing) * spacing;
  const distance = Math.abs(position - snappedPosition);
  
  // Nur snappen wenn innerhalb des Thresholds
  return distance < threshold ? snappedPosition : position;
}
```

### 1.2 TimelineService aktualisieren
**Datei**: `src/app/audio/timeline/services/timeline.service.ts`

#### Import EditorStateService bereits vorhanden (Zeile 2)

#### snapToGrid Methode updaten (ersetze Zeile 112-114):
```typescript
snapToGrid(timePosition: number, useThreshold = false): number {
  if (useThreshold) {
    return this.editorState.snapWithThreshold(timePosition);
  }
  return this.editorState.snapPositionToGrid(timePosition);
}
```

#### getGridLines erweitern (ersetze Zeile 117-126):
```typescript
getGridLines(): Array<{time: number; type: 'bar' | 'beat' | 'subdivision'}> {
  const duration = this.duration();
  const beatDur = this.editorState.beatDuration();
  const barDur = this.editorState.barDuration();
  const spacing = this.editorState.gridSpacing();
  const lines: Array<{time: number; type: 'bar' | 'beat' | 'subdivision'}> = [];
  
  // Start bei 0 und gehe in Grid-Spacing-Schritten
  for (let time = 0; time <= duration; time += spacing) {
    let type: 'bar' | 'beat' | 'subdivision' = 'subdivision';
    
    // Prüfe ob es eine Takt-Linie ist (z.B. alle 4 Beats bei 4/4)
    if (Math.abs(time % barDur) < 0.001) {
      type = 'bar';
    } 
    // Prüfe ob es eine Beat-Linie ist
    else if (Math.abs(time % beatDur) < 0.001) {
      type = 'beat';
    }
    
    lines.push({ time, type });
  }
  
  return lines;
}

// Neue Helper-Methode für Grid-Highlighting beim Dragging
getNearestGridLine(position: number): number | null {
  if (!this.editorState.snapToGrid()) return null;
  
  const spacing = this.editorState.gridSpacing();
  return Math.round(position / spacing) * spacing;
}
```

---

## Phase 2: Grid-Visualisierung

### 2.1 Grid-Lines in Timeline anzeigen
**Datei**: `src/app/audio/editor/components/audio-editor.component.html`

#### Grid-Container in Ruler hinzufügen (nach Zeile 52, vor Loop-Region):
```html
<!-- Grid Lines -->
<div class="grid-lines" 
     [style.width.px]="duration() * pxPerSecond()"
     *ngIf="editorState.snapToGrid()">
  @for (line of gridLines(); track line.time) {
    <div class="grid-line"
         [attr.data-type]="line.type"
         [class.bar-line]="line.type === 'bar'"
         [class.beat-line]="line.type === 'beat'" 
         [class.subdivision-line]="line.type === 'subdivision'"
         [style.left.px]="line.time * pxPerSecond()">
    </div>
  }
</div>
```

#### Grid-Lines auch in Track Lanes (nach Zeile 80):
```html
<!-- Grid Lines in Lanes -->
<div class="track-grid-lines" 
     [style.width.px]="duration() * pxPerSecond()"
     *ngIf="editorState.snapToGrid()">
  @for (line of gridLines(); track line.time) {
    <div class="grid-line"
         [attr.data-type]="line.type"
         [class.bar-line]="line.type === 'bar'"
         [class.beat-line]="line.type === 'beat'" 
         [class.subdivision-line]="line.type === 'subdivision'"
         [style.left.px]="line.time * pxPerSecond()">
    </div>
  }
</div>
```

### 2.2 Component Logic erweitern
**Datei**: `src/app/audio/editor/components/audio-editor.component.ts`

#### Import computed hinzufügen (falls nicht vorhanden):
```typescript
import { computed } from '@angular/core';
```

#### Computed Signal für Grid-Lines (nach constructor, ca. Zeile 200):
```typescript
// Grid Lines für visuelle Darstellung
gridLines = computed(() => {
  if (!this.editorState.snapToGrid()) return [];
  return this.timelineService.getGridLines();
});

// Helper für BPM-Display
formattedBPM = computed(() => {
  return `${this.editorState.bpm()} BPM`;
});

// Helper für Grid-Resolution-Display  
formattedGridResolution = computed(() => {
  const subdivision = this.editorState.gridSubdivision();
  const labels = {
    'bar': 'Takte',
    '1/2': '1/2 Noten',
    '1/4': '1/4 Noten',
    '1/8': '1/8 Noten',
    '1/16': '1/16 Noten'
  };
  return labels[subdivision];
});
```

### 2.3 CSS für Grid-Lines
**Datei**: `src/app/audio/editor/components/audio-editor.component.css`

#### Grid Styles hinzufügen:
```css
/* Grid Lines in Ruler */
.ruler .grid-lines {
  position: absolute;
  top: 0;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

/* Grid Lines in Track Lanes */
.track-lanes .track-grid-lines {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  pointer-events: none;
  z-index: 0; /* Unter den Clips */
}

/* Grid Line Base Styles */
.grid-line {
  position: absolute;
  top: 0;
  height: 100%;
  width: 1px;
  transition: opacity 0.2s ease;
}

/* Takt-Linien (Bars) - Deutlichste */
.grid-line.bar-line {
  background: rgba(255, 255, 255, 0.4);
  width: 2px;
  opacity: 0.6;
}

/* Beat-Linien - Mittel */
.grid-line.beat-line {
  background: rgba(255, 255, 255, 0.25);
  opacity: 0.4;
}

/* Subdivision-Linien - Subtil */
.grid-line.subdivision-line {
  background: rgba(255, 255, 255, 0.15);
  opacity: 0.2;
}

/* Zoom-abhängige Anzeige */
.editor[data-zoom="low"] .grid-line.subdivision-line {
  opacity: 0;
}

.editor[data-zoom="medium"] .grid-line.subdivision-line {
  opacity: 0.1;
}

/* Snap-Indikator beim Dragging */
.grid-line.snap-target {
  background: #4CAF50 !important;
  opacity: 0.8 !important;
  width: 2px !important;
  animation: pulse 0.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 0.4; }
}
```

---

## Phase 3: Snap-Integration

### 3.1 VirtualDragService Snap hinzufügen
**Datei**: `src/app/audio/timeline/services/virtual-drag.service.ts`

#### EditorStateService Import hinzufügen (Zeile 1):
```typescript
import { Injectable, signal, computed, inject } from '@angular/core';
import { EditorStateService } from '../../editor/services/editor-state.service';
```

#### Service injecten (Zeile 31):
```typescript
private editorState = inject(EditorStateService);
```

#### updateVirtualPosition erweitern (ca. Zeile 100-120):
```typescript
updateVirtualPosition(coords: DragCoordinates, startX: number): 
  { deltaX: number; deltaY: number; newTime: number; targetTrack: HTMLElement | null } {
  
  const state = this.dragState();
  if (!state.isDragging || !state.clipElement || !state.originalPosition) {
    return { deltaX: 0, deltaY: 0, newTime: state.startTime, targetTrack: null };
  }

  // Berechne Delta
  const deltaX = coords.clientX - startX;
  const deltaY = coords.clientY - state.originalPosition.top;

  // Berechne neue Zeit-Position
  const deltaTime = this.pxToSeconds(deltaX);
  let newTime = state.startTime + deltaTime;

  // Apply grid snap if enabled
  if (this.editorState.snapToGrid()) {
    const originalSnappedTime = this.editorState.snapPositionToGrid(state.startTime);
    const targetTime = state.startTime + deltaTime;
    newTime = this.editorState.snapPositionToGrid(targetTime);
    
    // Visual feedback: Highlight nearest grid line
    this.highlightNearestGridLine(newTime);
  }

  // Clamp to timeline bounds
  newTime = Math.max(0, newTime);

  // Update visual position using transform
  const visualDeltaX = this.secondsToPx(newTime - state.startTime);
  state.clipElement.style.transform = 
    `translateX(${visualDeltaX}px) translateY(-50%)`;

  // Find target track
  const targetTrack = this.getTrackAtPosition(coords.clientY);

  return { deltaX: visualDeltaX, deltaY, newTime, targetTrack };
}

// Neue Helper-Methode für visuelles Feedback
private highlightNearestGridLine(time: number): void {
  // Remove previous highlights
  document.querySelectorAll('.grid-line.snap-target').forEach(el => {
    el.classList.remove('snap-target');
  });
  
  // Add highlight to nearest grid line
  const gridLines = document.querySelectorAll('.grid-line');
  let nearestLine: Element | null = null;
  let minDistance = Infinity;
  
  gridLines.forEach(line => {
    const lineTime = parseFloat(line.getAttribute('data-time') || '0');
    const distance = Math.abs(lineTime - time);
    if (distance < minDistance) {
      minDistance = distance;
      nearestLine = line;
    }
  });
  
  if (nearestLine && minDistance < 0.1) { // Within 100ms
    nearestLine.classList.add('snap-target');
  }
}
```

### 3.2 Trim-Operations Snap
**Datei**: `src/app/audio/editor/components/audio-editor.component.ts`

#### handleTrimming Methode erweitern (ca. Zeile 940-980):
```typescript
private handleTrimming(event: MouseEvent): void {
  if (!this.trimState) return;
  
  const { id, side, startX, originalTrimStart, originalTrimEnd, 
          originalDuration, originalStartTime, clipRef } = this.trimState;
  
  const deltaX = event.clientX - startX;
  const deltaTime = this.timelineService.pxToSeconds(Math.abs(deltaX));
  
  let newTrimStart = originalTrimStart;
  let newTrimEnd = originalTrimEnd;
  let newStartTime = originalStartTime;
  let newDuration = originalDuration;
  
  if (side === 'start') {
    // Trim vom Anfang
    if (deltaX > 0) {
      // Nach rechts ziehen - mehr trimmen
      newTrimStart = Math.min(
        originalTrimStart + deltaTime,
        clipRef.originalDuration - originalTrimEnd - 0.1
      );
    } else {
      // Nach links ziehen - weniger trimmen
      newTrimStart = Math.max(0, originalTrimStart - deltaTime);
    }
    
    // Berechne neue StartTime
    const trimDelta = newTrimStart - originalTrimStart;
    newStartTime = originalStartTime + trimDelta;
    
    // Snap to grid if enabled
    if (this.editorState.snapToGrid()) {
      const snappedTime = this.editorState.snapPositionToGrid(newStartTime);
      const snapAdjustment = snappedTime - newStartTime;
      newStartTime = snappedTime;
      newTrimStart = Math.max(0, newTrimStart - snapAdjustment);
    }
    
    // Update duration
    newDuration = clipRef.originalDuration - newTrimStart - originalTrimEnd;
    
  } else {
    // Trim vom Ende
    if (deltaX < 0) {
      // Nach links ziehen - mehr trimmen
      newTrimEnd = Math.min(
        originalTrimEnd + deltaTime,
        clipRef.originalDuration - originalTrimStart - 0.1
      );
    } else {
      // Nach rechts ziehen - weniger trimmen
      newTrimEnd = Math.max(0, originalTrimEnd - deltaTime);
    }
    
    // Snap end position to grid if enabled
    if (this.editorState.snapToGrid()) {
      const endTime = originalStartTime + clipRef.originalDuration - newTrimEnd;
      const snappedEndTime = this.editorState.snapPositionToGrid(endTime);
      const snapAdjustment = snappedEndTime - endTime;
      newTrimEnd = Math.max(0, newTrimEnd - snapAdjustment);
    }
    
    // Update duration
    newDuration = clipRef.originalDuration - originalTrimStart - newTrimEnd;
  }
  
  // Update clip
  this.editorState.updateClip(id, {
    trimStart: newTrimStart,
    trimEnd: newTrimEnd,
    startTime: newStartTime,
    duration: newDuration
  });
}
```

### 3.3 Sound-Drop Snap
**Datei**: `src/app/audio/editor/components/audio-editor.component.ts`

#### handleSoundDrop erweitern (ca. Zeile 1074-1094):
```typescript
private async handleSoundDrop(event: DragEvent): Promise<void> {
  // ... existing code für sound data parsing ...
  
  // Calculate drop position
  const rect = clipsEl.getBoundingClientRect();
  const clipWidthInPx = buffer.duration * this.pxPerSecond();
  const x = event.clientX - rect.left - clipWidthInPx / 2;
  let dropTime = Math.max(0, this.timelineService.pxToSeconds(x));
  
  // Snap to grid if enabled
  if (this.editorState.snapToGrid()) {
    dropTime = this.editorState.snapPositionToGrid(dropTime);
    
    // Visual feedback
    this.showSnapIndicator(dropTime);
  }
  
  // Create the audio buffer with metadata
  const audioBuffer = Object.assign(buffer, {
    name: soundData.name,
    category: soundData.category,
    id: soundData.id,
  });
  
  // Add to specific track at drop position
  this.addSoundToTrack(audioBuffer, track, dropTime);
}

// Neue Helper-Methode für visuelles Feedback
private showSnapIndicator(time: number): void {
  // Kurzes visuelles Feedback für Snap
  const indicator = document.createElement('div');
  indicator.className = 'snap-indicator';
  indicator.style.left = `${this.timelineService.secondsToPx(time)}px`;
  
  const container = this.trackLanesEl?.nativeElement;
  if (container) {
    container.appendChild(indicator);
    setTimeout(() => indicator.remove(), 500);
  }
}
```

### 3.4 Loop-Region Snap (bereits implementiert)
**Datei**: `src/app/audio/timeline/services/interaction-coordinator.service.ts`

Die Loop-Region nutzt bereits `snapLoopMarkerToGrid()` (Zeilen 139, 155). 
Diese Methode wird automatisch die neue BPM-basierte Grid-Berechnung verwenden.

---

## Phase 4: UI Controls

### 4.1 Bottom Panel Grid Controls
**Datei**: `src/app/audio/editor/services/bottom-panel.service.ts`

#### Grid Tab zur Tab-Liste hinzufügen (ca. Zeile 20):
```typescript
tabs: PanelTab[] = [
  { 
    id: 'sounds', 
    label: 'Sounds', 
    icon: 'library_music',
    description: 'Browse and add sounds to your arrangement' 
  },
  { 
    id: 'grid', 
    label: 'Grid', 
    icon: 'grid_on',
    description: 'Grid & BPM Settings' 
  },
  { 
    id: 'effects', 
    label: 'Effects', 
    icon: 'tune',
    description: 'Audio effects and processing' 
  },
  // ... andere tabs
];
```

### 4.2 Grid Controls Component
**Neue Datei**: `src/app/audio/editor/components/grid-controls.component.ts`

```typescript
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EditorStateService } from '../services/editor-state.service';

@Component({
  selector: 'grid-controls',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  template: `
    <div class="grid-controls">
      <!-- BPM Control -->
      <div class="control-group">
        <mat-form-field>
          <mat-label>BPM</mat-label>
          <input matInput 
                 type="number" 
                 [ngModel]="editorState.bpm()"
                 (ngModelChange)="setBPM($event)"
                 min="60" 
                 max="200" 
                 step="1">
          <mat-hint>Beats per minute</mat-hint>
        </mat-form-field>
        
        <!-- BPM Presets -->
        <div class="bpm-presets">
          <button mat-button 
                  (click)="setBPM(90)" 
                  [class.active]="editorState.bpm() === 90"
                  matTooltip="Hip-Hop">
            90
          </button>
          <button mat-button 
                  (click)="setBPM(120)" 
                  [class.active]="editorState.bpm() === 120"
                  matTooltip="House">
            120
          </button>
          <button mat-button 
                  (click)="setBPM(140)" 
                  [class.active]="editorState.bpm() === 140"
                  matTooltip="Dubstep">
            140
          </button>
          <button mat-button 
                  (click)="setBPM(174)" 
                  [class.active]="editorState.bpm() === 174"
                  matTooltip="Drum & Bass">
            174
          </button>
        </div>
      </div>
      
      <!-- Time Signature -->
      <div class="control-group">
        <mat-form-field>
          <mat-label>Taktart</mat-label>
          <mat-select [ngModel]="getTimeSignatureString()" 
                      (ngModelChange)="setTimeSignature($event)">
            <mat-option value="4/4">4/4</mat-option>
            <mat-option value="3/4">3/4</mat-option>
            <mat-option value="6/8">6/8</mat-option>
            <mat-option value="7/8">7/8</mat-option>
          </mat-select>
        </mat-form-field>
      </div>
      
      <!-- Grid Resolution -->
      <div class="control-group">
        <mat-form-field>
          <mat-label>Grid Auflösung</mat-label>
          <mat-select [ngModel]="editorState.gridSubdivision()"
                      (ngModelChange)="editorState.gridSubdivision.set($event)">
            <mat-option value="bar">Takte</mat-option>
            <mat-option value="1/2">1/2 Noten</mat-option>
            <mat-option value="1/4">1/4 Noten</mat-option>
            <mat-option value="1/8">1/8 Noten</mat-option>
            <mat-option value="1/16">1/16 Noten</mat-option>
          </mat-select>
          <mat-hint>{{ getGridSpacingInMs() }}ms Abstand</mat-hint>
        </mat-form-field>
      </div>
      
      <!-- Snap Toggle -->
      <div class="control-group">
        <mat-slide-toggle [ngModel]="editorState.snapToGrid()"
                          (ngModelChange)="editorState.snapToGrid.set($event)">
          <span class="toggle-label">
            Snap to Grid
            <mat-icon class="info-icon" 
                      matTooltip="Clips rasten automatisch am Grid ein">
              info_outline
            </mat-icon>
          </span>
        </mat-slide-toggle>
      </div>
      
      <!-- Grid Info Display -->
      <div class="grid-info">
        <div class="info-item">
          <span class="label">Beat Duration:</span>
          <span class="value">{{ getBeatDurationMs() }}ms</span>
        </div>
        <div class="info-item">
          <span class="label">Bar Duration:</span>
          <span class="value">{{ getBarDurationMs() }}ms</span>
        </div>
        <div class="info-item">
          <span class="label">Grid Spacing:</span>
          <span class="value">{{ getGridSpacingInMs() }}ms</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .grid-controls {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-width: 600px;
    }
    
    .control-group {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    
    .bpm-presets {
      display: flex;
      gap: 8px;
    }
    
    .bpm-presets button {
      min-width: 50px;
    }
    
    .bpm-presets button.active {
      background-color: var(--accent-color);
      color: white;
    }
    
    .toggle-label {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .info-icon {
      font-size: 18px;
      opacity: 0.7;
    }
    
    .grid-info {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
    }
    
    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .info-item .label {
      font-size: 12px;
      opacity: 0.7;
    }
    
    .info-item .value {
      font-size: 14px;
      font-weight: 500;
    }
    
    @media (max-width: 768px) {
      .grid-controls {
        padding: 12px;
      }
      
      .control-group {
        flex-direction: column;
        align-items: stretch;
      }
      
      .bpm-presets {
        justify-content: space-between;
      }
      
      .grid-info {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class GridControlsComponent {
  editorState = inject(EditorStateService);
  
  setBPM(value: number): void {
    if (value >= 60 && value <= 200) {
      this.editorState.bpm.set(value);
    }
  }
  
  getTimeSignatureString(): string {
    const sig = this.editorState.timeSignature();
    return `${sig.numerator}/${sig.denominator}`;
  }
  
  setTimeSignature(value: string): void {
    const [numerator, denominator] = value.split('/').map(Number);
    this.editorState.timeSignature.set({ numerator, denominator });
  }
  
  getBeatDurationMs(): string {
    return (this.editorState.beatDuration() * 1000).toFixed(1);
  }
  
  getBarDurationMs(): string {
    return (this.editorState.barDuration() * 1000).toFixed(1);
  }
  
  getGridSpacingInMs(): string {
    return (this.editorState.gridSpacing() * 1000).toFixed(1);
  }
}
```

### 4.3 Bottom Panel Template Update
**Datei**: `src/app/audio/editor/components/bottom-panel.component.html`

#### Grid Tab Content hinzufügen (nach Zeile 61):
```html
<!-- Grid Tab -->
<div *ngIf="panelService.activeTab() === 'grid'" class="grid-content">
  <grid-controls></grid-controls>
</div>
```

#### Import GridControlsComponent (in bottom-panel.component.ts):
```typescript
import { GridControlsComponent } from './grid-controls.component';

@Component({
  // ...
  imports: [
    // ... existing imports
    GridControlsComponent
  ],
  // ...
})
```

---

## Kritische Stellen & Risikominimierung

### 1. Bestehende Funktionalität erhalten
- ✅ **Rückwärtskompatibilität**: Alle Changes sind additiv
- ✅ **Default-Verhalten**: snapToGrid bleibt standardmäßig `false`
- ✅ **Alte APIs**: Bestehende Methoden bleiben funktional
- ✅ **Keine Breaking Changes**: Keine Änderungen an bestehenden Interfaces

### 2. Performance-Risiken

#### Grid-Lines Rendering
- **Problem**: Viele DOM-Elemente bei feinem Grid
- **Lösung**: 
  - Computed Signal verhindert unnötige Re-Renders
  - Zoom-abhängige Anzeige (CSS-basiert)
  - Maximal ~200 Lines bei 3min Song mit 1/16 Grid

#### Snap-Berechnung
- **Problem**: Häufige Berechnungen während Dragging
- **Lösung**: 
  - Einfache Math.round Operation (O(1))
  - Caching in computed signals
  - Threshold-basiertes Snapping reduziert Berechnungen

### 3. Drag-System Kompatibilität

#### Transform-basierte Updates
- VirtualDragService nutzt bereits CSS Transforms
- Snap erfolgt nur bei finaler Position-Berechnung
- Visuelle Smoothness bleibt erhalten

#### Event-Handling
- Keine Änderungen am Event-Flow nötig
- Snap-Logic ist transparent für Handler
- Touch/Mouse/Pointer Events unverändert

### 4. Mobile Kompatibilität

#### Touch-Interaktion
- Grid funktioniert mit TouchDragHandler
- Snap-Threshold hilft bei unpräzisen Touch-Inputs
- Grid-Controls responsive designed

#### Performance auf Mobile
- CSS-basierte Grid-Lines (GPU-beschleunigt)
- Reduzierte Grid-Dichte bei niedrigem Zoom
- Debouncing für BPM-Änderungen

### 5. Edge Cases

#### BPM-Änderung während Playback
- **Problem**: Grid ändert sich während Audio läuft
- **Lösung**: Grid-Update nur visuell, Audio-Timing unverändert

#### Sehr hohe/niedrige BPM
- **Problem**: Zu viele/wenige Grid-Lines
- **Lösung**: 
  - Min/Max BPM limits (60-200)
  - Adaptive Grid-Subdivision

#### Import von Clips mit anderem BPM
- **Problem**: Clips passen nicht zum Grid
- **Lösung**: Optional BPM-Detection (Phase 5)

---

## Test-Strategie

### 1. Unit Tests (Falls vorhanden)
```typescript
describe('EditorStateService Grid Functions', () => {
  it('should calculate correct beat duration', () => {
    service.bpm.set(120);
    expect(service.beatDuration()).toBe(0.5); // 60/120
  });
  
  it('should snap position to grid', () => {
    service.bpm.set(120);
    service.gridSubdivision.set('1/4');
    service.snapToGrid.set(true);
    expect(service.snapPositionToGrid(0.4)).toBe(0.5);
  });
});
```

### 2. Manuelle Tests

#### Basis-Funktionalität
- [ ] Grid-Lines werden korrekt angezeigt
- [ ] Grid-Lines verschwinden bei snapToGrid = false
- [ ] BPM-Änderung aktualisiert Grid sofort
- [ ] Grid-Subdivision ändert Line-Dichte

#### Drag & Drop
- [ ] Clips snappen beim Draggen
- [ ] Clips snappen beim Import aus Sound Library  
- [ ] Multi-Track Dragging mit Snap
- [ ] Snap kann mit Shift-Taste umgangen werden

#### Trim-Operations
- [ ] Clip-Start snappt beim Trimmen
- [ ] Clip-Ende snappt beim Trimmen
- [ ] Trim behält Audio-Sync

#### Loop-Region
- [ ] Loop-Start/End snappen
- [ ] Loop-Region-Drag snappt
- [ ] Loop bleibt musikalisch korrekt

#### Performance
- [ ] Smooth Dragging bei 1/16 Grid
- [ ] Keine Lags bei Zoom-Changes
- [ ] Mobile Performance akzeptabel

### 3. Browser-Kompatibilität
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (macOS/iOS)
- [ ] Mobile Browser (Chrome/Safari)

### 4. Edge Cases
- [ ] BPM 60 (langsam)
- [ ] BPM 200 (schnell)
- [ ] 7/8 Takt
- [ ] Sehr lange Clips (>16 Takte)
- [ ] Sehr kurze Clips (<1/16 Note)

---

## Implementierungsreihenfolge

### Tag 1: Basis-Implementation (2-3 Stunden)

#### 1. Phase 1: BPM & Grid-Konfiguration (45min)
- [ ] EditorStateService erweitern (20min)
- [ ] TimelineService anpassen (10min)
- [ ] Build & Test (15min)

#### 2. Phase 3: Snap-Integration (45min)
- [ ] VirtualDragService Snap (20min)
- [ ] Trim-Operations Snap (15min)
- [ ] Sound-Drop Snap (10min)

#### 3. Test & Debugging (30min)
- [ ] Manuelle Tests der Snap-Funktionalität
- [ ] Bug-Fixes
- [ ] Performance-Check

### Tag 2: Visualisierung & UI (2-3 Stunden)

#### 4. Phase 2: Grid-Visualisierung (60min)
- [ ] HTML Templates erweitern (20min)
- [ ] Component Logic (20min)
- [ ] CSS Styling (20min)

#### 5. Phase 4: UI Controls (60min)
- [ ] GridControlsComponent erstellen (30min)
- [ ] Bottom Panel Integration (15min)
- [ ] Styling & Responsive Design (15min)

#### 6. Integration & Polish (30min)
- [ ] Gesamt-Test aller Features
- [ ] UI/UX Verbesserungen
- [ ] Code-Review & Cleanup

### Geschätzte Gesamtzeit
- **Minimum**: 4 Stunden (nur Kern-Features)
- **Realistisch**: 5-6 Stunden (mit Testing)
- **Maximum**: 8 Stunden (mit Polish & Extras)

---

## Zukünftige Erweiterungen (Phase 5+)

### Erweiterte Grid-Features
- [ ] Track-spezifische Grid-Settings
- [ ] Triplet/Dotted Note Subdivisions  
- [ ] Swing/Groove Templates
- [ ] Grid-Shift (Offset für Syncopation)

### BPM-Detection
- [ ] Auto-BPM von importierten Loops
- [ ] BPM-Tap Funktion
- [ ] Tempo-Automation

### Quantisierung
- [ ] Post-Recording Quantize
- [ ] Humanize-Funktion
- [ ] Strength-Parameter (0-100%)

### MIDI-Integration
- [ ] MIDI-Clock Sync
- [ ] MIDI-Pattern Import
- [ ] Beat-Grid Export

### Visuelle Enhancements
- [ ] Takt-Nummern Display
- [ ] Beat-Counter
- [ ] Metronom-Visualisierung
- [ ] Grid-Farben customizable

---

## Fazit

Diese Implementation fügt ein professionelles BPM-basiertes Grid-System hinzu, das:
- ✅ Musikalisch korrekte Clip-Positionierung ermöglicht
- ✅ Visuelles Feedback durch Grid-Lines bietet
- ✅ Flexibel konfigurierbar ist (BPM, Subdivision)
- ✅ Die bestehende Funktionalität nicht beeinträchtigt
- ✅ Performance-optimiert implementiert wird
- ✅ Mobile-friendly gestaltet ist

Der modulare Aufbau erlaubt schrittweise Implementation und Testing, wobei jede Phase für sich funktionsfähig ist.