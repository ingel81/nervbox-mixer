import { Injectable, signal, computed } from '@angular/core';
import * as Tone from 'tone';
import {
  ClipEffect,
  EffectType,
  EffectParams,
  ReverbParams,
  DelayParams,
  EQParams,
  DistortionParams,
  CompressorParams,
  FilterParams,
  PitchShiftParams,
  ChorusParams,
  AutotuneParams,
  VocoderParams,
  GainParams,
} from '../../shared/models/models';
import { generateUUID } from '../../shared/utils/uuid.util';

// Effect metadata for UI
export interface EffectMeta {
  type: EffectType;
  name: string;
  icon: string;
  description: string;
}

// Factory preset definition
export interface FactoryPreset {
  name: string;
  params: EffectParams;
}

// Cache entry for effect nodes per clip
interface EffectNodeCache {
  clipId: string;
  nodes: Map<string, Tone.ToneAudioNode>;
  inputNode: Tone.ToneAudioNode | null;
  outputNode: Tone.ToneAudioNode | null;
  inputBridge?: GainNode;
  outputBridge?: GainNode;
}

@Injectable({ providedIn: 'root' })
export class EffectsService {
  // Cache for active effect nodes per clip
  private nodeCache = new Map<string, EffectNodeCache>();

  // Currently selected effect for detail panel
  selectedEffect = signal<{ clipId: string; effectId: string } | null>(null);

  // Effect metadata for UI
  readonly effectMetas: EffectMeta[] = [
    { type: 'reverb', name: 'Reverb', icon: 'blur_on', description: 'Add space and depth' },
    { type: 'delay', name: 'Delay', icon: 'graphic_eq', description: 'Echo and repeat' },
    { type: 'eq', name: 'EQ', icon: 'equalizer', description: '3-band equalizer' },
    { type: 'distortion', name: 'Distortion', icon: 'flash_on', description: 'Add grit and drive' },
    { type: 'compressor', name: 'Compressor', icon: 'compress', description: 'Dynamic range control' },
    { type: 'filter', name: 'Filter', icon: 'filter_alt', description: 'Frequency shaping' },
    { type: 'pitch-shift', name: 'Pitch Shift', icon: 'trending_up', description: 'Change pitch' },
    { type: 'chorus', name: 'Chorus', icon: 'waves', description: 'Thicken and modulate' },
    { type: 'autotune', name: 'Autotune', icon: 'tune', description: 'Pitch correction' },
    { type: 'vocoder', name: 'Vocoder', icon: 'record_voice_over', description: 'Robot voice effect' },
    { type: 'gain', name: 'Gain', icon: 'volume_up', description: 'Boost or cut volume' },
  ];

