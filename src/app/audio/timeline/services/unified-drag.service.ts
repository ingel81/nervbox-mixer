import { Injectable, inject } from '@angular/core';
import { MouseDragHandler, TouchDragHandler, PointerDragHandler, DragHandlerConfig } from './drag-handlers';
import { DragResult } from './virtual-drag.service';
import { Clip, Track } from '../../shared/models/models';

export interface UnifiedDragConfig {
  clip: Clip;
  tracks: Track[];
  pxPerSecond: number;
  onDragComplete: (result: DragResult) => void;
  preferPointerEvents?: boolean; // Feature flag for pointer events
}

@Injectable({
  providedIn: 'root'
})
export class UnifiedDragService {
  private mouseHandler = inject(MouseDragHandler);
  private touchHandler = inject(TouchDragHandler);
  private pointerHandler = inject(PointerDragHandler);
  
  private activeHandler: MouseDragHandler | TouchDragHandler | PointerDragHandler | null = null;
  private usePointerEvents = false; // Can be configured via settings

  constructor() {
    // Check for pointer events support
    this.usePointerEvents = 'PointerEvent' in window && false; // Disabled by default for now
  }

  startDrag(element: HTMLElement, event: Event, config: UnifiedDragConfig): void {
    // Prevent multiple simultaneous drags
    if (this.activeHandler) {
      return;
    }

    const handlerConfig: DragHandlerConfig = {
      clip: config.clip,
      tracks: config.tracks,
      pxPerSecond: config.pxPerSecond,
      onDragComplete: (result) => {
        this.activeHandler = null;
        config.onDragComplete(result);
      }
    };

    // Select appropriate handler based on event type and configuration
    if (config.preferPointerEvents && this.usePointerEvents && event instanceof PointerEvent) {
      this.activeHandler = this.pointerHandler;
    } else if (typeof TouchEvent !== 'undefined' && event instanceof TouchEvent) {
      this.activeHandler = this.touchHandler;
    } else if (event instanceof MouseEvent) {
      this.activeHandler = this.mouseHandler;
    } else {
      console.warn('Unknown event type for drag operation:', event);
      return;
    }

    // Start the drag operation
    this.activeHandler.startDrag(element, event, handlerConfig);
  }

  cancelDrag(): void {
    if (this.activeHandler) {
      this.activeHandler.removeEventListeners();
      this.activeHandler = null;
    }
  }

  isSupported(): boolean {
    return true; // All modern browsers support mouse and touch events
  }

  isPointerEventsSupported(): boolean {
    return this.usePointerEvents;
  }

  enablePointerEvents(enable: boolean): void {
    if ('PointerEvent' in window) {
      this.usePointerEvents = enable;
    }
  }
}