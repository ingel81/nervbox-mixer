import {
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  effect,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioEngineService } from '../../audio-engine/services/audio-engine.service';
import { SoundLibraryService } from '../../sound-browser/services/sound-library.service';
import { EditorStateService } from '../services/editor-state.service';
import { DefaultArrangementService } from '../../arrangements/services/default-arrangement.service';
import { WaveformService } from '../../audio-engine/services/waveform.service';
import { TimelineService } from '../../timeline/services/timeline.service';
import { InteractionCoordinatorService } from '../../timeline/services/interaction-coordinator.service';
import { FileImportService } from '../../audio-engine/services/file-import.service';
import { ClipFactoryService } from '../../audio-engine/services/clip-factory.service';
import { MobileInteractionService } from '../../timeline/services/mobile-interaction.service';
import { LoopRegionComponent } from './loop-region.component';
import { SoundBrowserComponent } from '../../sound-browser/components/sound-browser.component';
import { BottomPanelComponent } from './bottom-panel.component';
import { PreviewClipComponent } from '../../sound-browser/components/preview-clip.component';
import {
  ClipDragEvent,
  ClipTrimEvent,
  ClipSelectEvent,
  ClipDeleteEvent,
  ClipDuplicateEvent,
} from '../../timeline/components/clip.component';
import {
  TrackMuteEvent,
  TrackSoloEvent,
  TrackDeleteEvent,
  TrackRenameEvent,
  TrackDropEvent,
  TrackDragEvent,
} from '../../timeline/components/track.component';
import { TrackHeaderComponent } from '../../timeline/components/track-header.component';
import { TrackLaneComponent } from '../../timeline/components/track-lane.component';
import { Clip, Track } from '../../shared/models/models';
import { KeyboardShortcutsDirective, KeyboardShortcutActions } from '../directives/keyboard-shortcuts.directive';
import { AnalyticsService } from '../../../services/analytics.service';

import { MatSliderModule } from '@angular/material/slider';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'audio-editor',
  imports: [
    CommonModule,
    MatSliderModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    LoopRegionComponent,
    SoundBrowserComponent,
    BottomPanelComponent,
    PreviewClipComponent,
    TrackHeaderComponent,
    TrackLaneComponent,
    KeyboardShortcutsDirective,
  ],
  templateUrl: './audio-editor.component.html',
  styleUrls: ['./audio-editor.component.css'],
})
export class AudioEditorComponent {
  @ViewChild('timeline') timelineEl!: ElementRef<HTMLDivElement>;
  @ViewChild('trackHeaders') trackHeadersEl!: ElementRef<HTMLDivElement>;
  @ViewChild('trackLanes') trackLanesEl!: ElementRef<HTMLDivElement>;

  // Use signals from EditorStateService
  get pxPerSecond() {
    return this.editorState.pxPerSecond;
  }
  get playhead() {
    return this.editorState.playhead;
  }
  get isPlaying() {
    return this.editorState.isPlaying;
  }
  get tracks() {
    return this.editorState.tracks;
  }
  get selectedClipId() {
    return this.editorState.selectedClipId;
  }
  get showSoundBrowser() {
    return this.editorState.showSoundBrowser;
  }
  get soundBrowserOpenedFromCta() {
    return this.editorState.soundBrowserOpenedFromCta;
  }

  // Loop dragging state is now fully managed by InteractionCoordinatorService

  // Environment info
  version = environment.version;
  author = environment.author;
  repository = environment.repository;

  scrollX = signal(0);

  // Keyboard shortcuts actions interface
  keyboardActions: KeyboardShortcutActions = {
    togglePlayback: () => this.togglePlayback(),
    forceRegenerateAllWaveforms: () => this.forceRegenerateAllWaveforms(),
  };

  // Delegate to timeline service
  get duration() {
    return this.timelineService.duration;
  }
  getTimelineMarkers() {
    return this.timelineService.getTimelineMarkers();
  }

  // Delegate to mobile interaction service
  getMobileButtonTop(selectedId: string | null): number | null {
    return this.mobileInteraction.getMobileButtonTop(selectedId);
  }
  getMobileDeleteButtonLeft(selectedId: string | null): number | null {
    return this.mobileInteraction.getMobileDeleteButtonLeft(selectedId);
  }
  getMobileDuplicateButtonLeft(selectedId: string | null): number | null {
    return this.mobileInteraction.getMobileDuplicateButtonLeft(selectedId);
  }

