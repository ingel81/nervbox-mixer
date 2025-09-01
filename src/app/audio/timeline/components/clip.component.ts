import { Component, Input, Output, EventEmitter, HostListener, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Clip, Track } from '../../shared/models/models';
import { EditorStateService } from '../../editor/services/editor-state.service';
import { WaveformService } from '../../audio-engine/services/waveform.service';
import { UnifiedDragService } from '../services/unified-drag.service';
import { DragResult } from '../services/virtual-drag.service';
import { pxToSeconds } from '../../shared/utils/timeline.util';

export interface ClipDragEvent {
  clip: Clip;
  startX: number;
  origStartTime: number;
  // For unified virtual drag completion
  finalTime?: number;
  targetTrack?: Track;
}

export interface ClipTrimEvent {
  clip: Clip;
  side: 'start' | 'end';
  startX: number;
  originalTrimStart: number;
  originalTrimEnd: number;
  originalDuration: number;
  originalStartTime: number;
}

export interface ClipSelectEvent {
  clip: Clip;
}

export interface ClipDeleteEvent {
  clip: Clip;
}

export interface ClipDuplicateEvent {
  clip: Clip;
}

@Component({
    selector: 'audio-clip',
    imports: [CommonModule, MatIconModule],
    template: `
    <div class="clip"
         [attr.data-clip-id]="clip.id"
         [attr.data-track-index]="trackIndex"
         [class.selected]="isSelected()"
         [class.dragging]="isDragging()"
         [class.trimming]="isTrimming()"
         [style.left.px]="clip.startTime * pxPerSecond"
         [style.width.px]="clip.duration * pxPerSecond"
         [style.background]="clip.color"
         (mousedown)="onClipMouseDown($event)"
         (touchstart)="onClipTouchStart($event)">
      
      <!-- Trim handles -->
      <div class="resize-handle left" 
           (mousedown)="onStartTrimming($event, 'start')"
           (touchstart)="onStartTrimmingTouch($event, 'start')"
           *ngIf="isSelected()">
      </div>
      <div class="resize-handle right" 
           (mousedown)="onStartTrimming($event, 'end')"
           (touchstart)="onStartTrimmingTouch($event, 'end')"
           *ngIf="isSelected()">
      </div>
      
      <div class="clip-content">
        <div class="clip-name">{{ clip.name }}</div>
      </div>
      <div class="clip-duration-bottom">
        <div class="clip-duration">{{ formatDuration(clip.duration) }}</div>
      </div>
      
      
      <img *ngIf="clip.waveform" 
           [src]="clip.waveform" 
           class="clip-waveform-img"
           alt="Waveform">
      
    </div>
  `,
    styleUrls: ['./clip.component.css']
})
export class ClipComponent {
  @Input({ required: true }) clip!: Clip;
  @Input({ required: true }) pxPerSecond!: number;
  @Input({ required: true }) tracks!: Track[];
  @Input() trackIndex = -1;
  
  @Output() clipSelected = new EventEmitter<ClipSelectEvent>();
  @Output() dragStarted = new EventEmitter<ClipDragEvent>();
  @Output() trimStarted = new EventEmitter<ClipTrimEvent>();
  @Output() clipDeleted = new EventEmitter<ClipDeleteEvent>();
  @Output() clipDuplicated = new EventEmitter<ClipDuplicateEvent>();

  private isDragActive = signal(false);
  private isTrimActive = signal(false);
  private waveformUpdateTimeout: number | null = null;
  private unifiedDragService = inject(UnifiedDragService);

  constructor(
    private editorState: EditorStateService,
    private waveformService: WaveformService
  ) {}

  isSelected = computed(() => this.editorState.selectedClipId() === this.clip.id);
  isDragging = computed(() => this.isDragActive());
  isTrimming = computed(() => this.editorState.trimState?.id === this.clip.id || this.isTrimActive());

  onClipMouseDown(event: MouseEvent) {
    event.stopPropagation();
    
    // Select this clip
    this.clipSelected.emit({ clip: this.clip });
    
    // Use unified drag system
    const clipElement = event.currentTarget as HTMLElement;
    this.unifiedDragService.startDrag(clipElement, event, {
      clip: this.clip,
      tracks: this.tracks,
      pxPerSecond: this.pxPerSecond,
      onDragComplete: (result: DragResult) => {
        // Emit virtual drag completion event
        this.dragStarted.emit({
          clip: this.clip,
          startX: event.clientX,
          origStartTime: this.clip.startTime,
          finalTime: result.finalTime,
          targetTrack: result.targetTrack || undefined
        });
        this.isDragActive.set(false);
        this.editorState.endClipDrag(); // Notify global state
      }
    });
    
    this.isDragActive.set(true);
    this.editorState.startClipDrag(); // Notify global state
    (document.body as HTMLElement).style.userSelect = 'none';
  }

