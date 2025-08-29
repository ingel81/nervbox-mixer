import { Component, ElementRef, ViewChild, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditorStateService } from '../services/editor-state.service';
import { TimelineService } from '../services/timeline.service';
import { InteractionCoordinatorService } from '../services/interaction-coordinator.service';

@Component({
  selector: 'loop-region',
  imports: [CommonModule],
  template: `
    <div class="loop-region" #loopRegion *ngIf="editorState.loopEnabled()">
      <!-- Loop Region Background -->
      <div 
        class="loop-background"
        [style.left.px]="loopStartPx()"
        [style.width.px]="loopWidthPx()"
        (mousedown)="onLoopRegionMouseDown($event)"
        (touchstart)="onLoopRegionTouchStart($event)"
      ></div>
      
      <!-- Loop Start Marker -->
      <div 
        class="loop-marker loop-start"
        [style.left.px]="loopStartPx()"
        (mousedown)="onLoopMarkerMouseDown($event, 'start')"
        (touchstart)="onLoopMarkerTouchStart($event, 'start')"
        title="Loop Start: {{editorState.loopStart()}}s"
      >
        <div class="loop-marker-handle">
          <div class="loop-marker-line"></div>
          <div class="loop-marker-grip"></div>
        </div>
      </div>
      
      <!-- Loop End Marker -->
      <div 
        class="loop-marker loop-end"
        [style.left.px]="loopEndPx()"
        (mousedown)="onLoopMarkerMouseDown($event, 'end')"
        (touchstart)="onLoopMarkerTouchStart($event, 'end')"
        title="Loop End: {{editorState.loopEnd()}}s"
      >
        <div class="loop-marker-handle">
          <div class="loop-marker-line"></div>
          <div class="loop-marker-grip"></div>
        </div>
      </div>
      
      <!-- Loop Duration Display -->
      <div 
        class="loop-duration"
        [style.left.px]="loopStartPx()"
        [style.width.px]="loopWidthPx()"
      >
        {{formatDuration(loopDuration())}}
      </div>
    </div>
  `,
  styles: [`
    .loop-region {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 100%;
      pointer-events: none;
      z-index: 10;
    }
    
    .loop-background {
      position: absolute;
      top: 0;
      height: 100%;
      background: rgba(147, 51, 234, 0.25);
      border: 2px solid rgba(147, 51, 234, 0.6);
      border-radius: 4px;
      pointer-events: auto;
      cursor: grab;
      transition: all 0.2s ease;
      box-shadow: 0 0 8px rgba(147, 51, 234, 0.3);
    }
    
    .loop-background:hover {
      background: rgba(147, 51, 234, 0.35);
      border-color: rgba(147, 51, 234, 0.8);
      box-shadow: 0 0 12px rgba(147, 51, 234, 0.4);
    }
    
    .loop-background:active {
      cursor: grabbing;
    }
    
    .loop-marker {
      position: absolute;
      top: 0;
      height: 100%;
      width: 12px;
      margin-left: -6px;
      pointer-events: auto;
      cursor: ew-resize;
      z-index: 15;
      transition: all 0.15s ease;
    }
    
    .loop-marker:hover {
      width: 14px;
      margin-left: -7px;
    }
    
    .loop-marker.loop-start .loop-marker-line {
      background: linear-gradient(180deg, #22c55e 0%, #16a34a 100%);
      box-shadow: 0 0 8px rgba(34, 197, 94, 0.6);
    }
    
    .loop-marker.loop-end .loop-marker-line {
      background: linear-gradient(180deg, #ef4444 0%, #dc2626 100%);
      box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
    }
    
    .loop-marker.loop-start:hover .loop-marker-line {
      box-shadow: 0 0 12px rgba(34, 197, 94, 0.8);
    }
    
    .loop-marker.loop-end:hover .loop-marker-line {
      box-shadow: 0 0 12px rgba(239, 68, 68, 0.8);
    }
    
    .loop-marker-handle {
      width: 100%;
      height: 100%;
      position: relative;
    }
    
    .loop-marker-line {
      position: absolute;
      left: 6px;
      top: 0;
      bottom: 0;
      width: 2px;
      margin-left: 0;
      transition: all 0.15s ease;
    }
    
    .loop-marker-grip {
      position: absolute;
      left: 0;
      top: calc(50% - 6px);
      width: 12px;
      height: 12px;
      background: rgba(255, 255, 255, 0.95);
      border: 2px solid currentColor;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    }
    
    .loop-marker.loop-start .loop-marker-grip {
      border-color: #22c55e;
      background: #22c55e;
    }
    
    .loop-marker.loop-end .loop-marker-grip {
      border-color: #ef4444;
      background: #ef4444;
    }
    
    /* Mobile specific styles */
    @media (hover: none) and (pointer: coarse) {
      .loop-marker {
        width: 20px;
        margin-left: -10px;
        cursor: pointer;
        touch-action: pan-x;
      }
      
      .loop-marker .loop-marker-line {
        left: 10px;
        width: 2px;
        margin-left: 0;
      }
      
      .loop-marker .loop-marker-grip {
        left: 4px;
        top: calc(50% - 6px);
        width: 12px;
        height: 12px;
        margin-top: 0;
        margin-left: 0;
        border: 2px solid rgba(255, 255, 255, 0.9);
      }
      
      .loop-marker:active .loop-marker-grip {
        transform: scale(1.1);
        border: 2px solid rgba(255, 255, 255, 1);
      }
    }
    
    .loop-duration {
      position: absolute;
      top: -25px;
      height: 20px;
      padding: 2px 8px;
      background: rgba(147, 51, 234, 0.9);
      color: white;
      font-size: 11px;
      font-weight: 500;
      border-radius: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      white-space: nowrap;
      pointer-events: none;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }
  `]
})
export class LoopRegionComponent {
  @ViewChild('loopRegion') loopRegionEl!: ElementRef<HTMLDivElement>;
  
  // Input for timeline scroll offset
  scrollX = input<number>(0);
  
  constructor(
    public editorState: EditorStateService,
    private timelineService: TimelineService,
    private interactionCoordinator: InteractionCoordinatorService
  ) {}
  
  // Computed positions - DOM manipulation during drag bypasses these
  loopStartPx = computed(() => 
    this.timelineService.secondsToPx(this.editorState.loopStart())
  );
  
  loopEndPx = computed(() => 
    this.timelineService.secondsToPx(this.editorState.loopEnd())
  );
  
  loopWidthPx = computed(() => 
    this.loopEndPx() - this.loopStartPx()
  );
  
  loopDuration = computed(() => 
    this.editorState.loopEnd() - this.editorState.loopStart()
  );
  
  // Event handlers
  onLoopMarkerMouseDown(event: MouseEvent, marker: 'start' | 'end'): void {
    event.preventDefault();
    event.stopPropagation();
    
    this.interactionCoordinator.startLoopMarkerDrag(marker, event.clientX);
  }
  
  onLoopRegionMouseDown(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    this.interactionCoordinator.startLoopRegionDrag(event.clientX);
  }

  onLoopMarkerTouchStart(event: TouchEvent, marker: 'start' | 'end'): void {
    event.preventDefault();
    event.stopPropagation();
    
    const touch = event.touches[0];
    this.interactionCoordinator.startLoopMarkerDrag(marker, touch.clientX);
  }

  onLoopRegionTouchStart(event: TouchEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    const touch = event.touches[0];
    this.interactionCoordinator.startLoopRegionDrag(touch.clientX);
  }
  
  // Helper methods
  formatDuration(duration: number): string {
    return `${duration.toFixed(2)}s`;
  }
}