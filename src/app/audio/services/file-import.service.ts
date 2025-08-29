import { Injectable } from '@angular/core';
import { EditorStateService } from './editor-state.service';
import { AudioEngineService } from './audio-engine.service';
import { WaveformService } from './waveform.service';
import { Track, Clip } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class FileImportService {
  constructor(
    private editorState: EditorStateService,
    private audioEngine: AudioEngineService,
    private waveformService: WaveformService
  ) {}

  async importFiles(files: FileList | null, targetTrack?: Track): Promise<void> {
    if (!files || files.length === 0) return;
    
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
              return await this.audioEngine.decode(f);
            } catch (err) {
              console.error(`Failed to decode ${f.name}:`, err);
              return null;
            }
          })
        );
        buffers.push(...batchBuffers.filter(b => b !== null) as AudioBuffer[]);
      } catch (err) {
        console.error('Batch decode error:', err);
      }
    }
    
    if (buffers.length === 0) {
      console.error('No files could be decoded');
      return;
    }
    
    this.editorState.tracks.update(list => {
      const createTrack = (): Track => ({ 
        id: crypto.randomUUID(), 
        name: `Track ${list.length + 1}`, 
        clips: [] as Clip[], 
        mute: false, 
        solo: false, 
        volume: 1, 
        pan: 0 
      });

      if (targetTrack) {
        // Files dropped on specific track
        const idx = list.findIndex(t => t === targetTrack);
        const track = idx >= 0 ? list[idx]! : (list[0] ?? (list[0] = createTrack()));
        
        let startTime = this.editorState.playhead();
        
        // Check if playhead position is available on this track
        const playheadAvailable = !track.clips.some(clip => {
          const clipStart = clip.startTime;
          const clipEnd = clip.startTime + clip.duration;
          return startTime >= clipStart && startTime < clipEnd;
        });
        
        if (!playheadAvailable && track.clips.length > 0) {
          // Find next available position
          startTime = this.findNextAvailablePosition(track, startTime, buffers);
        }
        
        // Add all clips to this track
        buffers.forEach((buf, i) => {
          const name = filesArray[i]?.name.replace(/\.[^.]+$/, '') || `Audio ${i + 1}`;
          const clip = this.createClipFromBuffer(buf, name, startTime);
          track.clips.push(clip);
          startTime += buf.duration + 0.1;
        });
      } else {
        // Files dropped in general area - distribute intelligently
        this.distributeClipsAcrossTracks(buffers, filesArray, list, createTrack);
      }
      
      // Return new array with deep copy to ensure change detection
      return list.map(track => ({
        ...track,
        clips: [...track.clips]
      }));
    });
  }

  private findNextAvailablePosition(track: Track, startTime: number, buffers: AudioBuffer[]): number {
    const clipsAfterPlayhead = track.clips.filter(c => c.startTime >= startTime);
    
    if (clipsAfterPlayhead.length > 0) {
      clipsAfterPlayhead.sort((a, b) => a.startTime - b.startTime);
      
      for (let i = 0; i < clipsAfterPlayhead.length; i++) {
        const currentClip = clipsAfterPlayhead[i];
        const nextClip = clipsAfterPlayhead[i + 1];
        
        if (!nextClip) {
          // After last clip
          return currentClip.startTime + currentClip.duration + 0.1;
        } else {
          // Check gap between clips
          const gapStart = currentClip.startTime + currentClip.duration;
          const gapSize = nextClip.startTime - gapStart;
          const totalDuration = buffers.reduce((sum, buf) => sum + buf.duration, 0) + (buffers.length - 1) * 0.1;
          
          if (gapSize >= totalDuration) {
            return gapStart + 0.1;
          }
        }
      }
    }
    
    // Place after all clips
    if (track.clips.length > 0) {
      const lastClip = track.clips.reduce((latest, clip) => 
        (clip.startTime + clip.duration) > (latest.startTime + latest.duration) ? clip : latest
      );
      return lastClip.startTime + lastClip.duration + 0.1;
    }
    
    return startTime;
  }

  private distributeClipsAcrossTracks(
    buffers: AudioBuffer[], 
    filesArray: File[], 
    trackList: Track[], 
    createTrack: () => Track
  ): void {
    buffers.forEach((buf, i) => {
      const name = filesArray[i]?.name.replace(/\.[^.]+$/, '') || `Audio ${i + 1}`;
      const playheadPos = this.editorState.playhead();
      
      // Try to find a track with space at playhead position
      let placedOnExistingTrack = false;
      
      for (const track of trackList) {
        const canPlace = !track.clips.some(clip => {
          const clipStart = clip.startTime;
          const clipEnd = clip.startTime + clip.duration;
          const newClipEnd = playheadPos + buf.duration;
          return !(newClipEnd <= clipStart || playheadPos >= clipEnd);
        });
        
        if (canPlace) {
          const clip = this.createClipFromBuffer(buf, name, playheadPos);
          track.clips.push(clip);
          placedOnExistingTrack = true;
          break;
        }
      }
      
      if (!placedOnExistingTrack) {
        // Create new track
        const newTrack = createTrack();
        const clip = this.createClipFromBuffer(buf, name, playheadPos);
        newTrack.clips.push(clip);
        trackList.push(newTrack);
      }
    });
  }

  private createClipFromBuffer(buffer: AudioBuffer, name: string, startTime: number): Clip {
    const color = this.getColorByFilename(name);
    const waveform = this.waveformService.generateFromBuffer(buffer, {
      width: Math.floor(buffer.duration * this.editorState.pxPerSecond()),
      height: 44,
      clipColor: color
    });
    
    return {
      id: crypto.randomUUID(),
      name,
      startTime,
      duration: buffer.duration,
      offset: 0,
      buffer,
      color,
      waveform,
      trimStart: 0,
      trimEnd: 0,
      originalDuration: buffer.duration
    };
  }

  private getColorByFilename(filename: string): string {
    const colors = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
      'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
      'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)'
    ];
    
    // Simple hash function for consistent color assignment
    let hash = 0;
    for (let i = 0; i < filename.length; i++) {
      const char = filename.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return colors[Math.abs(hash) % colors.length]!;
  }
}