  onClipTouchStart(event: TouchEvent) {
    event.stopPropagation();
    event.preventDefault();
    
    // Select this clip
    this.clipSelected.emit({ clip: this.clip });
    
    // Use unified drag system
    const clipElement = event.currentTarget as HTMLElement;
    const touch = event.touches[0];
    this.unifiedDragService.startDrag(clipElement, event, {
      clip: this.clip,
      tracks: this.tracks,
      pxPerSecond: this.pxPerSecond,
      onDragComplete: (result: DragResult) => {
        // Emit virtual drag completion event
        this.dragStarted.emit({
          clip: this.clip,
          startX: touch.clientX,
          origStartTime: this.clip.startTime,
          finalTime: result.finalTime,
          targetTrack: result.targetTrack || undefined
        });
        this.isDragActive.set(false);
        this.editorState.endClipDrag(); // Notify global state
      }
    });
    
    this.isDragActive.set(true);
    this.editorState.startClipDrag(); // Notify global state
    (document.body as HTMLElement).style.userSelect = 'none';
  }

  onStartTrimming(event: MouseEvent, side: 'start' | 'end') {
    event.stopPropagation();
    event.preventDefault();
    
    this.trimStarted.emit({
      clip: this.clip,
      side,
      startX: event.clientX,
      originalTrimStart: this.clip.trimStart || 0,
      originalTrimEnd: this.clip.trimEnd || 0,
      originalDuration: this.clip.originalDuration,
      originalStartTime: this.clip.startTime
    });
    
    this.isTrimActive.set(true);
    document.body.style.userSelect = 'none';
    
    // Only add mousemove listener during active trimming
    document.addEventListener('mousemove', this.handleTrimMouseMove);
    document.addEventListener('mouseup', this.handleTrimMouseUp);
  }

  onStartTrimmingTouch(event: TouchEvent, side: 'start' | 'end') {
    event.stopPropagation();
    event.preventDefault();
    
    const touch = event.touches[0];
    this.trimStarted.emit({
      clip: this.clip,
      side,
      startX: touch.clientX,
      originalTrimStart: this.clip.trimStart || 0,
      originalTrimEnd: this.clip.trimEnd || 0,
      originalDuration: this.clip.originalDuration,
      originalStartTime: this.clip.startTime
    });
    
    this.isTrimActive.set(true);
    document.body.style.userSelect = 'none';
    
    // Add touch event listeners for trimming
    document.addEventListener('touchmove', this.handleTrimTouchMove, { passive: false });
    document.addEventListener('touchend', this.handleTrimTouchEnd);
  }

  private handleTrimTouchMove = (event: TouchEvent) => {
    event.preventDefault();
    const touch = event.touches[0];
    // Convert to mouse event for existing trim logic
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    this.handleTrimMouseMove(mouseEvent);
  }

  private handleTrimTouchEnd = () => {
    this.handleTrimMouseUp();
    document.removeEventListener('touchmove', this.handleTrimTouchMove);
    document.removeEventListener('touchend', this.handleTrimTouchEnd);
  }

  // REMOVED: Global mousemove listener - huge performance killer!
  // Only listen to mousemove during active trimming

  private handleTrimMouseMove = (event: MouseEvent) => {
    const trimState = this.editorState.trimState;
    if (trimState && trimState.id === this.clip.id) {
      this.handleTrimming(event, trimState);
    }
  }
  
  private handleTrimMouseUp = () => {
    this.isTrimActive.set(false);
    document.body.style.userSelect = '';
    
    // Remove trim-specific listeners
    document.removeEventListener('mousemove', this.handleTrimMouseMove);
    document.removeEventListener('mouseup', this.handleTrimMouseUp);
  }

  @HostListener('window:mouseup')
  onMouseUp() {
    this.isDragActive.set(false);
    this.editorState.endClipDrag(); // Notify global state
    this.isTrimActive.set(false);
    (document.body as HTMLElement).style.userSelect = '';
  }

