import { Injectable } from '@angular/core';
import { VocoderParams } from '../../shared/models/models';

/**
 * Vocoder processing result
 */
export interface VocoderResult {
  processedBuffer: AudioBuffer;
  bandsUsed: number;
  carrierType: string;
}

/**
 * Service for vocoder effect processing using Web Audio API
 * Implements a channel vocoder with filterbank analysis/synthesis
 */
@Injectable({ providedIn: 'root' })
export class VocoderService {
  // Frequency range for vocoder bands (Hz)
  private readonly MIN_FREQ = 100;
  private readonly MAX_FREQ = 8000;

  /**
   * Process audio buffer with vocoder effect
   * Uses OfflineAudioContext for high-quality offline processing
   *
   * @param audioBuffer Input audio buffer (modulator - typically voice)
   * @param params Vocoder parameters
   * @returns Processed audio buffer with vocoder effect
   */
  async processAudioBuffer(
    audioBuffer: AudioBuffer,
    params: VocoderParams
  ): Promise<VocoderResult> {
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;
    const numberOfChannels = audioBuffer.numberOfChannels;

    console.log(`[Vocoder] Processing ${audioBuffer.duration.toFixed(2)}s of audio...`);
    console.log(`[Vocoder] Carrier: ${params.carrierType}, Bands: ${params.bands}, Q: ${params.qFactor}`);

    // Create offline context for rendering
    const offlineContext = new OfflineAudioContext(numberOfChannels, length, sampleRate);

    // Create modulator source (input audio)
    const modulatorSource = offlineContext.createBufferSource();
    modulatorSource.buffer = audioBuffer;

    // Create carrier signal
    const carrierNode = this.createCarrier(offlineContext, params, audioBuffer.duration);

    // Create filterbank for analysis and synthesis
    const bandFrequencies = this.calculateBandFrequencies(params.bands);

    // Create analysis chain (modulator path)
    const analysisBands: { filter: BiquadFilterNode; envelope: GainNode }[] = [];
    // Create synthesis chain (carrier path)
    const synthesisBands: { filter: BiquadFilterNode; gain: GainNode }[] = [];

    // Output mixer
    const outputMixer = offlineContext.createGain();
    outputMixer.gain.value = 1.0 / Math.sqrt(params.bands); // Normalize output

    // Dry/wet mixer
    const dryGain = offlineContext.createGain();
    const wetGain = offlineContext.createGain();
    dryGain.gain.value = 1 - params.mix;
    wetGain.gain.value = params.mix;

    const finalMixer = offlineContext.createGain();
    finalMixer.gain.value = 1.0;

    for (let i = 0; i < params.bands; i++) {
      const freq = bandFrequencies[i];

      // Analysis filter (modulator)
      const analysisFilter = offlineContext.createBiquadFilter();
      analysisFilter.type = 'bandpass';
      analysisFilter.frequency.value = freq;
      analysisFilter.Q.value = params.qFactor;

      // Envelope follower (using gain node with automation)
      // We'll approximate this with a simple gain node
      // Real envelope following requires sample-by-sample processing
      const envelopeGain = offlineContext.createGain();
      envelopeGain.gain.value = 1.0;

      analysisBands.push({ filter: analysisFilter, envelope: envelopeGain });

      // Synthesis filter (carrier)
      const synthesisFilter = offlineContext.createBiquadFilter();
      synthesisFilter.type = 'bandpass';
      synthesisFilter.frequency.value = freq;
      synthesisFilter.Q.value = params.qFactor;

      // Synthesis gain (modulated by envelope)
      const synthesisGain = offlineContext.createGain();
      synthesisGain.gain.value = 0; // Will be modulated

      synthesisBands.push({ filter: synthesisFilter, gain: synthesisGain });

      // Connect modulator path: source -> filter -> envelope
      modulatorSource.connect(analysisFilter);
      analysisFilter.connect(envelopeGain);

      // Connect carrier path: carrier -> filter -> gain -> mixer
      carrierNode.connect(synthesisFilter);
      synthesisFilter.connect(synthesisGain);
      synthesisGain.connect(outputMixer);
    }

    // Since Web Audio API doesn't have a native envelope follower,
    // we need to do sample-level processing
    // For now, use a simplified approach with ScriptProcessor alternative
    // We'll process the audio data directly

    // Connect dry path
    modulatorSource.connect(dryGain);
    dryGain.connect(finalMixer);

    // Connect wet path
    outputMixer.connect(wetGain);
    wetGain.connect(finalMixer);

    // Connect to destination
    finalMixer.connect(offlineContext.destination);

    // For proper vocoder, we need sample-level envelope following
    // Let's do this with manual audio processing instead
    const processedBuffer = await this.processWithEnvelopeFollowing(
      audioBuffer,
      params,
      bandFrequencies
    );

    console.log('[Vocoder] Processing complete');

    return {
      processedBuffer,
      bandsUsed: params.bands,
      carrierType: params.carrierType,
    };
  }

