import { Component, ElementRef, ViewChild, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditorStateService } from '../services/editor-state.service';
import { TimelineService } from '../services/timeline.service';
import { InteractionCoordinatorService } from '../services/interaction-coordinator.service';

@Component({
  selector: 'loop-region',
  imports: [CommonModule],
  template: `
    <div class="loop-region" #loopRegion>
      <!-- Loop Region Background -->
      <div 
        class="loop-background"
        [style.left.px]="loopStartPx()"
        [style.width.px]="loopWidthPx()"
        [style.opacity]="editorState.loopEnabled() ? 0.2 : 0"
        (mousedown)="onLoopRegionMouseDown($event)"
      ></div>
      
      <!-- Loop Start Marker -->
      <div 
        class="loop-marker loop-start"
        [style.left.px]="loopStartPx()"
        [style.opacity]="editorState.loopEnabled() ? 1 : 0.3"
        (mousedown)="onLoopMarkerMouseDown($event, 'start')"
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
        [style.opacity]="editorState.loopEnabled() ? 1 : 0.3"
        (mousedown)="onLoopMarkerMouseDown($event, 'end')"
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
        [style.opacity]="editorState.loopEnabled() ? 1 : 0"
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
      background: rgba(147, 51, 234, 0.15);
      border: 1px solid rgba(147, 51, 234, 0.3);
      border-radius: 2px;
      pointer-events: auto;
      cursor: grab;
      transition: all 0.2s ease;
    }
    
    .loop-background:hover {
      background: rgba(147, 51, 234, 0.25);
      border-color: rgba(147, 51, 234, 0.5);
    }
    
    .loop-background:active {
      cursor: grabbing;
    }
    
    .loop-marker {
      position: absolute;
      top: 0;
      height: 100%;
      width: 2px;
      pointer-events: auto;
      cursor: ew-resize;
      z-index: 15;
      transition: all 0.15s ease;
    }
    
    .loop-marker:hover {
      width: 3px;
      margin-left: -0.5px;
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
      left: 50%;
      top: 0;
      bottom: 0;
      width: 2px;
      margin-left: -1px;
      transition: all 0.15s ease;
    }
    
    .loop-marker-grip {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 10px;
      height: 10px;
      margin-left: -5px;
      margin-top: -5px;
      background: rgba(255, 255, 255, 0.9);
      border: 2px solid currentColor;
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
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
        width: 4px;
        cursor: pointer;
        touch-action: pan-x;
      }
      
      .loop-marker .loop-marker-grip {
        width: 12px;
        height: 12px;
        border: 2px solid rgba(255, 255, 255, 0.9);
      }
      
      .loop-marker:hover,
      .loop-marker:active {
        width: 6px;
        margin-left: -1px;
      }
      
      .loop-marker:hover .loop-marker-grip,
      .loop-marker:active .loop-marker-grip {
        width: 16px;
        height: 16px;
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
  
  // Computed positions
  loopStartPx = computed(() => 
    this.timelineService.secondsToPx(this.editorState.loopStart()) - this.scrollX()
  );
  
  loopEndPx = computed(() => 
    this.timelineService.secondsToPx(this.editorState.loopEnd()) - this.scrollX()
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
    
    const rect = this.loopRegionEl.nativeElement.getBoundingClientRect();
    const startX = event.clientX - rect.left + this.scrollX();
    
    this.interactionCoordinator.startLoopMarkerDrag(marker, startX);
  }
  
  onLoopRegionMouseDown(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    const rect = this.loopRegionEl.nativeElement.getBoundingClientRect();
    const startX = event.clientX - rect.left + this.scrollX();
    
    this.interactionCoordinator.startLoopRegionDrag(startX);
  }
  
  // Helper methods
  formatDuration(duration: number): string {
    return `${duration.toFixed(2)}s`;
  }
}