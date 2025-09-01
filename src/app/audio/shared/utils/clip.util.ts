import { Clip } from '../models/models';
import { WaveformService } from '../../audio-engine/services/waveform.service';

/**
 * Adds the generateWaveform method to a clip object
 */
export function enhanceClipWithWaveformGeneration(clip: Clip): Clip {
  clip.generateWaveform = function(pxPerSecond: number, waveformService: WaveformService) {
    const width = Math.floor(this.duration * pxPerSecond);
    
    this.waveform = waveformService.generateFromBuffer(this.buffer, {
      width: Math.max(1, width),
      height: 44,
      clipColor: this.color,
      trimStart: this.trimStart,
      trimEnd: this.trimEnd
    });
  };
  
  return clip;
}

/**
 * Creates a new clip with the generateWaveform method attached
 */
export function createClipWithWaveformGeneration(clipData: Omit<Clip, 'generateWaveform'>): Clip {
  const clip = clipData as Clip;
  return enhanceClipWithWaveformGeneration(clip);
}