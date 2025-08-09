import { Component, ElementRef, HostListener, ViewChild, ViewChildren, QueryList, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioEngineService } from './audio-engine.service';
import { SoundLibraryService } from './sound-library.service';
import { EditorStateService } from './editor-state.service';
import { DefaultArrangementService } from './default-arrangement.service';
import { WaveformService } from './waveform.service';
import { SoundBrowserComponent } from './sound-browser.component';
import { ClipComponent, ClipDragEvent, ClipTrimEvent, ClipSelectEvent } from './clip.component';
import { TrackComponent, TrackMuteEvent, TrackSoloEvent, TrackDeleteEvent, TrackDropEvent, TrackDragEvent } from './track.component';
import { Clip, Track } from './models';
import { secondsToPx, pxToSeconds } from './timeline.util';

import { MatSliderModule } from '@angular/material/slider';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'audio-editor',
  standalone: true,
  imports: [CommonModule, MatSliderModule, MatIconModule, MatButtonModule, MatTooltipModule, SoundBrowserComponent, ClipComponent, TrackComponent],
  templateUrl: './audio-editor.component.html',
  styleUrls: ['./audio-editor.component.css']
})
export class AudioEditorComponent {
  @ViewChild('timeline') timelineEl!: ElementRef<HTMLDivElement>;

  // Use signals from EditorStateService
  get pxPerSecond() { return this.editorState.pxPerSecond; }
  get playhead() { return this.editorState.playhead; }
  get isPlaying() { return this.editorState.isPlaying; }
  get tracks() { return this.editorState.tracks; }
  get selectedClipId() { return this.editorState.selectedClipId; }
  get showSoundBrowser() { return this.editorState.showSoundBrowser; }
  
  scrollX = signal(0);

  duration = computed(() => {
    const t = this.editorState.tracks();
    let max = 0;
    let maxClip = null;
    for (const tr of t) {
      for (const c of tr.clips) {
        const clipEnd = c.startTime + c.duration;
        if (clipEnd > max) {
          max = clipEnd;
          maxClip = c;
        }
      }
    }
    const result = Math.max(10, Math.ceil(max) + 5); // Add 5s buffer
    console.log(`Duration calculated: ${result}s from ${t.length} tracks with total ${t.reduce((sum, tr) => sum + tr.clips.length, 0)} clips. Max clip end: ${max}s`, maxClip?.name);
    return result;
  });

  getTimelineMarkers(): number[] {
    const dur = this.duration();
    const markers = Array.from({length: dur + 1}, (_, i) => i);    
    return markers;
  }

  constructor(
    private audio: AudioEngineService, 
    private soundLibrary: SoundLibraryService,
    public editorState: EditorStateService,
    private defaultArrangement: DefaultArrangementService,
    private waveformService: WaveformService
  ) {
    this.addDefaultHipHopTrack();
    
    // Initialize sound library
    this.soundLibrary.preloadEssentials().catch(console.error);
    
    effect(() => {
      if (!this.isPlaying()) this.audio.stop();
    });
  }

