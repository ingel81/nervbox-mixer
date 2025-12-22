import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AudioEngineService } from '../../audio-engine/services/audio-engine.service';
import { RecordingStorageService } from '../../audio-engine/services/recording-storage.service';
import { SOUND_LIBRARY, SoundLibraryItem, SOUND_CATEGORIES, SoundCategory } from '../../shared/utils/sound-library';
import {
  INSTRUMENT_LIBRARY,
  INSTRUMENT_CATEGORIES,
  InstrumentCategory,
} from '../../shared/utils/instrument-library';
import { environment } from '../../../../environments/environment';
import { Sound } from '../../../core/models/sound.model';
import { TagService } from '../../../core/services/tag.service';
import { FavoritesService } from '../../../core/services/favorites.service';

// Sort options matching the player
export type SortOption =
  | 'name-asc'
  | 'name-desc'
  | 'plays-desc'
  | 'votes-desc'
  | 'votes-asc'
  | 'newest'
  | 'duration-desc'
  | 'duration-asc'
  | 'random';

export interface SortOptionItem {
  value: SortOption;
  label: string;
}

export const SORT_OPTIONS: SortOptionItem[] = [
  { value: 'name-asc', label: 'Name A-Z' },
  { value: 'name-desc', label: 'Name Z-A' },
  { value: 'plays-desc', label: 'Meistgespielt' },
  { value: 'votes-desc', label: 'Beste Bewertung' },
  { value: 'votes-asc', label: 'Schlechteste' },
  { value: 'newest', label: 'Neueste' },
  { value: 'duration-desc', label: 'Längste' },
  { value: 'duration-asc', label: 'Kürzeste' },
  { value: 'random', label: 'Zufall' },
];

@Injectable({ providedIn: 'root' })
export class SoundLibraryService {
  private readonly http = inject(HttpClient);
  private readonly tagService = inject(TagService);
  private readonly favoritesService = inject(FavoritesService);
  private readonly recordingStorage = inject(RecordingStorageService);
  private loadedSounds = new Map<string, AudioBuffer>();

  readonly isLanMode = signal(!!environment.nervboxApi);
  readonly isLoading = signal(false);

  // Core data
  sounds = signal<SoundLibraryItem[]>([]);
  categories = signal<readonly SoundCategory[]>(SOUND_CATEGORIES);

  // Filters
  selectedCategory = signal<SoundCategory>('All');
  searchTerm = signal<string>('');
  selectedTags = signal<string[]>([]);
  showFavoritesOnly = signal(false);

  // Sorting
  sortOption = signal<SortOption>('plays-desc');
  private randomSeed = signal(Math.random());

  // Tab-Umschaltung (nur LAN-Modus relevant)
  readonly activeTab = signal<'nervbox' | 'instruments'>('nervbox');

  // Instrument-spezifische Filter
  readonly instrumentCategory = signal<InstrumentCategory>('All');
  readonly instrumentSearchTerm = signal<string>('');
  readonly instrumentCategories = signal<readonly InstrumentCategory[]>(INSTRUMENT_CATEGORIES);

  // Computed filtered and sorted sounds
  readonly filteredSounds = computed(() => {
    let result = this.sounds();
    const search = this.searchTerm().toLowerCase();
    const selectedTags = this.selectedTags();
    const category = this.selectedCategory();
    const isLan = this.isLanMode();
    const favOnly = this.showFavoritesOnly();

    // 1. Category filter (for local mode compatibility)
    if (category !== 'All' && !isLan) {
      result = result.filter(s => s.category === category);
    }

    // 2. Multi-Tag filter (OR logic) - only in LAN mode when tags selected
    if (isLan && selectedTags.length > 0) {
      result = result.filter(sound =>
        selectedTags.some(tag => sound.tags?.includes(tag))
      );
    }

    // 3. Search filter
    if (search) {
      result = result.filter(sound =>
        sound.name.toLowerCase().includes(search) ||
        sound.tags?.some(tag => tag.toLowerCase().includes(search)) ||
        sound.category.toLowerCase().includes(search)
      );
    }

    // 4. Favorites filter
    if (favOnly && isLan) {
      result = result.filter(s => this.favoritesService.isFavorite(s.id));
    }

    // 5. Apply sorting
    return this.applySorting(result);
  });

