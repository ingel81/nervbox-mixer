import { Injectable, inject } from '@angular/core';
import { Track } from '../../shared/models/models';
import { ArrangementService } from './arrangement.service';
import { 
  DEFAULT_HIPHOP_90S, 
  // HOUSE_TECHNO_128, 
  // ROCK_POP_110, 
  ARRANGEMENT_PATTERNS,
  PatternKey 
} from '../../data/arrangement-patterns';

@Injectable({
  providedIn: 'root'
})
export class DefaultArrangementService {
  
  private arrangementService = inject(ArrangementService);
  
  /**
   * Creates a random default pattern from available genres
   * Randomly selects between Hip Hop, House/Techno, and Rock/Pop patterns
   */
  async createRandomDefaultTracks(): Promise<Track[]> {
    try {
      // Get all available pattern keys
      const patternKeys = Object.keys(ARRANGEMENT_PATTERNS) as PatternKey[];
      
      // Select random pattern
      const randomIndex = Math.floor(Math.random() * patternKeys.length);
      const selectedPatternKey = patternKeys[randomIndex];
      const selectedPattern = ARRANGEMENT_PATTERNS[selectedPatternKey];
      
      console.log(`Loading random default pattern: ${selectedPattern.name} (${selectedPattern.bpm} BPM)`);
      
      return await this.arrangementService.createFromDefinition(selectedPattern);
    } catch (error) {
      console.error('Error creating random default tracks:', error);
      return []; // Return empty array on error
    }
  }
  
  /**
   * Creates the default hip hop tracks using the new JSON-based approach
   * This replaces the old 200+ lines of manual clip creation
   * @deprecated Use createRandomDefaultTracks() for varied genre selection
   */
  async createDefaultHipHopTracks(): Promise<Track[]> {
    try {
      return await this.arrangementService.createFromDefinition(DEFAULT_HIPHOP_90S);
    } catch (error) {
      console.error('Error creating default hip hop tracks:', error);
      return []; // Return empty array on error
    }
  }
  
  /**
   * Creates specific pattern by key
   */
  async createPatternByKey(patternKey: PatternKey): Promise<Track[]> {
    try {
      const pattern = ARRANGEMENT_PATTERNS[patternKey];
      console.log(`Loading specific pattern: ${pattern.name} (${pattern.bpm} BPM)`);
      return await this.arrangementService.createFromDefinition(pattern);
    } catch (error) {
      console.error(`Error creating pattern '${patternKey}':`, error);
      return [];
    }
  }
}