  async onFilesSelected(files: FileList | null, targetTrack?: Track) {
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
    
    this.tracks.update(list => {
      const createTrack = (): Track => ({ id: crypto.randomUUID(), name: `Track ${list.length + 1}`, clips: [] as Clip[], mute: false, solo: false, volume: 1, pan: 0 });

      if (targetTrack) {
        // Files dropped on specific track - add them at playhead position or after existing clips
        const idx = list.findIndex(t => t === targetTrack);
        const track = idx >= 0 ? list[idx]! : (list[0] ?? (list[0] = createTrack()));
        
        let startTime = this.playhead();
        
        // Check if playhead position is available on this track
        const playheadAvailable = !track.clips.some(clip => {
          const clipStart = clip.startTime;
          const clipEnd = clip.startTime + clip.duration;
          return startTime >= clipStart && startTime < clipEnd;
        });
        
        if (!playheadAvailable && track.clips.length > 0) {
          // Find next available position after playhead
          const clipsAfterPlayhead = track.clips.filter(c => c.startTime >= startTime);
          if (clipsAfterPlayhead.length > 0) {
            // Find gap after playhead
            clipsAfterPlayhead.sort((a, b) => a.startTime - b.startTime);
            let gapFound = false;
            
            for (let i = 0; i < clipsAfterPlayhead.length; i++) {
              const currentClip = clipsAfterPlayhead[i];
              const nextClip = clipsAfterPlayhead[i + 1];
              
              if (!nextClip) {
                // After last clip
                startTime = currentClip.startTime + currentClip.duration + 0.1;
                gapFound = true;
                break;
              } else {
                // Check gap between clips
                const gapStart = currentClip.startTime + currentClip.duration;
                const gapSize = nextClip.startTime - gapStart;
                const totalDuration = buffers.reduce((sum, buf) => sum + buf.duration, 0) + (buffers.length - 1) * 0.1;
                
                if (gapSize >= totalDuration) {
                  startTime = gapStart + 0.1;
                  gapFound = true;
                  break;
                }
              }
            }
            
            if (!gapFound) {
              // Place after all clips
              const lastClip = track.clips.reduce((latest, clip) => 
                (clip.startTime + clip.duration) > (latest.startTime + latest.duration) ? clip : latest
              );
              startTime = lastClip.startTime + lastClip.duration + 0.1;
            }
          } else {
            // Place after all clips
            const lastClip = track.clips.reduce((latest, clip) => 
              (clip.startTime + clip.duration) > (latest.startTime + latest.duration) ? clip : latest
            );
            startTime = lastClip.startTime + lastClip.duration + 0.1;
          }
        }
        
        // Add all clips to this track
        buffers.forEach((buf, i) => {
          const name = filesArray[i]?.name.replace(/\.[^.]+$/, '') || `Audio ${i + 1}`;
          const color = this.randomColor();
          const waveform = this.waveformService.generateFromBuffer(buf, {
            width: Math.floor(buf.duration * this.pxPerSecond()),
            height: 44,
            clipColor: color
          });
          track.clips.push({ 
            id: crypto.randomUUID(), 
            name, 
            startTime: startTime, 
            duration: buf.duration, 
            offset: 0, 
            buffer: buf, 
            color, 
            waveform,
            trimStart: 0,
            trimEnd: 0,
            originalDuration: buf.duration 
          });
          startTime += buf.duration + 0.1;
        });
        console.log(`Added ${buffers.length} files to ${track.name} starting at ${startTime.toFixed(2)}s`);
      } else {
        // Files dropped in general area - distribute intelligently
        buffers.forEach((buf, i) => {
          const name = filesArray[i]?.name.replace(/\.[^.]+$/, '') || `Audio ${i + 1}`;
          const color = this.randomColor();
          const waveform = this.waveformService.generateFromBuffer(buf, {
            width: Math.floor(buf.duration * this.pxPerSecond()),
            height: 44,
            clipColor: color
          });
          
          // Try to find a track with space at playhead position
          let placedOnExistingTrack = false;
          const playheadPos = this.playhead();
          
          for (const track of list) {
            const canPlace = !track.clips.some(clip => {
              const clipStart = clip.startTime;
              const clipEnd = clip.startTime + clip.duration;
              const newClipEnd = playheadPos + buf.duration;
              return !(newClipEnd <= clipStart || playheadPos >= clipEnd);
            });
            
            if (canPlace) {
              track.clips.push({ 
                id: crypto.randomUUID(), 
                name, 
                startTime: playheadPos, 
                duration: buf.duration, 
                offset: 0, 
                buffer: buf, 
                color, 
                waveform,
                trimStart: 0,
                trimEnd: 0,
                originalDuration: buf.duration 
              });
              placedOnExistingTrack = true;
              console.log(`Added ${name} to existing ${track.name} at playhead`);
              break;
            }
          }
          
          if (!placedOnExistingTrack) {
            // Create new track
            const newTrack = createTrack();
            newTrack.clips.push({ 
              id: crypto.randomUUID(), 
              name, 
              startTime: playheadPos, 
              duration: buf.duration, 
              offset: 0, 
              buffer: buf, 
              color, 
              waveform,
              trimStart: 0,
              trimEnd: 0,
              originalDuration: buf.duration 
            });
            list.push(newTrack);
            console.log(`Added ${name} to new ${newTrack.name} at playhead`);
          }
        });
      }
      // Return new array with deep copy to ensure change detection
      return list.map(track => ({
        ...track,
        clips: [...track.clips]
      }));
    });
  }


  async addDefaultHipHopTrack() {
    const defaultTracks = await this.defaultArrangement.createDefaultHipHopTracks();
    this.editorState.tracks.update(list => [...list, ...defaultTracks]);
  }

  private removeTrack(track: Track) {
    this.tracks.update(list => list.filter(t => t !== track));
  }

  private toggleMute(track: Track) {
    this.tracks.update(list => 
      list.map(t => t.id === track.id ? { ...t, mute: !t.mute } : t)
    );
    
    // If currently playing, restart playback with new mute states
    if (this.isPlaying()) {
      this.restartPlaybackFromCurrentPosition();
    }
  }

