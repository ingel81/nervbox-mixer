import { Injectable, inject } from '@angular/core';
import { BungeePitchShift } from 'bungee-pitch-shift';
import { PitchDetectionService, ScaleNote } from './pitch-detection.service';
import { AutotuneParams } from '../../shared/models/models';

/**
 * Autotune processing result
 */
export interface AutotuneResult {
  processedBuffer: AudioBuffer;
  detectedNotes: { time: number; note: string; frequency: number }[];
  correctionApplied: boolean;
}

/**
 * Service for real-time pitch correction (autotune) using bungee-pitch-shift
 */
@Injectable({ providedIn: 'root' })
export class AutotuneService {
  private pitchDetection = inject(PitchDetectionService);

  // Frame size for pitch detection (in samples at 48kHz)
  private readonly FRAME_SIZE = 2048;
  // Hop size for overlapping analysis
  private readonly HOP_SIZE = 512;

  /**
   * Process audio buffer with autotune effect
   * This is an offline/pre-processing approach for clip-based editing
   *
   * @param audioBuffer Input audio buffer
   * @param params Autotune parameters
   * @param context Audio context for processing
   * @returns Processed audio buffer with pitch correction
   */
  async processAudioBuffer(audioBuffer: AudioBuffer, params: AutotuneParams, context: AudioContext | OfflineAudioContext): Promise<AutotuneResult> {
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0); // Process first channel (mono or left)
    const duration = audioBuffer.duration;

    // Generate scale notes for the selected key/scale
    const scaleNotes = this.pitchDetection.getScaleNotes(params.key, params.scale);

    // Analyze pitch throughout the buffer
    const detectedNotes: { time: number; note: string; frequency: number }[] = [];
    const pitchCurve: { time: number; targetRatio: number }[] = [];

    for (let pos = 0; pos < channelData.length - this.FRAME_SIZE; pos += this.HOP_SIZE) {
      const frame = channelData.slice(pos, pos + this.FRAME_SIZE);
      const detectedFreq = this.pitchDetection.detectPitch(frame, sampleRate);

      if (detectedFreq && detectedFreq > 60 && detectedFreq < 1000) {
        // Valid vocal range (roughly)
        const time = pos / sampleRate;
        const noteInfo = this.pitchDetection.getNoteInfo(detectedFreq);
        const targetNote = this.pitchDetection.findNearestScaleNote(detectedFreq, scaleNotes);
        const pitchRatio = this.pitchDetection.calculatePitchRatio(detectedFreq, targetNote.frequency);

        // Apply correction strength (0 = no correction, 1 = full snap)
        const correctedRatio = 1 + (pitchRatio - 1) * params.strength;

        detectedNotes.push({
          time,
          note: noteInfo.note,
          frequency: detectedFreq,
        });

        pitchCurve.push({
          time,
          targetRatio: correctedRatio,
        });
      }
    }

    // If no pitch detected, return original buffer
    if (pitchCurve.length === 0) {
      return {
        processedBuffer: audioBuffer,
        detectedNotes: [],
        correctionApplied: false,
      };
    }

    // Calculate average pitch shift needed
    const avgRatio = pitchCurve.reduce((sum, p) => sum + p.targetRatio, 0) / pitchCurve.length;
    const avgSemitones = 12 * Math.log2(avgRatio);

    // Use bungee-pitch-shift for high-quality pitch correction
    try {
      const pitchShifter = await BungeePitchShift.create(context as AudioContext, {
        workletPath: '/assets/audio-worklets/bungee-processor-bundled.js',
        initialPitch: avgSemitones,
        initialSpeed: 1.0, // Keep tempo constant
        initialMix: params.mix,
      });

      // Create offline context for processing
      const offlineContext = new OfflineAudioContext(audioBuffer.numberOfChannels, audioBuffer.length, sampleRate);

      // Create source
      const source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;

      // Connect through pitch shifter
      source.connect(pitchShifter.node);
      pitchShifter.connect(offlineContext.destination);

      // Start and render
      source.start(0);
      const processedBuffer = await offlineContext.startRendering();

      // Cleanup
      pitchShifter.dispose();

      return {
        processedBuffer,
        detectedNotes,
        correctionApplied: true,
      };
    } catch (error) {
      console.error('Autotune processing failed:', error);
      return {
        processedBuffer: audioBuffer,
        detectedNotes,
        correctionApplied: false,
      };
    }
  }

  /**
   * Create real-time autotune node for live processing
   * This can be used during playback for real-time pitch correction
   *
   * @param context Audio context
   * @param params Autotune parameters
   * @returns BungeePitchShift instance configured for autotune
   */
  async createRealtimeNode(context: AudioContext, params: AutotuneParams): Promise<BungeePitchShift> {
    const pitchShifter = await BungeePitchShift.create(context, {
      workletPath: '/assets/audio-worklets/bungee-processor-bundled.js',
      initialPitch: 0, // Will be adjusted dynamically
      initialSpeed: 1.0,
      initialMix: params.mix,
    });

    return pitchShifter;
  }

  /**
   * Calculate target pitch shift for a given frequency
   *
   * @param detectedFreq Detected input frequency in Hz
   * @param params Autotune parameters
   * @returns Target pitch shift in semitones
   */
  calculateTargetPitchShift(detectedFreq: number, params: AutotuneParams): number {
    const scaleNotes = this.pitchDetection.getScaleNotes(params.key, params.scale);
    const targetNote = this.pitchDetection.findNearestScaleNote(detectedFreq, scaleNotes);
    const pitchRatio = this.pitchDetection.calculatePitchRatio(detectedFreq, targetNote.frequency);

    // Apply correction strength
    const correctedRatio = 1 + (pitchRatio - 1) * params.strength;

    // Convert ratio to semitones
    return 12 * Math.log2(correctedRatio);
  }

  /**
   * Get available musical keys
   */
  getAvailableKeys(): string[] {
    return ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  }

  /**
   * Get available scale types
   */
  getAvailableScales(): Array<{ value: 'chromatic' | 'major' | 'minor'; label: string }> {
    return [
      { value: 'chromatic', label: 'Chromatic' },
      { value: 'major', label: 'Major' },
      { value: 'minor', label: 'Minor' },
    ];
  }
}
