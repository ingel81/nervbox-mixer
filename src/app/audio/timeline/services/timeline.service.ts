import { Injectable, computed, effect } from '@angular/core';
import { EditorStateService } from '../../editor/services/editor-state.service';

@Injectable({
  providedIn: 'root'
})
export class TimelineService {
  constructor(private editorState: EditorStateService) {
    // Sync timeline updates with playhead changes
    effect(() => {
      const playhead = this.editorState.playhead();
      this.notifyPlayheadUpdate(playhead);
    });
  }

  // Core pixel-time conversion
  secondsToPx(seconds: number): number {
    return Math.round(seconds * this.editorState.pxPerSecond());
  }

  pxToSeconds(pixels: number): number {
    return pixels / this.editorState.pxPerSecond();
  }

  // Timeline duration calculation (moved from AudioEditor)
  duration = computed(() => {
    const tracks = this.editorState.tracks();
    let max = 0;
    for (const track of tracks) {
      for (const clip of track.clips) {
        const clipEnd = clip.startTime + clip.duration;
        if (clipEnd > max) {
          max = clipEnd;
        }
      }
    }
    return Math.max(10, Math.ceil(max) + 5); // Add 5s buffer
  });

  // Timeline markers generation
  getTimelineMarkers(): number[] {
    const dur = this.duration();
    return Array.from({length: dur + 1}, (_, i) => i);
  }

  // Playhead positioning for all components
  getPlayheadPositionPx(): number {
    return this.secondsToPx(this.editorState.playhead());
  }

  // Playhead update notification for components that need sync
  private playheadUpdateListeners: ((playhead: number) => void)[] = [];
  
  subscribeToPlayheadUpdates(callback: (playhead: number) => void): () => void {
    this.playheadUpdateListeners.push(callback);
    return () => {
      const index = this.playheadUpdateListeners.indexOf(callback);
      if (index > -1) {
        this.playheadUpdateListeners.splice(index, 1);
      }
    };
  }

  private notifyPlayheadUpdate(playhead: number): void {
    this.playheadUpdateListeners.forEach(callback => callback(playhead));
  }

  // Zoom operations
  zoomIn(factor = 1.5): void {
    const currentZoom = this.editorState.pxPerSecond();
    const newZoom = Math.min(currentZoom * factor, 1000); // Max zoom limit
    this.editorState.pxPerSecond.set(newZoom);
  }

  zoomOut(factor = 1.5): void {
    const currentZoom = this.editorState.pxPerSecond();
    const newZoom = Math.max(currentZoom / factor, 10); // Min zoom limit
    this.editorState.pxPerSecond.set(newZoom);
  }

  // Zoom to mouse position (for wheel events)
  zoomAtPosition(mouseX: number, scrollX: number, factor: number): number {
    const currentZoom = this.editorState.pxPerSecond();
    const mouseTimeBeforeZoom = this.pxToSeconds(mouseX + scrollX);
    
    const newZoom = factor > 1 
      ? Math.min(currentZoom * factor, 1000)
      : Math.max(currentZoom * factor, 10);
    
    this.editorState.pxPerSecond.set(newZoom);
    
    // Calculate new scroll position to keep mouse at same time position
    const mouseXAfterZoom = this.secondsToPx(mouseTimeBeforeZoom);
    const newScrollX = mouseXAfterZoom - mouseX;
    
    // Return new scroll position for timeline to use
    return Math.max(0, newScrollX);
  }

  // Timeline scrubbing
  scrubToPosition(clickX: number, scrollX: number): void {
    const timelineX = clickX + scrollX;
    const newTime = this.pxToSeconds(timelineX);
    const maxTime = this.duration() - 0.1;
    const clampedTime = Math.max(0, Math.min(newTime, maxTime));
    
    this.editorState.playhead.set(clampedTime);
  }

  // Snap-to-grid functionality
  snapToGrid(timePosition: number, gridSize = 0.25): number {
    return Math.round(timePosition / gridSize) * gridSize;
  }

  // Get grid lines for visual display
  getGridLines(gridSize = 0.25): number[] {
    const duration = this.duration();
    const lines: number[] = [];
    
    for (let time = 0; time <= duration; time += gridSize) {
      lines.push(time);
    }
    
    return lines;
  }
}