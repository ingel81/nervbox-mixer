export { TrackComponent } from './track.component';
export { TrackHeaderComponent } from './track-header.component';
export { TrackLaneComponent } from './track-lane.component';
export { ClipComponent } from './clip.component';

// Re-export events from components
export type {
  TrackMuteEvent,
  TrackSoloEvent,
  TrackDeleteEvent,
  TrackRenameEvent,
  TrackDropEvent,
  TrackDragEvent
} from './track.component';

export type {
  ClipDragEvent,
  ClipTrimEvent,
  ClipSelectEvent,
  ClipDeleteEvent,
  ClipDuplicateEvent
} from './clip.component';