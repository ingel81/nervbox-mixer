import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

import { EditorStateService } from '../audio/editor-state.service';
import { AudioEngineService } from '../audio/audio-engine.service';

@Component({
  selector: 'export-controls',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatMenuModule],
  template: `
    <button mat-button 
            [matMenuTriggerFor]="exportMenu" 
            color="accent" 
            class="export-btn">
      <mat-icon>download</mat-icon>
      Export
      <mat-icon>arrow_drop_down</mat-icon>
    </button>
    
    <mat-menu #exportMenu="matMenu">
      <button mat-menu-item (click)="exportMixdown('mp3')">
        <mat-icon>audiotrack</mat-icon>
        <span>Export as MP3</span>
      </button>
      <button mat-menu-item (click)="exportMixdown('wav')">
        <mat-icon>graphic_eq</mat-icon>
        <span>Export as WAV</span>
      </button>
    </mat-menu>
  `,
  styles: [`
    .export-btn {
      background: linear-gradient(45deg, #9333ea 0%, #ec4899 100%) !important;
      color: white !important;
      font-weight: 600 !important;
      font-size: 11px !important;
      text-transform: uppercase !important;
      letter-spacing: 1px !important;
      box-shadow: 
        0 2px 10px rgba(147, 51, 234, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
      border: 1px solid rgba(236, 72, 153, 0.3) !important;
      font-family: 'JetBrains Mono', monospace !important;
      padding: 0 12px !important;
      height: 36px !important;
      margin-left: 8px !important;
    }
    
    .export-btn:hover {
      box-shadow: 
        0 4px 20px rgba(236, 72, 153, 0.6),
        inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
      transform: translateY(-1px);
      background: linear-gradient(45deg, #a855f7 0%, #f472b6 100%) !important;
    }
    
    .export-btn mat-icon {
      margin-right: 4px !important;
    }
  `]
})
export class ExportControlsComponent {
  
  // Computed duration based on all clips
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
  
  constructor(
    private editorState: EditorStateService,
    private audio: AudioEngineService
  ) {}
  
  async exportMixdown(format: 'wav' | 'mp3' = 'wav'): Promise<void> {
    const clips = this.flattenClips().map(c => {
      return {
        buffer: c.buffer,
        startTime: c.startTime,
        duration: c.duration,
        offset: c.offset + (c.trimStart || 0), // Include trim offset
        gain: 1,
        pan: 0,
        muted: false,
      };
    });
    
    try {
      let blob: Blob;
      
      if (format === 'mp3') {
        blob = await this.audio.renderToMp3({ clips, duration: this.duration() });
      } else {
        blob = await this.audio.renderToWav({ clips, duration: this.duration() });
      }
      
      // Download the file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nervbox-export.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      
      console.log(`Export completed: ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Export failed: ${error}`);
    }
  }
  
  private flattenClips() {
    return this.editorState.flattenedClips();
  }
}