  private toggleSolo(track: Track) {
    this.tracks.update(list => {
      const hasSoloTracks = list.some(t => t.solo);
      const isTrackCurrentlySolo = track.solo;
      
      if (!hasSoloTracks) {
        // No tracks are solo, make this track solo
        return list.map(t => t.id === track.id ? { ...t, solo: true } : t);
      } else if (isTrackCurrentlySolo) {
        // This track is solo, turn off solo
        return list.map(t => t.id === track.id ? { ...t, solo: false } : t);
      } else {
        // Other tracks are solo, add this track to solo
        return list.map(t => t.id === track.id ? { ...t, solo: true } : t);
      }
    });
    
    // If currently playing, restart playback with new solo states
    if (this.isPlaying()) {
      this.restartPlaybackFromCurrentPosition();
    }
  }
  
  trackByFn(index: number, track: Track): string {
    return track.id;
  }

  // Track event handlers
  onTrackMuteToggled(event: TrackMuteEvent) {
    this.toggleMute(event.track);
  }
  
  onTrackSoloToggled(event: TrackSoloEvent) {
    this.toggleSolo(event.track);
  }
  
  onTrackDeleted(event: TrackDeleteEvent) {
    this.removeTrack(event.track);
  }
  
  onTrackDrop(event: TrackDropEvent) {
    this.onDrop(event.event, event.track);
  }
  
  onTrackDragOver(event: TrackDragEvent) {
    this.onDragOver(event.event);
  }
  
  onTrackDragEnter(event: TrackDragEvent) {
    this.onDragEnter(event.event, event.track);
  }
  
  onTrackDragLeave(event: TrackDragEvent) {
    this.onDragLeave(event.event);
  }

  private restartPlaybackFromCurrentPosition() {
    const currentPlayheadPosition = this.playhead();
    this.audio.stop();
    const clips = this.getPlayableClips();
    this.audio.play(clips, currentPlayheadPosition);
    this.tickPlayhead();
  }

  private getPlayableClips() {
    const tracks = this.tracks();
    const hasSoloTracks = tracks.some(t => t.solo);
    
    return tracks
      .filter(track => {
        // If there are solo tracks, only play solo tracks
        // If no solo tracks, play all non-muted tracks
        return hasSoloTracks ? track.solo : !track.mute;
      })
      .flatMap(track => track.clips.map(clip => ({
        buffer: clip.buffer,
        startTime: clip.startTime,
        duration: clip.duration,
        offset: clip.offset,
        gain: track.volume,
        pan: track.pan,
        muted: false, // Already filtered out muted tracks above
        trimStart: clip.trimStart,
        trimEnd: clip.trimEnd
      })));
  }


  private flattenClips(): Clip[] {
    return this.editorState.flattenedClips();
  }

  // Use drag state from service
  get dragState() { return this.editorState.dragState; }
  set dragState(value) { this.editorState.dragState = value; }
  
  get trimState() { return this.editorState.trimState; }
  set trimState(value) { this.editorState.trimState = value; }
  
  get clipboardClip() { return this.editorState.clipboardClip; }
  set clipboardClip(value) { this.editorState.clipboardClip = value; }
  
  get dragOverTrack() { return this.editorState.dragOverTrack; }
  set dragOverTrack(value) { this.editorState.dragOverTrack = value; }

  onClipSelected(event: ClipSelectEvent) {
    this.editorState.selectedClipId.set(event.clip.id);
  }

  onClipDragStarted(event: ClipDragEvent) {
    this.dragState = { 
      id: event.clip.id, 
      startX: event.startX, 
      origStartTime: event.origStartTime, 
      clipRef: event.clip 
    };
  }

  onClipTrimStarted(event: ClipTrimEvent) {
    this.trimState = {
      id: event.clip.id,
      side: event.side,
      startX: event.startX,
      originalTrimStart: event.originalTrimStart,
      originalTrimEnd: event.originalTrimEnd,
      originalDuration: event.originalDuration,
      originalStartTime: event.originalStartTime,
      clipRef: event.clip
    };
  }

  private lastDragUpdate = 0;
  private rafId: number | null = null;
  private seekingRafId: number | null = null;