  private handleTrimming(event: MouseEvent, trimState: { id: string; side: 'start' | 'end'; startX: number; originalTrimStart: number; originalTrimEnd: number; originalDuration: number; originalStartTime: number; clipRef: Clip }) {
    const dx = event.clientX - trimState.startX;
    const deltaSeconds = pxToSeconds(dx, this.pxPerSecond);
    
    // Calculate with sample precision for accuracy
    const sampleRate = this.clip.buffer.sampleRate;
    const samplesPerSecond = sampleRate;
    
    if (trimState.side === 'start') {
      // Trim from start - keep right edge fixed in timeline, adjust left edge only
      const maxTrimStart = this.clip.originalDuration - (this.clip.trimEnd || 0) - 0.001; // Min 1ms
      let newTrimStart = Math.max(0, Math.min(maxTrimStart, 
        trimState.originalTrimStart + deltaSeconds));
      
      // Snap to sample boundaries for precision
      const trimSamples = Math.floor(newTrimStart * samplesPerSecond);
      newTrimStart = trimSamples / samplesPerSecond;
      
      // FIXED: Keep right edge position constant
      // Calculate original right edge position
      const originalRightEdge = trimState.originalStartTime + (this.clip.originalDuration - (trimState.originalTrimStart + (trimState.originalTrimEnd || 0)));
      
      // Set new trim and calculate new start time to maintain right edge position
      this.clip.trimStart = newTrimStart;
      this.clip.duration = this.clip.originalDuration - this.clip.trimStart - (this.clip.trimEnd || 0);
      this.clip.startTime = originalRightEdge - this.clip.duration; // Right edge stays fixed
      
    } else {
      // Trim from end - only adjust duration
      const maxTrimEnd = this.clip.originalDuration - (this.clip.trimStart || 0) - 0.001; // Min 1ms
      let newTrimEnd = Math.max(0, Math.min(maxTrimEnd,
        trimState.originalTrimEnd - deltaSeconds));
      
      // Snap to sample boundaries for precision
      const trimSamples = Math.floor(newTrimEnd * samplesPerSecond);
      newTrimEnd = trimSamples / samplesPerSecond;
      
      this.clip.trimEnd = newTrimEnd;
      this.clip.duration = this.clip.originalDuration - (this.clip.trimStart || 0) - this.clip.trimEnd;
    }
    
    // Ensure minimum duration (1ms minimum for very short clips)
    if (this.clip.duration < 0.001) {
      this.clip.duration = 0.001;
    }
    
    // Regenerate waveform for trimmed section (throttled)
    if (!this.waveformUpdateTimeout) {
      this.waveformUpdateTimeout = setTimeout(() => {
        this.updateTrimmedWaveform();
        this.waveformUpdateTimeout = null;
      }, 50); // Throttle waveform updates
    }
  }

  private updateTrimmedWaveform(): void {
    const buffer = this.clip.buffer;
    const trimStart = this.clip.trimStart || 0;
    const trimEnd = this.clip.trimEnd || 0;
    
    // If no trimming, use original waveform
    if (trimStart === 0 && trimEnd === 0) {
      this.clip.waveform = this.waveformService.generateFromBuffer(buffer);
      return;
    }
    
    // Calculate precise sample positions
    const sampleRate = buffer.sampleRate;
    const totalSamples = buffer.length;
    const startSample = Math.floor(trimStart * sampleRate);
    const endSample = Math.floor((buffer.duration - trimEnd) * sampleRate);
    
    // Ensure we don't go out of bounds
    const clampedStart = Math.max(0, Math.min(startSample, totalSamples - 1));
    const clampedEnd = Math.max(clampedStart + 1, Math.min(endSample, totalSamples));
    
    // Extract trimmed audio data
    const channelData = buffer.getChannelData(0);
    const trimmedData = channelData.slice(clampedStart, clampedEnd);
    
    if (trimmedData.length === 0) {
      // Fallback: create minimal waveform
      this.clip.waveform = this.waveformService.generateFromData(new Float32Array([0, 0]), 0.1, {
        pxPerSecond: this.pxPerSecond
      });
      return;
    }
    
    // Generate waveform for the DISPLAY duration (clip.duration), not the buffer duration
    // This ensures waveform matches visual clip width
    this.clip.waveform = this.waveformService.generateFromData(trimmedData, this.clip.duration, {
      pxPerSecond: this.pxPerSecond
    });
  }


  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }

  isTouchDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

}