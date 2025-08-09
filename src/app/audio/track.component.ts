import { Component, Input, Output, EventEmitter, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ClipComponent, ClipDragEvent, ClipTrimEvent, ClipSelectEvent } from './clip.component';
import { Track } from './models';

export interface TrackMuteEvent {
  track: Track;
}

export interface TrackSoloEvent {
  track: Track;
}

export interface TrackDeleteEvent {
  track: Track;
}

export interface TrackDropEvent {
  track: Track;
  event: DragEvent;
}

export interface TrackDragEvent {
  track: Track;
  event: DragEvent;
}

@Component({
  selector: 'audio-track',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule, ClipComponent],
  template: `
    <!-- Track head -->
    <div class="track-head">
      <div class="track-controls">
        <div class="title">{{ track.name }}</div>
        <div class="track-buttons">
          <button mat-icon-button 
                  class="track-btn" 
                  [class.active]="track.mute"
                  (click)="onToggleMute()" 
                  matTooltip="Mute">
            <mat-icon>{{ track.mute ? 'volume_off' : 'volume_up' }}</mat-icon>
          </button>
          <button mat-icon-button 
                  class="track-btn" 
                  [class.active]="track.solo"
                  (click)="onToggleSolo()" 
                  matTooltip="Solo">
            <mat-icon>headset</mat-icon>
          </button>
          <button mat-icon-button class="track-btn delete" (click)="onRemoveTrack()" matTooltip="Remove track">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </div>
    </div>

    <!-- Timeline lane -->
    <div class="lane" 
         (mousedown)="onLaneMouseDown($event)" 
         (drop)="onDrop($event)" 
         (dragenter)="onDragEnter($event)"
         (dragleave)="onDragLeave($event)"
         [class.drag-over]="isDragOver">
      <div class="clips" [style.width.px]="duration * pxPerSecond">
        <audio-clip *ngFor="let clip of track.clips"
                    [clip]="clip"
                    [pxPerSecond]="pxPerSecond"
                    (clipSelected)="onClipSelected($event)"
                    (dragStarted)="onClipDragStarted($event)"
                    (trimStarted)="onClipTrimStarted($event)">
        </audio-clip>
      </div>
      <div class="playhead" [style.left.px]="(playhead * pxPerSecond)"></div>
    </div>
  `,
  styleUrls: ['./track.component.css']
})
export class TrackComponent {
  @Input({ required: true }) track!: Track;
  @Input({ required: true }) pxPerSecond!: number;
  @Input({ required: true }) duration!: number;
  @Input({ required: true }) playhead!: number;
  @Input() isDragOver = false;
  
  // Drag performance optimization
  private dragOverThrottleId: number | null = null;
  
  @Output() muteToggled = new EventEmitter<TrackMuteEvent>();
  @Output() soloToggled = new EventEmitter<TrackSoloEvent>();
  @Output() trackDeleted = new EventEmitter<TrackDeleteEvent>();
  @Output() trackDrop = new EventEmitter<TrackDropEvent>();
  // REMOVED: trackDragOver - was causing continuous performance issues
  @Output() trackDragEnter = new EventEmitter<TrackDragEvent>();
  @Output() trackDragLeave = new EventEmitter<TrackDragEvent>();
  @Output() laneMouseDown = new EventEmitter<MouseEvent>();
  
  // Pass through clip events
  @Output() clipSelected = new EventEmitter<ClipSelectEvent>();
  @Output() clipDragStarted = new EventEmitter<ClipDragEvent>();
  @Output() clipTrimStarted = new EventEmitter<ClipTrimEvent>();

  onToggleMute() {
    this.muteToggled.emit({ track: this.track });
  }

  onToggleSolo() {
    this.soloToggled.emit({ track: this.track });
  }

  onRemoveTrack() {
    this.trackDeleted.emit({ track: this.track });
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.trackDrop.emit({ track: this.track, event });
  }

  // Dynamic dragover handler - only active during dragenter/dragleave
  private handleDragOver = (event: DragEvent) => {
    event.preventDefault();
    // Minimal processing - just allow drop
  }

  onDragEnter(event: DragEvent) {
    console.log(`[DRAG PERF] TrackComponent ${this.track.name} onDragEnter - LANE HIGHLIGHT ON`);
    event.preventDefault(); // Allow drop
    
    // Dynamically add dragover listener only when needed
    const lane = event.currentTarget as HTMLElement;
    lane.addEventListener('dragover', this.handleDragOver);
    
    this.trackDragEnter.emit({ track: this.track, event });
  }

  onDragLeave(event: DragEvent) {
    console.log(`[DRAG PERF] TrackComponent ${this.track.name} onDragLeave - LANE HIGHLIGHT OFF`);
    
    // Remove dragover listener when leaving lane
    const lane = event.currentTarget as HTMLElement;
    lane.removeEventListener('dragover', this.handleDragOver);
    
    this.trackDragLeave.emit({ track: this.track, event });
  }

  onLaneMouseDown(event: MouseEvent) {
    this.laneMouseDown.emit(event);
  }

  // Pass through clip events
  onClipSelected(event: ClipSelectEvent) {
    this.clipSelected.emit(event);
  }

  onClipDragStarted(event: ClipDragEvent) {
    this.clipDragStarted.emit(event);
  }

  onClipTrimStarted(event: ClipTrimEvent) {
    this.clipTrimStarted.emit(event);
  }
}