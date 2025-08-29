import { Injectable, signal, computed } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class RecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];

  private readonly _isRecording = signal(false);
  private readonly _recordingDuration = signal(0);
  private readonly _audioLevel = signal(0);
  private startTime = 0;
  private animationFrameId: number | null = null;
  private levelCheckInterval: number | null = null;

  readonly isRecording = this._isRecording.asReadonly();
  readonly recordingDuration = this._recordingDuration.asReadonly();
  readonly audioLevel = this._audioLevel.asReadonly();
  readonly formattedDuration = computed(() => {
    const seconds = this._recordingDuration();
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  });

  async startRecording(): Promise<void> {
    try {
      // Request microphone with optimized settings for better quality
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 48000
        }
      });
      
      this.audioContext = new AudioContext({ sampleRate: 48000 });
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.source.connect(this.analyser);

      this.chunks = [];
      // Use higher bitrate for better quality
      const options = {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      };
      
      // Check if the mimeType is supported
      if (MediaRecorder.isTypeSupported(options.mimeType)) {
        this.mediaRecorder = new MediaRecorder(this.stream, options);
      } else {
        this.mediaRecorder = new MediaRecorder(this.stream);
      }
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
      this._isRecording.set(true);
      this.startTime = Date.now();
      this._recordingDuration.set(0);

      this.startDurationTracking();
      this.startLevelMonitoring();
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }

  async stopRecording(): Promise<AudioBuffer> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.audioContext) {
        reject(new Error('No recording in progress'));
        return;
      }

      this.mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(this.chunks, { type: 'audio/webm' });
          const arrayBuffer = await blob.arrayBuffer();
          
          if (this.audioContext) {
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            // Normalize the audio to maximize volume without clipping
            const normalizedBuffer = this.normalizeAudioBuffer(audioBuffer);
            this.cleanup();
            resolve(normalizedBuffer);
          } else {
            reject(new Error('Audio context not available'));
          }
        } catch (error) {
          this.cleanup();
          reject(error);
        }
      };

      this.mediaRecorder.stop();
      this._isRecording.set(false);
      this.stopDurationTracking();
      this.stopLevelMonitoring();
    });
  }
  
  private normalizeAudioBuffer(buffer: AudioBuffer): AudioBuffer {
    // Create a new buffer with same properties
    const normalizedBuffer = new AudioBuffer({
      numberOfChannels: buffer.numberOfChannels,
      length: buffer.length,
      sampleRate: buffer.sampleRate
    });
    
    // Process each channel
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);
      const normalizedData = new Float32Array(data.length);
      
      // Find the maximum absolute value in the recording
      let maxVal = 0;
      for (const sample of data) {
        const absVal = Math.abs(sample);
        if (absVal > maxVal) {
          maxVal = absVal;
        }
      }
      
      // Calculate normalization factor with MUCH more aggressive boosting
      let normalizationFactor = 1;
      if (maxVal > 0.0001) { // Avoid division by very small numbers
        // Always normalize to near maximum level
        normalizationFactor = 0.9 / maxVal;
        
        // Allow much higher boost for very quiet recordings
        // Typical microphone recordings are often around 0.01-0.05 peak
        if (maxVal < 0.01) {
          // Extremely quiet - boost up to 50x
          normalizationFactor = Math.min(normalizationFactor, 50);
        } else if (maxVal < 0.05) {
          // Very quiet - boost up to 30x  
          normalizationFactor = Math.min(normalizationFactor, 30);
        } else if (maxVal < 0.1) {
          // Quiet - boost up to 20x
          normalizationFactor = Math.min(normalizationFactor, 20);
        } else {
          // Normal level - standard boost up to 10x
          normalizationFactor = Math.min(normalizationFactor, 10);
        }
      }
      
      console.log(`Recording normalization: max=${maxVal.toFixed(4)}, factor=${normalizationFactor.toFixed(2)}x`);
      
      // Apply normalization with soft clipping to prevent harsh distortion
      for (let i = 0; i < data.length; i++) {
        let sample = data[i] * normalizationFactor;
        
        // Soft clipping using tanh for smoother sound at high levels
        if (Math.abs(sample) > 0.95) {
          sample = Math.tanh(sample);
        } else {
          // Hard limit at -1 to 1
          sample = Math.max(-1, Math.min(1, sample));
        }
        
        normalizedData[i] = sample;
      }
      
      // Copy normalized data to the new buffer
      normalizedBuffer.copyToChannel(normalizedData, channel);
    }
    
    return normalizedBuffer;
  }

  cancelRecording(): void {
    if (this.mediaRecorder && this._isRecording()) {
      this.mediaRecorder.stop();
      this._isRecording.set(false);
      this.stopDurationTracking();
      this.stopLevelMonitoring();
      this.cleanup();
    }
  }

  private startDurationTracking(): void {
    const updateDuration = () => {
      if (this._isRecording()) {
        const elapsed = (Date.now() - this.startTime) / 1000;
        this._recordingDuration.set(elapsed);
        this.animationFrameId = requestAnimationFrame(updateDuration);
      }
    };
    updateDuration();
  }

  private stopDurationTracking(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private startLevelMonitoring(): void {
    if (!this.analyser) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    
    const checkLevel = () => {
      if (!this.analyser || !this._isRecording()) return;
      
      this.analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
      const normalizedLevel = Math.min(1, average / 128);
      this._audioLevel.set(normalizedLevel);
    };

    this.levelCheckInterval = window.setInterval(checkLevel, 50);
  }

  private stopLevelMonitoring(): void {
    if (this.levelCheckInterval !== null) {
      clearInterval(this.levelCheckInterval);
      this.levelCheckInterval = null;
    }
    this._audioLevel.set(0);
  }

  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.mediaRecorder = null;
    this.chunks = [];
  }
}