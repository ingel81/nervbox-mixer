import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AudioEngineService } from '../../audio-engine/services/audio-engine.service';
import { SOUND_LIBRARY, SoundLibraryItem, SOUND_CATEGORIES, SoundCategory } from '../../shared/utils/sound-library';
import { environment } from '../../../../environments/environment';
import { Sound } from '../../../core/models/sound.model';

@Injectable({ providedIn: 'root' })
export class SoundLibraryService {
  private readonly http = inject(HttpClient);
  private loadedSounds = new Map<string, AudioBuffer>();

  readonly isLanMode = signal(!!environment.nervboxApi);
  readonly isLoading = signal(false);

  sounds = signal<SoundLibraryItem[]>([]);
  categories = signal<readonly SoundCategory[]>(SOUND_CATEGORIES);
  selectedCategory = signal<SoundCategory>('All');
  searchTerm = signal<string>('');

  filteredSounds = signal<SoundLibraryItem[]>([]);

  // All unique tags from sounds (for upload dialog)
  readonly availableTags = computed(() => {
    const allTags = new Set<string>();
    for (const sound of this.sounds()) {
      sound.tags?.forEach(tag => allTags.add(tag));
    }
    return Array.from(allTags).sort();
  });

  constructor(public audio: AudioEngineService) {
    this.initializeSounds();
  }

  private initPromise: Promise<void> | null = null;

  private async initializeSounds(): Promise<void> {
    this.isLoading.set(true);

    if (environment.nervboxApi) {
      await this.loadFromApi();
    } else {
      this.sounds.set(SOUND_LIBRARY);
    }

    this.updateFiltered();
    this.isLoading.set(false);
  }

  /** Wait for sounds to be loaded (for URL parameter loading) */
  async waitForSounds(): Promise<void> {
    // If already loaded, return immediately
    if (!this.isLoading()) {
      return;
    }

    // Wait for loading to complete
    return new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (!this.isLoading()) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 50);
    });
  }

  private async loadFromApi(): Promise<void> {
    try {
      const apiSounds = await firstValueFrom(
        this.http.get<Sound[]>(`${environment.nervboxApi}/sound`)
      );

      const mappedSounds: SoundLibraryItem[] = apiSounds.map(s => ({
        id: s.hash,
        name: s.name,
        category: this.detectCategory(s.tags, s.name),
        filename: s.fileName,
        duration: s.durationMs / 1000,
        tags: s.tags
      }));

      this.sounds.set(mappedSounds);

      // Extract categories from sounds
      const categories = new Set<string>(['All']);
      mappedSounds.forEach(s => categories.add(s.category));
      this.categories.set(Array.from(categories) as SoundCategory[]);

    } catch (error) {
      console.error('Failed to load sounds from API:', error);
      // Fallback to static library in case of error
      this.sounds.set(SOUND_LIBRARY);
    }
  }

  private detectCategory(tags: string[], name: string): string {
    // Map tags to categories
    if (tags.some(t => ['drums', 'kick', 'snare', 'hihat', 'percussion'].includes(t.toLowerCase()))) return 'Drums';
    if (tags.some(t => t.toLowerCase() === 'bass')) return 'Bass';
    if (tags.some(t => t.toLowerCase() === 'synth')) return 'Synth';
    if (tags.some(t => ['fx', 'effect', 'sfx'].includes(t.toLowerCase()))) return 'FX';

    // Fallback: detect from name
    const lowerName = name.toLowerCase();
    if (lowerName.includes('kick') || lowerName.includes('snare') || lowerName.includes('drum') || lowerName.includes('hat')) return 'Drums';
    if (lowerName.includes('bass')) return 'Bass';
    if (lowerName.includes('synth')) return 'Synth';
    return 'FX';
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
      // Different URL based on mode
      const url = environment.nervboxApi
        ? `${environment.nervboxApi}/sound/${soundId}/file`
        : `/assets/sounds/${sound.filename}`;

      const response = await fetch(url);
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