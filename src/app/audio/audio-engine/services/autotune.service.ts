import { Injectable, inject } from '@angular/core';
import * as Tone from 'tone';
import { PitchDetectionService } from './pitch-detection.service';
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
 * Service for real-time pitch correction (autotune) using Tone.js PitchShift
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
   * Uses Tone.js PitchShift with OfflineAudioContext for high-quality offline processing
   *
   * @param audioBuffer Input audio buffer
   * @param params Autotune parameters
   * @param context Audio context (used for sample rate reference)
   * @returns Processed audio buffer with pitch correction
   */
  async processAudioBuffer(
    audioBuffer: AudioBuffer,
    params: AutotuneParams,
    _context: AudioContext | OfflineAudioContext
  ): Promise<AutotuneResult> {
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0); // Process first channel (mono or left)

    // Generate scale notes for the selected key/scale
    const scaleNotes = this.pitchDetection.getScaleNotes(params.key, params.scale);

    // Analyze pitch throughout the buffer
    const detectedNotes: { time: number; note: string; frequency: number }[] = [];
    const pitchCurve: { time: number; targetRatio: number }[] = [];

    console.log(`[Autotune] Analyzing ${audioBuffer.duration.toFixed(2)}s of audio...`);

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

    console.log(`[Autotune] Detected ${detectedNotes.length} pitch points`);

    // If no pitch detected, return original buffer
    if (pitchCurve.length === 0) {
      console.log('[Autotune] No pitch detected in audio');
      return {
        processedBuffer: audioBuffer,
        detectedNotes: [],
        correctionApplied: false,
      };
    }

    // Calculate average pitch shift needed
    const avgRatio = pitchCurve.reduce((sum, p) => sum + p.targetRatio, 0) / pitchCurve.length;
    const avgSemitones = 12 * Math.log2(avgRatio);

    console.log(`[Autotune] Average pitch correction: ${avgSemitones.toFixed(2)} semitones`);

    // Skip processing if correction is negligible
    if (Math.abs(avgSemitones) < 0.01) {
      console.log('[Autotune] Pitch correction negligible, skipping processing');
      return {
        processedBuffer: audioBuffer,
        detectedNotes,
        correctionApplied: false,
      };
    }

    try {
      // Create offline context for rendering
      const offlineContext = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        sampleRate
      );

      // Set Tone.js to use offline context
      Tone.setContext(offlineContext as unknown as Tone.Context);

      // Create Tone.js PitchShift
      const pitchShift = new Tone.PitchShift({
        pitch: avgSemitones,
        wet: params.mix,
        windowSize: 0.1, // 100ms window for better quality
        delayTime: 0,
      });

      // Create source and connect
      const source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;

      // Create native gain nodes for input/output
      const inputGain = offlineContext.createGain();
      const outputGain = offlineContext.createGain();

      // Connect: source -> inputGain -> pitchShift -> outputGain -> destination
      source.connect(inputGain);
      Tone.connect(inputGain, pitchShift);
      Tone.connect(pitchShift, outputGain);
      outputGain.connect(offlineContext.destination);

      // Start and render
      source.start(0);
      console.log('[Autotune] Rendering with pitch shift...');
      const processedBuffer = await offlineContext.startRendering();

      // Cleanup
      pitchShift.dispose();

      console.log('[Autotune] ✓ Processing complete');

      return {
        processedBuffer,
        detectedNotes,
        correctionApplied: true,
      };
    } catch (error) {
      console.error('[Autotune] Processing failed:', error);
      return {
        processedBuffer: audioBuffer,
        detectedNotes,
        correctionApplied: false,
      };
    }
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
