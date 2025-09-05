import { Injectable, inject } from '@angular/core';
import { Track, Clip, ArrangementDefinition, TrackDefinition, ClipDefinition } from '../../shared/models/models';
import { SoundLibraryService } from '../../sound-browser/services/sound-library.service';
import { WaveformService } from '../../audio-engine/services/waveform.service';
import { EditorStateService } from '../../editor/services/editor-state.service';
import { AnalyticsService } from '../../../services/analytics.service';

@Injectable({
  providedIn: 'root'
})
export class ArrangementService {
  
  private soundLibrary = inject(SoundLibraryService);
  private waveformService = inject(WaveformService);
  private editorState = inject(EditorStateService);
  private analytics = inject(AnalyticsService);
  
  /**
   * Creates tracks from an arrangement definition (JSON-based pattern)
   * This replaces the old manual clip creation approach
   */
  async createFromDefinition(definition: ArrangementDefinition): Promise<Track[]> {
    const tracks: Track[] = [];
    
    // Apply grid settings from arrangement
    if (definition.bpm) {
      this.editorState.bpm.set(definition.bpm);
    }
    if (definition.timeSignature) {
      this.editorState.timeSignature.set(definition.timeSignature);
    }
    if (definition.gridSubdivision) {
      this.editorState.gridSubdivision.set(definition.gridSubdivision);
    }
    if (definition.snapToGrid !== undefined) {
      this.editorState.snapToGrid.set(definition.snapToGrid);
    }
    
    for (const trackDef of definition.tracks) {
      const track: Track = {
        id: crypto.randomUUID(),
        name: trackDef.name,
        volume: trackDef.volume,
        pan: trackDef.pan,
        mute: trackDef.mute,
        solo: trackDef.solo,
        clips: []
      };
      
      // Process clips for this track
      for (const clipDef of trackDef.clips) {
        const clip = await this.createClipFromDefinition(clipDef, trackDef);
        if (clip) {
          track.clips.push(clip);
        }
      }
      
      tracks.push(track);
    }
    
    console.log(`Arrangement "${definition.name}" created successfully`);
    console.log(`Total clips: ${tracks.reduce((sum, track) => sum + track.clips.length, 0)}`);
    
    // Track arrangement load
    this.analytics.trackArrangementLoad(definition.name, tracks.length);
    
    return tracks;
  }
  
  /**
   * Creates a single clip from a clip definition
   */
  private async createClipFromDefinition(
    clipDef: ClipDefinition, 
    trackDef: TrackDefinition
  ): Promise<Clip | null> {
    try {
      const buffer = await this.soundLibrary.loadSound(clipDef.soundId);
      if (!buffer) {
        console.warn(`Failed to load sound: ${clipDef.soundId}`);
        return null;
      }
      
      const duration = clipDef.duration || (buffer.duration - (clipDef.trimStart || 0) - (clipDef.trimEnd || 0));
      const color = clipDef.color || trackDef.color || this.getDefaultClipColor(clipDef.soundId);
      
      const clip: Clip = {
        id: crypto.randomUUID(),
        name: clipDef.soundId,
        startTime: clipDef.startTime,
        duration: Math.max(0.01, duration), // Ensure minimum duration
        offset: clipDef.offset !== undefined ? clipDef.offset : (clipDef.trimStart || 0),
        trimStart: clipDef.trimStart || 0,
        trimEnd: clipDef.trimEnd || 0,
        originalDuration: buffer.duration,
        buffer,
        color,
        soundId: clipDef.soundId
      } as Clip;
      
      // Generate waveform after model is applied from JSON
      const pxPerSecond = this.editorState.pxPerSecond(); // Use actual px per second from editor state
      const width = Math.floor(clip.duration * pxPerSecond);
      clip.waveform = this.waveformService.generateFromBuffer(buffer, {
        width: Math.max(1, width),
        height: 44,
        clipColor: color,
        trimStart: clip.trimStart,
        trimEnd: clip.trimEnd
      });
      
      return clip;
    } catch (error) {
      console.error(`Error creating clip for sound ${clipDef.soundId}:`, error);
      return null;
    }
  }
  
  // No longer needed - waveforms generated during model creation
  
  /**
   * Converts existing tracks to arrangement definition format
   * Useful for saving arrangements in JSON format
   */
  tracksToDefinition(tracks: Track[], name: string, bpm = 120): ArrangementDefinition {
    const duration = this.calculateArrangementDuration(tracks);
    
    // Get current grid settings from EditorState
    const currentBpm = this.editorState.bpm();
    const timeSignature = this.editorState.timeSignature();
    const gridSubdivision = this.editorState.gridSubdivision();
    const snapToGrid = this.editorState.snapToGrid();
    
    const trackDefinitions: TrackDefinition[] = tracks.map(track => ({
      name: track.name,
      volume: track.volume,
      pan: track.pan,
      mute: track.mute,
      solo: track.solo,
      clips: track.clips.map(clip => ({
        soundId: clip.soundId || crypto.randomUUID(),
        startTime: clip.startTime,
        duration: clip.duration !== clip.originalDuration ? clip.duration : undefined,
        offset: clip.offset !== clip.trimStart ? clip.offset : undefined,
        trimStart: clip.trimStart > 0 ? clip.trimStart : undefined,
        trimEnd: clip.trimEnd > 0 ? clip.trimEnd : undefined,
        color: clip.color
      }))
    }));
    
    return {
      name,
      bpm: currentBpm || bpm, // Use current BPM from editor state
      duration,
      tracks: trackDefinitions,
      // Include grid settings
      timeSignature,
      gridSubdivision,
      snapToGrid
    };
  }
  
  private calculateArrangementDuration(tracks: Track[]): number {
    let maxDuration = 0;
    
    for (const track of tracks) {
      for (const clip of track.clips) {
        const clipEnd = clip.startTime + clip.duration;
        if (clipEnd > maxDuration) {
          maxDuration = clipEnd;
        }
      }
    }
    
    return Math.ceil(maxDuration);
  }
  
  private getDefaultClipColor(soundId: string): string {
    // Generate colors based on sound type/category
    if (soundId.includes('kick')) {
      return 'linear-gradient(45deg, #dc2626, #b91c1c)';
    } else if (soundId.includes('snare')) {
      return 'linear-gradient(45deg, #f59e0b, #d97706)';
    } else if (soundId.includes('hi-hat') || soundId.includes('hihat')) {
      return 'linear-gradient(45deg, #10b981, #059669)';
    } else if (soundId.includes('bass')) {
      return 'linear-gradient(45deg, #dc2626, #991b1b)';
    } else if (soundId.includes('synth')) {
      return 'linear-gradient(45deg, #3b82f6, #2563eb)';
    } else {
      return 'linear-gradient(45deg, #6b7280, #4b5563)';
    }
  }
}