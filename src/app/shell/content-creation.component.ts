import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';

import { EditorStateService } from '../audio/editor/services/editor-state.service';
import { AudioEngineService } from '../audio/audio-engine/services/audio-engine.service';
import { WaveformService } from '../audio/audio-engine/services/waveform.service';
import { RecordingDialogComponent } from '../audio/arrangements/components/dialogs/recording-dialog.component';
import { Clip } from '../audio/shared/models/models';

@Component({
    selector: 'content-creation',
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
           (change)="handleFileInput($event)" 
           hidden>
    
    <button mat-icon-button
            (click)="openRecordingDialog()"
            matTooltip="Record from microphone"
            class="content-btn record-btn">
      <mat-icon>mic</mat-icon>
    </button>
    
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
      justify-content: flex-start;
      gap: 4px;
      margin-right: 16px;
      height: 48px;
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
    
    .record-btn:hover {
      color: #ef4444;
      background: rgba(239, 68, 68, 0.1);
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
      
      .content-btn {
        background: transparent !important;
        border: none !important;
        border-radius: 0 !important;
        box-shadow: none !important;
      }
      
      .content-btn:hover {
        background: rgba(147, 51, 234, 0.1) !important;
        box-shadow: none !important;
      }
      
      .content-btn.active {
        background: rgba(236, 72, 153, 0.15) !important;
        color: #ec4899 !important;
        box-shadow: none !important;
      }
      
      .content-btn mat-icon {
        font-size: 20px !important;
        width: 20px !important;
        height: 20px !important;
        color: rgba(255, 255, 255, 0.9) !important;
      }
      
      .content-btn.active mat-icon {
        color: #ec4899 !important;
      }
    }
    
    @media (max-width: 480px) {      
      .content-btn mat-icon {
        font-size: 18px !important;
        width: 18px !important;
        height: 18px !important;
      }
    }
  `]
})
export class ContentCreationComponent {
  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef<HTMLInputElement>;
  
  constructor(
    public editorState: EditorStateService,
    private audio: AudioEngineService,
    private waveform: WaveformService,
    private dialog: MatDialog
  ) {}
  
  
  openFileDialog(): void {
    this.fileInput.nativeElement.click();
  }
  
  toggleSoundBrowser(): void {
    this.editorState.toggleSoundBrowser('toolbar');
  }
  
  openRecordingDialog(): void {
    const dialogRef = this.dialog.open(RecordingDialogComponent, {
      width: '600px',
      panelClass: 'recording-dialog'
    });
    
    dialogRef.afterClosed().subscribe(audioBuffer => {
      if (audioBuffer) {
        this.addRecordingToTrack(audioBuffer);
      }
    });
  }
  
  private addRecordingToTrack(buffer: AudioBuffer): void {
    const playheadPos = this.editorState.playhead();
    const name = `Recording ${new Date().toLocaleTimeString()}`;
    const color = 'linear-gradient(45deg, #ef4444, #dc2626)';
    
    // Generate waveform for the recording
    const pxPerSecond = this.editorState.pxPerSecond();
    const waveformData = this.waveform.generateFromBuffer(buffer, {
      width: Math.max(200, Math.floor(buffer.duration * pxPerSecond)),
      height: 44,
      clipColor: color
    });
    
    const tracks = this.editorState.tracks();
    let placedOnExistingTrack = false;
    
    for (const track of tracks) {
      const canPlace = !track.clips.some(clip => {
        const clipStart = clip.startTime;
        const clipEnd = clip.startTime + clip.duration;
        const newClipEnd = playheadPos + buffer.duration;
        return !(newClipEnd <= clipStart || playheadPos >= clipEnd);
      });
      
      if (canPlace) {
        this.editorState.addClipToTrack(track.id, {
          id: crypto.randomUUID(),
          name,
          startTime: playheadPos,
          duration: buffer.duration,
          offset: 0,
          buffer,
          color,
          waveform: waveformData,
          trimStart: 0,
          trimEnd: 0,
          originalDuration: buffer.duration
        } as Clip);
        placedOnExistingTrack = true;
        break;
      }
    }
    
    if (!placedOnExistingTrack) {
      const newTrack = this.editorState.addTrack();
      this.editorState.addClipToTrack(newTrack.id, {
        id: crypto.randomUUID(),
        name,
        startTime: playheadPos,
        duration: buffer.duration,
        offset: 0,
        buffer,
        color,
        waveform: waveformData,
        trimStart: 0,
        trimEnd: 0,
        originalDuration: buffer.duration
      } as Clip);
    }
  }

  handleFileInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files) {
      this.onFilesSelected(target.files);
    }
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
      const color = this.getColorByFilename(name);
      
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
          } as Clip);
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
        } as Clip);
        console.log(`Added ${name} to new ${newTrack.name} at playhead`);
      }
    });
  }
  
  private getColorByFilename(filename: string): string {
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
    
    // Simple hash function for consistent color assignment
    let hash = 0;
    for (let i = 0; i < filename.length; i++) {
      const char = filename.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return colors[Math.abs(hash) % colors.length];
  }

}