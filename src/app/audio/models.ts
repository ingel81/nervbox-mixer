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
