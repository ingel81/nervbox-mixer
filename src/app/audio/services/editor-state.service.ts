import { Injectable, signal, computed } from '@angular/core';
import { Track, Clip } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class EditorStateService {
  // Core state signals
  tracks = signal<Track[]>([]);
  playhead = signal(0);
  selectedClipId = signal<string | null>(null);
  isPlaying = signal(false);
  
  // UI state
  pxPerSecond = signal(100);
  duration = signal(30);
  showSoundBrowser = signal(false);
  
  // Drag state
  dragState: { id: string; startX: number; origStartTime: number; clipRef?: Clip } | null = null;
  dragOverTrack: Track | null = null;
  
  // Trim state
  trimState: { id: string; side: 'start' | 'end'; startX: number; originalTrimStart: number; originalTrimEnd: number; originalDuration: number; originalStartTime: number; clipRef: Clip } | null = null;
  
  // Clipboard
  clipboardClip: Clip | null = null;
  
  // Computed values
  flattenedClips = computed(() => {
    const tracks = this.tracks();
    const clips: Clip[] = [];
    for (const track of tracks) {
      clips.push(...track.clips);
    }
    return clips;
  });
  
  selectedClip = computed(() => {
    const selectedId = this.selectedClipId();
    if (!selectedId) return null;
    return this.flattenedClips().find(c => c.id === selectedId) || null;
  });
  
  // Track management
  addTrack(): Track {
    const newTrack: Track = {
      id: crypto.randomUUID(),
      name: `Track ${this.tracks().length + 1}`,
      clips: [],
      mute: false,
      solo: false,
      volume: 1,
      pan: 0
    };
    
    this.tracks.update(list => [...list, newTrack]);
    return newTrack;
  }
  
  removeTrack(trackId: string): void {
    this.tracks.update(list => list.filter(t => t.id !== trackId));
  }
  
  updateTrack(trackId: string, updates: Partial<Track>): void {
    this.tracks.update(list => 
      list.map(track => 
        track.id === trackId 
          ? { ...track, ...updates }
          : track
      )
    );
  }

  renameTrack(trackId: string, newName: string): void {
    this.updateTrack(trackId, { name: newName });
  }
  
  // Clip management
  addClipToTrack(trackId: string, clip: Clip): void {
    this.tracks.update(list => 
      list.map(track => 
        track.id === trackId 
          ? { ...track, clips: [...track.clips, clip] }
          : track
      )
    );
  }
  
  removeClip(clipId: string): void {
    this.tracks.update(list => 
      list.map(track => ({
        ...track,
        clips: track.clips.filter(c => c.id !== clipId)
      }))
    );
    
    // Clear selection if deleted clip was selected
    if (this.selectedClipId() === clipId) {
      this.selectedClipId.set(null);
    }
  }
  
  updateClip(clipId: string, updates: Partial<Clip>): void {
    this.tracks.update(list => 
      list.map(track => ({
        ...track,
        clips: track.clips.map(clip => 
          clip.id === clipId 
            ? { ...clip, ...updates }
            : clip
        )
      }))
    );
  }
  
  moveClipToTrack(clipId: string, targetTrackId: string, startTime: number): void {
    let clipToMove: Clip | undefined;
    
    // Remove from source track
    this.tracks.update(list => 
      list.map(track => {
        const clipIndex = track.clips.findIndex(c => c.id === clipId);
        if (clipIndex !== -1) {
          clipToMove = { ...track.clips[clipIndex], startTime };
          return {
            ...track,
            clips: track.clips.filter(c => c.id !== clipId)
          };
        }
        return track;
      })
    );
    
    // Add to target track
    if (clipToMove) {
      this.addClipToTrack(targetTrackId, clipToMove);
    }
  }
  
  // Playback control
  play(): void {
    this.isPlaying.set(true);
  }
  
  pause(): void {
    this.isPlaying.set(false);
  }
  
  stop(): void {
    this.isPlaying.set(false);
    this.playhead.set(0);
  }
  
  seekTo(seconds: number): void {
    this.playhead.set(Math.max(0, Math.min(seconds, this.duration())));
  }
  
  // Selection
  selectClip(clipId: string | null): void {
    this.selectedClipId.set(clipId);
  }
  
  // Clipboard operations
  copyClip(clip: Clip): void {
    this.clipboardClip = {
      ...clip,
      id: crypto.randomUUID(), // New ID for the copy
      startTime: 0 // Reset position for pasting
    };
  }
  
  pasteClip(targetTrackId?: string): Clip | null {
    if (!this.clipboardClip) return null;
    
    const pastedClip: Clip = {
      ...this.clipboardClip,
      id: crypto.randomUUID(),
      startTime: this.playhead() // Paste at playhead position
    };
    
    // Find target track or create new one
    const tracks = this.tracks();
    let targetTrack = targetTrackId 
      ? tracks.find(t => t.id === targetTrackId)
      : tracks.find(t => t.clips.length === 0);
    
    if (!targetTrack) {
      targetTrack = this.addTrack();
    }
    
    this.addClipToTrack(targetTrack.id, pastedClip);
    this.selectClip(pastedClip.id);
    
    return pastedClip;
  }
  
  // Zoom
  zoomIn(): void {
    this.pxPerSecond.update(px => Math.min(px * 1.2, 500));
  }
  
  zoomOut(): void {
    this.pxPerSecond.update(px => Math.max(px / 1.2, 10));
  }
  
  // Mute/Solo
  toggleMute(trackId: string): void {
    this.tracks.update(list => 
      list.map(track => 
        track.id === trackId 
          ? { ...track, mute: !track.mute }
          : track
      )
    );
  }
  
  toggleSolo(trackId: string): void {
    this.tracks.update(list => {
      const targetTrack = list.find(t => t.id === trackId);
      if (!targetTrack) return list;
      
      const newSoloState = !targetTrack.solo;
      
      // If enabling solo, disable all others
      if (newSoloState) {
        return list.map(track => ({
          ...track,
          solo: track.id === trackId
        }));
      } else {
        // If disabling solo, just toggle this one
        return list.map(track => 
          track.id === trackId 
            ? { ...track, solo: false }
            : track
        );
      }
    });
  }
  
  // Clear/Reset
  clearArrangement(): void {
    this.tracks.set([]);
    this.playhead.set(0);
    this.selectedClipId.set(null);
    this.isPlaying.set(false);
  }
}