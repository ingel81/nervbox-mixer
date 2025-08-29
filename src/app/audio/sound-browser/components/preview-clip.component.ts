import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WaveformService } from '../../audio-engine/services/waveform.service';

@Component({
  selector: 'preview-clip',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="preview-clip"
         [style.width.px]="clipWidth()"
         [style.left.px]="position.x"
         [style.top.px]="position.y"
         [class.valid-drop]="isValidDrop"
         [class.invalid-drop]="!isValidDrop">
      
      <!-- Waveform -->
      <div class="clip-waveform"
           [style.background-image]="'url(' + waveformUrl() + ')'"
           [style.width.px]="clipWidth()">
      </div>
      
      <!-- Clip info -->
      <div class="clip-info">
        <span class="clip-name">{{ soundName }}</span>
        <span class="clip-duration">{{ formatDuration(duration()) }}</span>
      </div>
      
      <!-- Drop indicator -->
      <div class="drop-indicator" *ngIf="isValidDrop">
        <span>Drop hier</span>
      </div>
    </div>
  `,
  styles: [`
    .preview-clip {
      position: fixed;
      pointer-events: none;
      z-index: 10000;
      border-radius: 4px;
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
      transform: translate(-50%, -50%);
      min-width: 60px;
      height: 44px;
      opacity: 0.85;
      transition: opacity 0.1s ease;
    }
    
    .preview-clip.valid-drop {
      border: 2px solid #10b981;
      background: rgba(16, 185, 129, 0.1);
    }
    
    .preview-clip.invalid-drop {
      border: 2px solid #ef4444;
      background: rgba(239, 68, 68, 0.1);
    }
    
    .clip-waveform {
      height: 44px;
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      border-radius: 2px;
      position: relative;
      overflow: hidden;
    }
    
    .clip-info {
      position: absolute;
      top: -24px;
      left: 0;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      white-space: nowrap;
      display: flex;
      gap: 8px;
    }
    
    .clip-name {
      font-weight: 500;
    }
    
    .clip-duration {
      color: #94a3b8;
    }
    
    .drop-indicator {
      position: absolute;
      bottom: -20px;
      left: 50%;
      transform: translateX(-50%);
      background: #10b981;
      color: white;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 500;
    }
    
    .preview-clip.invalid-drop .drop-indicator {
      background: #ef4444;
    }
  `]
})
export class PreviewClipComponent {
  @Input() soundName!: string;
  @Input() audioBuffer!: AudioBuffer;
  @Input() position!: { x: number; y: number };
  @Input() pxPerSecond!: number;
  @Input() isValidDrop = false;

  constructor(private waveformService: WaveformService) {}

  duration = computed(() => this.audioBuffer?.duration || 0);
  
  clipWidth = computed(() => {
    const dur = this.duration();
    return Math.max(60, Math.floor(dur * this.pxPerSecond));
  });

  waveformUrl = computed(() => {
    if (!this.audioBuffer) return '';
    
    return this.waveformService.generateAutoSized(
      this.audioBuffer,
      this.duration(),
      this.pxPerSecond,
      this.isValidDrop ? '#10b981' : '#ef4444' // Green for valid, red for invalid
    );
  });

  formatDuration(seconds: number): string {
    if (seconds < 1) {
      return `${Math.round(seconds * 1000)}ms`;
    }
    const secs = Math.floor(seconds % 60);
    const subsecs = Math.round((seconds % 1) * 10);
    return subsecs > 0 ? `${secs}.${subsecs}s` : `${secs}s`;
  }
}