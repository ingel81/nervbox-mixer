import { Component, EventEmitter, Input, Output, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { SoundLibraryService, SORT_OPTIONS, SortOption } from '../services/sound-library.service';
import { InstrumentCategory } from '../../shared/utils/instrument-library';
import { SoundLibraryItem } from '../../shared/utils/sound-library';
import { TagService } from '../../../core/services/tag.service';
import { FavoritesService } from '../../../core/services/favorites.service';

@Component({
  selector: 'sound-browser',
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDividerModule,
    MatBadgeModule,
    MatButtonToggleModule,
    ScrollingModule,
  ],
  template: `
    <div class="sound-browser"
         [class.cta-position]="openedFromCta"
         [class.panel-mode]="panelMode">

      <!-- Panel Mode Header (simplified) -->
      <div class="panel-header" *ngIf="panelMode">
        <!-- Tab Toggle (LAN mode) -->
        <div class="source-toggle" *ngIf="libraryService.isLanMode()">
          <button class="toggle-btn"
                  [class.active]="libraryService.activeTab() === 'nervbox'"
                  (click)="onTabChange('nervbox')">
            <mat-icon>cloud</mat-icon>
            <span class="toggle-label">Nervbox</span>
          </button>
          <button class="toggle-btn"
                  [class.active]="libraryService.activeTab() === 'instruments'"
                  (click)="onTabChange('instruments')">
            <mat-icon>piano</mat-icon>
            <span class="toggle-label">Instrumente</span>
          </button>
        </div>

        <!-- Search -->
        <div class="search-box">
          <mat-icon class="search-icon">search</mat-icon>
          <input type="text"
                 class="search-input"
                 placeholder="Suchen..."
                 [value]="currentSearchTerm()"
                 (input)="onSearchChange($event)">
          <button class="clear-btn"
                  *ngIf="currentSearchTerm()"
                  (click)="clearSearch()"
                  matTooltip="Suche leeren">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <!-- Sort Dropdown (LAN mode, Nervbox tab only) -->
        <div class="sort-dropdown" *ngIf="libraryService.isLanMode() && !libraryService.isShowingInstruments()">
          <mat-icon class="sort-icon">sort</mat-icon>
          <mat-select [value]="libraryService.sortOption()"
                      (selectionChange)="onSortChange($event.value)"
                      panelClass="sort-panel">
            <mat-option *ngFor="let opt of sortOptions" [value]="opt.value">
              {{ opt.label }}
            </mat-option>
          </mat-select>
        </div>

        <!-- Instrument Category Filter (LAN mode, Instruments tab) -->
        <div class="category-dropdown" *ngIf="libraryService.isShowingInstruments()">
          <mat-icon class="category-icon">piano</mat-icon>
          <mat-select [value]="libraryService.instrumentCategory()"
                      (selectionChange)="onInstrumentCategoryChange($event.value)"
                      panelClass="category-panel">
            <mat-option *ngFor="let cat of libraryService.instrumentCategories()" [value]="cat">
              {{ cat }}
            </mat-option>
          </mat-select>
        </div>

        <!-- Favorites Toggle (LAN mode + authenticated, Nervbox only) -->
        <button class="fav-toggle"
                *ngIf="libraryService.isLanMode() && favoritesService.isAuthenticated() && !libraryService.isShowingInstruments()"
                [class.active]="libraryService.showFavoritesOnly()"
                (click)="toggleFavoritesFilter()"
                [matTooltip]="libraryService.showFavoritesOnly() ? 'Alle anzeigen' : 'Nur Favoriten'">
          <mat-icon>{{ libraryService.showFavoritesOnly() ? 'favorite' : 'favorite_border' }}</mat-icon>
        </button>

        <!-- Tag Filter Menu (LAN mode, Nervbox only) -->
        <button class="tag-menu-trigger"
                *ngIf="libraryService.isLanMode() && !libraryService.isShowingInstruments()"
                [matMenuTriggerFor]="tagMenuPanel"
                [matBadge]="selectedTagCount() || null"
                [matBadgeHidden]="selectedTagCount() === 0"
                matBadgeColor="accent"
                matBadgeSize="small"
                matTooltip="Tags filtern">
          <mat-icon>label</mat-icon>
          <mat-icon class="dropdown-arrow">arrow_drop_down</mat-icon>
        </button>

        <mat-menu #tagMenuPanel="matMenu" class="tag-menu">
          <div class="tag-menu-content" (click)="$event.stopPropagation()">
            <button mat-button class="clear-tags-btn" *ngIf="selectedTagCount() > 0" (click)="clearTags()">
              <mat-icon>clear_all</mat-icon> Alle entfernen
            </button>
            <mat-divider *ngIf="selectedTagCount() > 0"></mat-divider>
            <div class="tag-section" *ngIf="pinnedTags().length > 0">
              <div class="section-label">Gepinnt</div>
              <div class="tag-chips">
                <button *ngFor="let tag of pinnedTags()" class="tag-chip pinned"
                        [class.selected]="isTagSelected(tag)" [style.--tag-color]="getTagColor(tag)" (click)="toggleTag(tag)">
                  <mat-icon class="pin-icon">push_pin</mat-icon>
                  <span class="tag-dot" [style.background]="getTagColor(tag)"></span>
                  #{{ tag }}
                </button>
              </div>
            </div>
            <mat-divider *ngIf="pinnedTags().length > 0 && otherTags().length > 0"></mat-divider>
            <div class="tag-section" *ngIf="otherTags().length > 0">
              <div class="section-label" *ngIf="pinnedTags().length > 0">Weitere</div>
              <div class="tag-chips">
                <button *ngFor="let tag of otherTags()" class="tag-chip"
                        [class.selected]="isTagSelected(tag)" [style.--tag-color]="getTagColor(tag)" (click)="toggleTag(tag)">
                  <span class="tag-dot" [style.background]="getTagColor(tag)"></span>
                  #{{ tag }}
                </button>
              </div>
            </div>
          </div>
        </mat-menu>
      </div>

      <!-- Compact Header with all controls in one row -->
      <div class="browser-header"
           *ngIf="!panelMode"
           (mousedown)="onHeaderMouseDown($event)">

        <!-- Tab Toggle (LAN mode) -->
        <div class="source-toggle" *ngIf="libraryService.isLanMode()">
          <button class="toggle-btn"
                  [class.active]="libraryService.activeTab() === 'nervbox'"
                  (click)="onTabChange('nervbox')">
            <mat-icon>cloud</mat-icon>
            <span class="toggle-label">Nervbox</span>
          </button>
          <button class="toggle-btn"
                  [class.active]="libraryService.activeTab() === 'instruments'"
                  (click)="onTabChange('instruments')">
            <mat-icon>piano</mat-icon>
            <span class="toggle-label">Instrumente</span>
          </button>
        </div>

        <!-- Search -->
        <div class="search-box">
          <mat-icon class="search-icon">search</mat-icon>
          <input type="text"
                 class="search-input"
                 placeholder="Suchen..."
                 [value]="currentSearchTerm()"
                 (input)="onSearchChange($event)">
          <button class="clear-btn"
                  *ngIf="currentSearchTerm()"
                  (click)="clearSearch()"
                  matTooltip="Suche leeren">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <!-- Sort Dropdown (LAN mode, Nervbox only) -->
        <div class="sort-dropdown" *ngIf="libraryService.isLanMode() && !libraryService.isShowingInstruments()">
          <mat-icon class="sort-icon">sort</mat-icon>
          <mat-select [value]="libraryService.sortOption()"
                      (selectionChange)="onSortChange($event.value)"
                      panelClass="sort-panel">
            <mat-option *ngFor="let opt of sortOptions" [value]="opt.value">
              {{ opt.label }}
            </mat-option>
          </mat-select>
        </div>

        <!-- Instrument Category Filter (LAN mode, Instruments tab) -->
        <div class="category-dropdown" *ngIf="libraryService.isShowingInstruments()">
          <mat-icon class="category-icon">piano</mat-icon>
          <mat-select [value]="libraryService.instrumentCategory()"
                      (selectionChange)="onInstrumentCategoryChange($event.value)"
                      panelClass="category-panel">
            <mat-option *ngFor="let cat of libraryService.instrumentCategories()" [value]="cat">
              {{ cat }}
            </mat-option>
          </mat-select>
        </div>

        <!-- Favorites Toggle (LAN mode + authenticated, Nervbox only) -->
        <button class="fav-toggle"
                *ngIf="libraryService.isLanMode() && favoritesService.isAuthenticated() && !libraryService.isShowingInstruments()"
                [class.active]="libraryService.showFavoritesOnly()"
                (click)="toggleFavoritesFilter()"
                [matTooltip]="libraryService.showFavoritesOnly() ? 'Alle anzeigen' : 'Nur Favoriten'">
          <mat-icon>{{ libraryService.showFavoritesOnly() ? 'favorite' : 'favorite_border' }}</mat-icon>
        </button>

        <!-- Tag Filter Menu (LAN mode, Nervbox only) -->
        <button class="tag-menu-trigger"
                *ngIf="libraryService.isLanMode() && !libraryService.isShowingInstruments()"
                [matMenuTriggerFor]="tagMenu"
                [matBadge]="selectedTagCount() || null"
                [matBadgeHidden]="selectedTagCount() === 0"
                matBadgeColor="accent"
                matBadgeSize="small"
                matTooltip="Tags filtern">
          <mat-icon>label</mat-icon>
          <mat-icon class="dropdown-arrow">arrow_drop_down</mat-icon>
        </button>

        <mat-menu #tagMenu="matMenu" class="tag-menu">
          <div class="tag-menu-content" (click)="$event.stopPropagation()">
            <!-- Clear all button -->
            <button mat-button
                    class="clear-tags-btn"
                    *ngIf="selectedTagCount() > 0"
                    (click)="clearTags()">
              <mat-icon>clear_all</mat-icon>
              Alle entfernen
            </button>

            <mat-divider *ngIf="selectedTagCount() > 0"></mat-divider>

            <!-- Pinned Tags -->
            <div class="tag-section" *ngIf="pinnedTags().length > 0">
              <div class="section-label">Gepinnt</div>
              <div class="tag-chips">
                <button *ngFor="let tag of pinnedTags()"
                        class="tag-chip pinned"
                        [class.selected]="isTagSelected(tag)"
                        [style.--tag-color]="getTagColor(tag)"
                        (click)="toggleTag(tag)">
                  <mat-icon class="pin-icon">push_pin</mat-icon>
                  <span class="tag-dot" [style.background]="getTagColor(tag)"></span>
                  #{{ tag }}
                </button>
              </div>
            </div>

            <mat-divider *ngIf="pinnedTags().length > 0 && otherTags().length > 0"></mat-divider>

            <!-- Other Tags -->
            <div class="tag-section" *ngIf="otherTags().length > 0">
              <div class="section-label" *ngIf="pinnedTags().length > 0">Weitere</div>
              <div class="tag-chips">
                <button *ngFor="let tag of otherTags()"
                        class="tag-chip"
                        [class.selected]="isTagSelected(tag)"
                        [style.--tag-color]="getTagColor(tag)"
                        (click)="toggleTag(tag)">
                  <span class="tag-dot" [style.background]="getTagColor(tag)"></span>
                  #{{ tag }}
                </button>
              </div>
            </div>
          </div>
        </mat-menu>

        <!-- Spacer -->
        <div class="header-spacer"></div>

        <!-- Close Button -->
        <button class="close-btn" (click)="toggleBrowser()" matTooltip="Schließen">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Sound List with Virtual Scrolling -->
      <cdk-virtual-scroll-viewport [itemSize]="72" class="sound-list">
        <div class="sound-item"
             *cdkVirtualFor="let sound of libraryService.displayedSounds(); trackBy: trackByHash"
             [class.instrument]="libraryService.isShowingInstruments()"
             [class.loading]="loadingStates[sound.id]"
             [class.dragging]="currentDraggedSound?.id === sound.id"
             [class.desktop-mode]="!isTouchDevice"
             (pointerdown)="onSoundItemPointerDown($event, sound)">

          <div class="sound-info">
            <div class="sound-name">{{ sound.name }}</div>
            <div class="sound-meta">
              <!-- Kategorie-Badge nur bei Instrumenten -->
              <span class="category-badge" *ngIf="libraryService.isShowingInstruments()">{{ sound.category }}</span>
              <span class="duration" *ngIf="sound.duration">
                {{ formatDuration(sound.duration) }}
              </span>
              <!-- Play-Count nur bei Nervbox -->
              <span class="play-count" *ngIf="sound.playCount && !libraryService.isShowingInstruments()">
                <mat-icon class="meta-icon">play_arrow</mat-icon>
                {{ sound.playCount }}
              </span>
            </div>
            <!-- Colored Tags (nur bei Nervbox) -->
            <div class="sound-tags" *ngIf="!libraryService.isShowingInstruments() && sound.tags && sound.tags.length > 0">
              <span class="tag"
                    *ngFor="let tag of getVisibleTags(sound.tags)"
                    [style.background]="getTagBackground(tag)"
                    [style.border-color]="getTagColor(tag)">
                #{{ tag }}
              </span>
              <span class="tag-more"
                    *ngIf="sound.tags.length > 2"
                    [matTooltip]="getHiddenTagsTooltip(sound.tags)">
                +{{ sound.tags.length - 2 }}
              </span>
            </div>
          </div>

          <!-- Vote Score (nur bei Nervbox) -->
          <div class="vote-score"
               *ngIf="!libraryService.isShowingInstruments() && sound.score !== undefined"
               [class.positive]="sound.score > 0"
               [class.negative]="sound.score < 0"
               matTooltip="Bewertung: {{ sound.upVotes ?? 0 }} up / {{ sound.downVotes ?? 0 }} down">
            {{ sound.score }}
          </div>

          <div class="sound-actions">
            <!-- Favorite Button (nur bei Nervbox) -->
            <button mat-icon-button
                    class="favorite-btn"
                    *ngIf="!libraryService.isShowingInstruments() && favoritesService.isAuthenticated()"
                    [class.is-favorite]="isFavorite(sound.id)"
                    (click)="$event.stopPropagation(); toggleFavorite(sound.id)"
                    [matTooltip]="isFavorite(sound.id) ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'">
              <mat-icon>{{ isFavorite(sound.id) ? 'favorite' : 'favorite_border' }}</mat-icon>
            </button>

            <!-- Drag Handle (Mobile only) -->
            <button mat-icon-button
                    class="drag-btn"
                    *ngIf="isTouchDevice"
                    (pointerdown)="onDragAnchorPointerDown($event, sound)"
                    [disabled]="loadingStates[sound.id]"
                    matTooltip="In Timeline ziehen">
              <mat-icon>drag_indicator</mat-icon>
            </button>

            <!-- Preview Button -->
            <button mat-icon-button
                    class="play-btn"
                    (click)="$event.stopPropagation(); isPlaying(sound) ? stopPreview() : previewSound(sound)"
                    [disabled]="loadingStates[sound.id]"
                    [matTooltip]="isPlaying(sound) ? 'Stoppen' : 'Anhören'">
              <mat-icon *ngIf="!loadingStates[sound.id] && !isPlaying(sound)">play_arrow</mat-icon>
              <mat-icon *ngIf="!loadingStates[sound.id] && isPlaying(sound)">stop</mat-icon>
              <mat-progress-spinner *ngIf="loadingStates[sound.id]"
                                   diameter="20"
                                   mode="indeterminate">
              </mat-progress-spinner>
            </button>

            <!-- Add Button -->
            <button mat-icon-button
                      class="add-btn"
                      (click)="$event.stopPropagation(); addSoundToProject(sound)"
                      [disabled]="loadingStates[sound.id]"
                      matTooltip="Zum Projekt hinzufügen">
                <mat-icon>add</mat-icon>
            </button>
          </div>
        </div>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="libraryService.displayedSounds().length === 0">
          <mat-icon>{{ libraryService.isShowingInstruments() ? 'piano' : 'library_music' }}</mat-icon>
          <p>{{ libraryService.isShowingInstruments() ? 'Keine Instrumente gefunden' : 'Keine Sounds gefunden' }}</p>
          <button mat-button
                  *ngIf="hasActiveFilters() && !libraryService.isShowingInstruments()"
                  (click)="clearAllFilters()">
            Filter zurücksetzen
          </button>
        </div>
      </cdk-virtual-scroll-viewport>
    </div>
  `,
  styleUrls: ['./sound-browser.component.css'],
})
export class SoundBrowserComponent {
  @Input() openedFromCta = false;
  @Input() panelMode = false;
  @Output() soundSelected = new EventEmitter<AudioBuffer & { name: string; category: string; id: string }>();
  @Output() browserToggled = new EventEmitter<void>();
  @Output() soundDragStarted = new EventEmitter<{ sound: SoundLibraryItem; buffer: AudioBuffer; position: { x: number; y: number } }>();

