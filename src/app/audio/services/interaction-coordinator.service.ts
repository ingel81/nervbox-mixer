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
    
    // Cancel pending loop updates (no longer used with transform approach)
    if (this.loopUpdateRafId) {
      cancelAnimationFrame(this.loopUpdateRafId);
      this.loopUpdateRafId = null;
    }
    
    // Calculate and update final values, then restore transforms
    if (this.loopDragState || this.loopRegionDragState) {
      this.commitLoopDragState();
    }

    // Clear drag states
    this.loopDragState = null;
    this.loopRegionDragState = null;
    this.currentDragState.set(null);
    this.editorState.isDraggingSound.set(false);
    this.editorState.isDraggingClip.set(false);
    
    // Clear cached DOM elements
    this.clearLoopElementCache();
  }
  
  private commitLoopDragState(): void {
    // Calculate final values from current drag state
    let finalStartTime = this.editorState.loopStart();
    let finalEndTime = this.editorState.loopEnd();
    
    if (this.loopRegionDragState) {
      // For region drag, calculate new position based on accumulated deltaX
      if (this.loopBackgroundEl) {
        const transform = this.loopBackgroundEl.style.transform;
        const deltaX = this.extractTranslateX(transform);
        const deltaTime = this.timeline.pxToSeconds(deltaX);
        
        console.log('Region drag commit:', { deltaX, deltaTime, originalStart: this.loopRegionDragState.originalStart });
        
        const newStart = Math.max(0, this.loopRegionDragState.originalStart + deltaTime);
        const snappedStart = this.editorState.snapLoopMarkerToGrid(newStart);
        const snappedEnd = snappedStart + this.loopRegionDragState.loopDuration;
        
        // Always apply the changes - remove maxEnd check that might be causing resets
        finalStartTime = snappedStart;
        finalEndTime = snappedEnd;
      }
    } else if (this.loopDragState) {
      // For marker drag, calculate new position
      const targetEl = this.loopDragState.marker === 'start' ? this.loopStartEl : this.loopEndEl;
      
      if (targetEl) {
        const transform = targetEl.style.transform;
        const deltaX = this.extractTranslateX(transform);
        const deltaTime = this.timeline.pxToSeconds(deltaX);
        const newValue = Math.max(0, this.loopDragState.originalValue + deltaTime);
        const snappedValue = this.editorState.snapLoopMarkerToGrid(newValue);
        
        console.log('Marker drag commit:', { 
          marker: this.loopDragState.marker, 
          deltaX, 
          deltaTime, 
          originalValue: this.loopDragState.originalValue, 
          newValue,
          snappedValue
        });
        
        if (this.loopDragState.marker === 'start') {
          const maxStart = this.editorState.loopEnd() - 0.1;
          finalStartTime = Math.min(snappedValue, maxStart);
        } else {
          const minEnd = this.editorState.loopStart() + 0.1;
          finalEndTime = Math.max(minEnd, snappedValue);
        }
      }
    }
    
    console.log('Final commit values:', { finalStartTime, finalEndTime });
    
    // Restore all transforms to original state (like VirtualDragService)
    this.restoreLoopTransforms();
    
    // Update signals with final values - only once at the end
    this.editorState.loopStart.set(finalStartTime);
    this.editorState.loopEnd.set(finalEndTime);
  }
  
  private extractTranslateX(transform: string): number {
    if (!transform) return 0;
    const match = transform.match(/translateX\(([^)]+)\)/);
    if (match) {
      return parseFloat(match[1]) || 0;
    }
    return 0;
  }
  
  private restoreLoopTransforms(): void {
    // Restore all transforms like VirtualDragService.restoreVisualState()
    [this.loopBackgroundEl, this.loopStartEl, this.loopEndEl, this.loopDurationEl].forEach(el => {
      if (el) {
        const originalTransform = el.dataset.originalTransform || '';
        el.style.transform = originalTransform;
        el.style.transformOrigin = '';
        el.style.willChange = '';
        el.style.transition = 'none';
        delete el.dataset.originalTransform;
        
        // Re-enable transitions after a short delay
        setTimeout(() => {
          if (el) {
            el.style.transition = '';
          }
        }, 50);
      }
    });
  }
  
  private clearLoopElementCache(): void {
    this.loopBackgroundEl = null;
    this.loopStartEl = null;
    this.loopEndEl = null;
    this.loopDurationEl = null;
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
  startLoopMarkerDrag(marker: 'start' | 'end', clientX: number): void {
    const originalValue = marker === 'start' 
      ? this.editorState.loopStart() 
      : this.editorState.loopEnd();
      
    this.loopDragState = { marker, startX: clientX, originalValue };
    
    // Cache DOM elements and prepare for transform-based dragging
    this.prepareLoopElementsForDrag();
  }

  startLoopRegionDrag(clientX: number): void {
    this.loopRegionDragState = {
      startX: clientX,
      originalStart: this.editorState.loopStart(),
      originalEnd: this.editorState.loopEnd(),
      loopDuration: this.editorState.loopEnd() - this.editorState.loopStart()
    };
    
    // Cache DOM elements and prepare for transform-based dragging
    this.prepareLoopElementsForDrag();
  }
  
  // Cache DOM elements for performance
  private loopBackgroundEl: HTMLElement | null = null;
  private loopStartEl: HTMLElement | null = null;
  private loopEndEl: HTMLElement | null = null;
  private loopDurationEl: HTMLElement | null = null;
  
  private prepareLoopElementsForDrag(): void {
    const loopRegion = document.querySelector('.loop-region') as HTMLElement;
    if (loopRegion) {
      this.loopBackgroundEl = loopRegion.querySelector('.loop-background');
      this.loopStartEl = loopRegion.querySelector('.loop-start');
      this.loopEndEl = loopRegion.querySelector('.loop-end');
      this.loopDurationEl = loopRegion.querySelector('.loop-duration');
      
      // Optimize elements for transform-based dragging (like VirtualDragService)
      [this.loopBackgroundEl, this.loopStartEl, this.loopEndEl, this.loopDurationEl].forEach(el => {
        if (el) {
          el.style.willChange = 'transform';
          el.style.transition = 'none';
          // Store original transform for restoration
          el.dataset.originalTransform = el.style.transform || '';
        }
      });
    }
  }
  

  private handleDragMove(event: MouseEvent | TouchEvent, timelineElement: HTMLElement): void {
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    
    // Handle loop region dragging (move entire loop) - transform-based like VirtualDragService
    if (this.loopRegionDragState) {
      // Use simple clientX difference like VirtualDragService
      const deltaX = clientX - this.loopRegionDragState.startX;
      
      // Apply transform immediately for smooth movement
      this.applyLoopTransform(deltaX, 'region');
      return;
    }
    
    // Handle loop marker dragging - transform-based
    if (this.loopDragState) {
      // Use simple clientX difference like VirtualDragService
      const deltaX = clientX - this.loopDragState.startX;
      
      // Apply transform immediately for smooth movement
      this.applyLoopTransform(deltaX, this.loopDragState.marker);
    }
  }
  
  private applyLoopTransform(deltaX: number, dragType: 'start' | 'end' | 'region'): void {
    // Apply smooth transform-based updates like VirtualDragService
    if (dragType === 'region' && this.loopRegionDragState) {
      // Move entire loop region
      if (this.loopBackgroundEl) {
        this.loopBackgroundEl.style.transform = `translateX(${deltaX}px)`;
      }
      if (this.loopStartEl) {
        this.loopStartEl.style.transform = `translateX(${deltaX}px)`;
      }
      if (this.loopEndEl) {
        this.loopEndEl.style.transform = `translateX(${deltaX}px)`;
      }
      if (this.loopDurationEl) {
        this.loopDurationEl.style.transform = `translateX(${deltaX}px)`;
      }
    } else if (dragType === 'start' && this.loopDragState) {
      // Move start marker and resize background
      if (this.loopStartEl) {
        this.loopStartEl.style.transform = `translateX(${deltaX}px)`;
      }
      if (this.loopBackgroundEl) {
        // Adjust background: move left edge and adjust width
        this.loopBackgroundEl.style.transform = `translateX(${deltaX}px) scaleX(${1 - deltaX / (this.loopBackgroundEl.offsetWidth || 1)})`;
        this.loopBackgroundEl.style.transformOrigin = 'left center';
      }
      if (this.loopDurationEl) {
        this.loopDurationEl.style.transform = `translateX(${deltaX}px) scaleX(${1 - deltaX / (this.loopDurationEl.offsetWidth || 1)})`;
        this.loopDurationEl.style.transformOrigin = 'left center';
      }
    } else if (dragType === 'end' && this.loopDragState) {
      // Move end marker and resize background
      if (this.loopEndEl) {
        this.loopEndEl.style.transform = `translateX(${deltaX}px)`;
      }
      if (this.loopBackgroundEl) {
        // Adjust background: extend width
        this.loopBackgroundEl.style.transform = `scaleX(${1 + deltaX / (this.loopBackgroundEl.offsetWidth || 1)})`;
        this.loopBackgroundEl.style.transformOrigin = 'left center';
      }
      if (this.loopDurationEl) {
        this.loopDurationEl.style.transform = `scaleX(${1 + deltaX / (this.loopDurationEl.offsetWidth || 1)})`;
        this.loopDurationEl.style.transformOrigin = 'left center';
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