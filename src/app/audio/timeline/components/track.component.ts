import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TrackHeaderComponent, TrackMuteEvent, TrackSoloEvent, TrackDeleteEvent, TrackRenameEvent } from './track-header.component';
import { TrackLaneComponent, TrackDropEvent, TrackDragEvent } from './track-lane.component';
import { ClipDragEvent, ClipTrimEvent, ClipSelectEvent } from './clip.component';
import { Track } from '../../shared/models/models';

// Re-export interfaces from child components for backward compatibility
export { TrackMuteEvent, TrackSoloEvent, TrackDeleteEvent, TrackRenameEvent } from './track-header.component';
export { TrackDropEvent, TrackDragEvent } from './track-lane.component';

@Component({
    selector: 'audio-track',
    imports: [CommonModule, TrackHeaderComponent, TrackLaneComponent],
    template: `
    <!-- Track header component -->
    <track-header [track]="track"
                  (muteToggled)="onMuteToggled($event)"
                  (soloToggled)="onSoloToggled($event)"
                  (trackDeleted)="onTrackDeleted($event)"
                  (trackRenamed)="onTrackRenamed($event)">
    </track-header>

    <!-- Track lane component -->
    <track-lane [track]="track"
                [tracks]="tracks"
                [trackIndex]="trackIndex"
                [pxPerSecond]="pxPerSecond"
                [duration]="duration"
                [playhead]="playhead"
                [isDragOver]="isDragOver"
                (trackDrop)="onTrackDrop($event)"
                (trackDragEnter)="onTrackDragEnter($event)"
                (trackDragLeave)="onTrackDragLeave($event)"
                (laneMouseDown)="onLaneMouseDown($event)"
                (clipSelected)="onClipSelected($event)"
                (clipDragStarted)="onClipDragStarted($event)"
                (clipTrimStarted)="onClipTrimStarted($event)">
    </track-lane>
  `,
    styleUrls: ['./track.component.css']
})
export class TrackComponent {
  @Input({ required: true }) track!: Track;
  @Input({ required: true }) tracks!: Track[];
  @Input({ required: true }) trackIndex!: number;
  @Input({ required: true }) pxPerSecond!: number;
  @Input({ required: true }) duration!: number;
  @Input({ required: true }) playhead!: number;
  @Input() isDragOver = false;

  @Output() muteToggled = new EventEmitter<TrackMuteEvent>();
  @Output() soloToggled = new EventEmitter<TrackSoloEvent>();
  @Output() trackDeleted = new EventEmitter<TrackDeleteEvent>();
  @Output() trackRenamed = new EventEmitter<TrackRenameEvent>();
  @Output() trackDrop = new EventEmitter<TrackDropEvent>();
  @Output() trackDragEnter = new EventEmitter<TrackDragEvent>();
  @Output() trackDragLeave = new EventEmitter<TrackDragEvent>();
  @Output() laneMouseDown = new EventEmitter<MouseEvent>();
  @Output() clipSelected = new EventEmitter<ClipSelectEvent>();
  @Output() clipDragStarted = new EventEmitter<ClipDragEvent>();
  @Output() clipTrimStarted = new EventEmitter<ClipTrimEvent>();

  // Forward events from child components
  onMuteToggled(event: TrackMuteEvent) {
    this.muteToggled.emit(event);
  }

  onSoloToggled(event: TrackSoloEvent) {
    this.soloToggled.emit(event);
  }

  onTrackDeleted(event: TrackDeleteEvent) {
    this.trackDeleted.emit(event);
  }

  onTrackRenamed(event: TrackRenameEvent) {
    this.trackRenamed.emit(event);
  }

  onTrackDrop(event: TrackDropEvent) {
    this.trackDrop.emit(event);
  }

  onTrackDragEnter(event: TrackDragEvent) {
    this.trackDragEnter.emit(event);
  }

  onTrackDragLeave(event: TrackDragEvent) {
    this.trackDragLeave.emit(event);
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