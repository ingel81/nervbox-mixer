import { Component, ElementRef, HostListener, ViewChild, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioEngineService } from '../services/audio-engine.service';
import { SoundLibraryService } from '../services/sound-library.service';
import { EditorStateService } from '../services/editor-state.service';
import { DefaultArrangementService } from '../services/default-arrangement.service';
import { WaveformService } from '../services/waveform.service';
import { SoundBrowserComponent } from './sound-browser.component';
import { BottomPanelComponent } from './bottom-panel.component';
import { PreviewClipComponent } from './preview-clip.component';
import { ClipDragEvent, ClipTrimEvent, ClipSelectEvent, ClipDeleteEvent, ClipDuplicateEvent } from './clip.component';
import { TrackMuteEvent, TrackSoloEvent, TrackDeleteEvent, TrackRenameEvent, TrackDropEvent, TrackDragEvent } from './track.component';
import { TrackHeaderComponent } from './track-header.component';
import { TrackLaneComponent } from './track-lane.component';
import { Clip, Track } from '../models/models';
import { pxToSeconds } from '../utils/timeline.util';

import { MatSliderModule } from '@angular/material/slider';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { environment } from '../../../environments/environment';

@Component({
    selector: 'audio-editor',
    imports: [CommonModule, MatSliderModule, MatIconModule, MatButtonModule, MatTooltipModule, SoundBrowserComponent, BottomPanelComponent, PreviewClipComponent, TrackHeaderComponent, TrackLaneComponent],
    templateUrl: './audio-editor.component.html',
    styleUrls: ['./audio-editor.component.css']
})
export class AudioEditorComponent {
  @ViewChild('timeline') timelineEl!: ElementRef<HTMLDivElement>;
  @ViewChild('trackHeaders') trackHeadersEl!: ElementRef<HTMLDivElement>;
  @ViewChild('trackLanes') trackLanesEl!: ElementRef<HTMLDivElement>;

  // Use signals from EditorStateService
  get pxPerSecond() { return this.editorState.pxPerSecond; }
  get playhead() { return this.editorState.playhead; }
  get isPlaying() { return this.editorState.isPlaying; }
  get tracks() { return this.editorState.tracks; }
  get selectedClipId() { return this.editorState.selectedClipId; }
  get showSoundBrowser() { return this.editorState.showSoundBrowser; }
  get soundBrowserOpenedFromCta() { return this.editorState.soundBrowserOpenedFromCta; }
  
  // Loop dragging state
  private loopDragState: {
    marker: 'start' | 'end';
    startX: number;
    originalValue: number;
  } | null = null;
  
  // Loop region dragging state  
  private loopRegionDragState: {
    startX: number;
    originalStart: number;
    originalEnd: number;
    loopDuration: number;
  } | null = null;
  
  // Environment info
  version = environment.version;
  author = environment.author;
  repository = environment.repository;
  
  scrollX = signal(0);

