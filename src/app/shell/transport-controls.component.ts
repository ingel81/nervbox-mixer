import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { EditorStateService } from '../audio/services/editor-state.service';
import { AudioEngineService } from '../audio/services/audio-engine.service';

@Component({
    selector: 'transport-controls',
    imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule],
    template: `
    <button mat-icon-button 
            (click)="togglePlayback()" 
            matTooltip="Play/Pause"
            class="transport-btn">
      <mat-icon>{{ editorState.isPlaying() ? 'pause' : 'play_arrow' }}</mat-icon>
    </button>
    
    <button mat-icon-button 
            (click)="stop()" 
            matTooltip="Stop"
            class="transport-btn stop-btn">
      <mat-icon>stop</mat-icon>
    </button>
  `,
    styles: [`
    :host {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 8px;
      margin-right: 16px;
      height: 48px;
    }
    
    .transport-btn {
      color: rgba(255, 255, 255, 0.9);
      transition: all 0.2s ease;
    }
    
    .transport-btn:hover {
      color: #9333ea;
      background: rgba(147, 51, 234, 0.1);
    }
    
    /* Mobile styles */
    @media (max-width: 768px) {
      :host {
        gap: 0px;
        margin-right: 0px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: flex-start;
      }
      
      .stop-btn {
        display: none !important;
      }
      
      .transport-btn {
        width: 40px !important;
        height: 40px !important;
        background: transparent !important;
        border: none !important;
        border-radius: 0 !important;
        box-shadow: none !important;
      }
      
      .transport-btn:hover {
        background: rgba(147, 51, 234, 0.1) !important;
        box-shadow: none !important;
      }
      
      .transport-btn mat-icon {
        font-size: 20px !important;
        width: 20px !important;
        height: 20px !important;
        color: rgba(255, 255, 255, 0.9) !important;
      }
    }
    
    @media (max-width: 480px) {
      .transport-btn {
        width: 36px !important;
        height: 36px !important;
      }
      
      .transport-btn mat-icon {
        font-size: 18px !important;
        width: 18px !important;
        height: 18px !important;
      }
    }
  `]
})
export class TransportControlsComponent {
  
  constructor(
    public editorState: EditorStateService,
    private audio: AudioEngineService
  ) {}
  
  togglePlayback(): void {
    if (this.editorState.isPlaying()) {
      this.pause();
    } else {
      this.play();
    }
  }
  
  play(): void {
    // Get playable clips (considering mute/solo)
    const clips = this.getPlayableClips();
    this.audio.play(clips, this.editorState.playhead());
    this.editorState.play();
    this.tickPlayhead();
  }
  
  pause(): void {
    this.audio.pause();
    this.editorState.pause();
  }
  
  stop(): void {
    this.audio.stop();
    this.editorState.stop();
  }
  
  private getPlayableClips() {
    const tracks = this.editorState.tracks();
    const hasSolo = tracks.some(t => t.solo);
    
    return tracks
      .filter(track => {
        if (hasSolo) return track.solo && !track.mute;
        return !track.mute;
      })
      .flatMap(track => track.clips.map(clip => ({
        buffer: clip.buffer,
        startTime: clip.startTime,
        duration: clip.duration,
        offset: clip.offset || 0,
        gain: track.volume,
        pan: track.pan,
        muted: track.mute,
        trimStart: clip.trimStart,
        trimEnd: clip.trimEnd
      })));
  }
  
  private tickRAF?: number;
  
  private tickPlayhead(): void {
    if (this.tickRAF) {
      cancelAnimationFrame(this.tickRAF);
    }
    
    const start = performance.now();
    const origin = this.editorState.playhead();
    
    const loop = (t: number) => {
      if (!this.editorState.isPlaying()) return;
      const sec = (t - start) / 1000;
      this.editorState.playhead.set(origin + sec);
      this.tickRAF = requestAnimationFrame(loop);
    };
    
    this.tickRAF = requestAnimationFrame(loop);
  }
  
  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Ignore if user is typing in input field
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }
    
    // Global spacebar shortcut for play/pause
    if (event.code === 'Space') {
      event.preventDefault();
      this.togglePlayback();
    }
  }
}