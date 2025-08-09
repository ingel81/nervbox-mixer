import { Injectable, signal, inject } from '@angular/core';
import { Track, ArrangementDefinition } from '../models/models';
import { SoundLibraryService } from './sound-library.service';
import { ArrangementService } from './arrangement.service';

export interface SavedArrangement {
  id: string;
  name: string;
  arrangement: ArrangementDefinition; // Use unified format instead of raw tracks
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({ providedIn: 'root' })
export class ArrangementStorageService {
  private readonly STORAGE_KEY = 'nervbox-arrangements';
  
  savedArrangements = signal<SavedArrangement[]>([]);
  private soundLibrary = inject(SoundLibraryService);
  private arrangementService = inject(ArrangementService);

  constructor() {
    this.loadArrangementsFromStorage();
  }

  private loadArrangementsFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const arrangements = JSON.parse(stored);
        // Convert date strings back to Date objects
        const arrangementsWithDates = arrangements.map((arr: any) => ({
          ...arr,
          createdAt: new Date(arr.createdAt),
          updatedAt: new Date(arr.updatedAt)
        }));
        this.savedArrangements.set(arrangementsWithDates);
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

  saveArrangement(name: string, tracks: Track[], bpm: number = 120): string {
    const now = new Date();
    const existingIndex = this.savedArrangements().findIndex(arr => arr.name === name);
    
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
        name,
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
        name: newName,
        updatedAt: new Date()
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