  readonly libraryService = inject(SoundLibraryService);
  readonly tagService = inject(TagService);
  readonly favoritesService = inject(FavoritesService);

  readonly sortOptions = SORT_OPTIONS;

  // Computed: Aktueller Suchterm je nach Tab
  readonly currentSearchTerm = computed(() =>
    this.libraryService.isShowingInstruments()
      ? this.libraryService.instrumentSearchTerm()
      : this.libraryService.searchTerm()
  );

  loadingStates: Record<string, boolean> = {};

  // Window drag state
  isWindowDragging = false;
  windowDragOffset = { x: 0, y: 0 };

  // Sound drag state
  isDraggingSound = false;
  currentDraggedSound?: SoundLibraryItem;

  // Touch device detection
  isTouchDevice = this.detectTouchDevice();

  // Computed values for tags
  readonly pinnedTags = computed(() => this.tagService.pinnedTagNames());
  readonly otherTags = computed(() => {
    const pinned = this.pinnedTags();
    return this.libraryService.availableTags().filter(t => !pinned.includes(t));
  });
  readonly selectedTagCount = computed(() => this.libraryService.selectedTags().length);

  private detectTouchDevice(): boolean {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    );
  }

  trackByHash(_index: number, sound: SoundLibraryItem): string {
    return sound.id;
  }

  // Tag methods
  getTagColor(tagName: string): string {
    return this.tagService.getTagColor(tagName);
  }

  getTagBackground(tagName: string): string {
    const color = this.getTagColor(tagName);
    return `${color}20`; // 20 = 12.5% opacity in hex
  }

  getVisibleTags(tags: string[]): string[] {
    return tags.slice(0, 2);
  }

  getHiddenTagsTooltip(tags: string[]): string {
    return tags.slice(2).map(t => '#' + t).join(', ');
  }

  isTagSelected(tag: string): boolean {
    return this.libraryService.selectedTags().includes(tag);
  }

  toggleTag(tag: string): void {
    this.libraryService.toggleTag(tag);
  }

  clearTags(): void {
    this.libraryService.clearTags();
  }

  // Favorites methods
  isFavorite(hash: string): boolean {
    return this.favoritesService.isFavorite(hash);
  }

  toggleFavorite(hash: string): void {
    this.favoritesService.toggleFavorite(hash);
  }

  toggleFavoritesFilter(): void {
    this.libraryService.toggleFavoritesOnly();
  }

  // Sort method
  onSortChange(option: SortOption): void {
    this.libraryService.setSortOption(option);
  }

  // Tab-Wechsel (LAN-Modus)
  onTabChange(tab: 'nervbox' | 'instruments'): void {
    this.libraryService.setActiveTab(tab);
  }

  // Instrument-Kategorie ändern
  onInstrumentCategoryChange(category: InstrumentCategory): void {
    this.libraryService.setInstrumentCategory(category);
  }

  // Search methods
  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (this.libraryService.isShowingInstruments()) {
      this.libraryService.setInstrumentSearchTerm(target.value);
    } else {
      this.libraryService.setSearchTerm(target.value);
    }
  }

  clearSearch(): void {
    if (this.libraryService.isShowingInstruments()) {
      this.libraryService.setInstrumentSearchTerm('');
    } else {
      this.libraryService.setSearchTerm('');
    }
  }

  // Filter helpers
  hasActiveFilters(): boolean {
    return (
      this.libraryService.searchTerm() !== '' ||
      this.libraryService.selectedTags().length > 0 ||
      this.libraryService.showFavoritesOnly()
    );
  }

  clearAllFilters(): void {
    this.libraryService.setSearchTerm('');
    this.libraryService.clearTags();
    this.libraryService.setShowFavoritesOnly(false);
  }

  toggleBrowser(): void {
    this.browserToggled.emit();
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Preview playback
  private currentPreview?: AudioBufferSourceNode;
  currentPreviewSound?: SoundLibraryItem;

  async previewSound(sound: SoundLibraryItem): Promise<void> {
    this.stopPreview();
    this.loadingStates[sound.id] = true;

    try {
      const buffer = await this.libraryService.loadSound(sound.id);
      if (buffer) {
        const audioContext = this.libraryService.audio.audioContext;
        const source = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();

        source.buffer = buffer;
        gainNode.gain.value = 0.7;

        source.connect(gainNode).connect(audioContext.destination);
        source.start();

        this.currentPreview = source;
        this.currentPreviewSound = sound;

        source.onended = () => {
          if (this.currentPreview === source) {
            this.currentPreview = undefined;
            this.currentPreviewSound = undefined;
          }
        };
      }
    } catch (error) {
      console.error('Failed to preview sound:', error);
    } finally {
      this.loadingStates[sound.id] = false;
    }
  }

  stopPreview(): void {
    if (this.currentPreview) {
      try {
        this.currentPreview.stop();
      } catch {
        // Already stopped
      }
      this.currentPreview = undefined;
      this.currentPreviewSound = undefined;
    }
  }

  isPlaying(sound: SoundLibraryItem): boolean {
    return this.currentPreviewSound?.id === sound.id && !!this.currentPreview;
  }

  async addSoundToProject(sound: SoundLibraryItem): Promise<void> {
    this.loadingStates[sound.id] = true;

    try {
      const buffer = await this.libraryService.loadSound(sound.id);
      if (buffer) {
        this.soundSelected.emit(Object.assign(buffer, {
          name: sound.name,
          category: sound.category,
          id: sound.id,
        }));
      }
    } catch (error) {
      console.error('Failed to load sound:', error);
    } finally {
      this.loadingStates[sound.id] = false;
    }
  }

  // Drag handling
  onSoundItemPointerDown(event: PointerEvent, sound: SoundLibraryItem): void {
    if (this.isTouchDevice) return;
    if ((event.target as HTMLElement).closest('button')) return;
    this.startDragOperation(event, sound, false);
  }

  onDragAnchorPointerDown(event: PointerEvent, sound: SoundLibraryItem): void {
    event.preventDefault();
    event.stopPropagation();
    this.startDragOperation(event, sound, true);
  }

  private startDragOperation(event: PointerEvent, sound: SoundLibraryItem, immediate: boolean): void {
    const target = event.target as HTMLElement;
    target.setPointerCapture(event.pointerId);

    const startPos = { x: event.clientX, y: event.clientY };
    let isDragStarted = immediate;

    if (immediate) {
      this.currentDraggedSound = sound;
      this.isDraggingSound = true;
      document.body.style.cursor = 'grabbing';
      this.loadAndStartDrag(sound, startPos);
    } else {
      this.currentDraggedSound = sound;
    }

    const pointerMoveHandler = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== event.pointerId) return;

      if (!isDragStarted && !immediate) {
        const deltaX = Math.abs(moveEvent.clientX - startPos.x);
        const deltaY = Math.abs(moveEvent.clientY - startPos.y);

        if (deltaX > 5 || deltaY > 5) {
          isDragStarted = true;
          this.isDraggingSound = true;
          document.body.style.cursor = 'grabbing';
          this.loadAndStartDrag(sound, { x: moveEvent.clientX, y: moveEvent.clientY });
        }
      }

      if (isDragStarted) {
        this.onSoundPointerMove(moveEvent);
      }
    };

    const pointerUpHandler = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== event.pointerId) return;

      document.removeEventListener('pointermove', pointerMoveHandler);
      document.removeEventListener('pointerup', pointerUpHandler);
      document.removeEventListener('pointercancel', pointerUpHandler);

      try {
        target.releasePointerCapture(upEvent.pointerId);
      } catch {
        // Ignore
      }

      if (!isDragStarted && !immediate) {
        this.addSoundToProject(sound);
      } else if (isDragStarted) {
        this.onSoundPointerUp(upEvent);
      }

      this.currentDraggedSound = undefined;
    };

    document.addEventListener('pointermove', pointerMoveHandler, { passive: false });
    document.addEventListener('pointerup', pointerUpHandler);
    document.addEventListener('pointercancel', pointerUpHandler);
  }

  private onSoundPointerMove = (event: PointerEvent) => {
    if (!this.isDraggingSound || !this.currentDraggedSound) return;
    event.preventDefault();

    document.dispatchEvent(new CustomEvent('soundDragMove', {
      detail: { position: { x: event.clientX, y: event.clientY }, sound: this.currentDraggedSound },
    }));
  };

  private onSoundPointerUp = (event: PointerEvent) => {
    if (!this.isDraggingSound || !this.currentDraggedSound) return;

    document.dispatchEvent(new CustomEvent('soundDragEnd', {
      detail: {
        position: { x: event.clientX, y: event.clientY },
        sound: this.currentDraggedSound,
      },
    }));

    this.endSoundDrag();
  };

  private async loadAndStartDrag(sound: SoundLibraryItem, position: { x: number; y: number }): Promise<void> {
    try {
      this.loadingStates[sound.id] = true;
      const buffer = await this.libraryService.loadSound(sound.id);

      if (buffer && this.isDraggingSound) {
        document.dispatchEvent(new CustomEvent('soundDragStart', {
          detail: {
            sound: { id: sound.id, name: sound.name, category: sound.category },
            buffer,
            position,
          },
        }));

        this.soundDragStarted.emit({ sound, buffer, position });
      }
    } catch (error) {
      console.error('Failed to load sound for drag:', error);
    } finally {
      this.loadingStates[sound.id] = false;
    }
  }

  private endSoundDrag(): void {
    this.isDraggingSound = false;
    this.currentDraggedSound = undefined;
    document.body.style.cursor = 'auto';
  }

  // Window dragging
  onHeaderMouseDown(event: MouseEvent): void {
    if ((event.target as HTMLElement).closest('button, mat-select, input, .tag-menu-trigger')) return;
    if (this.isDraggingSound) return;

    this.isWindowDragging = true;
    const rect = (event.currentTarget as HTMLElement).closest('.sound-browser')!.getBoundingClientRect();
    this.windowDragOffset = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    document.addEventListener('mousemove', this.onWindowMouseMove);
    document.addEventListener('mouseup', this.onWindowMouseUp);
    event.preventDefault();
  }

  private onWindowMouseMove = (event: MouseEvent) => {
    if (!this.isWindowDragging) return;

    const soundBrowser = document.querySelector('.sound-browser') as HTMLElement;
    if (!soundBrowser) return;

    const newX = Math.max(0, Math.min(window.innerWidth - soundBrowser.offsetWidth, event.clientX - this.windowDragOffset.x));
    const newY = Math.max(0, Math.min(window.innerHeight - soundBrowser.offsetHeight, event.clientY - this.windowDragOffset.y));

    soundBrowser.style.left = `${newX}px`;
    soundBrowser.style.top = `${newY}px`;
    soundBrowser.style.right = 'auto';
  };

  private onWindowMouseUp = () => {
    this.isWindowDragging = false;
    document.removeEventListener('mousemove', this.onWindowMouseMove);
    document.removeEventListener('mouseup', this.onWindowMouseUp);
  };
}