  @HostListener('window:mousemove', ['$event'])
  onMouseMove(ev: MouseEvent) {
    // Handle seeking (ruler and lane dragging) with throttling
    if (this.seeking) {
      // Cancel previous seeking RAF if exists
      if (this.seekingRafId) {
        cancelAnimationFrame(this.seekingRafId);
      }
      
      // Throttle seeking updates using RAF for smooth 60fps
      this.seekingRafId = requestAnimationFrame(() => {
        if (!this.seeking) return;
        
        const target = ev.target as HTMLElement;
        const timelineEl = target.closest('.ruler') || target.closest('.lane');
        if (timelineEl) {
          let rect: DOMRect;
          let clipsEl: Element | null = null;
          
          if (timelineEl.classList.contains('ruler')) {
            rect = timelineEl.getBoundingClientRect();
          } else {
            // For lanes, use the clips element for correct positioning
            clipsEl = timelineEl.querySelector('.clips');
            if (!clipsEl) return;
            rect = clipsEl.getBoundingClientRect();
          }
          
          const x = ev.clientX - rect.left;
          const timePosition = Math.max(0, pxToSeconds(x, this.pxPerSecond()));
          this.seekTo(timePosition);
        }
        this.seekingRafId = null;
      });
      return;
    }
    
    // Trimming is now handled by individual ClipComponents
    
    // Handle clip dragging with optimized updates
    if (this.dragState) {
      // Cancel previous RAF
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
      }
      
      // Throttle updates using RAF for smooth 60fps
      this.rafId = requestAnimationFrame(() => {
        if (!this.dragState) return;
        
        const dx = ev.clientX - this.dragState.startX;
        const deltaSec = pxToSeconds(dx, this.pxPerSecond());
        const newTime = Math.max(0, this.dragState.origStartTime + deltaSec);
        
        // Direct update for smoother dragging
        if (this.dragState.clipRef) {
          // Check for overlaps with other clips on the same track
          const draggedClip = this.dragState.clipRef;
          let finalTime = newTime;
          
          // Find the track containing this clip
          const tracks = this.tracks();
          let currentTrack: Track | null = null;
          for (const track of tracks) {
            if (track.clips.some(c => c.id === draggedClip.id)) {
              currentTrack = track;
              break;
            }
          }
          
          if (currentTrack) {
            // Check for overlaps with other clips on same track
            const otherClips = currentTrack.clips.filter(c => c.id !== draggedClip.id);
            
            for (const otherClip of otherClips) {
              const draggedStart = finalTime;
              const draggedEnd = finalTime + draggedClip.duration;
              const otherStart = otherClip.startTime;
              const otherEnd = otherClip.startTime + otherClip.duration;
              
              // Check if clips would overlap
              if (!(draggedEnd <= otherStart || draggedStart >= otherEnd)) {
                // Snap to avoid overlap - position after the blocking clip
                if (draggedStart < otherStart) {
                  finalTime = Math.max(0, otherStart - draggedClip.duration - 0.05);
                } else {
                  finalTime = otherEnd + 0.05; // 50ms gap
                }
              }
            }
          }
          
          this.dragState.clipRef.startTime = Math.max(0, finalTime);
          
          // Only check for track changes occasionally to reduce overhead
          const now = performance.now();
          if (now - this.lastDragUpdate > 100) { // Every 100ms
            const targetTrackIdx = this.getTrackIndexAtClientY(ev.clientY);
            
            // Only proceed if we're actually changing tracks
            if (targetTrackIdx !== null) {
              this.tracks.update(list => {
                // Find current track
                let sourceTrackIdx = -1;
                let clipIdx = -1;
                for (let ti = 0; ti < list.length; ti++) {
                  const idx = list[ti]!.clips.findIndex(c => c.id === this.dragState!.clipRef?.id);
                  if (idx !== -1) {
                    sourceTrackIdx = ti;
                    clipIdx = idx;
                    break;
                  }
                }
                
                // Move between tracks if needed
                if (targetTrackIdx !== sourceTrackIdx && 
                    targetTrackIdx >= 0 && targetTrackIdx < list.length && 
                    sourceTrackIdx >= 0 && this.dragState!.clipRef) {
                  
                  const sourceTrack = list[sourceTrackIdx]!;
                  const targetTrack = list[targetTrackIdx]!;
                  const draggedClip = this.dragState!.clipRef;
                  let targetStartTime = draggedClip.startTime;
                  
                  // Check if current position on target track is available
                  const positionAvailable = !targetTrack.clips.some(clip => {
                    const clipStart = clip.startTime;
                    const clipEnd = clip.startTime + clip.duration;
                    const draggedEnd = targetStartTime + draggedClip.duration;
                    return !(draggedEnd <= clipStart || targetStartTime >= clipEnd);
                  });
                  
                  if (!positionAvailable) {
                    // Find nearest available position
                    const sortedClips = [...targetTrack.clips].sort((a, b) => a.startTime - b.startTime);
                    let foundPosition = false;
                    
                    // Check if we can fit before the first clip
                    if (sortedClips.length > 0 && sortedClips[0].startTime >= draggedClip.duration + 0.05) {
                      targetStartTime = 0;
                      foundPosition = true;
                    }
                    
                    // Try to find a gap between clips
                    if (!foundPosition) {
                      for (let i = 0; i < sortedClips.length - 1; i++) {
                        const currentClip = sortedClips[i];
                        const nextClip = sortedClips[i + 1];
                        const gapStart = currentClip.startTime + currentClip.duration + 0.05;
                        const gapEnd = nextClip.startTime;
                        const requiredSpace = draggedClip.duration + 0.05;
                        
                        if ((gapEnd - gapStart) >= requiredSpace) {
                          targetStartTime = gapStart;
                          foundPosition = true;
                          break;
                        }
                      }
                    }
                    
                    // Place after all existing clips
                    if (!foundPosition) {
                      if (sortedClips.length > 0) {
                        const lastClip = sortedClips[sortedClips.length - 1];
                        targetStartTime = lastClip.startTime + lastClip.duration + 0.05;
                      } else {
                        targetStartTime = Math.max(0, targetStartTime);
                      }
                    }
                  }
                  
                  // Remove from source track
                  sourceTrack.clips.splice(clipIdx, 1);
                  
                  // Update clip position and add to target track
                  draggedClip.startTime = Math.max(0, targetStartTime);
                  targetTrack.clips.push(draggedClip);
                  
                  console.log(`Moved "${draggedClip.name}" from ${sourceTrack.name} to ${targetTrack.name} at ${targetStartTime.toFixed(2)}s`);
                }
                
                // Return new array to trigger change detection
                return list.map(track => ({
                  ...track,
                  clips: [...track.clips]
                }));
              });
            }
            
            this.lastDragUpdate = now;
          }
        }
      });
    }
    
