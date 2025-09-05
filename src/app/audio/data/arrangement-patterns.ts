import { ArrangementDefinition } from '../shared/models/models';

// Default 90s Hip Hop pattern - clean JSON definition
export const DEFAULT_HIPHOP_90S: ArrangementDefinition = {
  name: '90s Hip Hop',
  bpm: 90,
  duration: 20,
  // Grid settings für Hip Hop
  timeSignature: { numerator: 4, denominator: 4 },
  gridSubdivision: '1/4',
  snapToGrid: true,
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

// House/Techno pattern - 4/4 beat at 128 BPM
export const HOUSE_TECHNO_128: ArrangementDefinition = {
  name: 'House/Techno 128',
  bpm: 128,
  duration: 16,
  // Grid settings für House/Techno
  timeSignature: { numerator: 4, denominator: 4 },
  gridSubdivision: '1/4',
  snapToGrid: true,
  tracks: [
    {
      name: 'Kick',
      volume: 1.0,
      pan: 0,
      mute: false,
      solo: false,
      color: 'linear-gradient(45deg, #dc2626, #b91c1c)',
      clips: [
        // Four-on-the-floor pattern - kick on every beat
        // Beat interval at 128 BPM: 60/128 = 0.46875 seconds per beat
        { soundId: 'kick-5', startTime: 0 },        // Beat 1
        { soundId: 'kick-5', startTime: 0.46875 },   // Beat 2
        { soundId: 'kick-5', startTime: 0.9375 },    // Beat 3
        { soundId: 'kick-5', startTime: 1.40625 },   // Beat 4
        { soundId: 'kick-5', startTime: 1.875 },     // Bar 2
        { soundId: 'kick-5', startTime: 2.34375 },
        { soundId: 'kick-5', startTime: 2.8125 },
        { soundId: 'kick-5', startTime: 3.28125 },
        { soundId: 'kick-5', startTime: 3.75 },      // Bar 3
        { soundId: 'kick-5', startTime: 4.21875 },
        { soundId: 'kick-5', startTime: 4.6875 },
        { soundId: 'kick-5', startTime: 5.15625 },
        { soundId: 'kick-5', startTime: 5.625 },     // Bar 4
        { soundId: 'kick-5', startTime: 6.09375 },
        { soundId: 'kick-5', startTime: 6.5625 },
        { soundId: 'kick-5', startTime: 7.03125 },
        { soundId: 'kick-5', startTime: 7.5 },       // Bar 5
        { soundId: 'kick-5', startTime: 7.96875 },
        { soundId: 'kick-5', startTime: 8.4375 },
        { soundId: 'kick-5', startTime: 8.90625 },
        { soundId: 'kick-5', startTime: 9.375 },     // Bar 6
        { soundId: 'kick-5', startTime: 9.84375 },
        { soundId: 'kick-5', startTime: 10.3125 },
        { soundId: 'kick-5', startTime: 10.78125 },
        { soundId: 'kick-5', startTime: 11.25 },     // Bar 7
        { soundId: 'kick-5', startTime: 11.71875 },
        { soundId: 'kick-5', startTime: 12.1875 },
        { soundId: 'kick-5', startTime: 12.65625 },
        { soundId: 'kick-5', startTime: 13.125 },    // Bar 8
        { soundId: 'kick-5', startTime: 13.59375 },
        { soundId: 'kick-5', startTime: 14.0625 },
        { soundId: 'kick-5', startTime: 14.53125 },
        { soundId: 'kick-5', startTime: 15 },        // Final bar
        { soundId: 'kick-5', startTime: 15.46875 }
      ]
    },
    {
      name: 'Clap/Snare',
      volume: 0.8,
      pan: 0,
      mute: false,
      solo: false,
      color: 'linear-gradient(45deg, #f59e0b, #d97706)',
      clips: [
        // Classic house clap on beats 2 and 4
        { soundId: 'snare-5', startTime: 0.46875 },   // Beat 2
        { soundId: 'snare-5', startTime: 1.40625 },   // Beat 4
        { soundId: 'snare-5', startTime: 2.34375 },   // Beat 2
        { soundId: 'snare-5', startTime: 3.28125 },   // Beat 4
        { soundId: 'snare-5', startTime: 4.21875 },   // Beat 2
        { soundId: 'snare-5', startTime: 5.15625 },   // Beat 4
        { soundId: 'snare-5', startTime: 6.09375 },   // Beat 2
        { soundId: 'snare-5', startTime: 7.03125 },   // Beat 4
        { soundId: 'snare-5', startTime: 7.96875 },   // Beat 2
        { soundId: 'snare-5', startTime: 8.90625 },   // Beat 4
        { soundId: 'snare-5', startTime: 9.84375 },   // Beat 2
        { soundId: 'snare-5', startTime: 10.78125 },  // Beat 4
        { soundId: 'snare-5', startTime: 11.71875 },  // Beat 2
        { soundId: 'snare-5', startTime: 12.65625 },  // Beat 4
        { soundId: 'snare-5', startTime: 13.59375 },  // Beat 2
        { soundId: 'snare-5', startTime: 14.53125 }   // Beat 4
      ]
    },
    {
      name: 'Hi-Hat Closed',
      volume: 0.5,
      pan: 0.1,
      mute: false,
      solo: false,
      color: 'linear-gradient(45deg, #10b981, #059669)',
      clips: [
        // 8th note hi-hat pattern (offbeats)
        // 8th note = 0.234375 seconds
        { soundId: 'hi-hat-8', startTime: 0.234375 },  // Between 1 and 2
        { soundId: 'hi-hat-8', startTime: 0.703125 },  // Between 2 and 3
        { soundId: 'hi-hat-8', startTime: 1.171875 },  // Between 3 and 4
        { soundId: 'hi-hat-8', startTime: 1.640625 },  // Between 4 and 1
        { soundId: 'hi-hat-8', startTime: 2.109375 },  // Bar 2
        { soundId: 'hi-hat-8', startTime: 2.578125 },
        { soundId: 'hi-hat-8', startTime: 3.046875 },
        { soundId: 'hi-hat-8', startTime: 3.515625 },
        { soundId: 'hi-hat-8', startTime: 3.984375 },  // Bar 3
        { soundId: 'hi-hat-8', startTime: 4.453125 },
        { soundId: 'hi-hat-8', startTime: 4.921875 },
        { soundId: 'hi-hat-8', startTime: 5.390625 },
        { soundId: 'hi-hat-8', startTime: 5.859375 },  // Bar 4
        { soundId: 'hi-hat-8', startTime: 6.328125 },
        { soundId: 'hi-hat-8', startTime: 6.796875 },
        { soundId: 'hi-hat-8', startTime: 7.265625 },
        { soundId: 'hi-hat-8', startTime: 7.734375 },  // Bar 5
        { soundId: 'hi-hat-8', startTime: 8.203125 },
        { soundId: 'hi-hat-8', startTime: 8.671875 },
        { soundId: 'hi-hat-8', startTime: 9.140625 },
        { soundId: 'hi-hat-8', startTime: 9.609375 },  // Bar 6
        { soundId: 'hi-hat-8', startTime: 10.078125 },
        { soundId: 'hi-hat-8', startTime: 10.546875 },
        { soundId: 'hi-hat-8', startTime: 11.015625 },
        { soundId: 'hi-hat-8', startTime: 11.484375 }, // Bar 7
        { soundId: 'hi-hat-8', startTime: 11.953125 },
        { soundId: 'hi-hat-8', startTime: 12.421875 },
        { soundId: 'hi-hat-8', startTime: 12.890625 },
        { soundId: 'hi-hat-8', startTime: 13.359375 }, // Bar 8
        { soundId: 'hi-hat-8', startTime: 13.828125 },
        { soundId: 'hi-hat-8', startTime: 14.296875 },
        { soundId: 'hi-hat-8', startTime: 14.765625 }
      ]
    },
    {
      name: 'Open Hi-Hat',
      volume: 0.4,
      pan: -0.1,
      mute: false,
      solo: false,
      color: 'linear-gradient(45deg, #8b5cf6, #7c3aed)',
      clips: [
        // Open hi-hat accents every other bar
        { soundId: 'hi-hat-12', startTime: 3.75 },    // Bar 3 start
        { soundId: 'hi-hat-12', startTime: 7.5 },     // Bar 5 start  
        { soundId: 'hi-hat-12', startTime: 11.25 },   // Bar 7 start
        { soundId: 'hi-hat-12', startTime: 15 }       // Final bar
      ]
    },
    {
      name: 'Bass',
      volume: 0.9,
      pan: 0,
      mute: false,
      solo: false,
      color: 'linear-gradient(45deg, #dc2626, #991b1b)',
      clips: [
        // Deep house bass pattern - root and fifth
        { soundId: 'moog-bass-1-c2', startTime: 0 },
        { soundId: 'moog-bass-1-c2', startTime: 1.875 },    // Every other bar
        { soundId: 'moog-bass-1-c2', startTime: 3.75 },
        { soundId: 'bass-3-b2', startTime: 5.390625 },      // Fifth variation
        { soundId: 'moog-bass-1-c2', startTime: 7.5 },
        { soundId: 'bass-3-b2', startTime: 9.140625 },      // Build tension
        { soundId: 'moog-bass-1-c2', startTime: 11.25 },
        { soundId: 'moog-bass-1-c2', startTime: 13.125 },
        { soundId: 'bass-3-b2', startTime: 15 }             // Final accent
      ]
    },
    {
      name: 'Synth',
      volume: 0.6,
      pan: 0.2,
      mute: false,
      solo: false,
      color: 'linear-gradient(45deg, #3b82f6, #1d4ed8)',
      clips: [
        // Synth stabs on the upbeats
        { soundId: 'synth-1', startTime: 0.703125 },   // Upbeat
        { soundId: 'synth-2', startTime: 2.578125 },   // Variation
        { soundId: 'synth-1', startTime: 4.453125 },
        { soundId: 'synth-2', startTime: 6.328125 },
        { soundId: 'synth-1', startTime: 8.203125 },
        { soundId: 'synth-2', startTime: 10.078125 },
        { soundId: 'synth-1', startTime: 11.953125 },
        { soundId: 'synth-2', startTime: 13.828125 }
      ]
    }
  ]
};

// Rock/Pop pattern - 110 BPM with driving energy  
export const ROCK_POP_110: ArrangementDefinition = {
  name: 'Rock/Pop 110',
  bpm: 110,
  duration: 16,
  // Grid settings für Rock/Pop
  timeSignature: { numerator: 4, denominator: 4 },
  gridSubdivision: '1/4',
  snapToGrid: true,
  tracks: [
    {
      name: 'Kick',
      volume: 1.0,
      pan: 0,
      mute: false,
      solo: false,
      color: 'linear-gradient(45deg, #dc2626, #b91c1c)',
      clips: [
        // Rock pattern - kick on 1 and 3, with some variations
        // Beat interval at 110 BPM: 60/110 = 0.545 seconds per beat
        { soundId: 'kick-8', startTime: 0 },        // Beat 1
        { soundId: 'kick-8', startTime: 1.09 },     // Beat 3
        { soundId: 'kick-8', startTime: 2.18 },     // Beat 1
        { soundId: 'kick-8', startTime: 3.27 },     // Beat 3
        { soundId: 'kick-8', startTime: 4.36 },     // Beat 1
        { soundId: 'kick-8', startTime: 5.45 },     // Beat 3
        { soundId: 'kick-8', startTime: 6.54 },     // Beat 1
        { soundId: 'kick-8', startTime: 7.63 },     // Beat 3
        { soundId: 'kick-8', startTime: 8.72 },     // Beat 1
        { soundId: 'kick-8', startTime: 9.81 },     // Beat 3
        { soundId: 'kick-8', startTime: 10.9 },     // Beat 1
        { soundId: 'kick-8', startTime: 12.0 },     // Variation - beat 3 + kick fill
        { soundId: 'kick-8', startTime: 12.54 },    // Extra kick
        { soundId: 'kick-8', startTime: 13.08 },    // Beat 1
        { soundId: 'kick-8', startTime: 14.17 },    // Beat 3
        { soundId: 'kick-8', startTime: 15.26 }     // Final kick
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
        // Classic backbeat on 2 and 4
        { soundId: 'snare-3', startTime: 0.545 },   // Beat 2
        { soundId: 'snare-3', startTime: 1.635 },   // Beat 4
        { soundId: 'snare-3', startTime: 2.725 },   // Beat 2
        { soundId: 'snare-3', startTime: 3.815 },   // Beat 4
        { soundId: 'snare-3', startTime: 4.905 },   // Beat 2
        { soundId: 'snare-3', startTime: 5.995 },   // Beat 4
        { soundId: 'snare-3', startTime: 7.085 },   // Beat 2
        { soundId: 'snare-3', startTime: 8.175 },   // Beat 4
        { soundId: 'snare-3', startTime: 9.265 },   // Beat 2
        { soundId: 'snare-3', startTime: 10.355 },  // Beat 4
        { soundId: 'snare-3', startTime: 11.445 },  // Beat 2
        { soundId: 'snare-3', startTime: 12.535 },  // Beat 4 + fill
        { soundId: 'snare-3', startTime: 12.8 },    // Snare fill
        { soundId: 'snare-3', startTime: 13.625 },  // Beat 2
        { soundId: 'snare-3', startTime: 14.715 },  // Beat 4
        { soundId: 'snare-3', startTime: 15.805 }   // Final snare
      ]
    },
    {
      name: 'Hi-Hat',
      volume: 0.6,
      pan: 0.1,
      mute: false,
      solo: false,
      color: 'linear-gradient(45deg, #10b981, #059669)',
      clips: [
        // 8th note hi-hat pattern with slight swing
        // 8th note = 0.2725 seconds
        { soundId: 'hi-hat-15', startTime: 0 },
        { soundId: 'hi-hat-15', startTime: 0.2725 },
        { soundId: 'hi-hat-15', startTime: 0.545 },
        { soundId: 'hi-hat-15', startTime: 0.8175 },
        { soundId: 'hi-hat-15', startTime: 1.09 },
        { soundId: 'hi-hat-15', startTime: 1.3625 },
        { soundId: 'hi-hat-15', startTime: 1.635 },
        { soundId: 'hi-hat-15', startTime: 1.9075 },
        { soundId: 'hi-hat-15', startTime: 2.18 },
        { soundId: 'hi-hat-15', startTime: 2.4525 },
        { soundId: 'hi-hat-15', startTime: 2.725 },
        { soundId: 'hi-hat-15', startTime: 2.9975 },
        { soundId: 'hi-hat-15', startTime: 3.27 },
        { soundId: 'hi-hat-15', startTime: 3.5425 },
        { soundId: 'hi-hat-15', startTime: 3.815 },
        { soundId: 'hi-hat-15', startTime: 4.0875 },
        // Continue pattern - abbreviated for space
        { soundId: 'hi-hat-15', startTime: 4.36 },
        { soundId: 'hi-hat-15', startTime: 4.6325 },
        { soundId: 'hi-hat-15', startTime: 4.905 },
        { soundId: 'hi-hat-15', startTime: 5.1775 },
        { soundId: 'hi-hat-15', startTime: 5.45 },
        { soundId: 'hi-hat-15', startTime: 5.7225 },
        { soundId: 'hi-hat-15', startTime: 5.995 },
        { soundId: 'hi-hat-15', startTime: 6.2675 }
      ]
    },
    {
      name: 'Crash',
      volume: 0.7,
      pan: -0.1,
      mute: false,
      solo: false,
      color: 'linear-gradient(45deg, #8b5cf6, #7c3aed)',
      clips: [
        // Crash accents at section starts
        { soundId: 'crash-1', startTime: 0 },      // Song start
        { soundId: 'crash-1', startTime: 8.72 },   // Middle section
        { soundId: 'crash-1', startTime: 13.08 }   // Final section
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
        // Rock bass pattern following kick mostly
        { soundId: 'bass-4-d2', startTime: 0 },
        { soundId: 'bass-4-d2', startTime: 1.09 },
        { soundId: 'bass-6-e2', startTime: 2.18 },    // Variation
        { soundId: 'bass-4-d2', startTime: 3.27 },
        { soundId: 'bass-4-d2', startTime: 4.36 },
        { soundId: 'bass-6-e2', startTime: 5.45 },
        { soundId: 'bass-4-d2', startTime: 6.54 },
        { soundId: 'bass-4-d2', startTime: 7.63 },
        { soundId: 'bass-4-d2', startTime: 8.72 },
        { soundId: 'bass-6-e2', startTime: 9.81 },    // Build up
        { soundId: 'bass-4-d2', startTime: 10.9 },
        { soundId: 'bass-4-d2', startTime: 12.0 },
        { soundId: 'bass-4-d2', startTime: 13.08 },
        { soundId: 'bass-6-e2', startTime: 14.17 },
        { soundId: 'bass-4-d2', startTime: 15.26 }
      ]
    }
  ]
};

// Reggae/Dub pattern - 75 BPM with characteristic off-beat emphasis
export const REGGAE_DUB_75: ArrangementDefinition = {
  name: 'Reggae/Dub 75',
  bpm: 75,
  duration: 16,
  // Grid settings für Reggae/Dub
  timeSignature: { numerator: 4, denominator: 4 },
  gridSubdivision: '1/4',
  snapToGrid: true,
  tracks: [
    {
      name: 'Kick',
      volume: 1.0,
      pan: 0,
      mute: false,
      solo: false,
      color: 'linear-gradient(45deg, #dc2626, #b91c1c)',
      clips: [
        // Reggae kick pattern - emphasizes beat 3, light on 1
        // Beat interval at 75 BPM: 60/75 = 0.8 seconds per beat
        { soundId: 'kick-12', startTime: 0, volume: 0.7 },      // Beat 1 (lighter)
        { soundId: 'kick-12', startTime: 1.6 },                 // Beat 3 (strong)
        { soundId: 'kick-12', startTime: 3.2, volume: 0.7 },    // Beat 1 (lighter)
        { soundId: 'kick-12', startTime: 4.8 },                 // Beat 3 (strong)
        { soundId: 'kick-12', startTime: 6.4, volume: 0.7 },    // Beat 1 (lighter)
        { soundId: 'kick-12', startTime: 8.0 },                 // Beat 3 (strong)
        { soundId: 'kick-12', startTime: 9.6, volume: 0.7 },    // Beat 1 (lighter)
        { soundId: 'kick-12', startTime: 11.2 },                // Beat 3 (strong)
        { soundId: 'kick-12', startTime: 12.8, volume: 0.7 },   // Beat 1 (lighter)
        { soundId: 'kick-12', startTime: 14.4 }                 // Beat 3 (strong)
      ]
    },
    {
      name: 'Snare',
      volume: 0.8,
      pan: 0,
      mute: false,
      solo: false,
      color: 'linear-gradient(45deg, #f59e0b, #d97706)',
      clips: [
        // Classic reggae snare on beat 2 and 4, with some variations
        { soundId: 'snare-4', startTime: 0.8 },     // Beat 2
        { soundId: 'snare-4', startTime: 2.4 },     // Beat 4
        { soundId: 'snare-4', startTime: 4.0 },     // Beat 2
        { soundId: 'snare-4', startTime: 5.6 },     // Beat 4
        { soundId: 'snare-4', startTime: 7.2 },     // Beat 2
        { soundId: 'snare-4', startTime: 8.8 },     // Beat 4
        { soundId: 'snare-4', startTime: 10.4 },    // Beat 2
        { soundId: 'snare-4', startTime: 12.0 },    // Beat 4
        { soundId: 'snare-4', startTime: 13.6 },    // Beat 2
        { soundId: 'snare-4', startTime: 15.2 }     // Beat 4
      ]
    },
    {
      name: 'Hi-Hat',
      volume: 0.4,
      pan: 0.1,
      mute: false,
      solo: false,
      color: 'linear-gradient(45deg, #10b981, #059669)',
      clips: [
        // Reggae hi-hat: emphasis on off-beats (+ of beats)
        // 8th note = 0.4 seconds
        { soundId: 'hi-hat-25', startTime: 0.4 },    // Off-beat after 1
        { soundId: 'hi-hat-25', startTime: 1.2 },    // Off-beat after 2  
        { soundId: 'hi-hat-25', startTime: 2.0 },    // Off-beat after 3
        { soundId: 'hi-hat-25', startTime: 2.8 },    // Off-beat after 4
        { soundId: 'hi-hat-25', startTime: 3.6 },    // Bar 2
        { soundId: 'hi-hat-25', startTime: 4.4 },
        { soundId: 'hi-hat-25', startTime: 5.2 },
        { soundId: 'hi-hat-25', startTime: 6.0 },
        { soundId: 'hi-hat-25', startTime: 6.8 },    // Bar 3
        { soundId: 'hi-hat-25', startTime: 7.6 },
        { soundId: 'hi-hat-25', startTime: 8.4 },
        { soundId: 'hi-hat-25', startTime: 9.2 },
        { soundId: 'hi-hat-25', startTime: 10.0 },   // Bar 4
        { soundId: 'hi-hat-25', startTime: 10.8 },
        { soundId: 'hi-hat-25', startTime: 11.6 },
        { soundId: 'hi-hat-25', startTime: 12.4 },
        { soundId: 'hi-hat-25', startTime: 13.2 },   // Bar 5
        { soundId: 'hi-hat-25', startTime: 14.0 },
        { soundId: 'hi-hat-25', startTime: 14.8 },
        { soundId: 'hi-hat-25', startTime: 15.6 }
      ]
    },
    {
      name: 'Bass',
      volume: 0.9,
      pan: 0,
      mute: false,
      solo: false,
      color: 'linear-gradient(45deg, #dc2626, #991b1b)',
      clips: [
        // Deep reggae bass - emphasizes the off-beat rhythm
        { soundId: 'bass-2-f2', startTime: 0.4 },     // Off-beat
        { soundId: 'bass-2-f2', startTime: 1.2 },     // Off-beat
        { soundId: 'bass-2-f2', startTime: 2.8 },     // Off-beat (skip one)
        { soundId: 'bass-2-f2', startTime: 3.6 },     // Off-beat
        { soundId: 'bass-2-f2', startTime: 4.4 },     // Off-beat
        { soundId: 'bass-2-f2', startTime: 6.0 },     // Off-beat
        { soundId: 'bass-2-f2', startTime: 6.8 },     // Off-beat
        { soundId: 'bass-2-f2', startTime: 8.4 },     // Off-beat
        { soundId: 'bass-2-f2', startTime: 9.2 },     // Off-beat
        { soundId: 'bass-2-f2', startTime: 10.8 },    // Off-beat
        { soundId: 'bass-2-f2', startTime: 12.4 },    // Off-beat
        { soundId: 'bass-2-f2', startTime: 13.2 },    // Off-beat
        { soundId: 'bass-2-f2', startTime: 14.8 }     // Off-beat
      ]
    },
    {
      name: 'Rim Shot',
      volume: 0.6,
      pan: -0.1,
      mute: false,
      solo: false,
      color: 'linear-gradient(45deg, #8b5cf6, #7c3aed)',
      clips: [
        // Reggae rim shots for texture
        { soundId: 'drum-stick-perc-1', startTime: 1.2 },   // Beat 2 off
        { soundId: 'drum-stick-perc-1', startTime: 4.4 },   // Beat 2 off
        { soundId: 'drum-stick-perc-1', startTime: 7.6 },   // Beat 2 off
        { soundId: 'drum-stick-perc-1', startTime: 10.8 },  // Beat 2 off
        { soundId: 'drum-stick-perc-1', startTime: 14.0 }   // Beat 2 off
      ]
    }
  ]
};

// POLYRHYTHMIC EXPERIMENTAL - 7/8 time signature madness at 95 BPM
export const POLY_EXPERIMENTAL_95: ArrangementDefinition = {
  name: 'Polyrhythmic Experiment 95',
  bpm: 95,
  duration: 14, // Weird length to mess with expectations
  // Grid settings für Experimental - könnte auch 7/8 sein für mehr Komplexität
  timeSignature: { numerator: 4, denominator: 4 },
  gridSubdivision: '1/8', // Feinere Auflösung für komplexe Patterns
  snapToGrid: true,
  tracks: [
    {
      name: 'Kick 4/4',
      volume: 0.9,
      pan: -0.1,
      mute: false,
      solo: false,
      color: 'linear-gradient(45deg, #dc2626, #b91c1c)',
      clips: [
        // Normal 4/4 kick while everything else is in 7/8
        // Beat interval at 95 BPM: 60/95 = 0.632 seconds per beat
        { soundId: 'kick-18', startTime: 0 },
        { soundId: 'kick-18', startTime: 2.526 },       // Beat 5 (4/4)
        { soundId: 'kick-18', startTime: 5.052 },       // Beat 9
        { soundId: 'kick-18', startTime: 7.578 },       // Beat 13
        { soundId: 'kick-18', startTime: 10.104 },      // Beat 17
        { soundId: 'kick-18', startTime: 12.630 }       // Beat 21
      ]
    },
    {
      name: 'Snare 7/8',
      volume: 0.8,
      pan: 0.1,
      mute: false,
      solo: false,
      color: 'linear-gradient(45deg, #f59e0b, #d97706)',
      clips: [
        // 7/8 pattern - 7 beats per bar
        // 7/8 bar = 7 * 0.632 = 4.424 seconds
        { soundId: 'snare-10', startTime: 1.263 },      // Beat 3 of 7
        { soundId: 'snare-10', startTime: 3.158 },      // Beat 6 of 7
        { soundId: 'snare-10', startTime: 5.687 },      // Beat 3 of 7 (next bar)
        { soundId: 'snare-10', startTime: 7.582 },      // Beat 6 of 7
        { soundId: 'snare-10', startTime: 10.111 },     // Beat 3 of 7
        { soundId: 'snare-10', startTime: 12.006 }      // Beat 6 of 7
      ]
    },
    {
      name: 'Hi-Hat 5/4',
      volume: 0.6,
      pan: 0,
      mute: false,
      solo: false,
      color: 'linear-gradient(45deg, #10b981, #059669)',
      clips: [
        // 5/4 pattern - 5 beats per bar
        // 5/4 bar = 5 * 0.632 = 3.16 seconds
        { soundId: 'hi-hat-28', startTime: 0 },
        { soundId: 'hi-hat-28', startTime: 0.632 },
        { soundId: 'hi-hat-28', startTime: 1.263 },
        { soundId: 'hi-hat-28', startTime: 1.895 },
        { soundId: 'hi-hat-28', startTime: 2.526 },
        { soundId: 'hi-hat-28', startTime: 3.158 },     // New 5/4 bar
        { soundId: 'hi-hat-28', startTime: 3.790 },
        { soundId: 'hi-hat-28', startTime: 4.421 },
        { soundId: 'hi-hat-28', startTime: 5.053 },
        { soundId: 'hi-hat-28', startTime: 5.684 },
        { soundId: 'hi-hat-28', startTime: 6.316 },     // New 5/4 bar
        { soundId: 'hi-hat-28', startTime: 6.947 },
        { soundId: 'hi-hat-28', startTime: 7.579 },
        { soundId: 'hi-hat-28', startTime: 8.211 },
        { soundId: 'hi-hat-28', startTime: 8.842 }
      ]
    },
    {
      name: 'Bass 3/4',
      volume: 0.9,
      pan: 0,
      mute: false,
      solo: false,
      color: 'linear-gradient(45deg, #dc2626, #991b1b)',
      clips: [
        // 3/4 waltz time bass while everything else is chaos
        // 3/4 bar = 3 * 0.632 = 1.895 seconds
        { soundId: 'bass-1-g2', startTime: 0 },         // Beat 1 of 3
        { soundId: 'bass-2-f2', startTime: 1.895 },     // Beat 1 of 3 (new bar)
        { soundId: 'bass-3-b2', startTime: 3.790 },     // Beat 1 of 3 (new bar)
        { soundId: 'bass-4-d2', startTime: 5.684 },     // Beat 1 of 3 (new bar)
        { soundId: 'bass-6-e2', startTime: 7.579 },     // Beat 1 of 3 (new bar)
        { soundId: 'bass-1-g2', startTime: 9.474 },    // Beat 1 of 3 (new bar)
        { soundId: 'bass-1-g2', startTime: 11.368 },    // Beat 1 of 3 (new bar)
        { soundId: 'bass-2-f2', startTime: 13.263 }     // Beat 1 of 3 (new bar)
      ]
    },
    {
      name: 'Percussion Chaos',
      volume: 0.7,
      pan: -0.2,
      mute: false,
      solo: false,
      color: 'linear-gradient(45deg, #8b5cf6, #7c3aed)',
      clips: [
        // Random percussion hits that don't follow any pattern
        { soundId: 'bongo-1', startTime: 0.421 },
        { soundId: 'conga-1', startTime: 1.578 },
        { soundId: 'bongo-1', startTime: 2.947 },
        { soundId: 'drum-stick-perc-1', startTime: 4.105 },
        { soundId: 'conga-1', startTime: 5.368 },
        { soundId: 'bongo-1', startTime: 6.842 },
        { soundId: 'drum-stick-perc-1', startTime: 8.526 },
        { soundId: 'conga-1', startTime: 9.789 },
        { soundId: 'bongo-1', startTime: 11.052 },
        { soundId: 'drum-stick-perc-1', startTime: 12.421 }
      ]
    }
  ]
};


// Export all available patterns
export const ARRANGEMENT_PATTERNS = {
  'hiphop-90s': DEFAULT_HIPHOP_90S,
  'house-techno-128': HOUSE_TECHNO_128,
  'rock-pop-110': ROCK_POP_110,
  'reggae-dub-75': REGGAE_DUB_75,
  'poly-experimental-95': POLY_EXPERIMENTAL_95
} as const;

export type PatternKey = keyof typeof ARRANGEMENT_PATTERNS;