  // Factory presets per effect type
  readonly factoryPresets: Map<EffectType, FactoryPreset[]> = new Map([
    [
      'reverb',
      [
        { name: 'Small Room', params: { mix: 0.3, decay: 0.5, preDelay: 0.01 } as ReverbParams },
        { name: 'Large Hall', params: { mix: 0.4, decay: 3.0, preDelay: 0.05 } as ReverbParams },
        { name: 'Plate', params: { mix: 0.35, decay: 1.5, preDelay: 0.02 } as ReverbParams },
        { name: 'Cathedral', params: { mix: 0.5, decay: 8.0, preDelay: 0.08 } as ReverbParams },
      ],
    ],
    [
      'delay',
      [
        { name: '1/4 Note', params: { mix: 0.3, time: 0.5, feedback: 0.4, pingPong: false } as DelayParams },
        { name: '1/8 Note', params: { mix: 0.25, time: 0.25, feedback: 0.5, pingPong: false } as DelayParams },
        { name: 'Ping Pong', params: { mix: 0.35, time: 0.375, feedback: 0.6, pingPong: true } as DelayParams },
        { name: 'Slapback', params: { mix: 0.4, time: 0.08, feedback: 0.2, pingPong: false } as DelayParams },
      ],
    ],
    [
      'eq',
      [
        { name: 'Flat', params: { mix: 1, low: 0, mid: 0, high: 0 } as EQParams },
        { name: 'Bass Boost', params: { mix: 1, low: 6, mid: 0, high: -2 } as EQParams },
        { name: 'Treble Boost', params: { mix: 1, low: -2, mid: 0, high: 6 } as EQParams },
        { name: 'Mid Scoop', params: { mix: 1, low: 3, mid: -4, high: 3 } as EQParams },
      ],
    ],
    [
      'distortion',
      [
        { name: 'Light', params: { mix: 0.3, drive: 0.2 } as DistortionParams },
        { name: 'Medium', params: { mix: 0.5, drive: 0.5 } as DistortionParams },
        { name: 'Heavy', params: { mix: 0.7, drive: 0.8 } as DistortionParams },
        { name: 'Extreme', params: { mix: 0.8, drive: 1.0 } as DistortionParams },
      ],
    ],
    [
      'compressor',
      [
        { name: 'Gentle', params: { mix: 1, threshold: -20, ratio: 2, attack: 0.1, release: 0.3 } as CompressorParams },
        { name: 'Moderate', params: { mix: 1, threshold: -24, ratio: 4, attack: 0.05, release: 0.2 } as CompressorParams },
        { name: 'Aggressive', params: { mix: 1, threshold: -30, ratio: 8, attack: 0.01, release: 0.1 } as CompressorParams },
        { name: 'Limiter', params: { mix: 1, threshold: -6, ratio: 20, attack: 0.001, release: 0.05 } as CompressorParams },
      ],
    ],
    [
      'filter',
      [
        { name: 'Low Pass Warm', params: { mix: 1, type: 'lowpass', frequency: 2000, resonance: 1 } as FilterParams },
        { name: 'High Pass Clean', params: { mix: 1, type: 'highpass', frequency: 200, resonance: 0.5 } as FilterParams },
        { name: 'Band Pass Mid', params: { mix: 1, type: 'bandpass', frequency: 1000, resonance: 2 } as FilterParams },
        { name: 'Telephone', params: { mix: 1, type: 'bandpass', frequency: 1200, resonance: 5 } as FilterParams },
      ],
    ],
    [
      'pitch-shift',
      [
        { name: 'Up Octave', params: { mix: 0.5, semitones: 12 } as PitchShiftParams },
        { name: 'Down Octave', params: { mix: 0.5, semitones: -12 } as PitchShiftParams },
        { name: 'Up Fifth', params: { mix: 0.5, semitones: 7 } as PitchShiftParams },
        { name: 'Detune', params: { mix: 0.3, semitones: 0.1 } as PitchShiftParams },
      ],
    ],
    [
      'chorus',
      [
        { name: 'Subtle', params: { mix: 0.3, rate: 1.5, depth: 0.3, feedback: 0.2 } as ChorusParams },
        { name: 'Classic', params: { mix: 0.5, rate: 2.5, depth: 0.5, feedback: 0.4 } as ChorusParams },
        { name: 'Wide', params: { mix: 0.6, rate: 0.8, depth: 0.7, feedback: 0.5 } as ChorusParams },
        { name: 'Vibrato', params: { mix: 0.8, rate: 5, depth: 0.8, feedback: 0.1 } as ChorusParams },
      ],
    ],
    [
      'autotune',
      [
        { name: 'Natural', params: { mix: 1, key: 'C', scale: 'major', strength: 0.3, speed: 0.4 } as AutotuneParams },
        { name: 'Subtle Fix', params: { mix: 1, key: 'C', scale: 'major', strength: 0.5, speed: 0.6 } as AutotuneParams },
        { name: 'Hard Tune', params: { mix: 1, key: 'C', scale: 'major', strength: 1.0, speed: 0.9 } as AutotuneParams },
        { name: 'T-Pain', params: { mix: 1, key: 'C', scale: 'minor', strength: 1.0, speed: 1.0 } as AutotuneParams },
        { name: 'Chromatic', params: { mix: 1, key: 'C', scale: 'chromatic', strength: 0.7, speed: 0.7 } as AutotuneParams },
      ],
    ],
    [
      'vocoder',
      [
        { name: 'Classic Robot', params: { mix: 1, carrierType: 'sawtooth', carrierFreq: 110, bands: 16, attack: 0.01, release: 0.05, qFactor: 8 } as VocoderParams },
        { name: 'Daft Punk', params: { mix: 1, carrierType: 'sawtooth', carrierFreq: 130, bands: 24, attack: 0.005, release: 0.03, qFactor: 12 } as VocoderParams },
        { name: 'Whisper', params: { mix: 0.8, carrierType: 'noise', carrierFreq: 100, bands: 16, attack: 0.02, release: 0.1, qFactor: 6 } as VocoderParams },
        { name: 'Synth Voice', params: { mix: 1, carrierType: 'square', carrierFreq: 165, bands: 20, attack: 0.008, release: 0.04, qFactor: 10 } as VocoderParams },
        { name: 'Subtle Blend', params: { mix: 0.5, carrierType: 'sawtooth', carrierFreq: 100, bands: 12, attack: 0.015, release: 0.08, qFactor: 5 } as VocoderParams },
      ],
    ],
    [
      'gain',
      [
        { name: 'Unity', params: { mix: 1, gain: 0 } as GainParams },
        { name: 'Boost +6dB', params: { mix: 1, gain: 6 } as GainParams },
        { name: 'Boost +12dB', params: { mix: 1, gain: 12 } as GainParams },
        { name: 'Boost +18dB', params: { mix: 1, gain: 18 } as GainParams },
        { name: 'Cut -6dB', params: { mix: 1, gain: -6 } as GainParams },
        { name: 'Cut -12dB', params: { mix: 1, gain: -12 } as GainParams },
      ],
    ],
  ]);

