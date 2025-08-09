import { Injectable, inject } from '@angular/core';
import { Track } from '../models/models';
import { ArrangementService } from './arrangement.service';
import { DEFAULT_HIPHOP_90S } from '../data/arrangement-patterns';

@Injectable({
  providedIn: 'root'
})
export class DefaultArrangementService {
  
  private arrangementService = inject(ArrangementService);
  
  /**
   * Creates the default hip hop tracks using the new JSON-based approach
   * This replaces the old 200+ lines of manual clip creation
   */
  async createDefaultHipHopTracks(): Promise<Track[]> {
    try {
      return await this.arrangementService.createFromDefinition(DEFAULT_HIPHOP_90S);
    } catch (error) {
      console.error('Error creating default hip hop tracks:', error);
      return []; // Return empty array on error
    }
  }
}