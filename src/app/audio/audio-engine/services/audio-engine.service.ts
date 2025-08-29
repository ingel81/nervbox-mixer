import { Injectable } from '@angular/core';
// Import the fixed lamejs package that resolves MPEGMode and BitStream issues
import { Mp3Encoder } from '@breezystack/lamejs';

@Injectable({ providedIn: 'root' })
export class AudioEngineService {
  private ctx?: AudioContext;
  private masterGain?: GainNode;
  private playing = false;
  private startContextTime = 0; // when the context started playing
  private startTimelineTime = 0; // seconds on timeline when playback started
  private scheduledNodes: {src: AudioBufferSourceNode; gain: GainNode; pan: StereoPannerNode}[] = [];


  get audioContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext({ sampleRate: 48000 });
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1;
      this.masterGain.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  async decode(file: File): Promise<AudioBuffer> {
    const arrayBuf = await file.arrayBuffer();
    // Don't use slice(0) as it creates unnecessary copy
    return await this.audioContext.decodeAudioData(arrayBuf);
  }

  play(clips: Iterable<{
    buffer: AudioBuffer;
    startTime: number; // timeline position
    duration: number;
    offset: number;
    gain: number; // 0..1
    pan: number;  // -1..1
    muted: boolean;
    trimStart?: number; // seconds trimmed from start
    trimEnd?: number;   // seconds trimmed from end
  }>, fromTime = 0): void {
    const ctx = this.audioContext;
    if (this.playing) this.stop();

    // Use minimal delay for highest precision
    this.startContextTime = ctx.currentTime + 0.01; // Reduced from 0.05 to 0.01
    this.startTimelineTime = fromTime;
    

    for (const c of clips) {
      if (c.muted) continue;
      const relStart = c.startTime - fromTime;
      const clipEnd = c.startTime + c.duration;
      
      // Skip clips that have already ended, but allow clips that start later
      if (fromTime >= clipEnd) continue;
      
      // Calculate trimmed playback parameters with higher precision
      const trimStart = c.trimStart || 0;
      const trimEnd = c.trimEnd || 0;
      
      // HIGH PRECISION: Calculate exact sample-based positions
      const sampleRate = c.buffer.sampleRate;
      const totalSamples = c.buffer.length;
      
      
      // Calculate exactly where in the clip timeline we should start
      let clipPlayOffset = 0;
      if (fromTime > c.startTime) {
        clipPlayOffset = fromTime - c.startTime;
      } else {
        // Clip starts later than playhead
      }
      
      // Convert to precise sample positions
      const trimStartSamples = Math.round(trimStart * sampleRate);
      const trimEndSamples = Math.round((trimEnd || 0) * sampleRate);
      const offsetSamples = Math.round(c.offset * sampleRate);
      const clipPlayOffsetSamples = Math.round(clipPlayOffset * sampleRate);
      
      // Calculate exact buffer range
      const bufferStartSample = offsetSamples + trimStartSamples + clipPlayOffsetSamples;
      const bufferEndSample = totalSamples - trimEndSamples;
      
      // Clamp to valid buffer bounds
      const clampedStart = Math.max(0, Math.min(bufferStartSample, totalSamples - 1));
      const clampedEnd = Math.max(clampedStart + 1, Math.min(bufferEndSample, totalSamples));
      
      // Convert back to exact seconds
      const actualOffset = clampedStart / sampleRate;
      const playLen = (clampedEnd - clampedStart) / sampleRate;
      
      
      if (playLen < 0.00001) {
        continue; // Skip if less than 0.01ms (extremely short)
      }
      
      const src = ctx.createBufferSource();
      src.buffer = c.buffer;

      const gain = ctx.createGain();
      gain.gain.value = c.gain;

      const pan = ctx.createStereoPanner();
      pan.pan.value = c.pan;

      src.connect(gain).connect(pan).connect(this.masterGain!);

      // PRECISION SCHEDULING: Use sample-accurate timing
      // If relStart > 0: clip starts later in the timeline
      // If relStart <= 0: clip should start immediately (we're already inside it)
      const scheduleDelay = Math.max(0, relStart);
      const preciseScheduleTime = this.startContextTime + scheduleDelay;
      
      
      try {
        // Use high-precision start method
        src.start(preciseScheduleTime, actualOffset, playLen);
      } catch (error) {
        console.error(`  ✗ Failed to start:`, error);
        continue;
      }
      this.scheduledNodes.push({ src, gain, pan });
    }

    this.playing = true;
  }

  pause(): void {
    this.stop();
  }

  stop(): void {
    for (const n of this.scheduledNodes) {
      try { n.src.stop(); } catch { /* Node already stopped */ }
      try { n.src.disconnect(); } catch { /* Node already disconnected */ }
      try { n.gain.disconnect(); } catch { /* Gain node already disconnected */ }
      try { n.pan.disconnect(); } catch { /* Pan node already disconnected */ }
    }
    this.scheduledNodes = [];
    this.playing = false;
  }