  /**
   * Get default parameters for an effect type
   */
  getDefaultParams(type: EffectType): EffectParams {
    switch (type) {
      case 'reverb':
        return { mix: 0.3, decay: 1.5, preDelay: 0.02 } as ReverbParams;
      case 'delay':
        return { mix: 0.3, time: 0.25, feedback: 0.4, pingPong: false } as DelayParams;
      case 'eq':
        return { mix: 1, low: 0, mid: 0, high: 0 } as EQParams;
      case 'distortion':
        return { mix: 0.5, drive: 0.3 } as DistortionParams;
      case 'compressor':
        return { mix: 1, threshold: -24, ratio: 4, attack: 0.05, release: 0.2 } as CompressorParams;
      case 'filter':
        return { mix: 1, type: 'lowpass', frequency: 2000, resonance: 1 } as FilterParams;
      case 'pitch-shift':
        return { mix: 0.5, semitones: 0 } as PitchShiftParams;
      case 'chorus':
        return { mix: 0.5, rate: 2, depth: 0.5, feedback: 0.3 } as ChorusParams;
      case 'autotune':
        return { mix: 1, key: 'C', scale: 'major', strength: 0.5, speed: 0.6 } as AutotuneParams;
      case 'vocoder':
        return { mix: 1, carrierType: 'sawtooth', carrierFreq: 110, bands: 16, attack: 0.01, release: 0.05, qFactor: 8 } as VocoderParams;
      case 'gain':
        return { mix: 1, gain: 0 } as GainParams;
    }
  }

  /**
   * Create a new effect with default parameters
   */
  createEffect(type: EffectType, preset?: string): ClipEffect {
    let params = this.getDefaultParams(type);

    if (preset) {
      const presets = this.factoryPresets.get(type);
      const presetData = presets?.find((p) => p.name === preset);
      if (presetData) {
        params = { ...presetData.params };
      }
    }

    return {
      id: generateUUID(),
      type,
      enabled: true,
      params,
      preset,
    };
  }

  /**
   * Get effect metadata by type
   */
  getEffectMeta(type: EffectType): EffectMeta | undefined {
    return this.effectMetas.find((m) => m.type === type);
  }

