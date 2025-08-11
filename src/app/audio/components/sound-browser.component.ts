import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SoundLibraryService } from '../services/sound-library.service';
import { SoundLibraryItem, SoundCategory } from '../utils/sound-library';

@Component({
    selector: 'sound-browser',
    imports: [
        CommonModule, FormsModule, MatButtonModule, MatIconModule,
        MatInputModule, MatChipsModule, MatProgressSpinnerModule, MatTooltipModule
    ],
    template: `
    <div class="sound-browser" 
         [class.cta-position]="openedFromCta" 
         [class.panel-mode]="panelMode">
      <div class="browser-header" 
           *ngIf="!panelMode"
           (mousedown)="onHeaderMouseDown($event)">
        <h3>Sound Library</h3>
        <button (click)="toggleBrowser()" class="close-btn">×</button>
      </div>

      <!-- Search -->
      <div class="search-section">
        <div class="search-container">
          <input type="text" 
                 class="search-input"
                 placeholder="Search..." 
                 [value]="libraryService.searchTerm()"
                 (input)="onSearchChange($event)">
          <button class="clear-search-btn" 
                  *ngIf="libraryService.searchTerm()"
                  (click)="clearSearch()"
                  matTooltip="Clear search">
            <mat-icon>clear</mat-icon>
          </button>
        </div>
      </div>

      <!-- Categories -->
      <div class="categories">
        <mat-chip-listbox class="category-chips">
          <mat-chip-option 
            *ngFor="let category of libraryService.categories()"
            [selected]="libraryService.selectedCategory() === category"
            (click)="selectCategory(category)">
            {{ category }}
          </mat-chip-option>
        </mat-chip-listbox>
      </div>

      <!-- Sound List -->
      <div class="sound-list">
        <div class="sound-item" 
             *ngFor="let sound of libraryService.filteredSounds()"
             [class.loading]="loadingStates[sound.id]"
             [class.dragging]="currentDraggedSound?.id === sound.id"
             (click)="addSoundToProject(sound)"
             (mousedown)="onSoundMouseDown($event, sound)">
          
          <div class="sound-info">
            <div class="sound-name">{{ sound.name }}</div>
            <div class="sound-meta">
              <span class="duration" *ngIf="sound.duration">
                {{ formatDuration(sound.duration) }}
              </span>
            </div>
            <div class="sound-tags" *ngIf="sound.tags">
              <span class="tag" *ngFor="let tag of sound.tags">{{ tag }}</span>
            </div>
          </div>

          <div class="sound-actions">
            <button mat-icon-button 
                    class="play-btn"
                    (click)="$event.stopPropagation(); isPlaying(sound) ? stopPreview() : previewSound(sound)"
                    [disabled]="loadingStates[sound.id]"
                    [matTooltip]="isPlaying(sound) ? 'Stop preview' : 'Preview'">
              <mat-icon *ngIf="!loadingStates[sound.id] && !isPlaying(sound)">play_arrow</mat-icon>
              <mat-icon *ngIf="!loadingStates[sound.id] && isPlaying(sound)">stop</mat-icon>
              <mat-progress-spinner *ngIf="loadingStates[sound.id]" 
                                   diameter="20" 
                                   mode="indeterminate">
              </mat-progress-spinner>
            </button>
            
            <button mat-icon-button 
                    class="add-btn"
                    (click)="$event.stopPropagation(); addSoundToProject(sound)"
                    [disabled]="loadingStates[sound.id]"
                    matTooltip="Add to project">
              <mat-icon>add</mat-icon>
            </button>
          </div>
        </div>
        
        <div class="empty-state" *ngIf="libraryService.filteredSounds().length === 0">
          <mat-icon>library_music</mat-icon>
          <p>No sounds found</p>
        </div>
      </div>
    </div>
  `,
    styleUrls: ['./sound-browser.component.css']
})
export class SoundBrowserComponent {
  @Input() openedFromCta = false;
  @Input() panelMode = false;
  @Output() soundSelected = new EventEmitter<AudioBuffer & { name: string; category: string; id: string }>();
  @Output() browserToggled = new EventEmitter<void>();
  @Output() soundDragStarted = new EventEmitter<{ sound: SoundLibraryItem; buffer: AudioBuffer; position: { x: number; y: number } }>();

