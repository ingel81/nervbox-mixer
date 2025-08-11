import { Injectable, signal, computed } from '@angular/core';
import { Clip, Track } from '../models/models';

export interface DragCoordinates {
  x: number;
  y: number;
  clientX: number;
  clientY: number;
}

export interface DragResult {
  clip: Clip;
  finalTime: number;
  targetTrack: Track | null;
  targetTrackIndex: number;
}

export interface VirtualDragState {
  isDragging: boolean;
  originalPosition: DOMRect | null;
  currentTrackIndex: number;
  targetElement: HTMLElement | null;
  clipElement: HTMLElement | null;
  startTime: number;
  pxPerSecond: number;
}

@Injectable({
  providedIn: 'root'
})
export class VirtualDragService {
  private dragState = signal<VirtualDragState>({
    isDragging: false,
    originalPosition: null,
    currentTrackIndex: -1,
    targetElement: null,
    clipElement: null,
    startTime: 0,
    pxPerSecond: 100
  });

  public readonly isDragging = computed(() => this.dragState().isDragging);

  normalizeInputCoordinates(event: MouseEvent | TouchEvent | PointerEvent): DragCoordinates {
    let clientX: number;
    let clientY: number;

    if (event instanceof TouchEvent) {
      const touch = event.touches[0] || event.changedTouches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = (event as MouseEvent).clientX;
      clientY = (event as MouseEvent).clientY;
    }

    return {
      x: clientX,
      y: clientY,
      clientX,
      clientY
    };
  }

  captureOriginalState(element: HTMLElement, clip: Clip, pxPerSecond: number): VirtualDragState {
    const rect = element.getBoundingClientRect();
    const currentTrackIndex = this.getTrackIndexFromElement(element);
    
    return {
      isDragging: true,
      originalPosition: rect,
      currentTrackIndex,
      targetElement: null,
      clipElement: element,
      startTime: clip.startTime,
      pxPerSecond
    };
  }

  startVirtualMode(element: HTMLElement, clip: Clip, pxPerSecond: number): void {
    const state = this.captureOriginalState(element, clip, pxPerSecond);
    this.dragState.set(state);

    // Prepare element for virtual dragging
    // Keep absolute positioning, we'll use transform for movement
    element.style.zIndex = '1000';
    element.style.pointerEvents = 'none';
    element.style.willChange = 'transform';
    // Disable transitions during drag
    element.style.transition = 'none';
    // Store the original transform for restoration
    element.dataset.originalTransform = element.style.transform || 'translateY(-50%)';
  }

  updateVirtualPosition(coords: DragCoordinates, startX: number): { deltaX: number; deltaY: number; newTime: number; targetTrack: HTMLElement | null } {
    const state = this.dragState();
    if (!state.isDragging || !state.clipElement || !state.originalPosition) {
      return { deltaX: 0, deltaY: 0, newTime: state.startTime, targetTrack: null };
    }

    // Calculate horizontal movement (time)
    const deltaX = coords.clientX - startX;
    const deltaTime = deltaX / state.pxPerSecond;
    const newTime = Math.max(0, state.startTime + deltaTime);

    // Find target track
    const trackResult = this.getTrackAtPosition(coords.clientY);
    const targetTrack = trackResult?.element || null;
    const targetTrackIndex = trackResult?.index ?? -1;
    

    // Calculate vertical position - always follow mouse vertically
    let deltaY = coords.clientY - (state.originalPosition.top + state.originalPosition.height / 2);
    
    // If hovering over a track, snap to its center
    if (targetTrack && targetTrackIndex >= 0) {
      const targetRect = targetTrack.getBoundingClientRect();
      const targetCenterY = targetRect.top + (targetRect.height / 2);
      const clipHalfHeight = state.originalPosition.height / 2;
      deltaY = (targetCenterY - clipHalfHeight) - state.originalPosition.top;
    }

    // Apply visual transform using translate instead of position
    // This preserves the original position set by Angular
    // We need to combine with the existing translateY(-50%) for vertical centering
    state.clipElement.style.transform = `translateY(-50%) translate(${deltaX}px, ${deltaY}px)`;

    // Update visual feedback - show green when over a valid track
    this.updateVisualFeedback(state.clipElement, targetTrackIndex >= 0);

    return { deltaX, deltaY, newTime, targetTrack };
  }

  updateVisualFeedback(element: HTMLElement, isSnapped: boolean): void {
    if (isSnapped) {
      element.style.boxShadow = '0 0 10px rgba(0, 255, 0, 0.5)';
      element.style.opacity = '0.9';
    } else {
      element.style.boxShadow = '0 0 10px rgba(255, 255, 0, 0.3)';
      element.style.opacity = '0.8';
    }
  }

  restoreVisualState(): void {
    const state = this.dragState();
    if (!state.clipElement) return;

    // Restore original transform (usually translateY(-50%) for vertical centering)
    const originalTransform = state.clipElement.dataset.originalTransform || 'translateY(-50%)';
    state.clipElement.style.transform = originalTransform === 'translateY(-50%)' ? '' : originalTransform;
    delete state.clipElement.dataset.originalTransform;
    
    // Remove other inline styles
    state.clipElement.style.zIndex = '';
    state.clipElement.style.pointerEvents = '';
    state.clipElement.style.boxShadow = '';
    state.clipElement.style.opacity = '';
    state.clipElement.style.willChange = '';
    
    // Keep transitions disabled to prevent animation after drop
    // They will be re-enabled by CSS :hover or other states
    state.clipElement.style.transition = 'none';
    
    // Re-enable transitions after a short delay to allow position update
    setTimeout(() => {
      if (state.clipElement) {
        state.clipElement.style.transition = '';
      }
    }, 50);
  }

  commitFinalState(_result: DragResult): void {
    this.restoreVisualState();
    this.dragState.set({
      isDragging: false,
      originalPosition: null,
      currentTrackIndex: -1,
      targetElement: null,
      clipElement: null,
      startTime: 0,
      pxPerSecond: 100
    });
  }

  getTrackAtPosition(y: number): { element: HTMLElement; index: number } | null {
    const tracks = document.querySelectorAll('track-lane');
    for (let i = 0; i < tracks.length; i++) {
      const trackElement = tracks[i] as HTMLElement;
      const rect = trackElement.getBoundingClientRect();
      if (y >= rect.top && y <= rect.bottom) {
        return { element: trackElement, index: i };
      }
    }
    return null;
  }

  private getTrackIndexFromElement(element: HTMLElement): number {
    // The track-lane element itself has the data-track-index
    const trackIndex = element.getAttribute('data-track-index');
    if (trackIndex !== null) {
      const index = parseInt(trackIndex, 10);
      return index;
    }
    return -1;
  }

  private getTrackLaneElement(trackIndex: number): HTMLElement | null {
    const lanes = document.querySelectorAll('track-lane');
    return lanes[trackIndex] as HTMLElement || null;
  }

  getTrackFromIndex(tracks: Track[], index: number): Track | null {
    return tracks[index] || null;
  }

  calculateLaneSnapping(coords: DragCoordinates, originalRect: DOMRect): { targetLane: HTMLElement | null; snapY: number } {
    const trackResult = this.getTrackAtPosition(coords.clientY);
    if (!trackResult) {
      return { targetLane: null, snapY: 0 };
    }

    const targetRect = trackResult.element.getBoundingClientRect();
    const targetCenterY = targetRect.top + (targetRect.height / 2);
    const clipHalfHeight = originalRect.height / 2;
    const snapY = (targetCenterY - clipHalfHeight) - originalRect.top;

    return { targetLane: trackResult.element, snapY };
  }
}