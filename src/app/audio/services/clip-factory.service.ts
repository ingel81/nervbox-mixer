import { Injectable } from '@angular/core';
import { EditorStateService } from './editor-state.service';
import { WaveformService } from './waveform.service';
import { Clip } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class ClipFactoryService {
  constructor(
    private editorState: EditorStateService,
    private waveformService: WaveformService
  ) {}

  createClipFromBuffer(
    buffer: AudioBuffer, 
    name: string, 
    startTime: number,
    options: { 
      color?: string, 
      trimStart?: number, 
      trimEnd?: number,
      waveformHeight?: number
    } = {}
  ): Clip {
    const color = options.color || this.getColorByFilename(name);
    const waveform = this.generateWaveform(buffer, color, options.waveformHeight);
    
    return {
      id: crypto.randomUUID(),
      name,
      startTime,
      duration: buffer.duration,
      offset: 0,
      buffer,
      color,
      waveform,
      trimStart: options.trimStart || 0,
      trimEnd: options.trimEnd || 0,
      originalDuration: buffer.duration
    };
  }

  generateWaveform(buffer: AudioBuffer, color: string, height = 44): string {
    return this.waveformService.generateFromBuffer(buffer, {
      width: Math.floor(buffer.duration * this.editorState.pxPerSecond()),
      height,
      clipColor: color
    });
  }

  regenerateWaveform(clip: Clip, height = 44): string {
    return this.waveformService.generateFromBuffer(clip.buffer, {
      width: Math.floor(clip.duration * this.editorState.pxPerSecond()),
      height,
      clipColor: clip.color
    });
  }

  private getColorByFilename(filename: string): string {
    const colors = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
      'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
      'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)'
    ];
    
    // Simple hash function for consistent color assignment
    let hash = 0;
    for (let i = 0; i < filename.length; i++) {
      const char = filename.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return colors[Math.abs(hash) % colors.length]!;
  }
}