  async renderToMp3(options: {
    clips: Iterable<{
      buffer: AudioBuffer;
      startTime: number;
      duration: number;
      offset: number;
      gain: number;
      pan: number;
      muted: boolean;
    }>;
    duration: number;
    sampleRate?: number;
    bitRate?: number;
  }): Promise<Blob> {
    const sampleRate = options.sampleRate ?? 44100; // MP3 prefers 44.1kHz
    const bitRate = options.bitRate ?? 192;
    const length = Math.ceil(options.duration * sampleRate);
    const off = new OfflineAudioContext({ numberOfChannels: 2, length, sampleRate });

    // Render audio
    for (const c of options.clips) {
      if (c.muted) continue;
      const src = new AudioBufferSourceNode(off, { buffer: c.buffer });
      const gain = new GainNode(off, { gain: c.gain });
      const pan = new StereoPannerNode(off, { pan: c.pan });
      src.connect(gain).connect(pan).connect(off.destination);
      
      // AudioBufferSourceNode.start(when, offset, duration)
      // when = when to start in context time (c.startTime)
      // offset = where to start in the buffer (c.offset) 
      // duration = how long to play (c.duration)
      src.start(Math.max(0, c.startTime), Math.max(0, c.offset), Math.max(0, Math.min(c.duration, c.buffer.duration - c.offset)));
    }

    const rendered = await off.startRendering();
    
    // Convert to MP3 using the fixed @breezystack/lamejs package
    const mp3encoder = new Mp3Encoder(2, sampleRate, bitRate);
    const mp3Data: Uint8Array[] = [];
    
    // Get samples
    const leftChannel = rendered.getChannelData(0);
    const rightChannel = rendered.getChannelData(1);
    
    // Convert float samples to 16-bit PCM
    const sampleBlockSize = 1152; // Must be multiple of 576 for encoder
    const left = new Int16Array(leftChannel.length);
    const right = new Int16Array(rightChannel.length);
    
    for (let i = 0; i < leftChannel.length; i++) {
      left[i] = Math.max(-32768, Math.min(32767, leftChannel[i] * 32768));
      right[i] = Math.max(-32768, Math.min(32767, rightChannel[i] * 32768));
    }
    
    // Encode to MP3
    for (let i = 0; i < left.length; i += sampleBlockSize) {
      const leftChunk = left.subarray(i, Math.min(i + sampleBlockSize, left.length));
      const rightChunk = right.subarray(i, Math.min(i + sampleBlockSize, right.length));
      const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
    }
    
    // Flush encoder
    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
    
    // Combine all chunks
    const merged = new Uint8Array(mp3Data.reduce((acc, val) => acc + val.length, 0));
    let offset = 0;
    for (const chunk of mp3Data) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    
    return new Blob([merged], { type: 'audio/mp3' });
  }

  async renderToWav(options: {
    clips: Iterable<{
      buffer: AudioBuffer;
      startTime: number;
      duration: number;
      offset: number;
      gain: number; // 0..1
      pan: number;  // -1..1
      muted: boolean;
    }>;
    duration: number; // total duration seconds
    sampleRate?: number;
  }): Promise<Blob> {
    const sampleRate = options.sampleRate ?? 48000;
    const length = Math.ceil(options.duration * sampleRate);
    const off = new OfflineAudioContext({ numberOfChannels: 2, length, sampleRate });

    for (const c of options.clips) {
      if (c.muted) continue;
      const src = new AudioBufferSourceNode(off, { buffer: c.buffer });
      const gain = new GainNode(off, { gain: c.gain });
      const pan = new StereoPannerNode(off, { pan: c.pan });
      src.connect(gain).connect(pan).connect(off.destination);
      
      // AudioBufferSourceNode.start(when, offset, duration)
      // when = when to start in context time (c.startTime)
      // offset = where to start in the buffer (c.offset) 
      // duration = how long to play (c.duration)
      src.start(Math.max(0, c.startTime), Math.max(0, c.offset), Math.max(0, Math.min(c.duration, c.buffer.duration - c.offset)));
    }

    const rendered = await off.startRendering();
    const wav = this.encodeWav(rendered);
    return new Blob([wav], { type: 'audio/wav' });
  }

  private encodeWav(buffer: AudioBuffer): ArrayBuffer {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const length = buffer.length * numChannels * 2 + 44;
    const out = new ArrayBuffer(length);
    const view = new DataView(out);

    const writeStr = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };

    // RIFF header
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + buffer.length * numChannels * 2, true);
    writeStr(8, 'WAVE');

    // fmt chunk
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);

    // data chunk
    writeStr(36, 'data');
    view.setUint32(40, buffer.length * numChannels * 2, true);

    const channels: Float32Array[] = [];
    for (let ch = 0; ch < numChannels; ch++) channels.push(buffer.getChannelData(ch));
    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        let sample = Math.max(-1, Math.min(1, channels[ch][i]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, sample, true);
        offset += 2;
      }
    }
    return out;
  }
}