  constructor(
    private audio: AudioEngineService,
    private soundLibrary: SoundLibraryService,
    public editorState: EditorStateService,
    private defaultArrangement: DefaultArrangementService,
    private waveformService: WaveformService,
    private timelineService: TimelineService,
    private interactionCoordinator: InteractionCoordinatorService,
    private fileImport: FileImportService,
    private clipFactory: ClipFactoryService,
    private mobileInteraction: MobileInteractionService,
    private analytics: AnalyticsService
  ) {
    // Register seek callback for timeline scrubbing during playback
    this.editorState.registerSeekCallback((seconds: number) => {
      this.seekTo(seconds);
    });
    
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
    // Track add track event
    this.analytics.trackTrackAction('add');
  }

  async onFilesSelected(files: FileList | null, targetTrack?: Track) {
    await this.fileImport.importFiles(files, targetTrack);
  }

  async addDefaultHipHopTrack() {
    const defaultTracks =
      await this.defaultArrangement.createRandomDefaultTracks();
    this.editorState.tracks.update(list => [...list, ...defaultTracks]);
    this.editorState.setArrangementName('DefaultBeat');

    // Activate first track
    if (defaultTracks.length > 0) {
      this.editorState.setActiveTrack(defaultTracks[0].id);
    }
  }
  
  // Grid Lines für visuelle Darstellung
  gridLines = computed(() => {
    if (!this.editorState.snapToGrid()) return [];
    return this.timelineService.getGridLines();
  });
  
  // Computed value für die Gesamthöhe aller Tracks
  totalTracksHeight = computed(() => {
    const trackCount = this.tracks().length;
    const trackHeight = 60; // Tatsächliche Track-Höhe (siehe track-lane.component.css)
    return trackCount * trackHeight;
  });
  
  // Helper für BPM-Display
  formattedBPM = computed(() => {
    return `${this.editorState.bpm()} BPM`;
  });
  
  // Helper für Grid-Resolution-Display  
  formattedGridResolution = computed(() => {
    const subdivision = this.editorState.gridSubdivision();
    const labels: Record<string, string> = {
      'bar': 'Takte',
      '1/2': '1/2 Noten',
      '1/4': '1/4 Noten',
      '1/8': '1/8 Noten',
      '1/16': '1/16 Noten'
    };
    return labels[subdivision] || '1/4 Noten';
  });

  private removeTrack(track: Track) {
    const trackIndex = this.tracks().findIndex(t => t.id === track.id);
    this.tracks.update(list => list.filter(t => t !== track));
    // Track remove track event
    this.analytics.trackTrackAction('delete', trackIndex);
  }

  private toggleMute(track: Track) {
    const trackIndex = this.tracks().findIndex(t => t.id === track.id);
    const isMuted = track.mute;
    this.tracks.update(list =>
      list.map(t => (t.id === track.id ? { ...t, mute: !t.mute } : t))
    );
    // Track mute/unmute event
    this.analytics.trackTrackControl(isMuted ? 'unmute' : 'mute', trackIndex);

    // If currently playing, restart playback with new mute states
    if (this.isPlaying()) {
      this.restartPlaybackFromCurrentPosition();
    }
  }

  private toggleSolo(track: Track) {
    const trackIndex = this.tracks().findIndex(t => t.id === track.id);
    const isSolo = track.solo;
    
    this.tracks.update(list => {
      const hasSoloTracks = list.some(t => t.solo);
      const isTrackCurrentlySolo = track.solo;

      if (!hasSoloTracks) {
        // No tracks are solo, make this track solo
        return list.map(t => (t.id === track.id ? { ...t, solo: true } : t));
      } else if (isTrackCurrentlySolo) {
        // This track is solo, turn off solo
        return list.map(t => (t.id === track.id ? { ...t, solo: false } : t));
      } else {
        // Other tracks are solo, add this track to solo
        return list.map(t => (t.id === track.id ? { ...t, solo: true } : t));
      }
    });
    
    // Track solo/unsolo event
    this.analytics.trackTrackControl(isSolo ? 'unsolo' : 'solo', trackIndex);

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
    const isEnabled = this.editorState.loopEnabled();
    this.editorState.toggleLoop();
    // Track loop toggle event
    this.analytics.trackLoopRegion(isEnabled ? 'disable' : 'enable');
    if (!isEnabled) {
      const duration = this.editorState.loopEnd() - this.editorState.loopStart();
      this.analytics.trackLoopDuration(duration);
    }
  }

