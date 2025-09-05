import { Injectable, inject } from '@angular/core';
import { VirtualDragService, DragCoordinates, DragResult } from './virtual-drag.service';
import { Clip, Track } from '../../shared/models/models';

export interface DragHandlerConfig {
  clip: Clip;
  tracks: Track[];
  pxPerSecond: number;
  onDragComplete: (result: DragResult) => void;
}

export abstract class BaseDragHandler {
  protected virtualDragService = inject(VirtualDragService);
  protected startX = 0;
  protected startY = 0;
  protected element: HTMLElement | null = null;
  protected config: DragHandlerConfig | null = null;
  protected moveHandler: ((e: Event) => void) | null = null;
  protected endHandler: ((e: Event) => void) | null = null;
  protected initialEvent: Event | null = null;

  abstract normalizeInput(event: Event): DragCoordinates;
  abstract installEventListeners(element: HTMLElement): void;
  abstract removeEventListeners(): void;

  startDrag(element: HTMLElement, event: Event, config: DragHandlerConfig): void {
    this.element = element;
    this.config = config;
    this.initialEvent = event;
    
    const coords = this.normalizeInput(event);
    this.startX = coords.clientX;
    this.startY = coords.clientY;

    // Start virtual mode
    this.virtualDragService.startVirtualMode(element, config.clip, config.pxPerSecond);

    // Install event listeners
    this.installEventListeners(element);

    // Prevent default behavior
    event.preventDefault();
    event.stopPropagation();
  }

  protected handleMove(event: Event): void {
    if (!this.config || !this.element) return;

    const coords = this.normalizeInput(event);
    // Check if Shift key is pressed to bypass grid snap
    const shiftPressed = (event as MouseEvent).shiftKey || (event as KeyboardEvent).shiftKey;
    this.virtualDragService.updateVirtualPosition(coords, this.startX, shiftPressed);
    
    // Prevent default to avoid scrolling
    event.preventDefault();
  }

  protected handleEnd(event: Event): void {
    if (!this.config || !this.element) return;

    const coords = this.normalizeInput(event);
    const shiftPressed = (event as MouseEvent).shiftKey || (event as KeyboardEvent).shiftKey;
    const { newTime } = this.virtualDragService.updateVirtualPosition(coords, this.startX, shiftPressed);

    // Get the track index directly from the track position
    const trackResult = this.virtualDragService.getTrackAtPosition(coords.clientY);
    const targetTrackIndex = trackResult?.index ?? -1;
    const targetTrackObj = this.virtualDragService.getTrackFromIndex(
      this.config.tracks, 
      targetTrackIndex
    );


    // Commit final state
    const result: DragResult = {
      clip: this.config.clip,
      finalTime: newTime,
      targetTrack: targetTrackObj,
      targetTrackIndex
    };

    this.virtualDragService.commitFinalState(result);
    this.config.onDragComplete(result);

    // Cleanup
    this.removeEventListeners();
    this.element = null;
    this.config = null;

    event.preventDefault();
  }
}

@Injectable({
  providedIn: 'root'
})
export class MouseDragHandler extends BaseDragHandler {
  normalizeInput(event: Event): DragCoordinates {
    const mouseEvent = event as MouseEvent;
    return {
      x: mouseEvent.clientX,
      y: mouseEvent.clientY,
      clientX: mouseEvent.clientX,
      clientY: mouseEvent.clientY
    };
  }

  installEventListeners(_element: HTMLElement): void {
    this.moveHandler = (e: Event) => this.handleMove(e);
    this.endHandler = (e: Event) => this.handleEnd(e);

    document.addEventListener('mousemove', this.moveHandler, { passive: false });
    document.addEventListener('mouseup', this.endHandler, { passive: false });
  }

  removeEventListeners(): void {
    if (this.moveHandler) {
      document.removeEventListener('mousemove', this.moveHandler);
    }
    if (this.endHandler) {
      document.removeEventListener('mouseup', this.endHandler);
    }
    this.moveHandler = null;
    this.endHandler = null;
  }
}

@Injectable({
  providedIn: 'root'
})
export class TouchDragHandler extends BaseDragHandler {
  private touchId: number | null = null;

  normalizeInput(event: Event): DragCoordinates {
    const touchEvent = event as TouchEvent;
    let touch: Touch | null = null;

    if (touchEvent.touches.length > 0) {
      touch = touchEvent.touches[0];
      if (this.touchId === null) {
        this.touchId = touch.identifier;
      } else {
        // Find the specific touch we're tracking
        for (const touchItem of Array.from(touchEvent.touches)) {
          if (touchItem.identifier === this.touchId) {
            touch = touchItem;
            break;
          }
        }
      }
    } else if (touchEvent.changedTouches.length > 0) {
      touch = touchEvent.changedTouches[0];
    }

    if (!touch) {
      return { x: 0, y: 0, clientX: 0, clientY: 0 };
    }

    return {
      x: touch.clientX,
      y: touch.clientY,
      clientX: touch.clientX,
      clientY: touch.clientY
    };
  }

  installEventListeners(_element: HTMLElement): void {
    this.moveHandler = (e: Event) => this.handleMove(e);
    this.endHandler = (e: Event) => {
      this.handleEnd(e);
      this.touchId = null;
    };

    document.addEventListener('touchmove', this.moveHandler, { passive: false });
    document.addEventListener('touchend', this.endHandler, { passive: false });
    document.addEventListener('touchcancel', this.endHandler, { passive: false });
  }

  removeEventListeners(): void {
    if (this.moveHandler) {
      document.removeEventListener('touchmove', this.moveHandler);
    }
    if (this.endHandler) {
      document.removeEventListener('touchend', this.endHandler);
      document.removeEventListener('touchcancel', this.endHandler);
    }
    this.moveHandler = null;
    this.endHandler = null;
    this.touchId = null;
  }
}

@Injectable({
  providedIn: 'root'
})
export class PointerDragHandler extends BaseDragHandler {
  private pointerId: number | null = null;

  normalizeInput(event: Event): DragCoordinates {
    const pointerEvent = event as PointerEvent;
    return {
      x: pointerEvent.clientX,
      y: pointerEvent.clientY,
      clientX: pointerEvent.clientX,
      clientY: pointerEvent.clientY
    };
  }

  installEventListeners(element: HTMLElement): void {
    const pointerEvent = this.initialEvent as PointerEvent;
    this.pointerId = pointerEvent.pointerId;
    
    // Capture pointer for this element
    element.setPointerCapture(this.pointerId);

    this.moveHandler = (e: Event) => {
      const pe = e as PointerEvent;
      if (pe.pointerId === this.pointerId) {
        this.handleMove(e);
      }
    };

    this.endHandler = (e: Event) => {
      const pe = e as PointerEvent;
      if (pe.pointerId === this.pointerId) {
        if (this.element && this.pointerId !== null) {
          this.element.releasePointerCapture(this.pointerId);
        }
        this.handleEnd(e);
        this.pointerId = null;
      }
    };

    element.addEventListener('pointermove', this.moveHandler, { passive: false });
    element.addEventListener('pointerup', this.endHandler, { passive: false });
    element.addEventListener('pointercancel', this.endHandler, { passive: false });
  }

  removeEventListeners(): void {
    if (this.element && this.moveHandler) {
      this.element.removeEventListener('pointermove', this.moveHandler);
    }
    if (this.element && this.endHandler) {
      this.element.removeEventListener('pointerup', this.endHandler);
      this.element.removeEventListener('pointercancel', this.endHandler);
    }
    this.moveHandler = null;
    this.endHandler = null;
    this.pointerId = null;
  }
}