import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

import { EditorStateService } from '../audio/editor/services/editor-state.service';
import { AudioEngineService } from '../audio/audio-engine/services/audio-engine.service';

@Component({
    selector: 'export-controls',
    imports: [CommonModule, MatButtonModule, MatIconModule, MatMenuModule],
    template: `
    <button mat-button 
            [matMenuTriggerFor]="exportMenu" 
            color="accent" 
            class="export-btn"
            [class.mobile]="isMobile">
      <mat-icon>download</mat-icon>
      <span class="btn-text">Export</span>
      <mat-icon class="dropdown-icon">arrow_drop_down</mat-icon>
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
    :host {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      height: 48px;
    }
    
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
    
    .dropdown-icon {
      margin-left: 2px !important;
      margin-right: 0 !important;
    }
    
    /* Mobile styles */
    @media (max-width: 768px) {
      :host {
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: flex-start;
      }
      
      .btn-text {
        display: none;
      }
      
      .dropdown-icon {
        display: none;
      }
      
      .export-btn {
        min-width: auto !important;
        width: 40px !important;
        height: 40px !important;
        padding: 0 !important;
        margin: 0 !important;
        background: transparent !important;
        border: none !important;
        border-radius: 0 !important;
        box-shadow: none !important;
      }
      
      .export-btn:hover {
        background: rgba(147, 51, 234, 0.1) !important;
        transform: none;
        box-shadow: none !important;
      }
      
      .export-btn mat-icon {
        margin: 0 !important;
        font-size: 20px !important;
        width: 20px !important;
        height: 20px !important;
        color: rgba(255, 255, 255, 0.9) !important;
      }
    }
  `]
})
export class ExportControlsComponent {
  isMobile = window.innerWidth <= 768;
  
  // Computed duration based on loop region if enabled, otherwise all clips
  duration = computed(() => {
    const isLoopEnabled = this.editorState.loopEnabled();
    
    if (isLoopEnabled) {
      return this.editorState.loopEnd() - this.editorState.loopStart();
    }
    
    // Original logic for full arrangement - export exactly until last clip ends
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
    return Math.max(10, max); // No additional buffer
  });
  
  constructor(
    private editorState: EditorStateService,
    private audio: AudioEngineService
  ) {}
  
  async exportMixdown(format: 'wav' | 'mp3' = 'wav'): Promise<void> {
    const isLoopEnabled = this.editorState.loopEnabled();
    const loopStart = this.editorState.loopStart();
    const loopEnd = this.editorState.loopEnd();
    
    let allClips = this.flattenClips();
    
    // Filter and adjust clips for loop region export
    if (isLoopEnabled) {
      allClips = allClips.filter(clip => {
        const clipStart = clip.startTime;
        const clipEnd = clip.startTime + clip.duration;
        // Include clips that overlap with the loop region
        return clipEnd > loopStart && clipStart < loopEnd;
      });
    }
    
    const clips = allClips.map(c => {
      let startTime = c.startTime;
      let duration = c.duration;
      let offset = c.offset + (c.trimStart || 0);
      
      if (isLoopEnabled) {
        // Adjust start time relative to loop start
        startTime = Math.max(0, c.startTime - loopStart);
        
        // Clip the start if clip begins before loop region
        if (c.startTime < loopStart) {
          const clipOffset = loopStart - c.startTime;
          offset += clipOffset;
          duration -= clipOffset;
        }
        
        // Clip the end if clip extends beyond loop region
        if (c.startTime + c.duration > loopEnd) {
          duration = Math.max(0, loopEnd - Math.max(c.startTime, loopStart));
        }
      }
      
      return {
        buffer: c.buffer,
        startTime,
        duration: Math.max(0, duration),
        offset: Math.max(0, offset),
        gain: 1,
        pan: 0,
        muted: false,
      };
    }).filter(c => c.duration > 0); // Remove clips with zero duration
    
    try {
      let blob: Blob;
      
      if (format === 'mp3') {
        blob = await this.audio.renderToMp3({ clips, duration: this.duration() });
      } else {
        blob = await this.audio.renderToWav({ clips, duration: this.duration() });
      }
      
      // Download the file using arrangement name
      const arrangementName = this.editorState.currentArrangementName();
      const sanitizedName = arrangementName.replace(/[^a-zA-Z0-9-_]/g, '_');
      const filename = `${sanitizedName}.${format}`;
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      
      const exportType = isLoopEnabled ? `Loop Region (${loopStart}s - ${loopEnd}s)` : 'Full Arrangement';
      console.log(`Export completed: ${format.toUpperCase()} - ${exportType}`);
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Export failed: ${error}`);
    }
  }
  
  private flattenClips() {
    return this.editorState.flattenedClips();
  }
}