  loadingStates: Record<string, boolean> = {};
  
  // Window drag state (for moving the browser window)
  isWindowDragging = false;
  windowDragOffset = { x: 0, y: 0 };
  
  // Sound drag state (for dragging sounds to tracks)
  isDraggingSound = false;
  currentDraggedSound?: SoundLibraryItem;
  
  constructor(public libraryService: SoundLibraryService) {}

  toggleBrowser() {
    this.browserToggled.emit();
  }

  onSearchChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.libraryService.setSearchTerm(target.value);
  }

  clearSearch() {
    this.libraryService.setSearchTerm('');
  }

  selectCategory(category: SoundCategory) {
    this.libraryService.setCategory(category);
  }

  private currentPreview?: AudioBufferSourceNode;
  currentPreviewSound?: SoundLibraryItem;

  async previewSound(sound: SoundLibraryItem) {
    console.log('Preview sound:', sound.name);
    
    // Stop current preview if playing
    this.stopPreview();
    
    this.loadingStates[sound.id] = true;
    
    try {
      const buffer = await this.libraryService.loadSound(sound.id);
      if (buffer) {
        // Create and play preview
        const audioContext = this.libraryService.audio.audioContext;
        const source = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();
        
        source.buffer = buffer;
        gainNode.gain.value = 0.7; // Lower volume for preview
        
        source.connect(gainNode).connect(audioContext.destination);
        source.start();
        
        this.currentPreview = source;
        this.currentPreviewSound = sound;
        
        // Auto-stop when preview ends naturally
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

  stopPreview() {
    if (this.currentPreview) {
      try {
        this.currentPreview.stop();
      } catch {
        // Preview already stopped or invalid
      }
      this.currentPreview = undefined;
      this.currentPreviewSound = undefined;
    }
  }

  isPlaying(sound: SoundLibraryItem): boolean {
    return this.currentPreviewSound?.id === sound.id && !!this.currentPreview;
  }

  async addSoundToProject(sound: SoundLibraryItem) {
    this.loadingStates[sound.id] = true;
    
    try {
      const buffer = await this.libraryService.loadSound(sound.id);
      if (buffer) {
        this.soundSelected.emit(Object.assign(buffer, { 
          name: sound.name, 
          category: sound.category,
          id: sound.id
        }));
      }
    } catch (error) {
      console.error('Failed to load sound:', error);
    } finally {
      this.loadingStates[sound.id] = false;
    }
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Sound drag with mouse events (replaces HTML5 drag & drop)
  onSoundMouseDown(event: MouseEvent, sound: SoundLibraryItem) {
    // Don't start drag on button clicks
    if ((event.target as HTMLElement).closest('button')) {
      return;
    }
    
    // Store potential drag start
    this.currentDraggedSound = sound;
    const startPos = { x: event.clientX, y: event.clientY };
    let isDragStarted = false;
    
    // Setup mouse move to detect drag threshold
    const mouseMoveHandler = (moveEvent: MouseEvent) => {
      const deltaX = Math.abs(moveEvent.clientX - startPos.x);
      const deltaY = Math.abs(moveEvent.clientY - startPos.y);
      
      // Start drag if moved more than 5 pixels
      if (!isDragStarted && (deltaX > 5 || deltaY > 5)) {
        isDragStarted = true;
        this.isDraggingSound = true;
        
        // Set cursor
        document.body.style.cursor = 'grabbing';
        
        // Continue with drag updates
        document.addEventListener('mousemove', this.onSoundMouseMove);
        
        // Load sound buffer and start drag (async but don't wait)
        this.loadAndStartDrag(sound, { x: moveEvent.clientX, y: moveEvent.clientY });
      }
    };
    
    // Setup mouse up to handle click or drag end
    const mouseUpHandler = (upEvent: MouseEvent) => {
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
      
      if (!isDragStarted) {
        // It was a click, not a drag - add sound to project
        this.addSoundToProject(sound);
      } else {
        // It was a drag - handle drop
        this.onSoundMouseUp(upEvent);
      }
    };
    
    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler);
  }

  private onSoundMouseMove = (event: MouseEvent) => {
    if (!this.isDraggingSound || !this.currentDraggedSound) return;
    
    // Emit move event with current position
    const position = { x: event.clientX, y: event.clientY };
    // This will be handled by the parent component
    document.dispatchEvent(new CustomEvent('soundDragMove', {
      detail: { position, sound: this.currentDraggedSound }
    }));
  }

  private onSoundMouseUp = (event: MouseEvent) => {
    if (!this.isDraggingSound || !this.currentDraggedSound) return;
    
    // Emit drop event
    document.dispatchEvent(new CustomEvent('soundDragEnd', {
      detail: { 
        position: { x: event.clientX, y: event.clientY }, 
        sound: this.currentDraggedSound 
      }
    }));
    
    this.endSoundDrag();
  }
  
  private async loadAndStartDrag(sound: SoundLibraryItem, position: { x: number; y: number }) {
    console.log('[loadAndStartDrag] Starting drag for:', sound.name);
    try {
      this.loadingStates[sound.id] = true;
      const buffer = await this.libraryService.loadSound(sound.id);
      
      if (buffer && this.isDraggingSound) {
        console.log('[loadAndStartDrag] Buffer loaded, dispatching soundDragStart event');
        
        // Dispatch via custom event for immediate handling
        document.dispatchEvent(new CustomEvent('soundDragStart', {
          detail: {
            sound: {
              id: sound.id,
              name: sound.name,
              category: sound.category
            },
            buffer,
            position
          }
        }));
        
        // Also emit for Angular binding (if needed)
        this.soundDragStarted.emit({
          sound,
          buffer,
          position
        });
      } else {
        console.log('[loadAndStartDrag] Buffer not loaded or drag cancelled');
      }
    } catch (error) {
      console.error('Failed to load sound for drag:', error);
    } finally {
      this.loadingStates[sound.id] = false;
    }
  }
  
  private endSoundDrag() {
    this.isDraggingSound = false;
    this.currentDraggedSound = undefined;
    
    // Remove global listeners
    document.removeEventListener('mousemove', this.onSoundMouseMove);
    document.removeEventListener('mouseup', this.onSoundMouseUp);
    
    // Reset cursor
    document.body.style.cursor = 'auto';
  }

  onHeaderMouseDown(event: MouseEvent) {
    // Don't drag if clicking close button or if sound is being dragged
    if ((event.target as HTMLElement).classList.contains('close-btn') || this.isDraggingSound) {
      return;
    }
    
    this.isWindowDragging = true;
    const rect = (event.currentTarget as HTMLElement).closest('.sound-browser')!.getBoundingClientRect();
    this.windowDragOffset = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
    
    // Global mouse events for window dragging
    document.addEventListener('mousemove', this.onWindowMouseMove);
    document.addEventListener('mouseup', this.onWindowMouseUp);
    
    event.preventDefault();
  }

  private onWindowMouseMove = (event: MouseEvent) => {
    if (!this.isWindowDragging) return;
    
    const soundBrowser = document.querySelector('.sound-browser') as HTMLElement;
    if (!soundBrowser) return;
    
    const newX = Math.max(0, Math.min(window.innerWidth - soundBrowser.offsetWidth, 
                                    event.clientX - this.windowDragOffset.x));
    const newY = Math.max(0, Math.min(window.innerHeight - soundBrowser.offsetHeight, 
                                    event.clientY - this.windowDragOffset.y));
    
    soundBrowser.style.left = `${newX}px`;
    soundBrowser.style.top = `${newY}px`;
    soundBrowser.style.right = 'auto';
  }

  private onWindowMouseUp = () => {
    this.isWindowDragging = false;
    document.removeEventListener('mousemove', this.onWindowMouseMove);
    document.removeEventListener('mouseup', this.onWindowMouseUp);
  }
}