  /**
   * Process vocoder with proper envelope following (sample-level)
   */
  private async processWithEnvelopeFollowing(
    audioBuffer: AudioBuffer,
    params: VocoderParams,
    bandFrequencies: number[]
  ): Promise<AudioBuffer> {
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;
    const numChannels = audioBuffer.numberOfChannels;

    // Create output buffer
    const offlineContext = new OfflineAudioContext(numChannels, length, sampleRate);
    const outputBuffer = offlineContext.createBuffer(numChannels, length, sampleRate);

    // Process each channel
    for (let channel = 0; channel < numChannels; channel++) {
      const inputData = audioBuffer.getChannelData(channel);
      const outputData = outputBuffer.getChannelData(channel);

      // Generate carrier signal
      const carrier = this.generateCarrierSamples(length, sampleRate, params);

      // Process through filterbank
      const result = this.processFilterbank(
        inputData,
        carrier,
        bandFrequencies,
        sampleRate,
        params
      );

      // Apply wet/dry mix
      for (let i = 0; i < length; i++) {
        outputData[i] = inputData[i] * (1 - params.mix) + result[i] * params.mix;
      }
    }

    return outputBuffer;
  }

  /**
   * Generate carrier samples based on carrier type
   */
  private generateCarrierSamples(
    length: number,
    sampleRate: number,
    params: VocoderParams
  ): Float32Array {
    const carrier = new Float32Array(length);
    const freq = params.carrierFreq;

    switch (params.carrierType) {
      case 'sawtooth':
        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          const phase = (t * freq) % 1;
          carrier[i] = 2 * phase - 1;
        }
        break;

      case 'square':
        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          const phase = (t * freq) % 1;
          carrier[i] = phase < 0.5 ? 1 : -1;
        }
        break;

