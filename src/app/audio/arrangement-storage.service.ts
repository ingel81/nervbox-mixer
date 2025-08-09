import { Injectable, signal, inject } from '@angular/core';
import { Track } from './models';
import { SoundLibraryService } from './sound-library.service';

export interface SavedArrangement {
  id: string;
  name: string;
  tracks: Track[];
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({ providedIn: 'root' })
export class ArrangementStorageService {
  private readonly STORAGE_KEY = 'nervbox-arrangements';
  
  savedArrangements = signal<SavedArrangement[]>([]);
  private soundLibrary = inject(SoundLibraryService);

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

  saveArrangement(name: string, tracks: Track[]): string {
    const now = new Date();
    const existingIndex = this.savedArrangements().findIndex(arr => arr.name === name);
    
    if (existingIndex >= 0) {
      // Update existing arrangement
      const arrangements = [...this.savedArrangements()];
      arrangements[existingIndex] = {
        ...arrangements[existingIndex],
        tracks: this.cloneTracks(tracks),
        updatedAt: now
      };
      this.savedArrangements.set(arrangements);
    } else {
      // Create new arrangement
      const newArrangement: SavedArrangement = {
        id: crypto.randomUUID(),
        name,
        tracks: this.cloneTracks(tracks),
        createdAt: now,
        updatedAt: now
      };
      this.savedArrangements.update(list => [...list, newArrangement]);
    }

    this.saveArrangementsToStorage();
    return name;
  }

  async loadArrangement(id: string): Promise<Track[] | null> {
    const arrangement = this.savedArrangements().find(arr => arr.id === id);
    if (!arrangement) return null;

    // Clone tracks and restore AudioBuffers
    const restoredTracks = await Promise.all(
      arrangement.tracks.map(async (track) => {
        const restoredClips = await Promise.all(
          track.clips.map(async (clip) => {
            if ((clip as any).soundId) {
              // Restore buffer from sound library
              const buffer = await this.soundLibrary.loadSound((clip as any).soundId);
              if (buffer) {
                return { ...clip, buffer };
              } else {
                console.warn(`Failed to load buffer for clip ${clip.name} with soundId ${(clip as any).soundId}`);
                return null;
              }
            } else {
              // For clips without soundId, we can't restore the buffer
              console.warn(`Clip ${clip.name} has no soundId, buffer cannot be restored`);
              return null;
            }
          })
        );
        
        // Filter out clips that couldn't be restored
        const validClips = restoredClips.filter(clip => clip !== null) as any[];
        
        return {
          ...track,
          clips: validClips
        };
      })
    );

    return restoredTracks;
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

  private cloneTracks(tracks: Track[]): Track[] {
    // Deep clone tracks and store sound info for buffer restoration
    return tracks.map(track => ({
      ...track,
      clips: track.clips.map(clip => ({
        ...clip,
        // Store sound ID for buffer restoration, remove buffer for serialization
        soundId: (clip as any).soundId || null,
        buffer: null as any // Will be restored when loading
      }))
    }));
  }

  exportArrangement(id: string): string {
    const arrangement = this.savedArrangements().find(arr => arr.id === id);
    if (!arrangement) throw new Error('Arrangement not found');
    
    // Create export data without AudioBuffers (not serializable)
    const exportData = {
      ...arrangement,
      tracks: arrangement.tracks.map(track => ({
        ...track,
        clips: track.clips.map(clip => ({
          ...clip,
          buffer: null, // AudioBuffer will need to be reloaded
          bufferInfo: {
            // Store info to help reload the buffer later
            duration: clip.buffer.duration,
            sampleRate: clip.buffer.sampleRate,
            numberOfChannels: clip.buffer.numberOfChannels
          }
        }))
      }))
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