  /**
   * Create a single Tone.js effect node
   */
  private createToneEffect(effect: ClipEffect): Tone.ToneAudioNode {
    const params = effect.params;

    switch (effect.type) {
      case 'reverb': {
        const p = params as ReverbParams;
        const reverb = new Tone.Reverb({
          decay: p.decay,
          preDelay: p.preDelay,
          wet: p.mix,
        });
        return reverb;
      }

      case 'delay': {
        const p = params as DelayParams;
        if (p.pingPong) {
          return new Tone.PingPongDelay({
            delayTime: p.time,
            feedback: p.feedback,
            wet: p.mix,
          });
        } else {
          return new Tone.FeedbackDelay({
            delayTime: p.time,
            feedback: p.feedback,
            wet: p.mix,
          });
        }
      }

      case 'eq': {
        const p = params as EQParams;
        return new Tone.EQ3({
          low: p.low,
          mid: p.mid,
          high: p.high,
        });
      }

      case 'distortion': {
        const p = params as DistortionParams;
        return new Tone.Distortion({
          distortion: p.drive,
          wet: p.mix,
        });
      }

      case 'compressor': {
        const p = params as CompressorParams;
        return new Tone.Compressor({
          threshold: p.threshold,
          ratio: p.ratio,
          attack: p.attack,
          release: p.release,
        });
      }

      case 'filter': {
        const p = params as FilterParams;
        return new Tone.Filter({
          type: p.type,
          frequency: p.frequency,
          Q: p.resonance,
        });
      }

      case 'pitch-shift': {
        const p = params as PitchShiftParams;
        return new Tone.PitchShift({
          pitch: p.semitones,
          wet: p.mix,
          windowSize: 0.1,
          delayTime: 0,
        });
      }

      case 'chorus': {
        const p = params as ChorusParams;
        return new Tone.Chorus({
          frequency: p.rate,
          depth: p.depth,
          feedback: p.feedback,
          wet: p.mix,
        });
      }

      case 'autotune': {
        // Autotune is applied as pre-processing during clip rendering/export
        // For now, return a passthrough gain node
        // Real autotune processing happens in AutotuneService
        const gain = new Tone.Gain(1);
        return gain;
      }

      case 'vocoder': {
        // Vocoder is applied as pre-processing during clip rendering/export
        // For now, return a passthrough gain node
        // Real vocoder processing happens in VocoderService
        const gain = new Tone.Gain(1);
        return gain;
      }

      case 'gain': {
        const p = params as GainParams;
        // Convert dB to linear gain: 10^(dB/20)
        const linearGain = Math.pow(10, p.gain / 20);
        return new Tone.Gain(linearGain);
      }
    }
  }

  /**
   * Create an effect chain for a clip
   * Returns input/output nodes to connect to audio pipeline
   */
  createEffectChain(
    clipId: string,
    effects: ClipEffect[],
    context: AudioContext | OfflineAudioContext
  ): { input: AudioNode; output: AudioNode } | null {
    // Dispose existing chain if any
    this.disposeEffectChain(clipId);

    const enabledEffects = effects.filter((e) => e.enabled);
    if (enabledEffects.length === 0) {
      return null;
    }

    // Set Tone.js context to match our context
    Tone.setContext(context as unknown as Tone.Context);

    const nodes = new Map<string, Tone.ToneAudioNode>();
    const toneNodes: Tone.ToneAudioNode[] = [];

    // Create all effect nodes
    for (const effect of enabledEffects) {
      const node = this.createToneEffect(effect);
      nodes.set(effect.id, node);
      toneNodes.push(node);
    }

    // Chain effects together using Tone.js connections
    for (let i = 0; i < toneNodes.length - 1; i++) {
      toneNodes[i].connect(toneNodes[i + 1]);
    }

    // Create native GainNodes as input/output bridges
    // This ensures we have clean native AudioNodes to connect to our pipeline
    const inputGain = context.createGain();
    const outputGain = context.createGain();
    inputGain.gain.value = 1;
    outputGain.gain.value = 1;

    // Connect: inputGain -> first Tone effect
    const firstToneNode = toneNodes[0];
    // Connect: last Tone effect -> outputGain
    const lastToneNode = toneNodes[toneNodes.length - 1];

    try {
      // Use Tone.connect for bridging native to Tone.js
      Tone.connect(inputGain, firstToneNode);
      Tone.connect(lastToneNode, outputGain);
    } catch (error) {
      console.warn('Could not connect effect chain:', error);
      this.disposeEffectChain(clipId);
      return null;
    }

    // Cache for cleanup (store the bridge gains too)
    this.nodeCache.set(clipId, {
      clipId,
      nodes,
      inputNode: firstToneNode,
      outputNode: lastToneNode,
      inputBridge: inputGain,
      outputBridge: outputGain,
    });

    return {
      input: inputGain,
      output: outputGain,
    };
  }