      case 'pulse':
        // Pulse wave with 25% duty cycle
        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          const phase = (t * freq) % 1;
          carrier[i] = phase < 0.25 ? 1 : -1;
        }
        break;

      case 'noise':
      default:
        // White noise
        for (let i = 0; i < length; i++) {
          carrier[i] = Math.random() * 2 - 1;
        }
        break;
    }

    return carrier;
  }

  /**
   * Process through filterbank with envelope following
   */
  private processFilterbank(
    modulator: Float32Array,
    carrier: Float32Array,
    frequencies: number[],
    sampleRate: number,
    params: VocoderParams
  ): Float32Array {
    const length = modulator.length;
    const output = new Float32Array(length);
    const numBands = frequencies.length;

    // Attack and release coefficients for envelope follower
    const attackCoef = Math.exp(-1 / (params.attack * sampleRate));
    const releaseCoef = Math.exp(-1 / (params.release * sampleRate));

    // Process each band
    for (let band = 0; band < numBands; band++) {
      const freq = frequencies[band];

      // Create bandpass filter coefficients (simplified biquad)
      const Q = params.qFactor;
      const omega = (2 * Math.PI * freq) / sampleRate;
      const sinOmega = Math.sin(omega);
      const cosOmega = Math.cos(omega);
      const alpha = sinOmega / (2 * Q);

      // Bandpass filter coefficients
      const b0 = alpha;
      const b1 = 0;
      const b2 = -alpha;
      const a0 = 1 + alpha;
      const a1 = -2 * cosOmega;
      const a2 = 1 - alpha;

      // Normalize coefficients
      const b0n = b0 / a0;
      const b1n = b1 / a0;
      const b2n = b2 / a0;
      const a1n = a1 / a0;
      const a2n = a2 / a0;

      // Filter state for modulator
      let modX1 = 0,
        modX2 = 0,
        modY1 = 0,
        modY2 = 0;
      // Filter state for carrier
      let carX1 = 0,
        carX2 = 0,
        carY1 = 0,
        carY2 = 0;

      // Envelope follower state
      let envelope = 0;

      // Process samples
      for (let i = 0; i < length; i++) {
        // Filter modulator
        const modIn = modulator[i];
        const modFiltered = b0n * modIn + b1n * modX1 + b2n * modX2 - a1n * modY1 - a2n * modY2;
        modX2 = modX1;
        modX1 = modIn;
        modY2 = modY1;
        modY1 = modFiltered;

        // Envelope follower (peak detection with attack/release)
        const rectified = Math.abs(modFiltered);
        if (rectified > envelope) {
          envelope = attackCoef * envelope + (1 - attackCoef) * rectified;
        } else {
          envelope = releaseCoef * envelope + (1 - releaseCoef) * rectified;
        }

        // Filter carrier
        const carIn = carrier[i];
        const carFiltered = b0n * carIn + b1n * carX1 + b2n * carX2 - a1n * carY1 - a2n * carY2;
        carX2 = carX1;
        carX1 = carIn;
        carY2 = carY1;
        carY1 = carFiltered;

        // Apply envelope to carrier and accumulate
        // Higher gain (8x) because bandpass filters reduce amplitude significantly
        output[i] += carFiltered * envelope * 8;
      }
    }

    // Normalize and apply makeup gain
    // Less aggressive normalization to preserve volume
    const normFactor = 2 / Math.sqrt(numBands);
    for (let i = 0; i < length; i++) {
      output[i] *= normFactor;
      // Soft clip to prevent harsh distortion while preserving volume
      output[i] = Math.tanh(output[i] * 1.5) / 1.5 * 2;
    }

    return output;
  }

  /**
   * Create carrier audio node
   */
  private createCarrier(
    context: OfflineAudioContext,
    params: VocoderParams,
    duration: number
  ): AudioNode {
    if (params.carrierType === 'noise') {
      // Create noise buffer
      const bufferSize = Math.ceil(duration * context.sampleRate);
      const noiseBuffer = context.createBuffer(1, bufferSize, context.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const source = context.createBufferSource();
      source.buffer = noiseBuffer;
      source.start(0);
      return source;
    } else {
      // Create oscillator
      const oscillator = context.createOscillator();
      oscillator.type = params.carrierType === 'pulse' ? 'square' : params.carrierType;
      oscillator.frequency.value = params.carrierFreq;
      oscillator.start(0);
      return oscillator;
    }
  }

  /**
   * Calculate logarithmically spaced band frequencies
   */
  private calculateBandFrequencies(numBands: number): number[] {
    const frequencies: number[] = [];
    const logMin = Math.log(this.MIN_FREQ);
    const logMax = Math.log(this.MAX_FREQ);
    const logStep = (logMax - logMin) / (numBands - 1);

    for (let i = 0; i < numBands; i++) {
      frequencies.push(Math.exp(logMin + i * logStep));
    }

    return frequencies;
  }

  /**
   * Get available carrier types
   */
  getCarrierTypes(): Array<{ value: VocoderParams['carrierType']; label: string }> {
    return [
      { value: 'sawtooth', label: 'Sawtooth' },
      { value: 'square', label: 'Square' },
      { value: 'pulse', label: 'Pulse' },
      { value: 'noise', label: 'Noise' },
    ];
  }
}