  // Computed: Gefilterte Instrumente (für Instrument-Tab)
  readonly filteredInstruments = computed(() => {
    let result = [...INSTRUMENT_LIBRARY];
    const category = this.instrumentCategory();
    const search = this.instrumentSearchTerm().toLowerCase();

    // 1. Kategorie-Filter
    if (category !== 'All') {
      result = result.filter((s) => s.category === category);
    }

    // 2. Suche
    if (search) {
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(search) ||
          s.category.toLowerCase().includes(search)
      );
    }

    // Alphabetisch sortieren
    return result.sort((a, b) => a.name.localeCompare(b.name, 'de'));
  });

  // Computed: Anzuzeigende Sounds basierend auf aktivem Tab
  readonly displayedSounds = computed(() => {
    if (!this.isLanMode()) {
      return this.filteredSounds();
    }
    return this.activeTab() === 'instruments'
      ? this.filteredInstruments()
      : this.filteredSounds();
  });

  // Computed: Prüft ob aktuell Instrumente angezeigt werden
  readonly isShowingInstruments = computed(() => {
    return this.isLanMode() && this.activeTab() === 'instruments';
  });

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

  private async initializeSounds(): Promise<void> {
    this.isLoading.set(true);

    if (environment.nervboxApi) {
      // Load tags and favorites in parallel
      await Promise.all([
        this.loadFromApi(),
        this.tagService.loadTags(),
        this.favoritesService.loadFavorites(),
      ]);
    } else {
      this.sounds.set(SOUND_LIBRARY);
    }

    this.isLoading.set(false);
  }

  /** Wait for sounds to be loaded (for URL parameter loading) */
  async waitForSounds(): Promise<void> {
    if (!this.isLoading()) {
      return;
    }

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

      // Map API sounds to SoundLibraryItem with extended fields
      const mappedSounds: SoundLibraryItem[] = apiSounds.map(s => ({
        id: s.hash,
        name: s.name,
        category: s.tags?.[0] || 'uncategorized',
        filename: s.fileName,
        duration: s.durationMs / 1000,
        tags: s.tags,
        playCount: s.playCount,
        upVotes: s.upVotes,
        downVotes: s.downVotes,
        score: s.score,
        createdAt: s.createdAt,
      }));

      this.sounds.set(mappedSounds);

      // Extract unique tags as categories for backwards compatibility
      const allTags = new Set<string>(['All']);
      apiSounds.forEach(s => s.tags?.forEach(tag => allTags.add(tag)));
      this.categories.set(Array.from(allTags).sort() as SoundCategory[]);

    } catch (error) {
      console.error('Failed to load sounds from API:', error);
      this.sounds.set(SOUND_LIBRARY);
    }
  }

  private applySorting(sounds: SoundLibraryItem[]): SoundLibraryItem[] {
    const sorted = [...sounds];
    const option = this.sortOption();

    switch (option) {
      case 'name-asc':
        return sorted.sort((a, b) => a.name.localeCompare(b.name, 'de'));

      case 'name-desc':
        return sorted.sort((a, b) => b.name.localeCompare(a.name, 'de'));

      case 'plays-desc':
        return sorted.sort((a, b) => (b.playCount ?? 0) - (a.playCount ?? 0));

      case 'votes-desc':
        return sorted.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

      case 'votes-asc':
        return sorted.sort((a, b) => (a.score ?? 0) - (b.score ?? 0));

      case 'newest':
        return sorted.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });

      case 'duration-desc':
        return sorted.sort((a, b) => (b.duration ?? 0) - (a.duration ?? 0));

      case 'duration-asc':
        return sorted.sort((a, b) => (a.duration ?? 0) - (b.duration ?? 0));

      case 'random':
        return this.seededShuffle(sorted, this.randomSeed());

      default:
        return sorted;
    }
  }

  // Deterministic shuffle based on seed (stable random order)
  private seededShuffle<T>(array: T[], seed: number): T[] {
    const result = [...array];
    let currentIndex = result.length;

    // Simple seeded random
    const seededRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    while (currentIndex > 0) {
      const randomIndex = Math.floor(seededRandom() * currentIndex);
      currentIndex--;
      [result[currentIndex], result[randomIndex]] = [result[randomIndex], result[currentIndex]];
    }

    return result;
  }

  // Public methods for updating filters

  setCategory(category: SoundCategory): void {
    this.selectedCategory.set(category);
  }

  setSearchTerm(term: string): void {
    this.searchTerm.set(term);
  }

  setSortOption(option: SortOption): void {
    // Reseed random when switching to random sort
    if (option === 'random') {
      this.randomSeed.set(Math.random());
    }
    this.sortOption.set(option);
  }

  toggleTag(tag: string): void {
    const current = this.selectedTags();
    if (current.includes(tag)) {
      this.selectedTags.set(current.filter(t => t !== tag));
    } else {
      this.selectedTags.set([...current, tag]);
    }
  }

  clearTags(): void {
    this.selectedTags.set([]);
  }

  setShowFavoritesOnly(show: boolean): void {
    this.showFavoritesOnly.set(show);
  }

  toggleFavoritesOnly(): void {
    this.showFavoritesOnly.update(v => !v);
  }

  // Tab-Methoden (LAN-Modus)

  setActiveTab(tab: 'nervbox' | 'instruments'): void {
    this.activeTab.set(tab);
  }

  setInstrumentCategory(category: InstrumentCategory): void {
    this.instrumentCategory.set(category);
  }

  setInstrumentSearchTerm(term: string): void {
    this.instrumentSearchTerm.set(term);
  }

  // Sound loading

  async loadSound(soundId: string): Promise<AudioBuffer | null> {
    // Check cache first
    if (this.loadedSounds.has(soundId)) {
      return this.loadedSounds.get(soundId)!;
    }

    // Handle recordings from IndexedDB
    if (this.recordingStorage.isRecordingId(soundId)) {
      try {
        const audioBuffer = await this.recordingStorage.loadRecording(
          soundId,
          this.audio.audioContext
        );
        if (audioBuffer) {
          this.loadedSounds.set(soundId, audioBuffer);
        }
        return audioBuffer;
      } catch (error) {
        console.error(`Error loading recording ${soundId}:`, error);
        return null;
      }
    }

    // Prüfe ob es ein Instrument-Sound ist (lokal, statisch)
    const instrumentSound = INSTRUMENT_LIBRARY.find((s) => s.id === soundId);
    if (instrumentSound) {
      return this.loadInstrumentSound(instrumentSound);
    }

    // Handle sounds from API (Nervbox)
    const sound = this.sounds().find((s) => s.id === soundId);
    if (!sound) return null;

    try {
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

      this.loadedSounds.set(soundId, audioBuffer);

      // Update duration in the sound library
      this.sounds.update((sounds) =>
        sounds.map((s) => (s.id === soundId ? { ...s, duration: audioBuffer.duration } : s))
      );

      return audioBuffer;
    } catch (error) {
      console.error(`Error loading sound ${sound.filename}:`, error);
      return null;
    }
  }

  // Instrument-Sounds aus lokalen Assets laden
  private async loadInstrumentSound(sound: SoundLibraryItem): Promise<AudioBuffer | null> {
    try {
      // Instrumente werden aus assets/instruments/ geladen (relativ zu base href)
      const url = `assets/instruments/${sound.filename}`;

      const response = await fetch(url);
      if (!response.ok) {
        console.error(`Failed to load instrument sound: ${sound.filename}`);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audio.audioContext.decodeAudioData(arrayBuffer);

      this.loadedSounds.set(sound.id, audioBuffer);
      return audioBuffer;
    } catch (error) {
      console.error(`Error loading instrument sound ${sound.filename}:`, error);
      return null;
    }
  }

  async preloadSounds(soundIds: string[]): Promise<void> {
    const promises = soundIds.map(id => this.loadSound(id));
    await Promise.allSettled(promises);
  }

  async preloadEssentials(): Promise<void> {
    const essentials = [
      'kick-808', 'kick-trap',
      'snare-trap', 'snare-clap',
      'hihat-closed', 'hihat-open',
      'bass-808-long', 'bass-808-short'
    ];
    await this.preloadSounds(essentials);
  }
}
