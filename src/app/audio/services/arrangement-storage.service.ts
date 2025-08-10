import { Injectable, signal, inject } from '@angular/core';
import { Track, ArrangementDefinition } from '../models/models';
import { SoundLibraryService } from './sound-library.service';
import { ArrangementService } from './arrangement.service';

export interface SavedArrangement {
  id: string;                    // UUID für eindeutige ID
  createdAt: string;             // ISO string für sauberes JSON  
  updatedAt: string;             // ISO string für sauberes JSON
  arrangement: ArrangementDefinition; // Minimales Format mit name, bpm, duration, tracks
}

@Injectable({ providedIn: 'root' })
export class ArrangementStorageService {
  private readonly STORAGE_KEY = 'nervbox-arrangements';
  private readonly SCHEMA_KEY = 'nervbox-schema';
  private readonly CURRENT_SCHEMA = 'v1';
  
  savedArrangements = signal<SavedArrangement[]>([]);
  private soundLibrary = inject(SoundLibraryService);
  private arrangementService = inject(ArrangementService);

  constructor() {
    this.checkSchemaAndCleanup();
    this.loadArrangementsFromStorage();
  }

  private checkSchemaAndCleanup() {
    try {
      const storedSchema = localStorage.getItem(this.SCHEMA_KEY);
      
      if (storedSchema !== this.CURRENT_SCHEMA) {
        console.log('Schema mismatch or not found. Cleaning up old arrangements...');
        
        // Remove old arrangement data
        localStorage.removeItem(this.STORAGE_KEY);
        
        // Set current schema
        localStorage.setItem(this.SCHEMA_KEY, this.CURRENT_SCHEMA);
        
        console.log('Old arrangements cleaned up, schema updated to v1');
      }
    } catch (error) {
      console.error('Error checking schema:', error);
      // On error, assume cleanup needed
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.setItem(this.SCHEMA_KEY, this.CURRENT_SCHEMA);
    }
  }

  private loadArrangementsFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const arrangements = JSON.parse(stored);
        // Dates are already ISO strings - no conversion needed for clean JSON
        this.savedArrangements.set(arrangements);
      }
    } catch (error) {
      console.error('Error loading arrangements from localStorage:', error);
    }
  }

  private saveArrangementsToStorage() {
    try {
      const arrangements = this.savedArrangements();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(arrangements));
    } catch (error) {
      console.error('Error saving arrangements to localStorage:', error);
    }
  }

  saveArrangement(name: string, tracks: Track[], bpm = 120): string {
    const now = new Date().toISOString();
    const existingIndex = this.savedArrangements().findIndex(arr => arr.arrangement.name === name);
    
    // Convert tracks to unified arrangement definition format
    const arrangementDef = this.arrangementService.tracksToDefinition(tracks, name, bpm);
    
    if (existingIndex >= 0) {
      // Update existing arrangement
      const arrangements = [...this.savedArrangements()];
      arrangements[existingIndex] = {
        ...arrangements[existingIndex],
        arrangement: arrangementDef,
        updatedAt: now
      };
      this.savedArrangements.set(arrangements);
    } else {
      // Create new arrangement
      const newArrangement: SavedArrangement = {
        id: crypto.randomUUID(),
        arrangement: arrangementDef,
        createdAt: now,
        updatedAt: now
      };
      this.savedArrangements.update(list => [...list, newArrangement]);
    }

    this.saveArrangementsToStorage();
    return name;
  }

  async loadArrangement(id: string): Promise<Track[] | null> {
    const savedArrangement = this.savedArrangements().find(arr => arr.id === id);
    if (!savedArrangement) return null;

    try {
      // Use the unified arrangement service to create tracks from definition
      return await this.arrangementService.createFromDefinition(savedArrangement.arrangement);
    } catch (error) {
      console.error('Error loading arrangement:', error);
      return null;
    }
  }

  deleteArrangement(id: string): void {
    this.savedArrangements.update(list => list.filter(arr => arr.id !== id));
    this.saveArrangementsToStorage();
  }

  renameArrangement(id: string, newName: string): void {
    const arrangements = [...this.savedArrangements()];
    const index = arrangements.findIndex(arr => arr.id === id);
    
    if (index >= 0) {
      arrangements[index] = {
        ...arrangements[index],
        arrangement: {
          ...arrangements[index].arrangement,
          name: newName
        },
        updatedAt: new Date().toISOString()
      };
      this.savedArrangements.set(arrangements);
      this.saveArrangementsToStorage();
    }
  }

  // No longer needed - ArrangementService handles track/definition conversion

  exportArrangement(id: string): string {
    const arrangement = this.savedArrangements().find(arr => arr.id === id);
    if (!arrangement) throw new Error('Arrangement not found');
    
    // Export the clean arrangement definition - no AudioBuffers needed
    const exportData = {
      ...arrangement,
      // arrangement already contains the clean JSON definition
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  getArrangementCount(): number {
    return this.savedArrangements().length;
  }

  clearAllArrangements(): void {
    this.savedArrangements.set([]);
    localStorage.removeItem(this.STORAGE_KEY);
  }
}