import { Component, EventEmitter, Output, signal } from '@angular/core';
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
    <div class="sound-browser">
      <div class="browser-header" 
           (mousedown)="onHeaderMouseDown($event)">
        <h3>Sound Library</h3>
        <button (click)="toggleBrowser()" class="close-btn">×</button>
      </div>

      <!-- Search -->
      <div class="search-section">
        <input type="text" 
               class="search-input"
               placeholder="Search..." 
               [value]="libraryService.searchTerm()"
               (input)="onSearchChange($event)">
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
             [class.dragging]="draggedSound?.id === sound.id"
             (click)="addSoundToProject(sound)"
             draggable="true"
             (dragstart)="onDragStart($event, sound)"
             (dragend)="onDragEnd($event)">
          
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
  @Output() soundSelected = new EventEmitter<AudioBuffer & { name: string; category: string; id: string }>();
  @Output() browserToggled = new EventEmitter<void>();

  loadingStates: { [key: string]: boolean } = {};
  
  // Drag state
  isDragging = false;
  dragOffset = { x: 0, y: 0 };
  draggedSound?: SoundLibraryItem;
  
  constructor(public libraryService: SoundLibraryService) {}

  toggleBrowser() {
    this.browserToggled.emit();
  }

  onSearchChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.libraryService.setSearchTerm(target.value);
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
      } catch {}
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

  // Drag & Drop for sounds
  onDragStart(event: DragEvent, sound: SoundLibraryItem) {
    console.log('Drag start:', sound.name);
    this.draggedSound = sound;
    
    // Signal that a sound is being dragged (not the window)
    (window as any).soundDragActive = true;
    
    // Set drag data
    event.dataTransfer!.effectAllowed = 'copy';
    event.dataTransfer!.setData('text/plain', JSON.stringify({
      type: 'sound',
      id: sound.id,
      name: sound.name,
      category: sound.category
    }));
    
    // Create drag image
    const dragImage = document.createElement('div');
    dragImage.className = 'drag-image';
    dragImage.textContent = sound.name;
    dragImage.style.cssText = `
      position: fixed;
      top: -1000px;
      left: -1000px;
      background: rgba(147, 51, 234, 0.9);
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      box-shadow: 0 4px 12px rgba(147, 51, 234, 0.5);
      z-index: 10000;
    `;
    document.body.appendChild(dragImage);
    event.dataTransfer!.setDragImage(dragImage, 0, 0);
    
    // Clean up drag image after a delay
    setTimeout(() => document.body.removeChild(dragImage), 100);
  }

  onDragEnd(event: DragEvent) {
    console.log('Drag end');
    this.draggedSound = undefined;
    
    // Clear sound drag flag
    (window as any).soundDragActive = false;
  }

  onHeaderMouseDown(event: MouseEvent) {
    // Nicht draggen wenn auf Close-Button geklickt wird
    if ((event.target as HTMLElement).classList.contains('close-btn')) {
      return;
    }
    
    this.isDragging = true;
    const rect = (event.currentTarget as HTMLElement).closest('.sound-browser')!.getBoundingClientRect();
    this.dragOffset = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
    
    // Global mouse events für dragging
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
    
    event.preventDefault();
  }

  private onMouseMove = (event: MouseEvent) => {
    if (!this.isDragging) return;
    
    const soundBrowser = document.querySelector('.sound-browser') as HTMLElement;
    if (!soundBrowser) return;
    
    const newX = Math.max(0, Math.min(window.innerWidth - soundBrowser.offsetWidth, 
                                    event.clientX - this.dragOffset.x));
    const newY = Math.max(0, Math.min(window.innerHeight - soundBrowser.offsetHeight, 
                                    event.clientY - this.dragOffset.y));
    
    soundBrowser.style.left = `${newX}px`;
    soundBrowser.style.top = `${newY}px`;
    soundBrowser.style.right = 'auto';
  }

  private onMouseUp = () => {
    this.isDragging = false;
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  }
}