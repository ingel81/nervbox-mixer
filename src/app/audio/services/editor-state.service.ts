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
  currentArrangementName = signal<string>('Untitled');
  
  // UI state
  pxPerSecond = signal(100);
  duration = signal(30);
  showSoundBrowser = signal(false);
  soundBrowserOpenedFromCta = signal(false);
  
  // Legacy drag state removed - using Virtual Drag System
  dragOverTrack: Track | null = null;
  
  // Drag preview state for Sound Browser
  dragPreview = signal<{
    sound: { id: string; name: string; category: string };
    buffer: AudioBuffer;
    position: { x: number; y: number };
    targetTrack: Track | null;
    isValidDrop: boolean;
  } | null>(null);
  
  isDraggingSound = signal(false);
  isDraggingClip = signal(false);
  
  // Trim state
  trimState: { id: string; side: 'start' | 'end'; startX: number; originalTrimStart: number; originalTrimEnd: number; originalDuration: number; originalStartTime: number; clipRef: Clip } | null = null;
  
  // Clipboard
  clipboardClip: Clip | null = null;
  
  // Active track management
  activeTrackId = signal<string | null>(null);
  activeTrack = computed(() => {
    const id = this.activeTrackId();
    if (!id) return null;
    return this.tracks().find(t => t.id === id) || null;
  });
  
  // Loop region state
  loopEnabled = signal(false);
  loopStart = signal(0); // in seconds
  loopEnd = signal(4); // in seconds
  snapToGrid = signal(false);
  gridResolution = signal(0.25); // 1/4 beat at 120 BPM
  
  // Computed loop region validation
  validLoopRegion = computed(() => {
    const start = this.loopStart();
    const end = this.loopEnd();
    return end > start && end - start >= 0.1; // Minimum 100ms loop
  });
  
  // Sound browser control
  toggleSoundBrowser(source?: string): void {
    const wasShown = this.showSoundBrowser();
    this.showSoundBrowser.update(show => !show);
    
    // Track opening source if opening (not closing)
    if (!wasShown) {
      this.soundBrowserOpenedFromCta.set(source === 'cta');
    }
  }
  
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
    
    // Automatically activate new track
    this.setActiveTrack(newTrack.id);
    
    return newTrack;
  }
  
  removeTrack(trackId: string): void {
    // If removing active track, activate next available track
    if (this.activeTrackId() === trackId) {
      const tracks = this.tracks();
      const index = tracks.findIndex(t => t.id === trackId);
      if (index !== -1) {
        const nextTrack = tracks[index + 1] || tracks[index - 1];
        this.setActiveTrack(nextTrack?.id || null);
      }
    }
    
    this.tracks.update(list => list.filter(t => t.id !== trackId));
  }
  
  // Active track methods
  setActiveTrack(trackId: string | null): void {
    this.activeTrackId.set(trackId);
  }
  
  getOrCreateActiveTrack(): Track {
    let track = this.activeTrack();
    
    if (!track) {
      // Try to get first track
      const tracks = this.tracks();
      if (tracks.length > 0) {
        track = tracks[0];
        this.setActiveTrack(track.id);
      } else {
        // Create new track
        track = this.addTrack();
      }
    }
    
    return track;
  }
  
  findNextFreePosition(track: Track, startTime: number, clipDuration: number): number {
    const sortedClips = [...track.clips].sort((a, b) => a.startTime - b.startTime);
    
    // Check if playhead position is free
    const collision = sortedClips.find(clip => {
      const clipStart = clip.startTime;
      const clipEnd = clip.startTime + clip.duration;
      const newClipEnd = startTime + clipDuration;
      return !(newClipEnd <= clipStart || startTime >= clipEnd);
    });
    
    if (!collision) {
      return startTime; // Position is free
    }
    
    // Find next free position after the colliding clip
    return collision.startTime + collision.duration + 0.1; // Small gap
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
  
  // Loop control methods
  toggleLoop(): void {
    this.loopEnabled.update(enabled => !enabled);
  }
  
  setLoopRegion(start: number, end: number): void {
    // Ensure valid loop region
    if (end > start) {
      this.loopStart.set(start);
      this.loopEnd.set(end);
    }
  }
  
  setLoopToSelection(): void {
    const selectedClip = this.selectedClip();
    if (selectedClip) {
      this.setLoopRegion(selectedClip.startTime, selectedClip.startTime + selectedClip.duration);
      this.loopEnabled.set(true);
    }
  }
  
  snapLoopMarkerToGrid(time: number): number {
    if (!this.snapToGrid()) return time;
    
    const grid = this.gridResolution();
    return Math.round(time / grid) * grid;
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
    
    // Get target track - use provided ID, active track, or create new
    const targetTrack = targetTrackId 
      ? this.tracks().find(t => t.id === targetTrackId)
      : this.getOrCreateActiveTrack();
    
    if (!targetTrack) return null;
    
    // Find free position starting from playhead
    const playheadPos = this.playhead();
    const freePosition = this.findNextFreePosition(
      targetTrack, 
      playheadPos, 
      this.clipboardClip.duration
    );
    
    const pastedClip: Clip = {
      ...this.clipboardClip,
      id: crypto.randomUUID(),
      startTime: freePosition
    };
    
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
    this.currentArrangementName.set('Untitled');
  }

  // Arrangement name management
  setArrangementName(name: string): void {
    this.currentArrangementName.set(name);
  }
  
  // Drag preview methods for Sound Browser
  startSoundDrag(sound: { id: string; name: string; category: string }, buffer: AudioBuffer, position: { x: number; y: number }): void {
    this.isDraggingSound.set(true);
    this.dragPreview.set({
      sound,
      buffer,
      position,
      targetTrack: null,
      isValidDrop: false
    });
  }
  
  updateSoundDragPosition(position: { x: number; y: number }, targetTrack?: Track): void {
    const current = this.dragPreview();
    if (!current) return;
    
    this.dragPreview.set({
      ...current,
      position,
      targetTrack: targetTrack || null,
      isValidDrop: !!targetTrack
    });
  }
  
  endSoundDrag(): void {
    this.isDraggingSound.set(false);
    this.dragPreview.set(null);
  }

  // Clip drag state management
  startClipDrag(): void {
    this.isDraggingClip.set(true);
  }

  endClipDrag(): void {
    this.isDraggingClip.set(false);
  }

  // Clip splitting functionality
  splitClip(clipId: string, splitPosition: number): { leftClip: Clip; rightClip: Clip } | null {
    // Find the clip and its track
    let targetClip: Clip | undefined;
    let targetTrack: Track | undefined;
    
    for (const track of this.tracks()) {
      const clip = track.clips.find(c => c.id === clipId);
      if (clip) {
        targetClip = clip;
        targetTrack = track;
        break;
      }
    }
    
    if (!targetClip || !targetTrack) {
      console.error('Clip not found:', clipId);
      return null;
    }
    
    // Validate split position
    const clipStart = targetClip.startTime;
    const clipEnd = targetClip.startTime + targetClip.duration;
    
    if (splitPosition <= clipStart || splitPosition >= clipEnd) {
      console.error('Split position outside clip bounds:', { splitPosition, clipStart, clipEnd });
      return null;
    }
    
    // Calculate relative position within the clip
    const relativePosition = splitPosition - clipStart;
    
    // Create left part (keep original clip ID)
    // Left clip keeps original start time and ends exactly at split position
    const leftClip: Clip = {
      ...targetClip,
      duration: relativePosition,  // New duration is from start to split point
      // trimEnd needs to account for what we're cutting off
      trimEnd: targetClip.trimEnd + (targetClip.duration - relativePosition),
      waveform: undefined // Force regeneration for left clip too
    };
    
    // Create right part (new clip ID)
    // Right clip starts at split position with remaining duration
    const rightClip: Clip = {
      ...targetClip,
      id: crypto.randomUUID(),
      startTime: splitPosition,
      duration: targetClip.duration - relativePosition,
      trimStart: targetClip.trimStart + relativePosition,
      // Offset stays the same - trimStart handles the position in buffer
      offset: targetClip.offset,
      waveform: undefined // Will need regeneration
    };
    
    // Log for debugging
    console.log('=== SPLIT CALCULATION DETAILS ===');
    console.log('Split calculation:', {
      original: {
        startTime: targetClip.startTime,
        duration: targetClip.duration,
        offset: targetClip.offset,
        trimStart: targetClip.trimStart,
        trimEnd: targetClip.trimEnd,
        originalDuration: targetClip.originalDuration
      },
      splitPosition,
      relativePosition,
      left: {
        startTime: leftClip.startTime,
        duration: leftClip.duration,
        endTime: leftClip.startTime + leftClip.duration,
        offset: leftClip.offset,
        trimStart: leftClip.trimStart,
        trimEnd: leftClip.trimEnd,
        effectiveDuration: leftClip.originalDuration - leftClip.trimStart - leftClip.trimEnd
      },
      right: {
        startTime: rightClip.startTime,
        duration: rightClip.duration,
        endTime: rightClip.startTime + rightClip.duration,
        offset: rightClip.offset,
        trimStart: rightClip.trimStart,
        trimEnd: rightClip.trimEnd,
        effectiveDuration: rightClip.originalDuration - rightClip.trimStart - rightClip.trimEnd
      },
      validation: {
        leftEndsAtSplit: (leftClip.startTime + leftClip.duration) === splitPosition,
        rightStartsAtSplit: rightClip.startTime === splitPosition,
        totalDurationMatch: (leftClip.duration + rightClip.duration) === targetClip.duration,
        leftEndExact: Math.abs((leftClip.startTime + leftClip.duration) - splitPosition) < 0.0001,
        rightStartExact: Math.abs(rightClip.startTime - splitPosition) < 0.0001
      }
    });
    
    // Update track with split clips
    this.tracks.update(tracks => {
      return tracks.map(track => {
        if (track.id !== targetTrack.id) return track;
        
        // Replace original clip with left and right parts
        const newClips = track.clips.map(clip => {
          if (clip.id === clipId) {
            return leftClip;
          }
          return clip;
        });
        
        // Add right clip
        newClips.push(rightClip);
        
        // Sort by start time for consistency
        newClips.sort((a, b) => a.startTime - b.startTime);
        
        return {
          ...track,
          clips: newClips
        };
      });
    });
    
    return { leftClip, rightClip };
  }
  
  splitAllClipsAtPosition(position: number): void {
    const allClips = this.flattenedClips();
    const clipsToSplit = allClips.filter(clip => {
      const clipStart = clip.startTime;
      const clipEnd = clip.startTime + clip.duration;
      return position > clipStart && position < clipEnd;
    });
    
    console.log(`Splitting ${clipsToSplit.length} clips at position ${position}`);
    
    for (const clip of clipsToSplit) {
      this.splitClip(clip.id, position);
    }
    
    // Force a complete re-render by creating new track references
    this.forceTracksRefresh();
  }
  
  splitAtPlayhead(): void {
    const position = this.playhead();
    console.log('Splitting at playhead position:', position);
    this.splitAllClipsAtPosition(position);
  }
  
  // Force UI refresh by creating new object references
  forceTracksRefresh(): void {
    this.tracks.update(tracks => {
      // Create completely new array with new track objects
      return tracks.map(track => ({
        ...track,
        clips: [...track.clips]
      }));
    });
  }
}