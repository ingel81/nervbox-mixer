import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { EditorStateService } from '../audio/services/editor-state.service';
import { AudioEngineService } from '../audio/services/audio-engine.service';

@Component({
  selector: 'content-creation',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    
    <button mat-icon-button 
            (click)="openFileDialog()" 
            matTooltip="Import audio files"
            class="content-btn">
      <mat-icon>file_upload</mat-icon>
    </button>
    
    <input #fileInput 
           type="file" 
           multiple 
           accept="audio/*" 
           (change)="onFilesSelected($event.target.files)" 
           hidden>
    
    <button mat-icon-button 
            (click)="toggleSoundBrowser()" 
            matTooltip="Sound Library"
            class="content-btn"
            [class.active]="editorState.showSoundBrowser()">
      <mat-icon>library_music</mat-icon>
    </button>
  `,
  styles: [`
    :host {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-right: 16px;
    }
    
    .content-btn {
      color: rgba(255, 255, 255, 0.8);
      transition: all 0.2s ease;
    }
    
    .content-btn:hover {
      color: #9333ea;
      background: rgba(147, 51, 234, 0.1);
    }
    
    .content-btn.active {
      color: #ec4899 !important;
      background: rgba(236, 72, 153, 0.2) !important;
      box-shadow: 0 0 10px rgba(236, 72, 153, 0.3);
    }
  `]
})
export class ContentCreationComponent {
  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef<HTMLInputElement>;
  
  constructor(
    public editorState: EditorStateService,
    private audio: AudioEngineService
  ) {}
  
  
  openFileDialog(): void {
    this.fileInput.nativeElement.click();
  }
  
  toggleSoundBrowser(): void {
    this.editorState.showSoundBrowser.update(show => !show);
  }
  
  async onFilesSelected(files: FileList | null): Promise<void> {
    if (!files || files.length === 0) return;
    
    console.log(`Importing ${files.length} audio files...`);
    
    // Process files in batches to avoid memory issues
    const filesArray = Array.from(files);
    const batchSize = 10;
    const buffers: AudioBuffer[] = [];
    
    // Decode in batches
    for (let i = 0; i < filesArray.length; i += batchSize) {
      const batch = filesArray.slice(i, i + batchSize);
      try {
        const batchBuffers = await Promise.all(
          batch.map(async (f) => {
            try {
              return await this.audio.decode(f);
            } catch (err) {
              console.error(`Failed to decode ${f.name}:`, err);
              return null;
            }
          })
        );
        buffers.push(...batchBuffers.filter(b => b !== null) as AudioBuffer[]);
        console.log(`Processed ${Math.min(i + batchSize, filesArray.length)} of ${filesArray.length} files`);
      } catch (err) {
        console.error('Batch decode error:', err);
      }
    }
    
    if (buffers.length === 0) {
      console.error('No files could be decoded');
      return;
    }
    
    console.log(`Successfully imported ${buffers.length} files`);
    
    // Add files to tracks
    this.addBuffersToTracks(buffers, filesArray);
  }
  
  private addBuffersToTracks(buffers: AudioBuffer[], files: File[]): void {
    const playheadPos = this.editorState.playhead();
    
    buffers.forEach((buf, i) => {
      const name = files[i]?.name.replace(/\.[^.]+$/, '') || `Audio ${i + 1}`;
      const color = this.randomColor();
      
      // Try to find a track with space at playhead position
      const tracks = this.editorState.tracks();
      let placedOnExistingTrack = false;
      
      for (const track of tracks) {
        const canPlace = !track.clips.some(clip => {
          const clipStart = clip.startTime;
          const clipEnd = clip.startTime + clip.duration;
          const newClipEnd = playheadPos + buf.duration;
          return !(newClipEnd <= clipStart || playheadPos >= clipEnd);
        });
        
        if (canPlace) {
          this.editorState.addClipToTrack(track.id, {
            id: crypto.randomUUID(),
            name,
            startTime: playheadPos,
            duration: buf.duration,
            offset: 0,
            buffer: buf,
            color,
            waveform: '', // Will be generated later
            trimStart: 0,
            trimEnd: 0,
            originalDuration: buf.duration
          } as any);
          placedOnExistingTrack = true;
          console.log(`Added ${name} to existing ${track.name} at playhead`);
          break;
        }
      }
      
      if (!placedOnExistingTrack) {
        // Create new track
        const newTrack = this.editorState.addTrack();
        this.editorState.addClipToTrack(newTrack.id, {
          id: crypto.randomUUID(),
          name,
          startTime: playheadPos,
          duration: buf.duration,
          offset: 0,
          buffer: buf,
          color,
          waveform: '', // Will be generated later
          trimStart: 0,
          trimEnd: 0,
          originalDuration: buf.duration
        } as any);
        console.log(`Added ${name} to new ${newTrack.name} at playhead`);
      }
    });
  }
  
  private randomColor(): string {
    const colors = [
      'linear-gradient(45deg, #dc2626, #b91c1c)',
      'linear-gradient(45deg, #f59e0b, #d97706)',
      'linear-gradient(45deg, #10b981, #059669)',
      'linear-gradient(45deg, #3b82f6, #1d4ed8)',
      'linear-gradient(45deg, #8b5cf6, #7c3aed)',
      'linear-gradient(45deg, #ec4899, #be185d)',
      'linear-gradient(45deg, #06b6d4, #0891b2)',
      'linear-gradient(45deg, #84cc16, #65a30d)'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}