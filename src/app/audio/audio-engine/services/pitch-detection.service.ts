import { Injectable } from '@angular/core';
import * as Pitchfinder from 'pitchfinder';

/**
 * Musical note information
 */
export interface NoteInfo {
  frequency: number; // Hz
  note: string; // e.g., 'C4', 'A#3'
  midiNote: number; // MIDI note number (0-127)
  cents: number; // Cents deviation from target note (-50 to +50)
}

/**
 * Scale note representation
 */
export interface ScaleNote {
  note: string; // e.g., 'C', 'D', 'E'
  octave?: number; // Optional octave specifier
  frequency: number; // Hz
  midiNote: number; // MIDI note number
}

/**
 * Service for detecting pitch from audio data using YIN algorithm
 */
@Injectable({ providedIn: 'root' })
export class PitchDetectionService {
  private detector: (input: Float32Array) => number | null;

  // Standard A4 = 440 Hz reference
  private readonly A4_FREQUENCY = 440;
  private readonly A4_MIDI_NOTE = 69;

  // Note names for chromatic scale
  private readonly NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  constructor() {
    // Initialize YIN detector (best for vocals)
    // YIN is more accurate than autocorrelation for monophonic pitch detection
    this.detector = Pitchfinder.YIN({ sampleRate: 48000 });
  }

  /**
   * Detect pitch from audio buffer
   * @param audioData Float32Array of audio samples
   * @param sampleRate Sample rate of the audio
   * @returns Detected frequency in Hz, or null if no pitch detected
   */
  detectPitch(audioData: Float32Array, sampleRate: number): number | null {
    // Update detector if sample rate changed
    if (sampleRate !== 48000) {
      this.detector = Pitchfinder.YIN({ sampleRate });
    }

    return this.detector(audioData);
  }

  /**
   * Convert frequency to MIDI note number
   * @param frequency Frequency in Hz
   * @returns MIDI note number (0-127)
   */
  frequencyToMidi(frequency: number): number {
    return Math.round(12 * Math.log2(frequency / this.A4_FREQUENCY) + this.A4_MIDI_NOTE);
  }

  /**
   * Convert MIDI note number to frequency
   * @param midiNote MIDI note number (0-127)
   * @returns Frequency in Hz
   */
  midiToFrequency(midiNote: number): number {
    return this.A4_FREQUENCY * Math.pow(2, (midiNote - this.A4_MIDI_NOTE) / 12);
  }

  /**
   * Get note name from MIDI note number
   * @param midiNote MIDI note number (0-127)
   * @returns Note name with octave (e.g., 'C4', 'A#3')
   */
  midiToNoteName(midiNote: number): string {
    const octave = Math.floor(midiNote / 12) - 1;
    const noteIndex = midiNote % 12;
    return `${this.NOTE_NAMES[noteIndex]}${octave}`;
  }

  /**
   * Convert note name to MIDI note number
   * @param noteName Note name (e.g., 'C4', 'A#3')
   * @returns MIDI note number
   */
  noteNameToMidi(noteName: string): number {
    const match = noteName.match(/^([A-G]#?)(-?\d+)$/);
    if (!match) {
      throw new Error(`Invalid note name: ${noteName}`);
    }

    const note = match[1];
    const octave = parseInt(match[2], 10);
    const noteIndex = this.NOTE_NAMES.indexOf(note);

    if (noteIndex === -1) {
      throw new Error(`Invalid note: ${note}`);
    }

    return (octave + 1) * 12 + noteIndex;
  }

  /**
   * Get detailed note information from frequency
   * @param frequency Frequency in Hz
   * @returns Note information including cents deviation
   */
  getNoteInfo(frequency: number): NoteInfo {
    const exactMidi = 12 * Math.log2(frequency / this.A4_FREQUENCY) + this.A4_MIDI_NOTE;
    const midiNote = Math.round(exactMidi);
    const cents = Math.round((exactMidi - midiNote) * 100);
    const note = this.midiToNoteName(midiNote);

    return {
      frequency,
      note,
      midiNote,
      cents,
    };
  }

  /**
   * Get scale notes for a given key and scale type
   * @param key Root note (e.g., 'C', 'F#', 'Bb')
   * @param scale Scale type ('major', 'minor', 'chromatic')
   * @param octaves Number of octaves to generate (default: 8)
   * @returns Array of scale notes
   */
  getScaleNotes(key: string, scale: 'major' | 'minor' | 'chromatic', octaves = 8): ScaleNote[] {
    // Major scale intervals: W-W-H-W-W-W-H (semitones: 0,2,4,5,7,9,11)
    const majorIntervals = [0, 2, 4, 5, 7, 9, 11];
    // Minor scale intervals: W-H-W-W-H-W-W (semitones: 0,2,3,5,7,8,10)
    const minorIntervals = [0, 2, 3, 5, 7, 8, 10];
    // Chromatic: all semitones
    const chromaticIntervals = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

    const intervals = scale === 'major' ? majorIntervals : scale === 'minor' ? minorIntervals : chromaticIntervals;

    // Find root note index
    const rootIndex = this.NOTE_NAMES.indexOf(key);
    if (rootIndex === -1) {
      throw new Error(`Invalid key: ${key}`);
    }

    const scaleNotes: ScaleNote[] = [];

    // Generate scale notes across all octaves
    for (let octave = 0; octave < octaves; octave++) {
      for (const interval of intervals) {
        const noteIndex = (rootIndex + interval) % 12;
        const midiNote = octave * 12 + noteIndex;
        const frequency = this.midiToFrequency(midiNote);
        const note = this.NOTE_NAMES[noteIndex];

        scaleNotes.push({
          note,
          octave,
          frequency,
          midiNote,
        });
      }
    }

    return scaleNotes;
  }

  /**
   * Find nearest scale note to a given frequency
   * @param frequency Input frequency in Hz
   * @param scaleNotes Array of scale notes
   * @returns Nearest scale note
   */
  findNearestScaleNote(frequency: number, scaleNotes: ScaleNote[]): ScaleNote {
    let nearest = scaleNotes[0];
    let minDiff = Math.abs(frequency - nearest.frequency);

    for (const note of scaleNotes) {
      const diff = Math.abs(frequency - note.frequency);
      if (diff < minDiff) {
        minDiff = diff;
        nearest = note;
      }
    }

    return nearest;
  }

  /**
   * Calculate pitch correction ratio
   * @param inputFreq Input frequency in Hz
   * @param targetFreq Target frequency in Hz
   * @returns Pitch shift ratio (e.g., 1.0 = no shift, 1.06 = up by semitone)
   */
  calculatePitchRatio(inputFreq: number, targetFreq: number): number {
    return targetFreq / inputFreq;
  }
}
