export interface Clip {
  id: string;
  name: string;
  /** start position on the timeline, seconds */
  startTime: number;
  /** play length in seconds */
  duration: number;
  /** offset into the AudioBuffer where playback begins (seconds) */
  offset: number;
  buffer: AudioBuffer;
  color: string;
  waveform?: string; // Canvas data URL for waveform
  
  // Trimming properties
  trimStart: number; // seconds trimmed from start
  trimEnd: number;   // seconds trimmed from end
  originalDuration: number; // original duration before trimming
  soundId?: string; // ID for identifying sound samples
}

export interface Track {
  id: string;
  name: string;
  clips: Clip[];
  mute: boolean;
  solo: boolean;
  /** 0..1 */
  volume: number;
  /** -1..1 */
  pan: number;
}

// Arrangement definition interfaces for JSON-based patterns
export interface ClipDefinition {
  soundId: string;        // Reference to sound library
  startTime: number;      // seconds
  duration?: number;      // optional - uses full sound if omitted
  trimStart?: number;     // seconds to trim from start
  trimEnd?: number;       // seconds to trim from end
  volume?: number;        // clip-specific volume (0-1)
  color?: string;         // optional clip color override
}

export interface TrackDefinition {
  name: string;
  volume: number;
  pan: number;
  mute: boolean;
  solo: boolean;
  color?: string;         // default color for clips in this track
  clips: ClipDefinition[];
}

export interface ArrangementDefinition {
  name: string;
  bpm: number;
  duration: number;       // total seconds
  tracks: TrackDefinition[];
}
