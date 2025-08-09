import { Injectable } from '@angular/core';
import { Track, Clip } from '../models/models';
import { SoundLibraryService } from './sound-library.service';
import { WaveformService } from './waveform.service';

@Injectable({
  providedIn: 'root'
})
export class DefaultArrangementService {
  
  constructor(
    private soundLibrary: SoundLibraryService,
    private waveformService: WaveformService
  ) {}
  
  async createDefaultHipHopTracks(): Promise<Track[]> {
    // Create multiple tracks for a complete 90s hip hop setup (20 seconds)
    const kickTrack: Track = { 
      id: crypto.randomUUID(), 
      name: 'Kick', 
      clips: [], 
      mute: false, 
      solo: false, 
      volume: 1, 
      pan: 0 
    };

    const snareTrack: Track = { 
      id: crypto.randomUUID(), 
      name: 'Snare', 
      clips: [], 
      mute: false, 
      solo: false, 
      volume: 0.9, 
      pan: 0 
    };

    // Two separate hi-hat tracks to avoid overlapping issues
    const hihatClosedTrack: Track = { 
      id: crypto.randomUUID(), 
      name: 'Hi-Hat Closed', 
      clips: [], 
      mute: false, 
      solo: false, 
      volume: 0.6, 
      pan: 0.1 
    };

    const hihatOpenTrack: Track = { 
      id: crypto.randomUUID(), 
      name: 'Hi-Hat Open', 
      clips: [], 
      mute: false, 
      solo: false, 
      volume: 0.5, 
      pan: -0.1 
    };

    const bassTrack: Track = { 
      id: crypto.randomUUID(), 
      name: 'Bass', 
      clips: [], 
      mute: false, 
      solo: false, 
      volume: 0.8, 
      pan: 0 
    };

    // Try to load and create beat pattern clips
    try {
      // Load sounds from our library
      const kickBuffer = await this.soundLibrary.loadSound('kick-1'); // Classic 90s kick
      const snareBuffer = await this.soundLibrary.loadSound('snare-2'); // Crispy snare
      const hihatClosedBuffer = await this.soundLibrary.loadSound('hi-hat-3'); // Closed hi-hat
      const hihatOpenBuffer = await this.soundLibrary.loadSound('hi-hat-10'); // Open hi-hat
      const bassBuffer = await this.soundLibrary.loadSound('bass-1-g2'); // Deep bass

      // Extended 90s hip hop pattern (20 seconds at 90 BPM = ~7.5 bars)
      const barLength = 2.67; // seconds per bar at 90 BPM
      const beatInterval = barLength / 4; // quarter notes
      const totalBars = Math.floor(20 / barLength); // ~7 bars for 20 seconds
      const pxPerSecond = 120; // Default px per second for waveform generation

      // Helper function to create a clip
      const createClip = (buffer: AudioBuffer, name: string, startTime: number, color: string, soundId: string, durationMultiplier = 1): Clip => ({
        id: crypto.randomUUID(),
        name,
        startTime,
        duration: buffer.duration * durationMultiplier,
        offset: 0,
        trimStart: 0,
        trimEnd: 0,
        originalDuration: buffer.duration,
        buffer,
        color,
        waveform: this.waveformService.generateFromBuffer(buffer, {
          width: Math.floor(buffer.duration * pxPerSecond),
          height: 44,
          clipColor: color
        }),
        soundId
      } as any);

      // Kick pattern: Classic boom-bap with variation every 2 bars
      if (kickBuffer) {
        const kickColor = 'linear-gradient(45deg, #dc2626, #b91c1c)';
        for (let bar = 0; bar < totalBars; bar++) {
          const barStart = bar * barLength;
          const isVariationBar = bar % 4 >= 2; // Variation every 2 bars
          
          // Beat 1 - always kick
          kickTrack.clips.push(createClip(kickBuffer, 'Kick', barStart, kickColor, 'kick-1'));
          
          // Beat 2.5 - syncopated kick
          if (!isVariationBar || bar % 2 === 0) {
            kickTrack.clips.push(createClip(kickBuffer, 'Kick', barStart + beatInterval * 1.5, kickColor, 'kick-1'));
          }
          
          // Beat 4 - less frequent for variation
          if (bar % 3 !== 0) {
            kickTrack.clips.push(createClip(kickBuffer, 'Kick', barStart + beatInterval * 3, kickColor, 'kick-1'));
          }
        }
      }

      // Snare pattern: backbeat on 2 and 4 with occasional ghost notes
      if (snareBuffer) {
        const snareColor = 'linear-gradient(45deg, #f59e0b, #d97706)';
        for (let bar = 0; bar < totalBars; bar++) {
          const barStart = bar * barLength;
          
          // Beat 2 - main snare
          snareTrack.clips.push(createClip(snareBuffer, 'Snare', barStart + beatInterval * 1, snareColor, 'snare-2'));
          
          // Beat 4 - main snare
          snareTrack.clips.push(createClip(snareBuffer, 'Snare', barStart + beatInterval * 3, snareColor, 'snare-2'));
          
          // Ghost notes occasionally on off-beats for groove
          if (bar % 4 === 2) {
            snareTrack.clips.push(createClip(snareBuffer, 'Snare', barStart + beatInterval * 0.75, snareColor, 'snare-2', 0.6));
          }
        }
      }

      // Hi-hat closed pattern: steady 8th notes
      if (hihatClosedBuffer) {
        const hihatColor = 'linear-gradient(45deg, #10b981, #059669)';
        for (let bar = 0; bar < totalBars; bar++) {
          const barStart = bar * barLength;
          const eighthNote = beatInterval / 2;
          
          // Steady 8th note pattern with some gaps for groove
          for (let i = 0; i < 8; i++) {
            // Skip some beats to create groove and avoid snare conflicts
            if (i !== 2 && i !== 6 && !(bar % 2 === 1 && i === 4)) {
              hihatClosedTrack.clips.push(createClip(hihatClosedBuffer, 'Hi-Hat Closed', barStart + (i * eighthNote), hihatColor, 'hi-hat-3'));
            }
          }
        }
      }

      // Hi-hat open pattern: occasional accents
      if (hihatOpenBuffer) {
        const hihatOpenColor = 'linear-gradient(45deg, #8b5cf6, #7c3aed)';
        for (let bar = 0; bar < totalBars; bar++) {
          const barStart = bar * barLength;
          
          // Open hi-hat accents on certain off-beats for flavor
          if (bar % 4 === 1) {
            hihatOpenTrack.clips.push(createClip(hihatOpenBuffer, 'Hi-Hat Open', barStart + beatInterval * 3.5, hihatOpenColor, 'hi-hat-10'));
          }
          
          if (bar % 8 === 5) {
            hihatOpenTrack.clips.push(createClip(hihatOpenBuffer, 'Hi-Hat Open', barStart + beatInterval * 1.75, hihatOpenColor, 'hi-hat-10'));
          }
        }
      }

      // Bass pattern: Simple but groovy pattern
      if (bassBuffer) {
        const bassColor = 'linear-gradient(45deg, #dc2626, #991b1b)';
        for (let bar = 0; bar < totalBars; bar++) {
          const barStart = bar * barLength;
          
          // Main bass hits - root note pattern
          bassTrack.clips.push(createClip(bassBuffer, 'Bass', barStart, bassColor, 'bass-1-g2'));
          
          // Variation every other bar
          if (bar % 2 === 1) {
            bassTrack.clips.push(createClip(bassBuffer, 'Bass', barStart + beatInterval * 2.5, bassColor, 'bass-1-g2'));
          }
          
          // Less frequent hits for groove
          if (bar % 4 === 2) {
            bassTrack.clips.push(createClip(bassBuffer, 'Bass', barStart + beatInterval * 1.25, bassColor, 'bass-1-g2'));
          }
        }
      }

      console.log('Default hip hop track setup created successfully');
      console.log(`Total clips: Kick=${kickTrack.clips.length}, Snare=${snareTrack.clips.length}, HH Closed=${hihatClosedTrack.clips.length}, HH Open=${hihatOpenTrack.clips.length}, Bass=${bassTrack.clips.length}`);
    } catch (error) {
      console.error('Error loading default sounds:', error);
    }

    return [kickTrack, snareTrack, hihatClosedTrack, hihatOpenTrack, bassTrack];
  }

}