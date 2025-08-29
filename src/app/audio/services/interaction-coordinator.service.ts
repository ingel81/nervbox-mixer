import { Injectable, signal } from '@angular/core';
import { EditorStateService } from './editor-state.service';
import { AudioEngineService } from './audio-engine.service';
import { TimelineService } from './timeline.service';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
}

export interface DragState {
  type: 'loop-marker' | 'loop-region' | 'timeline-scrub' | 'sound-drag' | 'clip-drag';
  startX: number;
  startY?: number;
  data?: unknown;
}

export interface LoopDragState {
  marker: 'start' | 'end';
  startX: number;
  originalValue: number;
}

export interface LoopRegionDragState {
  startX: number;
  originalStart: number;
  originalEnd: number;
  loopDuration: number;
}

@Injectable({
  providedIn: 'root'
})
export class InteractionCoordinatorService {
  // Current drag state
  private currentDragState = signal<DragState | null>(null);
  
  // Touch interaction state
  private lastTouchDistance = 0;
  private rafId: number | null = null;
  
  // Loop region drag states
  private loopDragState: LoopDragState | null = null;
  private loopRegionDragState: LoopRegionDragState | null = null;
  
  // Performance optimization: track pending updates
  private pendingLoopUpdate: { start?: number; end?: number } | null = null;
  private loopUpdateRafId: number | null = null;

  // Keyboard shortcuts registry
  private shortcuts: KeyboardShortcut[] = [];

  constructor(
    private editorState: EditorStateService,
    private audioEngine: AudioEngineService,
    private timeline: TimelineService
  ) {
    this.setupDefaultShortcuts();
  }

  // Keyboard event handling
  handleKeyDown(event: KeyboardEvent): boolean {
    // Ignore if user is typing in input field
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return false;
    }

    // Find matching shortcut
    const shortcut = this.shortcuts.find(s => 
      s.key.toLowerCase() === event.key.toLowerCase() &&
      !!s.ctrlKey === event.ctrlKey &&
      !!s.shiftKey === event.shiftKey &&
      !!s.altKey === event.altKey
    );

    if (shortcut) {
      event.preventDefault();
      shortcut.action();
      return true;
    }

