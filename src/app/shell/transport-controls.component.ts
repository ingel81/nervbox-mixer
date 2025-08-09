import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { EditorStateService } from '../audio/services/editor-state.service';
import { AudioEngineService } from '../audio/services/audio-engine.service';

@Component({
  selector: 'transport-controls',
  standalone: true,
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
            class="transport-btn">
      <mat-icon>stop</mat-icon>
    </button>
  `,
  styles: [`
    :host {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-right: 16px;
    }
    
    .transport-btn {
      color: rgba(255, 255, 255, 0.9);
      transition: all 0.2s ease;
    }
    
    .transport-btn:hover {
      color: #9333ea;
      background: rgba(147, 51, 234, 0.1);
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