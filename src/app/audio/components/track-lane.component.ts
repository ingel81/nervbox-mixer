import { Component, Input, Output, EventEmitter, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClipComponent, ClipDragEvent, ClipTrimEvent, ClipSelectEvent, ClipDeleteEvent, ClipDuplicateEvent } from './clip.component';
import { Track } from '../models/models';

export interface TrackDropEvent {
  track: Track;
  event: DragEvent;
}

export interface TrackDragEvent {
  track: Track;
  event: DragEvent;
}

export interface TrackHoverEvent {
  track: Track;
  isHovering: boolean;
}

@Component({
    selector: 'track-lane',
    imports: [CommonModule, ClipComponent],
    template: `
    <div class="lane" 
         #laneElement
         [attr.data-track-index]="trackIndex"
         (mousedown)="onLaneMouseDown($event)" 
         (touchstart)="onLaneTouchStart($event)"
         (mouseenter)="onLaneMouseEnter()"
         (mouseleave)="onLaneMouseLeave()"
         (drop)="onDrop($event)" 
         (dragover)="onDragOver($event)"
         (dragenter)="onDragEnter($event)"
         (dragleave)="onDragLeave($event)"
         [class.drag-over]="isDragOver"
         [class.sound-drag-hover]="isSoundDragTarget()">
      <div class="clips" [style.width.px]="duration * pxPerSecond">
        <audio-clip *ngFor="let clip of track.clips"
                    [clip]="clip"
                    [pxPerSecond]="pxPerSecond"
                    [tracks]="tracks"
                    [trackIndex]="trackIndex"
                    (clipSelected)="onClipSelected($event)"
                    (dragStarted)="onClipDragStarted($event)"
                    (trimStarted)="onClipTrimStarted($event)"
                    (clipDeleted)="onClipDeleted($event)"
                    (clipDuplicated)="onClipDuplicated($event)">
        </audio-clip>
      </div>
      <div class="playhead" [style.left.px]="(playhead * pxPerSecond)"></div>
    </div>
  `,
    styleUrls: ['./track-lane.component.css']
})
export class TrackLaneComponent {
  @Input() track!: Track;
  @Input() tracks!: Track[];
  @Input() trackIndex!: number;
  @Input() pxPerSecond!: number;
  @Input() duration!: number;
  @Input() playhead!: number;
  @Input() isDragOver = false;
  @Input() dragPreview: {
    sound: { id: string; name: string; category: string };
    buffer: AudioBuffer;
    position: { x: number; y: number };
    targetTrack: Track | null;
    isValidDrop: boolean;
  } | null = null;

  @Output() trackDrop = new EventEmitter<TrackDropEvent>();
  @Output() trackDragEnter = new EventEmitter<TrackDragEvent>();
  @Output() trackDragLeave = new EventEmitter<TrackDragEvent>();
  @Output() trackHover = new EventEmitter<TrackHoverEvent>();
  @Output() laneMouseDown = new EventEmitter<MouseEvent>();
  @Output() laneTouchStart = new EventEmitter<TouchEvent>();
  @Output() clipSelected = new EventEmitter<ClipSelectEvent>();
  @Output() clipDragStarted = new EventEmitter<ClipDragEvent>();
  @Output() clipTrimStarted = new EventEmitter<ClipTrimEvent>();
  @Output() clipDeleted = new EventEmitter<ClipDeleteEvent>();
  @Output() clipDuplicated = new EventEmitter<ClipDuplicateEvent>();

  constructor(private elementRef: ElementRef) {}

  onDrop(event: DragEvent) {
    this.trackDrop.emit({ track: this.track, event });
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  onDragEnter(event: DragEvent) {
    this.trackDragEnter.emit({ track: this.track, event });
  }

  onDragLeave(event: DragEvent) {
    this.trackDragLeave.emit({ track: this.track, event });
  }

  onLaneMouseDown(event: MouseEvent) {
    this.laneMouseDown.emit(event);
  }

  onLaneTouchStart(event: TouchEvent) {
    this.laneTouchStart.emit(event);
  }

  onClipSelected(event: ClipSelectEvent) {
    this.clipSelected.emit(event);
  }

  onClipDragStarted(event: ClipDragEvent) {
    this.clipDragStarted.emit(event);
  }

  onClipTrimStarted(event: ClipTrimEvent) {
    this.clipTrimStarted.emit(event);
  }

  onClipDeleted(event: ClipDeleteEvent) {
    this.clipDeleted.emit(event);
  }

  onClipDuplicated(event: ClipDuplicateEvent) {
    this.clipDuplicated.emit(event);
  }
  
  // Sound drag preview methods
  isSoundDragTarget(): boolean {
    return this.dragPreview?.targetTrack?.id === this.track.id;
  }
  
  shouldShowPreview(): boolean {
    return !!this.dragPreview && this.isSoundDragTarget();
  }
  
  getPreviewPosition(): { x: number; y: number } {
    if (!this.dragPreview) return { x: 0, y: 0 };
    
    // Convert global position to relative position within the track lane
    const laneRect = this.elementRef.nativeElement.getBoundingClientRect();
    return {
      x: this.dragPreview.position.x - laneRect.left,
      y: this.dragPreview.position.y - laneRect.top
    };
  }
  
  onLaneMouseEnter() {
    this.trackHover.emit({ track: this.track, isHovering: true });
  }
  
  onLaneMouseLeave() {
    this.trackHover.emit({ track: this.track, isHovering: false });
  }
}