    return false;
  }

  // Mouse event handling
  handleMouseMove(event: MouseEvent | TouchEvent, timelineElement: HTMLElement): void {
    this.handleDragMove(event, timelineElement);
  }

  handleMouseUp(): void {
    // Cancel any pending RAF updates
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    
    // Cancel pending loop updates
    if (this.loopUpdateRafId) {
      cancelAnimationFrame(this.loopUpdateRafId);
      this.loopUpdateRafId = null;
    }
    
    // Apply any pending loop updates immediately
    if (this.pendingLoopUpdate) {
      if (this.pendingLoopUpdate.start !== undefined) {
        this.editorState.loopStart.set(this.pendingLoopUpdate.start);
      }
      if (this.pendingLoopUpdate.end !== undefined) {
        this.editorState.loopEnd.set(this.pendingLoopUpdate.end);
      }
      this.pendingLoopUpdate = null;
    }

    // Clear drag states
    this.loopDragState = null;
    this.loopRegionDragState = null;
    this.currentDragState.set(null);
    this.editorState.isDraggingSound.set(false);
    this.editorState.isDraggingClip.set(false);
    
    // Clear cached DOM elements
    this.cachedTrackLanesEl = null;
  }

  // Touch event handling
  handleTouchStart(event: TouchEvent): void {
    if (event.touches.length === 2) {
      // Initialize pinch-to-zoom
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      this.lastTouchDistance = distance;
    }
  }

  handleTouchMove(event: TouchEvent, timelineElement: HTMLElement): void {
    if (event.touches.length === 2) {
      event.preventDefault();
      
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      if (this.lastTouchDistance > 0) {
        const scale = distance / this.lastTouchDistance;
        const centerX = (touch1.clientX + touch2.clientX) / 2;
        const rect = timelineElement.getBoundingClientRect();
        const mouseX = centerX - rect.left;
        
        // Use timeline service for zoom
        this.timeline.zoomAtPosition(mouseX, 0, scale > 1 ? 1.02 : 0.98);
      }
      
      this.lastTouchDistance = distance;
    } else {
      // Single touch - treat as mouse move
      this.handleMouseMove(event, timelineElement);
    }
  }

  handleTouchEnd(): void {
    this.lastTouchDistance = 0;
    this.handleMouseUp();
  }

  // Drag state management
  startDrag(type: DragState['type'], startX: number, startY?: number, data?: unknown): void {
    this.currentDragState.set({ type, startX, startY, data });
    
    if (type === 'sound-drag') {
      this.editorState.isDraggingSound.set(true);
    } else if (type === 'clip-drag') {
      this.editorState.isDraggingClip.set(true);
    }
  }

  // Loop region drag handling
  startLoopMarkerDrag(marker: 'start' | 'end', startX: number): void {
    const originalValue = marker === 'start' 
      ? this.editorState.loopStart() 
      : this.editorState.loopEnd();
      
    this.loopDragState = { marker, startX, originalValue };
    
    // Clear any cached DOM references when starting a new drag
    this.cachedTrackLanesEl = null;
  }

  startLoopRegionDrag(startX: number): void {
    this.loopRegionDragState = {
      startX,
      originalStart: this.editorState.loopStart(),
      originalEnd: this.editorState.loopEnd(),
      loopDuration: this.editorState.loopEnd() - this.editorState.loopStart()
    };
    
    // Clear any cached DOM references when starting a new drag
    this.cachedTrackLanesEl = null;
  }
  
  // Cache for DOM elements to avoid repeated queries
  private cachedTrackLanesEl: HTMLElement | null = null;

  private handleDragMove(event: MouseEvent | TouchEvent, timelineElement: HTMLElement): void {
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    
    // Cache track lanes element to avoid repeated DOM queries
    if (!this.cachedTrackLanesEl) {
      this.cachedTrackLanesEl = timelineElement.closest('.timeline-wrapper')?.querySelector('.track-lanes') as HTMLElement;
    }
    const scrollLeft = this.cachedTrackLanesEl ? this.cachedTrackLanesEl.scrollLeft : 0;
    
    // Handle loop region dragging (move entire loop)
    if (this.loopRegionDragState) {
      const rect = timelineElement.getBoundingClientRect();
      const currentX = clientX - rect.left + scrollLeft;
      const deltaX = currentX - this.loopRegionDragState.startX;
      const deltaTime = this.timeline.pxToSeconds(deltaX);
      
      const newStart = Math.max(0, this.loopRegionDragState.originalStart + deltaTime);
      
      // Apply grid snapping if enabled
      const snappedStart = this.editorState.snapLoopMarkerToGrid(newStart);
      const snappedEnd = snappedStart + this.loopRegionDragState.loopDuration;
      
      const maxEnd = this.timeline.duration();
      if (snappedEnd <= maxEnd) {
        // Store pending update
        this.pendingLoopUpdate = { start: snappedStart, end: snappedEnd };
        
        // Schedule RAF update if not already scheduled
        if (!this.loopUpdateRafId) {
          this.loopUpdateRafId = requestAnimationFrame(() => {
            if (this.pendingLoopUpdate) {
              this.editorState.loopStart.set(this.pendingLoopUpdate.start!);
              this.editorState.loopEnd.set(this.pendingLoopUpdate.end!);
              this.pendingLoopUpdate = null;
            }
            this.loopUpdateRafId = null;
          });
        }
      }
      return;
    }
    
    // Handle loop marker dragging
    if (this.loopDragState) {
      const rect = timelineElement.getBoundingClientRect();
      const currentX = clientX - rect.left + scrollLeft;
      const deltaX = currentX - this.loopDragState.startX;
      const deltaTime = this.timeline.pxToSeconds(deltaX);
      const newValue = Math.max(0, this.loopDragState.originalValue + deltaTime);
      
      // Apply grid snapping if enabled
      const snappedValue = this.editorState.snapLoopMarkerToGrid(newValue);
      
      if (this.loopDragState.marker === 'start') {
        const maxStart = this.editorState.loopEnd() - 0.1;
        const finalValue = Math.min(snappedValue, maxStart);
        
        // Store pending update
        this.pendingLoopUpdate = { start: finalValue };
        
        // Schedule RAF update
        if (!this.loopUpdateRafId) {
          this.loopUpdateRafId = requestAnimationFrame(() => {
            if (this.pendingLoopUpdate?.start !== undefined) {
              this.editorState.loopStart.set(this.pendingLoopUpdate.start);
            }
            this.pendingLoopUpdate = null;
            this.loopUpdateRafId = null;
          });
        }
      } else {
        const minEnd = this.editorState.loopStart() + 0.1;
        const maxEnd = this.timeline.duration();
        const finalValue = Math.max(minEnd, Math.min(snappedValue, maxEnd));
        
        // Store pending update
        this.pendingLoopUpdate = { end: finalValue };
        
        // Schedule RAF update
        if (!this.loopUpdateRafId) {
          this.loopUpdateRafId = requestAnimationFrame(() => {
            if (this.pendingLoopUpdate?.end !== undefined) {
              this.editorState.loopEnd.set(this.pendingLoopUpdate.end);
            }
            this.pendingLoopUpdate = null;
            this.loopUpdateRafId = null;
          });
        }
      }
    }
  }

  // Timeline scrubbing
  scrubTimeline(clickX: number, scrollX: number): void {
    this.timeline.scrubToPosition(clickX, scrollX);
  }

  // Zoom handling
  handleWheelZoom(event: WheelEvent, mouseX: number, scrollX: number): number | undefined {
    if (event.ctrlKey) {
      event.preventDefault();
      const factor = event.deltaY > 0 ? 0.9 : 1.1;
      return this.timeline.zoomAtPosition(mouseX, scrollX, factor);
    }
    return undefined;
  }

  // Register keyboard shortcuts
  registerShortcut(shortcut: KeyboardShortcut): void {
    this.shortcuts.push(shortcut);
  }

  private setupDefaultShortcuts(): void {
    this.shortcuts = [
      {
        key: ' ',
        action: () => this.togglePlayback(),
        description: 'Play/Pause'
      },
      {
        key: 'Delete',
        action: () => this.deleteSelectedClip(),
        description: 'Delete selected clip'
      },
      {
        key: 'c',
        ctrlKey: true,
        action: () => this.copySelectedClip(),
        description: 'Copy selected clip'
      },
      {
        key: 'v',
        ctrlKey: true,
        action: () => this.pasteClip(),
        description: 'Paste clip'
      },
      {
        key: 'd',
        ctrlKey: true,
        action: () => this.duplicateSelectedClip(),
        description: 'Duplicate selected clip'
      }
    ];
  }

  // Shortcut actions
  private togglePlayback(): void {
    if (this.editorState.isPlaying()) {
      this.audioEngine.stop();
      this.editorState.isPlaying.set(false);
    } else {
      // Convert tracks to clips for audio engine
      const clips = this.editorState.tracks().flatMap(track => 
        track.clips.map(clip => ({
          buffer: clip.buffer,
          startTime: clip.startTime,
          duration: clip.duration,
          offset: clip.offset,
          gain: track.volume,
          pan: track.pan,
          muted: track.mute,
          trimStart: clip.trimStart,
          trimEnd: clip.trimEnd
        }))
      );
      
      this.audioEngine.play(clips, this.editorState.playhead());
      this.editorState.isPlaying.set(true);
    }
  }

  private deleteSelectedClip(): void {
    const selectedId = this.editorState.selectedClipId();
    if (selectedId) {
      this.editorState.removeClip(selectedId);
    }
  }

  private copySelectedClip(): void {
    const selectedId = this.editorState.selectedClipId();
    if (selectedId) {
      const clip = this.findClipById(selectedId);
      if (clip) {
        this.editorState.clipboardClip = { ...clip };
      }
    }
  }

  private pasteClip(): void {
    if (this.editorState.clipboardClip && this.editorState.activeTrackId()) {
      const trackId = this.editorState.activeTrackId()!;
      const playheadTime = this.editorState.playhead();
      
      const newClip = {
        ...this.editorState.clipboardClip,
        id: Date.now().toString(),
        startTime: playheadTime
      };
      
      this.editorState.addClipToTrack(trackId, newClip);
    }
  }

  private duplicateSelectedClip(): void {
    this.copySelectedClip();
    this.pasteClip();
  }

  private findClipById(clipId: string) {
    for (const track of this.editorState.tracks()) {
      const clip = track.clips.find(c => c.id === clipId);
      if (clip) return clip;
    }
    return null;
  }

  // Getters for current state
  get isDragging(): boolean {
    return this.currentDragState() !== null || 
           this.loopDragState !== null || 
           this.loopRegionDragState !== null;
  }

  get currentDrag() {
    return this.currentDragState();
  }
}