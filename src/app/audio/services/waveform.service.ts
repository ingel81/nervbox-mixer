import { Injectable } from '@angular/core';

export interface WaveformOptions {
  width?: number;
  height?: number;
  clipColor?: string;
  pxPerSecond?: number;
  trimStart?: number;
  trimEnd?: number;
}

@Injectable({
  providedIn: 'root'
})
export class WaveformService {

  /**
   * Generate waveform from AudioBuffer - Primary method
   */
  generateFromBuffer(
    buffer: AudioBuffer, 
    options: WaveformOptions = {}
  ): string {
    const {
      width = 200,
      height = 44,
      clipColor = ''
    } = options;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    
    // Get audio data
    const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const amp = height / 2;
    
    // Clear canvas with slight background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, width, height);
    
    // Use consistent color for waveforms
    const waveColor = this.getWaveformColor(clipColor);
    
    // Create stronger gradient for better visibility
    const waveGradient = ctx.createLinearGradient(0, 0, 0, height);
    const rgb = this.hexToRgb(waveColor);
    waveGradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1.0)`);
    waveGradient.addColorStop(0.3, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.95)`);
    waveGradient.addColorStop(0.7, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.95)`);
    waveGradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1.0)`);
    
    // Draw filled waveform
    ctx.beginPath();
    ctx.moveTo(0, amp);
    
    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;
      
      for (let j = 0; j < step; j++) {
        const datum = data[(i * step) + j];
        if (datum !== undefined) {
          if (datum < min) min = datum;
          if (datum > max) max = datum;
        }
      }
      
      // Amplify weak signals for better visibility
      min *= 1.5;
      max *= 1.5;
      min = Math.max(-1, min);
      max = Math.min(1, max);
      
      ctx.lineTo(i, (1 + max) * amp);
    }
    
    // Complete the path for filled waveform
    for (let i = width - 1; i >= 0; i--) {
      let min = 1.0;
      let max = -1.0;
      
      for (let j = 0; j < step; j++) {
        const datum = data[(i * step) + j];
        if (datum !== undefined) {
          if (datum < min) min = datum;
          if (datum > max) max = datum;
        }
      }
      
      // Amplify weak signals
      min *= 1.5;
      max *= 1.5;
      min = Math.max(-1, min);
      max = Math.min(1, max);
      
      ctx.lineTo(i, (1 + min) * amp);
    }
    
    ctx.closePath();
    ctx.fillStyle = waveGradient;
    ctx.fill();
    
    // Add subtle outline if needed
    if (this.needsOutline(clipColor)) {
      ctx.strokeStyle = waveColor;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
    
    return canvas.toDataURL();
  }

  /**
   * Generate waveform from raw audio data - For trimming operations
   */
  generateFromData(
    audioData: Float32Array, 
    duration: number, 
    options: WaveformOptions = {}
  ): string {
    const {
      height = 44,
      clipColor = '',
      pxPerSecond = 120
    } = options;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    // Use exact pixel width to match visual clip width
    const width = Math.max(50, Math.floor(duration * pxPerSecond));
    
    canvas.width = width;
    canvas.height = height;
    
    console.log(`Generating trimmed waveform: duration=${duration}s, width=${width}px, samples=${audioData.length}`);
    
    const step = Math.ceil(audioData.length / width);
    const amp = height / 2;
    
    // Clear canvas with slight background (same as generateFromBuffer)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, width, height);
    
    // Use consistent color for waveforms (same as generateFromBuffer)
    const waveColor = this.getWaveformColor(clipColor);
    
    // Create stronger gradient for better visibility (same as generateFromBuffer)
    const waveGradient = ctx.createLinearGradient(0, 0, 0, height);
    const rgb = this.hexToRgb(waveColor);
    waveGradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1.0)`);
    waveGradient.addColorStop(0.3, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.95)`);
    waveGradient.addColorStop(0.7, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.95)`);
    waveGradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1.0)`);
    
    // Draw filled waveform (same algorithm as generateFromBuffer)
    ctx.beginPath();
    ctx.moveTo(0, amp);
    
    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;
      
      for (let j = 0; j < step; j++) {
        const datum = audioData[(i * step) + j];
        if (datum !== undefined) {
          if (datum < min) min = datum;
          if (datum > max) max = datum;
        }
      }
      
      // Amplify weak signals for better visibility
      min *= 1.5;
      max *= 1.5;
      min = Math.max(-1, min);
      max = Math.min(1, max);
      
      ctx.lineTo(i, (1 + max) * amp);
    }
    
    // Complete the path for filled waveform
    for (let i = width - 1; i >= 0; i--) {
      let min = 1.0;
      let max = -1.0;
      
      for (let j = 0; j < step; j++) {
        const datum = audioData[(i * step) + j];
        if (datum !== undefined) {
          if (datum < min) min = datum;
          if (datum > max) max = datum;
        }
      }
      
      // Amplify weak signals
      min *= 1.5;
      max *= 1.5;
      min = Math.max(-1, min);
      max = Math.min(1, max);
      
      ctx.lineTo(i, (1 + min) * amp);
    }
    
    ctx.closePath();
    ctx.fillStyle = waveGradient;
    ctx.fill();
    
    // Add subtle outline if needed (same as generateFromBuffer)
    if (this.needsOutline(clipColor)) {
      ctx.strokeStyle = waveColor;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
    
    return canvas.toDataURL();
  }

  /**
   * Generate waveform with automatic sizing based on duration and pxPerSecond
   */
  generateAutoSized(
    buffer: AudioBuffer, 
    duration: number, 
    pxPerSecond: number, 
    clipColor = ''
  ): string {
    const width = Math.floor(duration * pxPerSecond);
    return this.generateFromBuffer(buffer, {
      width,
      height: 44,
      clipColor,
      pxPerSecond
    });
  }

  /**
   * Helper methods for color handling
   */
  private getWaveformColor(clipColor: string): string {
    // For red/pink clips, use pure white for maximum contrast
    if (clipColor.includes('dc2626') || clipColor.includes('b91c1c') || 
        clipColor.includes('f093fb') || clipColor.includes('f5576c') || 
        clipColor.includes('fa709a') || clipColor.includes('ff9a9e') ||
        clipColor.includes('ff6e7f')) {
      return '#ffffff'; // Pure white for red/pink clips
    }
    
    // For purple/dark clips, use light gray
    if (clipColor.includes('7c3aed') || clipColor.includes('6d28d9') ||
        clipColor.includes('667eea') || clipColor.includes('764ba2') ||
        clipColor.includes('330867')) { // Purple
      return '#f3f4f6';
    }
    
    // For bright clips, use darker gray
    return '#9ca3af'; // Medium gray for bright backgrounds
  }

  private hexToRgb(hex: string): {r: number, g: number, b: number} {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : {r: 156, g: 163, b: 175}; // Default to gray
  }

  private needsOutline(clipColor: string): boolean {
    return clipColor.includes('dc2626') || clipColor.includes('b91c1c') ||
           clipColor.includes('f093fb') || clipColor.includes('f5576c') || 
           clipColor.includes('fa709a') || clipColor.includes('ff9a9e') ||
           clipColor.includes('ff6e7f');
  }
}