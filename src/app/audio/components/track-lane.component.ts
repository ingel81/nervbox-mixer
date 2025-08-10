import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClipComponent, ClipDragEvent, ClipTrimEvent, ClipSelectEvent } from './clip.component';
import { Track } from '../models/models';

export interface TrackDropEvent {
  track: Track;
  event: DragEvent;
}

export interface TrackDragEvent {
  track: Track;
  event: DragEvent;
}

@Component({
    selector: 'track-lane',
    imports: [CommonModule, ClipComponent],
    template: `
    <div class="lane" 
         (mousedown)="onLaneMouseDown($event)" 
         (drop)="onDrop($event)" 
         (dragover)="onDragOver($event)"
         (dragenter)="onDragEnter($event)"
         (dragleave)="onDragLeave($event)"
         [class.drag-over]="isDragOver">
      <div class="clips" [style.width.px]="duration * pxPerSecond">
        <audio-clip *ngFor="let clip of track.clips"
                    [clip]="clip"
                    [pxPerSecond]="pxPerSecond"
                    [playhead]="playhead"
                    (clipSelected)="onClipSelected($event)"
                    (dragStarted)="onClipDragStarted($event)"
                    (trimStarted)="onClipTrimStarted($event)">
        </audio-clip>
      </div>
      <div class="playhead" [style.left.px]="(playhead * pxPerSecond)"></div>
    </div>
  `,
    styleUrls: ['./track-lane.component.css']
})
export class TrackLaneComponent {
  @Input() track!: Track;
  @Input() pxPerSecond!: number;
  @Input() duration!: number;
  @Input() playhead!: number;
  @Input() isDragOver = false;

  @Output() trackDrop = new EventEmitter<TrackDropEvent>();
  @Output() trackDragEnter = new EventEmitter<TrackDragEvent>();
  @Output() trackDragLeave = new EventEmitter<TrackDragEvent>();
  @Output() laneMouseDown = new EventEmitter<MouseEvent>();
  @Output() clipSelected = new EventEmitter<ClipSelectEvent>();
  @Output() clipDragStarted = new EventEmitter<ClipDragEvent>();
  @Output() clipTrimStarted = new EventEmitter<ClipTrimEvent>();

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