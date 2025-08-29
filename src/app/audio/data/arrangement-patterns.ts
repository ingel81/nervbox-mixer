import { ArrangementDefinition } from '../shared/models/models';

// Default 90s Hip Hop pattern - clean JSON definition
export const DEFAULT_HIPHOP_90S: ArrangementDefinition = {
  name: '90s Hip Hop',
  bpm: 90,
  duration: 20,
  tracks: [
    {
      name: 'Kick',
      volume: 1.0,
      pan: 0,
      mute: false,
      solo: false,
      color: 'linear-gradient(45deg, #dc2626, #b91c1c)',
      clips: [
        // Extended 90s hip hop pattern (20 seconds at 90 BPM = ~7.5 bars)
        // Bar length: 2.67 seconds, Beat interval: 0.67 seconds
        
        // Bar 1
        { soundId: 'kick-1', startTime: 0 },
        { soundId: 'kick-1', startTime: 1.0 },
        { soundId: 'kick-1', startTime: 2.0 },
        
        // Bar 2 
        { soundId: 'kick-1', startTime: 2.67 },
        { soundId: 'kick-1', startTime: 4.34 },
        
        // Bar 3
        { soundId: 'kick-1', startTime: 5.34 },
        { soundId: 'kick-1', startTime: 6.67 },
        
        // Bar 4
        { soundId: 'kick-1', startTime: 8.01 },
        { soundId: 'kick-1', startTime: 9.34 },
        
        // Bar 5-7 continuation
        { soundId: 'kick-1', startTime: 10.68 },
        { soundId: 'kick-1', startTime: 12.01 },
        { soundId: 'kick-1', startTime: 13.35 },
        { soundId: 'kick-1', startTime: 15.35 },
        { soundId: 'kick-1', startTime: 16.02 },
        { soundId: 'kick-1', startTime: 18.02 }
      ]
    },
    {
      name: 'Snare',
      volume: 0.9,
      pan: 0,
      mute: false,
      solo: false,
      color: 'linear-gradient(45deg, #f59e0b, #d97706)',
      clips: [
        // Classic backbeat on 2 and 4 with occasional ghost notes
        { soundId: 'snare-2', startTime: 0.67 },   // Beat 2
        { soundId: 'snare-2', startTime: 2.0 },    // Beat 4
        { soundId: 'snare-2', startTime: 3.34 },   // Beat 2
        { soundId: 'snare-2', startTime: 4.67 },   // Beat 4
        { soundId: 'snare-2', startTime: 6.01 },   // Beat 2
        { soundId: 'snare-2', startTime: 7.34 },   // Beat 4
        { soundId: 'snare-2', startTime: 8.68 },   // Beat 2
        { soundId: 'snare-2', startTime: 10.01 },  // Beat 4
        
        // Ghost note for groove
        { soundId: 'snare-2', startTime: 6.51, volume: 0.6 },
        
        { soundId: 'snare-2', startTime: 11.35 },  // Beat 2
        { soundId: 'snare-2', startTime: 12.68 },  // Beat 4
        { soundId: 'snare-2', startTime: 14.02 },  // Beat 2
        { soundId: 'snare-2', startTime: 15.35 },  // Beat 4
        { soundId: 'snare-2', startTime: 16.69 },  // Beat 2
        { soundId: 'snare-2', startTime: 18.02 }   // Beat 4
      ]
    },
    {
      name: 'Hi-Hat Closed',
      volume: 0.6,
      pan: 0.1,
      mute: false,
      solo: false,
      color: 'linear-gradient(45deg, #10b981, #059669)',
      clips: [
        // Steady 8th note pattern with gaps for groove
        // 8th note = 0.335 seconds
        { soundId: 'hi-hat-3', startTime: 0 },
        { soundId: 'hi-hat-3', startTime: 0.335 },
        { soundId: 'hi-hat-3', startTime: 1.005 },
        { soundId: 'hi-hat-3', startTime: 1.34 },
        { soundId: 'hi-hat-3', startTime: 1.675 },
        { soundId: 'hi-hat-3', startTime: 2.345 },
        
        { soundId: 'hi-hat-3', startTime: 2.67 },
        { soundId: 'hi-hat-3', startTime: 3.005 },
        { soundId: 'hi-hat-3', startTime: 3.675 },
        { soundId: 'hi-hat-3', startTime: 4.01 },
        { soundId: 'hi-hat-3', startTime: 4.345 },
        { soundId: 'hi-hat-3', startTime: 5.015 },
        
        // Continue pattern for remaining bars
        { soundId: 'hi-hat-3', startTime: 5.34 },
        { soundId: 'hi-hat-3', startTime: 5.675 },
        { soundId: 'hi-hat-3', startTime: 6.345 },
        { soundId: 'hi-hat-3', startTime: 6.68 },
        { soundId: 'hi-hat-3', startTime: 7.015 },
        { soundId: 'hi-hat-3', startTime: 7.685 },
        
        { soundId: 'hi-hat-3', startTime: 8.01 },
        { soundId: 'hi-hat-3', startTime: 8.345 },
        { soundId: 'hi-hat-3', startTime: 9.015 },
        { soundId: 'hi-hat-3', startTime: 9.35 },
        { soundId: 'hi-hat-3', startTime: 9.685 },
        { soundId: 'hi-hat-3', startTime: 10.355 },
        
        { soundId: 'hi-hat-3', startTime: 10.68 },
        { soundId: 'hi-hat-3', startTime: 11.015 },
        { soundId: 'hi-hat-3', startTime: 11.685 },
        { soundId: 'hi-hat-3', startTime: 12.02 },
        { soundId: 'hi-hat-3', startTime: 12.355 },
        { soundId: 'hi-hat-3', startTime: 13.025 },
        
        { soundId: 'hi-hat-3', startTime: 13.35 },
        { soundId: 'hi-hat-3', startTime: 13.685 },
        { soundId: 'hi-hat-3', startTime: 14.355 },
        { soundId: 'hi-hat-3', startTime: 14.69 },
        { soundId: 'hi-hat-3', startTime: 15.025 },
        { soundId: 'hi-hat-3', startTime: 15.695 },
        
        { soundId: 'hi-hat-3', startTime: 16.02 },
        { soundId: 'hi-hat-3', startTime: 16.355 },
        { soundId: 'hi-hat-3', startTime: 17.025 },
        { soundId: 'hi-hat-3', startTime: 17.36 },
        { soundId: 'hi-hat-3', startTime: 17.695 },
        { soundId: 'hi-hat-3', startTime: 18.365 }
      ]
    },
    {
      name: 'Hi-Hat Open',
      volume: 0.5,
      pan: -0.1,
      mute: false,
      solo: false,
      color: 'linear-gradient(45deg, #8b5cf6, #7c3aed)',
      clips: [
        // Occasional open hi-hat accents for flavor
        { soundId: 'hi-hat-10', startTime: 3.675 },  // Bar 2, beat 3.5
        { soundId: 'hi-hat-10', startTime: 9.685 },  // Bar 4, beat 3.75
        { soundId: 'hi-hat-10', startTime: 13.525 }, // Bar 6, beat 1.75
        { soundId: 'hi-hat-10', startTime: 17.195 }  // Bar 7, beat 3.5
      ]
    },
    {
      name: 'Bass',
      volume: 0.8,
      pan: 0,
      mute: false,
      solo: false,
      color: 'linear-gradient(45deg, #dc2626, #991b1b)',
      clips: [
        // Simple but groovy bass pattern
        { soundId: 'bass-1-g2', startTime: 0 },
        { soundId: 'bass-1-g2', startTime: 2.67 },
        { soundId: 'bass-1-g2', startTime: 4.34 },    // Variation bar
        { soundId: 'bass-1-g2', startTime: 5.34 },
        { soundId: 'bass-1-g2', startTime: 8.01 },
        { soundId: 'bass-1-g2', startTime: 9.18 },    // Groove hit
        { soundId: 'bass-1-g2', startTime: 10.68 },
        { soundId: 'bass-1-g2', startTime: 13.35 },
        { soundId: 'bass-1-g2', startTime: 14.52 },   // Variation
        { soundId: 'bass-1-g2', startTime: 16.02 },
        { soundId: 'bass-1-g2', startTime: 18.02 }
      ]
    }
  ]
};

// Export all available patterns
export const ARRANGEMENT_PATTERNS = {
  'hiphop-90s': DEFAULT_HIPHOP_90S
} as const;

export type PatternKey = keyof typeof ARRANGEMENT_PATTERNS;