  // Loop region event handlers are now handled by LoopRegionComponent directly

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
    const trackIndex = this.tracks().findIndex(t => t.id === event.track.id);
    this.editorState.renameTrack(event.track.id, event.newName);
    // Track rename event
    this.analytics.trackTrackAction('rename', trackIndex);
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
    // Synchronize scrollX signal for loop region positioning
    this.scrollX.set(lanesEl.scrollLeft);
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
    
    // Track play event
    this.analytics.trackPlayback('play');
  }

  pause(): void {
    // Track pause event
    this.analytics.trackPlayback('pause');
    this.audio.pause();
    this.editorState.pause();
  }

  stop(): void {
    this.audio.stop();
    this.editorState.stop();
    
    // Track stop event
    this.analytics.trackPlayback('stop');
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
      .flatMap(track =>
        track.clips.map(clip => ({
          buffer: clip.buffer,
          startTime: clip.startTime,
          duration: clip.duration,
          offset: clip.offset,
          gain: track.volume,
          pan: track.pan,
          muted: false, // Already filtered out muted tracks above
          trimStart: clip.trimStart,
          trimEnd: clip.trimEnd,
        }))
      );
  }

  private flattenClips(): Clip[] {
    return this.editorState.flattenedClips();
  }

  // Use drag state from service

  get trimState() {
    return this.editorState.trimState;
  }
  set trimState(value) {
    this.editorState.trimState = value;
  }

  get clipboardClip() {
    return this.editorState.clipboardClip;
  }
  set clipboardClip(value) {
    this.editorState.clipboardClip = value;
  }

  get dragOverTrack() {
    return this.editorState.dragOverTrack;
  }
  set dragOverTrack(value) {
    this.editorState.dragOverTrack = value;
  }

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
      clipRef: event.clip,
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
      // Track clip deletion
      this.analytics.trackClipAction('delete', 'clip');
    }
  }

  duplicateSelectedClip() {
    const selectedClip = this.getSelectedClip();
    if (selectedClip) {
      this.duplicateClip(selectedClip);
      // Track clip duplication
      this.analytics.trackClipAction('copy', 'clip');
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

  private rafId: number | null = null;
  private seekingRafId: number | null = null;

  // Drag performance optimization
  private dragOverThrottleId: number | null = null;

  @HostListener('window:mousemove', ['$event'])
  @HostListener('window:touchmove', ['$event'])
  onMouseMove(ev: MouseEvent | TouchEvent) {
    // Delegate all loop dragging to InteractionCoordinatorService
    if (this.timelineEl?.nativeElement) {
      this.interactionCoordinator.handleMouseMove(ev, this.timelineEl.nativeElement);
      
      // Exit early if the service is handling loop dragging
      if (this.interactionCoordinator.isDragging) {
        return;
      }
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

        const target = (
          'target' in ev ? ev.target : (ev as TouchEvent).touches[0]?.target
        ) as HTMLElement;
        const timelineEl =
          target?.closest('.ruler') || target?.closest('.lane');
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
          const clientX =
            'clientX' in ev
              ? ev.clientX
              : (ev as TouchEvent).touches[0]?.clientX || 0;
          const x = clientX - rect.left;
          this.timelineService.scrubToPosition(x, 0);
        }
        this.seekingRafId = null;
      });
      return;
    }

    // Trimming is now handled by individual ClipComponents
    // Clip dragging is now handled by the Virtual Drag System
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

    // Notify InteractionCoordinatorService to clear drag states
    this.interactionCoordinator.handleMouseUp();

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
          const centerX = trackLanes.clientWidth / 2;
          const scrollX = trackLanes.scrollLeft;

          const scale = currentDistance / this.lastTouchDistance;
          const newScrollX = this.timelineService.zoomAtPosition(
            centerX,
            scrollX,
            scale
          );
          trackLanes.scrollLeft = newScrollX;

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
    const mouseX = ev.clientX - rect.left;
    const scrollX = trackLanes.scrollLeft;

    // Apply zoom using timeline service
    const factor = ev.deltaY > 0 ? 0.9 : 1.1;
    const newScrollX = this.timelineService.zoomAtPosition(
      mouseX,
      scrollX,
      factor
    );
    trackLanes.scrollLeft = newScrollX;
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
      if (
        this.editorState.loopEnabled() &&
        this.editorState.validLoopRegion()
      ) {
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
    // Track seek event
    this.analytics.trackSeek(sec);

    // If playing, restart from new position
    if (this.isPlaying()) {
      this.audio.stop();
      const all = this.flattenClips();
      this.audio.play(
        all.map(c => ({
          buffer: c.buffer,
          startTime: c.startTime,
          duration: c.duration,
          offset: c.offset,
          gain: 1,
          pan: 0,
          muted: false,
          trimStart: c.trimStart,
          trimEnd: c.trimEnd,
        })),
        sec
      );
      // Restart the playhead ticker from new position
      this.tickPlayhead();
    }
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


  pasteClip(): void {
    if (!this.clipboardClip) return;

    // Use EditorStateService for pasting - it handles active track and collision detection
    const pastedClip = this.editorState.pasteClip();

    if (pastedClip) {
      // Clip successfully pasted by EditorStateService
      this.analytics.trackClipAction('paste', 'clip');
    }
  }

  duplicateClip(clip: Clip): void {
    // Create a duplicate clip positioned after the original
    const duplicate: Clip = {
      ...clip,
      id: crypto.randomUUID(),
      startTime: clip.startTime + clip.duration + 0.1, // Small gap after original
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
    
    // Track duplicate action
    this.analytics.trackClipAction('duplicate', 'clip');
  }


  async onSoundSelected(
    buffer: AudioBuffer & { name: string; category: string; id?: string }
  ) {
    // Track sound selection
    this.analytics.trackSoundBrowserAction('load');
    this.analytics.trackAudioPlay(buffer.name, buffer.category);
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
  onSoundDragStarted(event: {
    sound: { id: string; name: string; category: string };
    buffer: AudioBuffer;
    position: { x: number; y: number };
  }) {
    this.editorState.startSoundDrag(event.sound, event.buffer, event.position);
  }

  private handleSoundDragStart(detail: {
    sound: { id: string; name: string; category: string };
    buffer: AudioBuffer;
    position: { x: number; y: number };
  }) {
    this.editorState.startSoundDrag(
      detail.sound,
      detail.buffer,
      detail.position
    );
  }

  private handleSoundDragMove(detail: {
    position: { x: number; y: number };
    sound: { id: string; name: string; category: string };
  }) {
    // Find which track is being hovered
    const targetTrack = this.getTrackAtPosition(detail.position.y);

    // Update drag preview position and target
    this.editorState.updateSoundDragPosition(detail.position, targetTrack);

    // Debug log removed
  }

  private handleSoundDragEnd(detail: {
    position: { x: number; y: number };
    sound: { id: string; name: string; category: string };
  }) {
    const dragPreview = this.editorState.dragPreview();

    if (dragPreview && dragPreview.isValidDrop && dragPreview.targetTrack) {
      // Calculate drop position in timeline
      // The preview is centered with CSS transform: translate(-50%, -50%)
      // So we need to adjust for the half width to get the actual start position
      const clipDuration = dragPreview.buffer.duration;
      const clipWidthInPx = clipDuration * this.pxPerSecond();
      const adjustedX = detail.position.x - clipWidthInPx / 2;
      const mouseTime = this.getTimeAtPosition(adjustedX);
      const dropTime = Math.max(0, mouseTime);

      // Add sound to target track by extending the buffer with metadata
      const extendedBuffer = Object.assign(dragPreview.buffer, {
        name: dragPreview.sound.name,
        category: dragPreview.sound.category,
        id: dragPreview.sound.id,
      });
      this.addSoundToTrack(extendedBuffer, dragPreview.targetTrack, dropTime);
    }

    // End drag operation
    this.editorState.endSoundDrag();
  }

  private getTrackAtPosition(y: number): Track | undefined {
    // Get track lane elements
    const trackLanes =
      this.trackLanesEl.nativeElement.querySelectorAll('track-lane');

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
    const trackLanesRect =
      this.trackLanesEl.nativeElement.getBoundingClientRect();
    const relativeX =
      x - trackLanesRect.left + this.trackLanesEl.nativeElement.scrollLeft;

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

  private async handleSoundDrop(
    soundData: { id: string; name: string; category: string },
    track: Track,
    event: DragEvent
  ) {
    try {
      // Load the sound
      const buffer = await this.soundLibrary.loadSound(soundData.id);
      if (!buffer) {
        console.error('Failed to load sound for drop');
        return;
      }

      // Calculate drop position based on mouse position
      // Use document.elementFromPoint to get the actual element under the mouse
      const elementUnderMouse = document.elementFromPoint(
        event.clientX,
        event.clientY
      );
      const lane = elementUnderMouse?.closest('.lane') as HTMLElement;

      if (!lane) {
        console.error('Could not find lane element at drop position');
        // Fallback to using playhead position
        const dropTime = this.playhead();
        this.addSoundToTrack(
          Object.assign(buffer, {
            name: soundData.name,
            category: soundData.category,
            id: soundData.id,
          }),
          track,
          dropTime
        );
        return;
      }

      const clipsEl = lane.querySelector('.clips');
      if (!clipsEl) {
        console.error('Could not find .clips element in lane');
        // Fallback to using playhead position
        const dropTime = this.playhead();
        this.addSoundToTrack(
          Object.assign(buffer, {
            name: soundData.name,
            category: soundData.category,
            id: soundData.id,
          }),
          track,
          dropTime
        );
        return;
      }

      const rect = clipsEl.getBoundingClientRect();
      // Die Preview wird mit CSS transform: translate(-50%, -50%) zentriert angezeigt.
      // Das bedeutet, die visuelle Position ist um die halbe Breite nach links verschoben.
      // Beim Drop müssen wir das berücksichtigen, um WYSIWYG zu erreichen.
      const clipWidthInPx = buffer.duration * this.pxPerSecond();
      const x = event.clientX - rect.left - clipWidthInPx / 2;
      let dropTime = Math.max(0, this.timelineService.pxToSeconds(x));
      
      // Snap to grid if enabled
      if (this.editorState.snapToGrid()) {
        dropTime = this.editorState.snapPositionToGrid(dropTime);
        
        // Visual feedback
        this.showSnapIndicator(dropTime);
      }

      // Create the audio buffer with metadata
      const audioBuffer = Object.assign(buffer, {
        name: soundData.name,
        category: soundData.category,
        id: soundData.id,
      });

      // Add to specific track at drop position
      this.addSoundToTrack(audioBuffer, track, dropTime);
    } catch (error) {
      console.error('Error handling sound drop:', error);
    }
  }

  // Neue Helper-Methode für visuelles Feedback
  private showSnapIndicator(time: number): void {
    // Kurzes visuelles Feedback für Snap
    const indicator = document.createElement('div');
    indicator.className = 'snap-indicator';
    indicator.style.left = `${this.timelineService.secondsToPx(time)}px`;
    
    const container = this.trackLanesEl?.nativeElement;
    if (container) {
      container.appendChild(indicator);
      setTimeout(() => indicator.remove(), 500);
    }
  }
  
  private addSoundToTrack(
    buffer: AudioBuffer & { name: string; category: string; id?: string },
    track: Track,
    startTime: number
  ) {
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
      finalStartTime =
        overlappingClip.startTime + overlappingClip.duration + 0.1;
    }

    this.tracks.update(list => {
      const targetTrack = list.find(t => t.id === track.id);
      if (targetTrack) {
        const newClip = this.clipFactory.createClipFromBuffer(
          buffer,
          buffer.name,
          finalStartTime
        );
        newClip.soundId = buffer.id || crypto.randomUUID();

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

    const x = ev.clientX - rect.left;
    this.timelineService.scrubToPosition(x, scrollLeft);
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
    this.timelineService.scrubToPosition(x, 0);
    this.seeking = true;
    (document.body as HTMLElement).style.userSelect = 'none';
  }

  private forceRegenerateAllWaveforms(): void {
    // Force regenerate ALL waveforms, even if they exist
    this.editorState.tracks.update(tracks => {
      return tracks.map(track => ({
        ...track,
        clips: track.clips.map(clip => ({
          ...clip,
          waveform: this.clipFactory.regenerateWaveform(clip),
        })),
      }));
    });
  }
}