  duration = computed(() => {
    const t = this.editorState.tracks();
    let max = 0;
    for (const tr of t) {
      for (const c of tr.clips) {
        const clipEnd = c.startTime + c.duration;
        if (clipEnd > max) {
          max = clipEnd;
        }
      }
    }
    const result = Math.max(10, Math.ceil(max) + 5); // Add 5s buffer
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
    
    // Listen for sound selection from bottom panel
    document.addEventListener('soundSelected', (event: Event) => {
      if (event instanceof CustomEvent) {
        this.onSoundSelected(event.detail);
      }
    });
    
    effect(() => {
      if (!this.isPlaying()) this.audio.stop();
    });
    
    // Setup sound drag event listeners
    this.setupSoundDragListeners();
  }
  
  private setupSoundDragListeners(): void {
    // Listen for sound drag start events
    document.addEventListener('soundDragStart', (event: Event) => {
      if (event instanceof CustomEvent) {
        this.handleSoundDragStart(event.detail);
      }
    });
    
    // Listen for sound drag move events
    document.addEventListener('soundDragMove', (event: Event) => {
      if (event instanceof CustomEvent) {
        this.handleSoundDragMove(event.detail);
      }
    });
    
    // Listen for sound drag end events
    document.addEventListener('soundDragEnd', (event: Event) => {
      if (event instanceof CustomEvent) {
        this.handleSoundDragEnd(event.detail);
      }
    });
  }

  addTrack(): void {
    this.editorState.addTrack();
  }

  async onFilesSelected(files: FileList | null, targetTrack?: Track) {
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
              return await this.audio.decode(f);
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
          const color = this.getColorByFilename(name);
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
      } else {
        // Files dropped in general area - distribute intelligently
        buffers.forEach((buf, i) => {
          const name = filesArray[i]?.name.replace(/\.[^.]+$/, '') || `Audio ${i + 1}`;
          const color = this.getColorByFilename(name);
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
    this.editorState.setArrangementName('DefaultBeat');
    
    // Activate first track
    if (defaultTracks.length > 0) {
      this.editorState.setActiveTrack(defaultTracks[0].id);
    }
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

  toggleSoundBrowser(source?: string) {
    this.editorState.toggleSoundBrowser(source);
  }
  
  // Loop controls
  toggleLoop() {
    this.editorState.toggleLoop();
  }
  
  loopMarkerMouseDown(event: MouseEvent, marker: 'start' | 'end') {
    event.preventDefault();
    event.stopPropagation();
    
    const rect = this.timelineEl.nativeElement.getBoundingClientRect();
    
    // Account for timeline horizontal scrolling - use track lanes scrollLeft
    const trackLanesEl = this.trackLanesEl?.nativeElement;
    const scrollLeft = trackLanesEl ? trackLanesEl.scrollLeft : 0;
    
    const startX = event.clientX - rect.left + scrollLeft;
    
    this.loopDragState = {
      marker,
      startX,
      originalValue: marker === 'start' ? this.editorState.loopStart() : this.editorState.loopEnd()
    };
    
    (document.body as HTMLElement).style.userSelect = 'none';
  }
  
  loopMarkerTouchStart(event: TouchEvent, marker: 'start' | 'end') {
    event.preventDefault();
    event.stopPropagation();
    
    const touch = event.touches[0];
    if (!touch) return;
    
    const rect = this.timelineEl.nativeElement.getBoundingClientRect();
    
    // Account for timeline horizontal scrolling - use track lanes scrollLeft
    const trackLanesEl = this.trackLanesEl?.nativeElement;
    const scrollLeft = trackLanesEl ? trackLanesEl.scrollLeft : 0;
    
    const startX = touch.clientX - rect.left + scrollLeft;
    
    this.loopDragState = {
      marker,
      startX,
      originalValue: marker === 'start' ? this.editorState.loopStart() : this.editorState.loopEnd()
    };
    
    (document.body as HTMLElement).style.userSelect = 'none';
  }
  
  loopRegionMouseDown(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    
    const rect = this.timelineEl.nativeElement.getBoundingClientRect();
    
    // Account for timeline horizontal scrolling - use track lanes scrollLeft
    const trackLanesEl = this.trackLanesEl?.nativeElement;
    const scrollLeft = trackLanesEl ? trackLanesEl.scrollLeft : 0;
    
    const startX = event.clientX - rect.left + scrollLeft;
    
    this.loopRegionDragState = {
      startX,
      originalStart: this.editorState.loopStart(),
      originalEnd: this.editorState.loopEnd(),
      loopDuration: this.editorState.loopEnd() - this.editorState.loopStart()
    };
    
    (document.body as HTMLElement).style.userSelect = 'none';
  }
  
  loopRegionTouchStart(event: TouchEvent) {
    event.preventDefault();
    event.stopPropagation();
    
    const touch = event.touches[0];
    if (!touch) return;
    
    const rect = this.timelineEl.nativeElement.getBoundingClientRect();
    
    // Account for timeline horizontal scrolling - use track lanes scrollLeft
    const trackLanesEl = this.trackLanesEl?.nativeElement;
    const scrollLeft = trackLanesEl ? trackLanesEl.scrollLeft : 0;
    
    const startX = touch.clientX - rect.left + scrollLeft;
    
    this.loopRegionDragState = {
      startX,
      originalStart: this.editorState.loopStart(),
      originalEnd: this.editorState.loopEnd(),
      loopDuration: this.editorState.loopEnd() - this.editorState.loopStart()
    };
    
    (document.body as HTMLElement).style.userSelect = 'none';
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

  onTrackRenamed(event: TrackRenameEvent) {
    this.editorState.renameTrack(event.track.id, event.newName);
  }
  
  onTrackHeaderClicked(event: { track: Track }) {
    this.editorState.setActiveTrack(event.track.id);
  }
  
  onTrackDrop(event: TrackDropEvent) {
    this.onDrop(event.event, event.track);
  }
  
  // REMOVED: onTrackDragOver - was causing continuous performance issues
  
  onTrackDragEnter(event: TrackDragEvent) {
    this.onDragEnter(event.event, event.track);
  }
  
  onTrackDragLeave(event: TrackDragEvent) {
    this.onDragLeave(event.event);
  }

  onTrackScroll(event: Event) {
    // Synchronize header scrolling with lanes
    const lanesEl = event.target as HTMLDivElement;
    if (this.trackHeadersEl) {
      this.trackHeadersEl.nativeElement.scrollTop = lanesEl.scrollTop;
    }
    // Synchronize timeline ruler horizontal scrolling
    if (this.timelineEl) {
      this.timelineEl.nativeElement.scrollLeft = lanesEl.scrollLeft;
    }
  }

  private restartPlaybackFromCurrentPosition() {
    const currentPlayheadPosition = this.playhead();
    this.audio.stop();
    const clips = this.getPlayableClips();
    this.audio.play(clips, currentPlayheadPosition);
    this.tickPlayhead();
  }

  togglePlayback(): void {
    if (this.isPlaying()) {
      this.pause();
    } else {
      this.play();
    }
  }
  
  play(): void {
    let startPosition = this.playhead();
    
    // If loop is enabled and playhead is outside loop region, start at loop start
    if (this.editorState.loopEnabled() && this.editorState.validLoopRegion()) {
      const loopStart = this.editorState.loopStart();
      const loopEnd = this.editorState.loopEnd();
      
      if (startPosition < loopStart || startPosition >= loopEnd) {
        startPosition = loopStart;
        this.playhead.set(startPosition);
      }
    }
    
    const clips = this.getPlayableClips();
    this.audio.play(clips, startPosition);
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
    // Check if this is a virtual drag completion event
    if (event.finalTime !== undefined || event.targetTrack) {
      this.handleVirtualDragCompletion(event);
      return;
    }
    
    // Legacy drag handling removed - using virtual drag system
  }
  
  private handleVirtualDragCompletion(event: ClipDragEvent) {
    const clip = event.clip;
    const newTime = event.finalTime!;
    const targetTrack = event.targetTrack;
    
    // Delay the position update to prevent animation
    // The visual state needs to be restored first
    requestAnimationFrame(() => {
      // Update clip position
      clip.startTime = newTime;
      
      // Handle track change if needed
      if (targetTrack) {
        this.tracks.update(list => {
          // Remove clip from its current track
          for (const track of list) {
            const clipIndex = track.clips.findIndex(c => c.id === clip.id);
            if (clipIndex !== -1) {
              track.clips.splice(clipIndex, 1);
              break;
            }
          }
          
          // Add clip to target track
          const targetTrackObj = list.find(t => t.id === targetTrack.id);
          if (targetTrackObj) {
            targetTrackObj.clips.push(clip);
          }
          
          return [...list];
        });
      } else {
        // Just update position, trigger change detection
        this.tracks.update(list => [...list]);
      }
    });
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

  onClipDeleted(event: ClipDeleteEvent) {
    this.editorState.removeClip(event.clip.id);
  }

  onClipDuplicated(event: ClipDuplicateEvent) {
    this.duplicateClip(event.clip);
  }

  deleteSelectedClip() {
    const selectedId = this.selectedClipId();
    if (selectedId) {
      this.editorState.removeClip(selectedId);
    }
  }

  duplicateSelectedClip() {
    const selectedClip = this.getSelectedClip();
    if (selectedClip) {
      this.duplicateClip(selectedClip);
    }
  }


  laneTouchStart(ev: TouchEvent, track: Track) {
    // Similar to laneMouseDown but for touch
    if ((ev.target as HTMLElement)?.closest('.clip')) return;
    
    // Activate the touched track
    this.editorState.setActiveTrack(track.id);
    
    // Deselect current clip when touching empty lane area
    this.editorState.selectedClipId.set(null);
    
    ev.preventDefault();
    ev.stopPropagation();
  }

  isTouchDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }


  // Mobile button positioning methods for CSS Subgrid layer
  getMobileButtonTop(selectedId: string | null): number | null {
    if (!selectedId) return null;
    
    const clipElement = document.querySelector(`[data-clip-id="${selectedId}"]`) as HTMLElement;
    if (!clipElement) return null;
    
    const buttonLayerEl = document.querySelector('.mobile-button-layer') as HTMLElement;
    if (!buttonLayerEl) return null;
    
    const buttonLayerRect = buttonLayerEl.getBoundingClientRect();
    const clipRect = clipElement.getBoundingClientRect();
    
    // Position relative to mobile button layer
    return clipRect.top - buttonLayerRect.top - 38; // 38px above clip
  }

  getMobileDeleteButtonLeft(selectedId: string | null): number | null {
    if (!selectedId) return null;
    
    const clipElement = document.querySelector(`[data-clip-id="${selectedId}"]`) as HTMLElement;
    if (!clipElement) return null;
    
    const buttonLayerEl = document.querySelector('.mobile-button-layer') as HTMLElement;
    if (!buttonLayerEl) return null;
    
    const buttonLayerRect = buttonLayerEl.getBoundingClientRect();
    const clipRect = clipElement.getBoundingClientRect();
    
    // Position relative to mobile button layer, towards center
    const clipWidth = clipRect.width;
    return clipRect.left - buttonLayerRect.left + (clipWidth * 0.25) - 14; // 25% into clip
  }

  getMobileDuplicateButtonLeft(selectedId: string | null): number | null {
    if (!selectedId) return null;
    
    const clipElement = document.querySelector(`[data-clip-id="${selectedId}"]`) as HTMLElement;
    if (!clipElement) return null;
    
    const buttonLayerEl = document.querySelector('.mobile-button-layer') as HTMLElement;
    if (!buttonLayerEl) return null;
    
    const buttonLayerRect = buttonLayerEl.getBoundingClientRect();
    const clipRect = clipElement.getBoundingClientRect();
    
    // Position relative to mobile button layer, towards center from right
    const clipWidth = clipRect.width;
    return clipRect.right - buttonLayerRect.left - (clipWidth * 0.25) - 14; // 25% from right edge
  }


  private rafId: number | null = null;
  private seekingRafId: number | null = null;
  
  // Drag performance optimization
  private dragOverThrottleId: number | null = null;


  @HostListener('window:mousemove', ['$event'])
  @HostListener('window:touchmove', ['$event'])
  onMouseMove(ev: MouseEvent | TouchEvent) {
    // Handle loop region dragging (move entire loop)
    if (this.loopRegionDragState) {
      const rect = this.timelineEl.nativeElement.getBoundingClientRect();
      
      // Account for timeline horizontal scrolling - use track lanes scrollLeft
      const trackLanesEl = this.trackLanesEl?.nativeElement;
      const scrollLeft = trackLanesEl ? trackLanesEl.scrollLeft : 0;
      
      // Get clientX from either mouse or touch event
      const clientX = 'clientX' in ev ? ev.clientX : (ev as TouchEvent).touches[0]?.clientX || 0;
      const currentX = clientX - rect.left + scrollLeft;
      
      const deltaX = currentX - this.loopRegionDragState.startX;
      const deltaTime = pxToSeconds(deltaX, this.pxPerSecond());
      
      const newStart = Math.max(0, this.loopRegionDragState.originalStart + deltaTime);
      const newEnd = newStart + this.loopRegionDragState.loopDuration;
      
      // Apply grid snapping if enabled
      const snappedStart = this.editorState.snapLoopMarkerToGrid(newStart);
      const snappedEnd = snappedStart + this.loopRegionDragState.loopDuration;
      
      this.editorState.loopStart.set(snappedStart);
      this.editorState.loopEnd.set(snappedEnd);
      return;
    }
    
    // Handle loop marker dragging
    if (this.loopDragState) {
      const rect = this.timelineEl.nativeElement.getBoundingClientRect();
      
      // Account for timeline horizontal scrolling - use track lanes scrollLeft
      const trackLanesEl = this.trackLanesEl?.nativeElement;
      const scrollLeft = trackLanesEl ? trackLanesEl.scrollLeft : 0;
      
      // Get clientX from either mouse or touch event
      const clientX = 'clientX' in ev ? ev.clientX : (ev as TouchEvent).touches[0]?.clientX || 0;
      const currentX = clientX - rect.left + scrollLeft;
      
      const deltaX = currentX - this.loopDragState.startX;
      const deltaTime = pxToSeconds(deltaX, this.pxPerSecond());
      const newTime = Math.max(0, this.loopDragState.originalValue + deltaTime);
      
      // Apply grid snapping if enabled
      const snappedTime = this.editorState.snapLoopMarkerToGrid(newTime);
      
      if (this.loopDragState.marker === 'start') {
        // Ensure loop start doesn't exceed loop end
        const maxTime = this.editorState.loopEnd() - 0.1;
        this.editorState.loopStart.set(Math.min(snappedTime, maxTime));
      } else {
        // Ensure loop end doesn't go below loop start
        const minTime = this.editorState.loopStart() + 0.1;
        this.editorState.loopEnd.set(Math.max(snappedTime, minTime));
      }
      return;
    }
    
    // Early exit if nothing is active - massive performance improvement
    if (!this.seeking) {
      return;
    }
    
    // Handle seeking (ruler and lane dragging) with throttling
    if (this.seeking) {
      // Cancel previous seeking RAF if exists
      if (this.seekingRafId) {
        cancelAnimationFrame(this.seekingRafId);
      }
      
      // Throttle seeking updates using RAF for smooth 60fps
      this.seekingRafId = requestAnimationFrame(() => {
        if (!this.seeking) return;
        
        const target = ('target' in ev ? ev.target : (ev as TouchEvent).touches[0]?.target) as HTMLElement;
        const timelineEl = target?.closest('.ruler') || target?.closest('.lane');
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
          
          // Get clientX from either mouse or touch event
          const clientX = 'clientX' in ev ? ev.clientX : (ev as TouchEvent).touches[0]?.clientX || 0;
          const x = clientX - rect.left;
          const timePosition = Math.max(0, pxToSeconds(x, this.pxPerSecond()));
          this.seekTo(timePosition);
        }
        this.seekingRafId = null;
      });
      return;
    }
    
    // Trimming is now handled by individual ClipComponents
    // Clip dragging is now handled by the Virtual Drag System
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    // Ignore if user is typing in input field
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }


    const selectedClip = this.getSelectedClip();

    // Copy (Ctrl+C)
    if (event.ctrlKey && (event.key === 'c' || event.key === 'C') && selectedClip) {
      event.preventDefault();
      this.copyClip(selectedClip);
      return;
    }

    // Paste (Ctrl+V)
    if (event.ctrlKey && (event.key === 'v' || event.key === 'V')) {
      event.preventDefault();
      if (this.clipboardClip) {
        this.pasteClip();
      }
      return;
    }

    // Delete (Del)
    if (event.key === 'Delete' && selectedClip) {
      event.preventDefault();
      this.deleteClip(selectedClip);
      return;
    }

    // Spacebar for play/pause
    if (event.code === 'Space') {
      event.preventDefault();
      this.togglePlayback();
      return;
    }
    
    // Alt+L for set loop to selected clip (check first!)
    if (event.altKey && event.code === 'KeyL') {
      event.preventDefault();
      this.editorState.setLoopToSelection();
      return;
    }
    
    // L for toggle loop (only if no modifiers)
    if (event.code === 'KeyL' && !event.altKey && !event.ctrlKey && !event.shiftKey) {
      event.preventDefault();
      this.toggleLoop();
      return;
    }
    
    // Shift+I for set loop start to playhead (I = In-Point)
    if (event.shiftKey && event.code === 'KeyI') {
      event.preventDefault();
      this.editorState.loopStart.set(this.playhead());
      this.editorState.loopEnabled.set(true);
      return;
    }
    
    // Shift+O for set loop end to playhead (O = Out-Point)  
    if (event.shiftKey && event.code === 'KeyO') {
      event.preventDefault();
      this.editorState.loopEnd.set(this.playhead());
      this.editorState.loopEnabled.set(true);
      return;
    }
    
    // S for split at playhead
    if (event.code === 'KeyS' && !event.altKey && !event.ctrlKey && !event.shiftKey) {
      event.preventDefault();
      this.editorState.splitAtPlayhead();
      // Force regenerate all waveforms after split
      setTimeout(() => this.forceRegenerateAllWaveforms(), 100);
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
    
    // Clear loop marker dragging
    this.loopDragState = null;
    
    // Clear loop region dragging
    this.loopRegionDragState = null;
    
    this.trimState = null;
    this.seeking = false;
    (document.body as HTMLElement).style.userSelect = '';
  }

  @HostListener('window:touchend')
  onTouchEnd() {
    // Reset pinch zoom distance when gesture ends
    this.lastTouchDistance = 0;
    // Same cleanup as mouseup for touch events
    this.onMouseUp();
  }

  // Pinch-to-zoom support for mobile
  private lastTouchDistance = 0;
  private initialPinchZoom = 0;
  
  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent) {
    if (event.touches.length === 2) {
      // Initialize pinch-to-zoom
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      this.lastTouchDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      // Store the initial zoom level when pinch starts
      this.initialPinchZoom = this.pxPerSecond();
    }
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent) {
    if (event.touches.length === 2) {
      event.preventDefault();
      
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      const currentDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      if (this.lastTouchDistance > 0) {
        // For pinch zoom, use center of viewport as anchor point
        const trackLanes = this.trackLanesEl?.nativeElement;
        if (trackLanes) {
          const viewportCenterX = trackLanes.scrollLeft + (trackLanes.clientWidth / 2);
          const timeAtCenter = viewportCenterX / this.pxPerSecond();
          
          const scale = currentDistance / this.lastTouchDistance;
          const currentPx = this.pxPerSecond();
          const newPx = Math.min(2000, Math.max(10, Math.round(currentPx * scale)));
          this.pxPerSecond.set(newPx);
          
          // Adjust scroll to keep center point fixed
          const newCenterX = timeAtCenter * newPx;
          trackLanes.scrollLeft = newCenterX - (trackLanes.clientWidth / 2);
          
          // Update lastTouchDistance for next frame
          this.lastTouchDistance = currentDistance;
        }
      }
    }
  }


  onWheel(ev: WheelEvent) {
    if (!ev.ctrlKey) return;
    ev.preventDefault();
    
    // Get the timeline element and mouse position relative to it
    const trackLanes = this.trackLanesEl?.nativeElement;
    if (!trackLanes) return;
    
    const rect = trackLanes.getBoundingClientRect();
    const mouseX = ev.clientX - rect.left + trackLanes.scrollLeft;
    
    // Calculate time at mouse position before zoom
    const timeAtMouse = mouseX / this.pxPerSecond();
    
    // Apply zoom
    const factor = ev.deltaY > 0 ? 0.9 : 1.1;
    const oldPx = this.pxPerSecond();
    const newPx = Math.min(2000, Math.max(10, Math.round(oldPx * factor)));
    this.pxPerSecond.set(newPx);
    
    // Calculate new pixel position for the same time point
    const newMouseX = timeAtMouse * newPx;
    
    // Adjust scroll to keep the time point under the mouse
    const scrollAdjustment = newMouseX - mouseX;
    trackLanes.scrollLeft += scrollAdjustment;
  }

  private tickRAF?: number;
  private tickPlayhead() {
    cancelAnimationFrame(this.tickRAF!);
    const start = performance.now();
    const origin = this.playhead();
    const loop = (t: number) => {
      if (!this.isPlaying()) return;
      const sec = (t - start) / 1000;
      const newPlayhead = origin + sec;
      
      // Check for loop condition
      if (this.editorState.loopEnabled() && this.editorState.validLoopRegion()) {
        const loopStart = this.editorState.loopStart();
        const loopEnd = this.editorState.loopEnd();
        
        if (newPlayhead >= loopEnd) {
          // Jump back to loop start
          const overshoot = newPlayhead - loopEnd;
          const loopDuration = loopEnd - loopStart;
          const loopedPosition = loopStart + (overshoot % loopDuration);
          
          this.playhead.set(loopedPosition);
          
          // Restart audio from loop start position to maintain seamless playback
          this.restartPlaybackFromCurrentPosition();
          return;
        }
      }
      
      this.playhead.set(newPlayhead);
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
  }

  pasteClip(): void {
    if (!this.clipboardClip) return;

    // Use EditorStateService for pasting - it handles active track and collision detection
    const pastedClip = this.editorState.pasteClip();
    
    if (pastedClip) {
      // Clip successfully pasted by EditorStateService
    }
  }

  duplicateClip(clip: Clip): void {
    // Create a duplicate clip positioned after the original
    const duplicate: Clip = {
      ...clip,
      id: crypto.randomUUID(),
      startTime: clip.startTime + clip.duration + 0.1 // Small gap after original
    };

    // Find the track containing the original clip and add duplicate
    this.tracks.update(trackList => {
      for (const track of trackList) {
        if (track.clips.some(c => c.id === clip.id)) {
          track.clips.push(duplicate);
          break;
        }
      }
      return trackList;
    });

    // Select the new duplicate
    this.editorState.selectedClipId.set(duplicate.id);
    
  }

  deleteClip(clip: Clip): void {
    this.tracks.update(list => {
      for (const track of list) {
        const clipIndex = track.clips.findIndex(c => c.id === clip.id);
        if (clipIndex !== -1) {
          track.clips.splice(clipIndex, 1);
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
    // Get or create active track
    const targetTrack = this.editorState.getOrCreateActiveTrack();
    
    // Find free position starting from playhead
    const playheadPos = this.playhead();
    const freePosition = this.editorState.findNextFreePosition(
      targetTrack,
      playheadPos,
      buffer.duration
    );
    
    // Add sound to track
    this.addSoundToTrack(buffer, targetTrack, freePosition);
    
  }
  
  // Sound drag handlers
  onSoundDragStarted(event: { sound: { id: string; name: string; category: string }, buffer: AudioBuffer, position: { x: number; y: number } }) {
    this.editorState.startSoundDrag(event.sound, event.buffer, event.position);
  }
  
  private handleSoundDragStart(detail: { sound: { id: string; name: string; category: string }, buffer: AudioBuffer, position: { x: number; y: number } }) {
    this.editorState.startSoundDrag(detail.sound, detail.buffer, detail.position);
  }
  
  private handleSoundDragMove(detail: { position: { x: number; y: number }, sound: { id: string; name: string; category: string } }) {
    // Find which track is being hovered
    const targetTrack = this.getTrackAtPosition(detail.position.y);
    
    // Update drag preview position and target
    this.editorState.updateSoundDragPosition(detail.position, targetTrack);
    
    // Debug log removed
  }
  
  private handleSoundDragEnd(detail: { position: { x: number; y: number }, sound: { id: string; name: string; category: string } }) {
    const dragPreview = this.editorState.dragPreview();
    
    if (dragPreview && dragPreview.isValidDrop && dragPreview.targetTrack) {
      // Calculate drop position in timeline
      // The preview is centered with CSS transform: translate(-50%, -50%)
      // So we need to adjust for the half width to get the actual start position
      const clipDuration = dragPreview.buffer.duration;
      const clipWidthInPx = clipDuration * this.pxPerSecond();
      const adjustedX = detail.position.x - (clipWidthInPx / 2);
      const mouseTime = this.getTimeAtPosition(adjustedX);
      const dropTime = Math.max(0, mouseTime);
      
      // Add sound to target track by extending the buffer with metadata
      const extendedBuffer = Object.assign(dragPreview.buffer, {
        name: dragPreview.sound.name,
        category: dragPreview.sound.category,
        id: dragPreview.sound.id
      });
      this.addSoundToTrack(extendedBuffer, dragPreview.targetTrack, dropTime);
      
    }
    
    // End drag operation
    this.editorState.endSoundDrag();
  }
  
  private getTrackAtPosition(y: number): Track | undefined {
    // Get track lane elements
    const trackLanes = this.trackLanesEl.nativeElement.querySelectorAll('track-lane');
    
    for (let i = 0; i < trackLanes.length; i++) {
      const trackElement = trackLanes[i] as HTMLElement;
      const rect = trackElement.getBoundingClientRect();
      
      if (y >= rect.top && y <= rect.bottom) {
        return this.tracks()[i];
      }
    }
    
    return undefined;
  }
  
  private getTimeAtPosition(x: number): number {
    // Get timeline container position
    const trackLanesRect = this.trackLanesEl.nativeElement.getBoundingClientRect();
    const relativeX = x - trackLanesRect.left + this.trackLanesEl.nativeElement.scrollLeft;
    
    // Convert pixel position to time
    return Math.max(0, relativeX / this.pxPerSecond());
  }
  
  onTrackHover(_event: { track: Track; isHovering: boolean }) {
    // Track hover is handled automatically by the drag preview system
    // This method exists for potential future use
  }

  // --- Drag & Drop from Sound Library ---
  // REMOVED: Global dragover - still caused performance issues
  // Now using dynamic per-lane dragover only when needed

  onDragEnter(event: DragEvent, track: Track) {
    // Skip processing if sound drag is not active (window dragging)
    if (!(window as Window & { soundDragActive?: boolean }).soundDragActive) {
      return;
    }
    
    event.preventDefault();
    this.dragOverTrack = track;
  }

  onDragLeave(event: DragEvent) {
    // Skip processing if sound drag is not active (window dragging)
    if (!(window as Window & { soundDragActive?: boolean }).soundDragActive) {
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
          this.handleSoundDrop(dragData, track, event);
          return;
        }
      } catch {
        // JSON parsing failed - not a valid sound drop
      }
    }
    
    // Handle file drops (existing functionality)
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.onFilesSelected(files, track);
    }
  }

  private async handleSoundDrop(soundData: { id: string; name: string; category: string }, track: Track, event: DragEvent) {
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
      // Die Preview wird mit CSS transform: translate(-50%, -50%) zentriert angezeigt.
      // Das bedeutet, die visuelle Position ist um die halbe Breite nach links verschoben.
      // Beim Drop müssen wir das berücksichtigen, um WYSIWYG zu erreichen.
      const clipWidthInPx = buffer.duration * this.pxPerSecond();
      const x = event.clientX - rect.left - (clipWidthInPx / 2);
      const dropTime = Math.max(0, pxToSeconds(x, this.pxPerSecond()));
      
      // Create the audio buffer with metadata
      const audioBuffer = Object.assign(buffer, {
        name: soundData.name,
        category: soundData.category,
        id: soundData.id
      });
      
      // Add to specific track at drop position
      this.addSoundToTrack(audioBuffer, track, dropTime);
      
      
    } catch (error) {
      console.error('Error handling sound drop:', error);
    }
  }

  private addSoundToTrack(buffer: AudioBuffer & { name: string; category: string; id?: string }, track: Track, startTime: number) {
    const color = this.getColorByFilename(buffer.name);
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
          originalDuration: buffer.duration,
          soundId: buffer.id || crypto.randomUUID()
        } as Clip;
        
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
    
    // Account for timeline horizontal scrolling - use track lanes scrollLeft
    const trackLanesEl = this.trackLanesEl?.nativeElement;
    const scrollLeft = trackLanesEl ? trackLanesEl.scrollLeft : 0;
    
    const x = ev.clientX - rect.left + scrollLeft;
    const timePosition = pxToSeconds(x, this.pxPerSecond());
    this.seekTo(timePosition);
    this.seeking = true;
    (document.body as HTMLElement).style.userSelect = 'none';
  }
  laneMouseDown(ev: MouseEvent, track: Track) {
    // Wenn auf einem Clip (oder innerhalb), kein Seeking auslösen
    if ((ev.target as HTMLElement)?.closest('.clip')) return;
    
    // Activate the clicked track
    this.editorState.setActiveTrack(track.id);
    
    // Deselect current clip when clicking on empty lane area
    this.editorState.selectedClipId.set(null);
    
    ev.preventDefault();
    ev.stopPropagation();
    const lane = ev.currentTarget as HTMLElement;
    const clipsEl = lane.querySelector('.clips');
    if (!clipsEl) return;
    const rect = clipsEl.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const timePosition = pxToSeconds(x, this.pxPerSecond());
    this.seekTo(timePosition);
    this.seeking = true;
    (document.body as HTMLElement).style.userSelect = 'none';
  }

  private regenerateWaveformsForAllClips(): void {
    // Regenerate waveforms for all clips
    this.editorState.tracks.update(tracks => {
      return tracks.map(track => ({
        ...track,
        clips: track.clips.map(clip => {
          // Only regenerate if waveform is missing or undefined
          if (!clip.waveform) {
            const waveform = this.waveformService.generateFromBuffer(clip.buffer, {
              width: Math.floor(clip.duration * this.pxPerSecond()),
              height: 44,
              clipColor: clip.color,
              trimStart: clip.trimStart,
              trimEnd: clip.trimEnd
            });
            return { ...clip, waveform };
          }
          return clip;
        })
      }));
    });
  }

  private forceRegenerateAllWaveforms(): void {
    // Force regenerate ALL waveforms, even if they exist
    this.editorState.tracks.update(tracks => {
      return tracks.map(track => ({
        ...track,
        clips: track.clips.map(clip => {
          const waveform = this.waveformService.generateFromBuffer(clip.buffer, {
            width: Math.floor(clip.duration * this.pxPerSecond()),
            height: 44,
            clipColor: clip.color,
            trimStart: clip.trimStart,
            trimEnd: clip.trimEnd
          });
          return { ...clip, waveform };
        })
      }));
    });
  }

}
