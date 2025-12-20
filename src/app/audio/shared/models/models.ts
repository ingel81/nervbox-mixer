import { WaveformService } from '../../audio-engine/services/waveform.service';

// ============================================================================
// Effect Types and Interfaces
// ============================================================================

export type EffectType =
  | 'reverb'
  | 'delay'
  | 'eq'
  | 'distortion'
  | 'compressor'
  | 'filter'
  | 'pitch-shift'
  | 'chorus';

// Base interface for all effect parameters
export interface BaseEffectParams {
  mix: number; // 0-1, Wet/Dry Mix
}

export interface ReverbParams extends BaseEffectParams {
  decay: number; // 0.1-10 seconds
  preDelay: number; // 0-0.1 seconds
}

export interface DelayParams extends BaseEffectParams {
  time: number; // 0.001-1 seconds
  feedback: number; // 0-0.95
  pingPong: boolean;
}

export interface EQParams extends BaseEffectParams {
  low: number; // -12 to +12 dB
  mid: number; // -12 to +12 dB
  high: number; // -12 to +12 dB
}

export interface DistortionParams extends BaseEffectParams {
  drive: number; // 0-1
}

export interface CompressorParams extends BaseEffectParams {
  threshold: number; // -60 to 0 dB
  ratio: number; // 1-20
  attack: number; // 0-1 seconds
  release: number; // 0-2 seconds
}

export interface FilterParams extends BaseEffectParams {
  type: 'lowpass' | 'highpass' | 'bandpass';
  frequency: number; // 20-20000 Hz
  resonance: number; // 0-20
}

export interface PitchShiftParams extends BaseEffectParams {
  semitones: number; // -12 to +12
}

export interface ChorusParams extends BaseEffectParams {
  rate: number; // 0.1-10 Hz
  depth: number; // 0-1
  feedback: number; // 0-0.95
}

// Union type for all effect parameters
export type EffectParams =
  | ReverbParams
  | DelayParams
  | EQParams
  | DistortionParams
  | CompressorParams
  | FilterParams
  | PitchShiftParams
  | ChorusParams;

// A single effect in the effect chain
export interface ClipEffect {
  id: string;
  type: EffectType;
  enabled: boolean;
  params: EffectParams;
  preset?: string; // Factory preset name
}

// Serializable effect definition (for persistence)
export interface EffectDefinition {
  type: EffectType;
  enabled: boolean;
  params: EffectParams;
  preset?: string;
}

// ============================================================================
// Clip and Track Interfaces
// ============================================================================

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

  // Waveform generation method
  generateWaveform?: (pxPerSecond: number, waveformService: WaveformService) => void;

  // Effect chain for this clip
  effects?: ClipEffect[];
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
  offset?: number;        // offset into the AudioBuffer where playback begins (seconds)
  trimStart?: number;     // seconds to trim from start
  trimEnd?: number;       // seconds to trim from end
  volume?: number;        // clip-specific volume (0-1)
  color?: string;         // optional clip color override
  effects?: EffectDefinition[]; // Effect chain for this clip
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
  // Grid settings
  timeSignature?: { numerator: number; denominator: number };
  gridSubdivision?: 'bar' | '1/2' | '1/4' | '1/8' | '1/16';
  snapToGrid?: boolean;
}
