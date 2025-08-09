import { Injectable, signal } from '@angular/core';
import { AudioEngineService } from './audio-engine.service';
import { SOUND_LIBRARY, SoundLibraryItem, SOUND_CATEGORIES, SoundCategory } from '../utils/sound-library';

@Injectable({ providedIn: 'root' })
export class SoundLibraryService {
  private loadedSounds = new Map<string, AudioBuffer>();
  
  sounds = signal<SoundLibraryItem[]>(SOUND_LIBRARY);
  categories = signal<readonly SoundCategory[]>(SOUND_CATEGORIES);
  selectedCategory = signal<SoundCategory>('All');
  searchTerm = signal<string>('');
  
  filteredSounds = signal<SoundLibraryItem[]>([]);

  constructor(public audio: AudioEngineService) {
    // Update filtered sounds when category or search changes
    this.updateFiltered();
  }

  private updateFiltered() {
    const category = this.selectedCategory();
    const search = this.searchTerm().toLowerCase();
    const allSounds = this.sounds();
    
    const filtered = allSounds.filter(sound => {
      const matchesCategory = category === 'All' || sound.category === category;
      const matchesSearch = search === '' || 
        sound.name.toLowerCase().includes(search) ||
        sound.tags?.some(tag => tag.toLowerCase().includes(search)) ||
        sound.category.toLowerCase().includes(search);
      
      return matchesCategory && matchesSearch;
    });
    
    this.filteredSounds.set(filtered);
  }

  setCategory(category: SoundCategory) {
    this.selectedCategory.set(category);
    this.updateFiltered();
  }

  setSearchTerm(term: string) {
    this.searchTerm.set(term);
    this.updateFiltered();
  }

  async loadSound(soundId: string): Promise<AudioBuffer | null> {
    // Return cached if already loaded
    if (this.loadedSounds.has(soundId)) {
      return this.loadedSounds.get(soundId)!;
    }

    const sound = this.sounds().find(s => s.id === soundId);
    if (!sound) return null;

    try {
      const response = await fetch(`/assets/sounds/${sound.filename}`);
      if (!response.ok) {
        console.error(`Failed to load sound: ${sound.filename}`);
        return null;
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audio.audioContext.decodeAudioData(arrayBuffer);
      
      // Cache the loaded sound
      this.loadedSounds.set(soundId, audioBuffer);
      
      // Update duration in the sound library
      this.sounds.update(sounds => 
        sounds.map(s => s.id === soundId ? { ...s, duration: audioBuffer.duration } : s)
      );
      
      return audioBuffer;
    } catch (error) {
      console.error(`Error loading sound ${sound.filename}:`, error);
      return null;
    }
  }

  async preloadSounds(soundIds: string[]): Promise<void> {
    const promises = soundIds.map(id => this.loadSound(id));
    await Promise.allSettled(promises);
  }

  // Preload a few essential sounds on app start
  async preloadEssentials(): Promise<void> {
    const essentials = [
      // Beat making essentials
      'kick-808', 'kick-trap', 
      'snare-trap', 'snare-clap', 
      'hihat-closed', 'hihat-open',
      'bass-808-long', 'bass-808-short'
    ];
    await this.preloadSounds(essentials);
  }
}