  /**
   * Dispose effect chain for a clip
   */
  disposeEffectChain(clipId: string): void {
    const cache = this.nodeCache.get(clipId);
    if (cache) {
      // Disconnect bridge nodes
      try {
        cache.inputBridge?.disconnect();
        cache.outputBridge?.disconnect();
      } catch {
        // Already disconnected
      }

      // Dispose Tone.js nodes
      cache.nodes.forEach((node) => {
        try {
          node.dispose();
        } catch {
          // Node already disposed
        }
      });
      this.nodeCache.delete(clipId);
    }
  }

  /**
   * Dispose all effect chains
   */
  disposeAllChains(): void {
    this.nodeCache.forEach((cache) => {
      // Disconnect bridge nodes
      try {
        cache.inputBridge?.disconnect();
        cache.outputBridge?.disconnect();
      } catch {
        // Already disconnected
      }

      // Dispose Tone.js nodes
      cache.nodes.forEach((node) => {
        try {
          node.dispose();
        } catch {
          // Node already disposed
        }
      });
    });
    this.nodeCache.clear();
  }

  /**
   * Update a single effect parameter
   */
  updateEffectParam(clipId: string, effectId: string, paramName: string, value: unknown): void {
    const cache = this.nodeCache.get(clipId);
    if (!cache) return;

    const node = cache.nodes.get(effectId);
    if (!node) return;

    // Update the parameter on the Tone.js node
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyNode = node as any;
      if (paramName === 'mix' && 'wet' in anyNode) {
        anyNode.wet.value = value;
      } else if (paramName in anyNode) {
        if (typeof anyNode[paramName] === 'object' && 'value' in anyNode[paramName]) {
          anyNode[paramName].value = value;
        } else {
          anyNode[paramName] = value;
        }
      }
    } catch (error) {
      console.warn(`Could not update effect param ${paramName}:`, error);
    }
  }

  /**
   * Select an effect for editing
   */
  selectEffect(clipId: string, effectId: string): void {
    this.selectedEffect.set({ clipId, effectId });
  }

  /**
   * Clear effect selection
   */
  clearSelection(): void {
    this.selectedEffect.set(null);
  }

  /**
   * Deep clone effects array (for copy/paste)
   */
  cloneEffects(effects: ClipEffect[] | undefined): ClipEffect[] | undefined {
    if (!effects) return undefined;
    return effects.map((e) => ({
      ...e,
      id: generateUUID(),
      params: { ...e.params },
    }));
  }

  /**
   * Convert effects to definition format (for persistence)
   */
  effectsToDefinition(effects: ClipEffect[] | undefined): { type: EffectType; enabled: boolean; params: EffectParams; preset?: string }[] | undefined {
    if (!effects || effects.length === 0) return undefined;
    return effects.map((e) => ({
      type: e.type,
      enabled: e.enabled,
      params: { ...e.params },
      preset: e.preset,
    }));
  }

  /**
   * Convert definition to effects (for loading)
   */
  definitionToEffects(definitions: { type: EffectType; enabled: boolean; params: EffectParams; preset?: string }[] | undefined): ClipEffect[] | undefined {
    if (!definitions || definitions.length === 0) return undefined;
    return definitions.map((d) => ({
      id: generateUUID(),
      type: d.type,
      enabled: d.enabled,
      params: { ...d.params },
      preset: d.preset,
    }));
  }
}