    // Seeking is now handled in the dedicated seeking section above
    // This legacy seeking code is no longer needed
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    // Ignore if user is typing in input field
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    console.log('Key pressed:', event.key, 'Ctrl:', event.ctrlKey); // Debug

    const selectedClip = this.getSelectedClip();
    console.log('Selected clip:', selectedClip?.name || 'none'); // Debug

    // Copy (Ctrl+C)
    if (event.ctrlKey && (event.key === 'c' || event.key === 'C') && selectedClip) {
      event.preventDefault();
      console.log('Copying clip:', selectedClip.name);
      this.copyClip(selectedClip);
      return;
    }

    // Paste (Ctrl+V)
    if (event.ctrlKey && (event.key === 'v' || event.key === 'V')) {
      event.preventDefault();
      console.log('Pasting clip, clipboard has:', this.clipboardClip?.name || 'nothing');
      if (this.clipboardClip) {
        this.pasteClip();
      }
      return;
    }

    // Delete (Del)
    if (event.key === 'Delete' && selectedClip) {
      event.preventDefault();
      console.log('Deleting clip:', selectedClip.name);
      this.deleteClip(selectedClip);
      return;
    }
  }

  @HostListener('window:mouseup')
  onMouseUp() {
    // Cancel any pending RAF updates
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    
    // Cancel seeking RAF if exists
    if (this.seekingRafId) {
      cancelAnimationFrame(this.seekingRafId);
      this.seekingRafId = null;
    }
    
    this.dragState = null;
    this.trimState = null;
    this.seeking = false;
    (document.body as any).style.userSelect = '';
  }

  private getTrackIndexAtClientY(clientY: number): number | null {
    // Get all lane elements from TrackComponents
    const trackElements = document.querySelectorAll('audio-track .lane');
    for (let i = 0; i < trackElements.length; i++) {
      const rect = trackElements[i]!.getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) return i;
    }
    return null;
  }

  onWheel(ev: WheelEvent) {
    if (!ev.ctrlKey) return;
    ev.preventDefault();
    const factor = ev.deltaY > 0 ? 0.9 : 1.1;
    const next = Math.min(600, Math.max(40, Math.round(this.pxPerSecond() * factor)));
    this.pxPerSecond.set(next);
  }

  private tickRAF?: number;
  private tickPlayhead() {
    cancelAnimationFrame(this.tickRAF!);
    const start = performance.now();
    const origin = this.playhead();
    const loop = (t: number) => {
      if (!this.isPlaying()) return;
      const sec = (t - start) / 1000;
      this.playhead.set(origin + sec);
      this.tickRAF = requestAnimationFrame(loop);
    };
    this.tickRAF = requestAnimationFrame(loop);
  }


  seekTo(sec: number) { 
    this.playhead.set(sec);
    
    // If playing, restart from new position
    if (this.isPlaying()) {
      this.audio.stop();
      const all = this.flattenClips();
      this.audio.play(all.map(c => ({
        buffer: c.buffer,
        startTime: c.startTime,
        duration: c.duration,
        offset: c.offset,
        gain: 1,
        pan: 0,
        muted: false,
        trimStart: c.trimStart,
        trimEnd: c.trimEnd
      })), sec);
      // Restart the playhead ticker from new position
      this.tickPlayhead();
    }
  }

  randomColor() { 
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
    return colors[Math.floor(Math.random() * colors.length)]!;
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }



  getSelectedClip(): Clip | null {
    const selectedId = this.editorState.selectedClipId();
    if (!selectedId) return null;
    
    return this.flattenClips().find(c => c.id === selectedId) || null;
  }

  copyClip(clip: Clip): void {
    // Create a deep copy of the clip (without the buffer reference)
    this.clipboardClip = {
      ...clip,
      id: crypto.randomUUID(), // New ID for the copy
      startTime: 0 // Reset position for pasting
    };
    console.log(`Clip "${clip.name}" copied to clipboard`);
  }

  pasteClip(): void {
    if (!this.clipboardClip) return;

    this.tracks.update(list => {
      // Find first empty track or create new one
      let targetTrack = list.find(t => t.clips.length === 0);
      
      if (!targetTrack) {
        // Create new track
        targetTrack = {
          id: crypto.randomUUID(),
          name: `Track ${list.length + 1}`,
          clips: [],
          mute: false,
          solo: false,
          volume: 1,
          pan: 0
        };
        list.push(targetTrack);
      }

      // Create the pasted clip with a new ID
      const pastedClip: Clip = {
        ...this.clipboardClip!,
        id: crypto.randomUUID(),
        startTime: this.playhead(), // Paste at current playhead position
        color: this.randomColor() // New color
      };

      targetTrack.clips.push(pastedClip);
      
      // Select the newly pasted clip
      this.editorState.selectedClipId.set(pastedClip.id);
      
      console.log(`Clip "${pastedClip.name}" pasted to ${targetTrack.name}`);
      
      return [...list];
    });
  }

  deleteClip(clip: Clip): void {
    this.tracks.update(list => {
      for (const track of list) {
        const clipIndex = track.clips.findIndex(c => c.id === clip.id);
        if (clipIndex !== -1) {
          track.clips.splice(clipIndex, 1);
          console.log(`Clip "${clip.name}" deleted`);
          break;
        }
      }
      
      // Clear selection if deleted clip was selected
      if (this.editorState.selectedClipId() === clip.id) {
        this.editorState.selectedClipId.set(null);
      }
      
      return [...list];
    });
  }


  async onSoundSelected(buffer: AudioBuffer & { name: string; category: string; id?: string }) {
    const color = this.randomColor();
    const waveform = this.waveformService.generateFromBuffer(buffer, {
      width: Math.floor(buffer.duration * this.pxPerSecond()),
      height: 44,
      clipColor: color
    });
    const playheadPosition = this.playhead();
    
    this.tracks.update(list => {
      // Strategy: Try to place at playhead position on existing track, otherwise create new track
      let targetTrack: Track | null = null;
      let targetStartTime = playheadPosition;
      let placementStrategy = '';
      
      // First pass: Look for exact playhead position availability
      for (const track of list) {
        const isPositionFree = !track.clips.some(clip => {
          const clipStart = clip.startTime;
          const clipEnd = clip.startTime + clip.duration;
          const newClipEnd = playheadPosition + buffer.duration;
          return !(newClipEnd <= clipStart || playheadPosition >= clipEnd);
        });
        
        if (isPositionFree) {
          targetTrack = track;
          targetStartTime = playheadPosition;
          placementStrategy = `at playhead on ${track.name}`;
          break;
        }
      }
      
      // Second pass: If playhead position not available, look for nearest gap on any track
      if (!targetTrack) {
        let bestOption: { track: Track; startTime: number; distance: number } | null = null;
        
        for (const track of list) {
          const sortedClips = [...track.clips].sort((a, b) => a.startTime - b.startTime);
          
          // Check gap before first clip
          if (sortedClips.length > 0 && sortedClips[0].startTime >= buffer.duration + 0.05) {
            const distance = Math.abs(0 - playheadPosition);
            if (!bestOption || distance < bestOption.distance) {
              bestOption = { track, startTime: 0, distance };
            }
          }
          
          // Check gaps between clips
          for (let i = 0; i < sortedClips.length - 1; i++) {
            const currentClip = sortedClips[i];
            const nextClip = sortedClips[i + 1];
            const gapStart = currentClip.startTime + currentClip.duration + 0.05;
            const gapSize = nextClip.startTime - gapStart;
            
            if (gapSize >= buffer.duration) {
              const distance = Math.abs(gapStart - playheadPosition);
              if (!bestOption || distance < bestOption.distance) {
                bestOption = { track, startTime: gapStart, distance };
              }
            }
          }
          
          // Check position after last clip
          if (sortedClips.length > 0) {
            const lastClip = sortedClips[sortedClips.length - 1];
            const afterLastPosition = lastClip.startTime + lastClip.duration + 0.05;
            const distance = Math.abs(afterLastPosition - playheadPosition);
            if (!bestOption || distance < bestOption.distance) {
              bestOption = { track, startTime: afterLastPosition, distance };
            }
          }
        }
        
        if (bestOption) {
          targetTrack = bestOption.track;
          targetStartTime = bestOption.startTime;
          placementStrategy = `in nearest gap on ${bestOption.track.name}`;
        }
      }
      
      if (targetTrack) {
        // Add to existing track
        const newClip = {
          id: crypto.randomUUID(),
          name: buffer.name,
          startTime: targetStartTime,
          duration: buffer.duration,
          offset: 0,
          buffer: buffer,
          color,
          waveform,
          trimStart: 0,
          trimEnd: 0,
          originalDuration: buffer.duration,
          soundId: buffer.id
        } as any;
        targetTrack.clips.push(newClip);
        console.log(`Added ${buffer.name} ${placementStrategy} at ${targetStartTime.toFixed(2)}s`);
        console.log(`Track "${targetTrack.name}" now has ${targetTrack.clips.length} clips:`, 
                    targetTrack.clips.map(c => `${c.name}@${c.startTime.toFixed(1)}s`));
      } else {
        // Create new track - all existing tracks are too busy
        const newTrack: Track = {
          id: crypto.randomUUID(),
          name: `Track ${list.length + 1}`,
          clips: [{
            id: crypto.randomUUID(),
            name: buffer.name,
            startTime: playheadPosition,
            duration: buffer.duration,
            offset: 0,
            buffer: buffer,
            color,
            waveform,
            trimStart: 0,
            trimEnd: 0,
            originalDuration: buffer.duration,
            soundId: buffer.id
          } as any],
          mute: false,
          solo: false,
          volume: 1,
          pan: 0
        };
        list.push(newTrack);
        console.log(`Added ${buffer.name} on new ${newTrack.name} at playhead ${playheadPosition.toFixed(2)}s`);
      }
      
      // Return new array with deep copy to ensure change detection
      return list.map(track => ({
        ...track,
        clips: [...track.clips]
      }));
    });
  }

  // --- Drag & Drop from Sound Library ---
  onDragOver(event: DragEvent) {
    // Skip processing if sound drag is not active (window dragging)
    if (!(window as any).soundDragActive) {
      return;
    }
    
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'copy';
  }

  onDragEnter(event: DragEvent, track: Track) {
    // Skip processing if sound drag is not active (window dragging)
    if (!(window as any).soundDragActive) {
      return;
    }
    
    event.preventDefault();
    this.dragOverTrack = track;
    console.log(`Drag enter track: ${track.name}`);
  }

  onDragLeave(event: DragEvent) {
    // Skip processing if sound drag is not active (window dragging)
    if (!(window as any).soundDragActive) {
      return;
    }
    
    // Only clear if we're leaving the lane entirely
    const relatedTarget = event.relatedTarget as HTMLElement;
    if (!relatedTarget || !relatedTarget.closest('.lane')) {
      this.dragOverTrack = null;
    }
  }

  onDrop(event: DragEvent, track: Track) {
    event.preventDefault();
    this.dragOverTrack = null;
    
    // Check if it's a sound from the library
    const textData = event.dataTransfer?.getData('text/plain');
    if (textData) {
      try {
        const dragData = JSON.parse(textData);
        if (dragData.type === 'sound') {
          console.log(`Dropped sound ${dragData.name} on track ${track.name}`);
          this.handleSoundDrop(dragData, track, event);
          return;
        }
      } catch (e) {
        console.log('Not a sound drop, checking for files...');
      }
    }
    
    // Handle file drops (existing functionality)
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.onFilesSelected(files, track);
    }
  }

  private async handleSoundDrop(soundData: any, track: Track, event: DragEvent) {
    try {
      // Load the sound
      const buffer = await this.soundLibrary.loadSound(soundData.id);
      if (!buffer) {
        console.error('Failed to load sound for drop');
        return;
      }
      
      // Calculate drop position based on mouse position
      // Use document.elementFromPoint to get the actual element under the mouse
      const elementUnderMouse = document.elementFromPoint(event.clientX, event.clientY);
      const lane = elementUnderMouse?.closest('.lane') as HTMLElement;
      
      if (!lane) {
        console.error('Could not find lane element at drop position');
        // Fallback to using playhead position
        const dropTime = this.playhead();
        this.addSoundToTrack(Object.assign(buffer, {
          name: soundData.name,
          category: soundData.category,
          id: soundData.id
        }), track, dropTime);
        return;
      }
      
      const clipsEl = lane.querySelector('.clips');
      if (!clipsEl) {
        console.error('Could not find .clips element in lane');
        // Fallback to using playhead position
        const dropTime = this.playhead();
        this.addSoundToTrack(Object.assign(buffer, {
          name: soundData.name,
          category: soundData.category,
          id: soundData.id
        }), track, dropTime);
        return;
      }
      
      const rect = clipsEl.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const dropTime = Math.max(0, pxToSeconds(x, this.pxPerSecond()));
      
      // Create the audio buffer with metadata
      const audioBuffer = Object.assign(buffer, {
        name: soundData.name,
        category: soundData.category,
        id: soundData.id
      });
      
      // Add to specific track at drop position
      this.addSoundToTrack(audioBuffer, track, dropTime);
      
      console.log(`Added ${soundData.name} to ${track.name} at ${dropTime.toFixed(2)}s`);
      
    } catch (error) {
      console.error('Error handling sound drop:', error);
    }
  }

  private addSoundToTrack(buffer: AudioBuffer & { name: string; category: string; id?: string }, track: Track, startTime: number) {
    const color = this.randomColor();
    const waveform = this.waveformService.generateFromBuffer(buffer, {
      width: Math.floor(buffer.duration * this.pxPerSecond()),
      height: 44,
      clipColor: color
    });
    
    // Check for overlaps and find suitable position
    let finalStartTime = startTime;
    const newClipEnd = startTime + buffer.duration;
    
    const overlappingClip = track.clips.find(clip => {
      const clipStart = clip.startTime;
      const clipEnd = clip.startTime + clip.duration;
      return !(newClipEnd <= clipStart || startTime >= clipEnd);
    });
    
    if (overlappingClip) {
      // Find next available position after overlapping clip
      finalStartTime = overlappingClip.startTime + overlappingClip.duration + 0.1;
      console.log(`Adjusted position due to overlap: ${finalStartTime.toFixed(2)}s`);
    }
    
    this.tracks.update(list => {
      const targetTrack = list.find(t => t.id === track.id);
      if (targetTrack) {
        const newClip: Clip = {
          id: crypto.randomUUID(),
          name: buffer.name,
          startTime: finalStartTime,
          duration: buffer.duration,
          offset: 0,
          buffer: buffer,
          color,
          waveform,
          trimStart: 0,
          trimEnd: 0,
          originalDuration: buffer.duration
        };
        
        targetTrack.clips.push(newClip);
      }
      
      return [...list];
    });
  }

  // --- Seeking per Maus in Ruler/Lane ---
  private seeking = false;
  rulerMouseDown(ev: MouseEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const timePosition = pxToSeconds(x, this.pxPerSecond());
    console.log(`Timeline seek to: ${timePosition.toFixed(3)}s, isPlaying: ${this.isPlaying()}`);
    this.seekTo(timePosition);
    this.seeking = true;
    (document.body as any).style.userSelect = 'none';
  }
  laneMouseDown(ev: MouseEvent) {
    // Wenn auf einem Clip (oder innerhalb), kein Seeking auslösen
    if ((ev.target as HTMLElement)?.closest('.clip')) return;
    ev.preventDefault();
    ev.stopPropagation();
    const lane = ev.currentTarget as HTMLElement;
    const clipsEl = lane.querySelector('.clips');
    if (!clipsEl) return;
    const rect = clipsEl.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const timePosition = pxToSeconds(x, this.pxPerSecond());
    console.log(`Lane seek to: ${timePosition.toFixed(3)}s, isPlaying: ${this.isPlaying()}`);
    this.seekTo(timePosition);
    this.seeking = true;
    (document.body as any).style.userSelect = 'none';
  }

}
