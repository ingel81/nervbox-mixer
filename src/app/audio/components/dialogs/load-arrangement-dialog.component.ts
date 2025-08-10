import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ArrangementStorageService, SavedArrangement } from '../../services/arrangement-storage.service';
import { ConfirmDialogComponent } from './confirm-dialog.component';
import { TrackDefinition } from '../../models/models';

@Component({
    selector: 'load-arrangement-dialog',
    imports: [
        CommonModule,
        FormsModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule
    ],
    template: `
    <h2 mat-dialog-title>
      <mat-icon class="dialog-icon">folder_open</mat-icon>
      Load Arrangement
    </h2>
    
    <mat-dialog-content>
      <div class="search-container">
        <input class="search-input" 
               [(ngModel)]="searchTerm" 
               placeholder="Search arrangements..."
               cdkFocusInitial>
        <mat-icon class="search-icon">search</mat-icon>
      </div>

      <div class="arrangements-container" *ngIf="filteredArrangements().length > 0">
        <div class="arrangement-list">
          <div *ngFor="let arr of filteredArrangements()" 
               class="arrangement-item"
               [class.selected]="selectedArrangement.length > 0 && selectedArrangement[0].id === arr.id"
               (click)="selectArrangement(arr)">
            <div class="arrangement-header">
              <mat-icon class="arrangement-icon">music_note</mat-icon>
              <div class="arrangement-info">
                <div class="arrangement-name">{{ arr.arrangement.name }}</div>
                <div class="arrangement-meta">
                  <span>{{ formatDate(arr.updatedAt) }}</span>
                  <span class="separator">•</span>
                  <span>{{ arr.arrangement.tracks.length }} tracks</span>
                  <span class="separator">•</span>
                  <span>{{ arr.arrangement.bpm }} BPM</span>
                  <span class="track-names" *ngIf="arr.arrangement.tracks.length > 0">
                    <span class="separator">•</span>
                    {{ getTrackNames(arr.arrangement.tracks) }}
                  </span>
                </div>
              </div>
              <button mat-icon-button 
                      class="delete-btn"
                      (click)="deleteArrangement($event, arr)"
                      matTooltip="Delete arrangement">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="empty-state" *ngIf="filteredArrangements().length === 0">
        <mat-icon>library_music</mat-icon>
        <p *ngIf="savedArrangements().length === 0">No saved arrangements</p>
        <p *ngIf="savedArrangements().length > 0 && searchTerm">No arrangements match your search</p>
      </div>
    </mat-dialog-content>
    
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-flat-button 
              color="primary" 
              [disabled]="!selectedArrangement || selectedArrangement.length === 0"
              (click)="onLoad()">
        Load
      </button>
    </mat-dialog-actions>
  `,
    styles: [`
    .dialog-icon {
      vertical-align: middle;
      margin-right: 8px;
      background: linear-gradient(135deg, #9333ea, #ec4899);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .search-container {
      position: relative;
      width: 100%;
      margin-bottom: 16px;
    }

    .search-input {
      width: 100%;
      padding: 8px 36px 8px 12px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(147, 51, 234, 0.2);
      border-radius: 20px;
      color: #ffffff;
      font-size: 13px;
      font-family: Inter, sans-serif;
      transition: all 0.2s;
      outline: none;
      box-sizing: border-box;
    }

    .search-input:focus {
      border-color: rgba(147, 51, 234, 0.4);
      background: rgba(255, 255, 255, 0.08);
    }

    .search-input::placeholder {
      color: rgba(255, 255, 255, 0.4);
    }

    .search-icon {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: rgba(147, 51, 234, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    mat-dialog-content {
      min-width: 500px;
      max-width: 600px;
      box-sizing: border-box;
      overflow-x: hidden;
    }

    .arrangements-container {
      max-height: 400px;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 4px;
      box-sizing: border-box;
    }

    .arrangement-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
      box-sizing: border-box;
    }

    .arrangement-item {
      padding: 12px;
      border: 1px solid rgba(147, 51, 234, 0.2);
      border-radius: 6px;
      background: rgba(20, 20, 25, 0.6);
      backdrop-filter: blur(10px);
      transition: all 0.2s;
      cursor: pointer;
      box-sizing: border-box;
      width: 100%;
    }

    .arrangement-item:hover {
      background: linear-gradient(135deg, rgba(147, 51, 234, 0.1), rgba(236, 72, 153, 0.1));
      border-color: rgba(147, 51, 234, 0.4);
      transform: translateX(4px);
    }

    .arrangement-item.selected {
      background: linear-gradient(135deg, rgba(147, 51, 234, 0.15), rgba(236, 72, 153, 0.15));
      border-color: rgba(147, 51, 234, 0.6);
      border-left-width: 3px;
    }

    .arrangement-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }

    .arrangement-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #9333ea, #ec4899);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .arrangement-info {
      flex: 1;
    }

    .arrangement-name {
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 4px;
    }

    .arrangement-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.5);
      line-height: 1.5;
    }

    .separator {
      margin: 0 6px;
      color: rgba(255, 255, 255, 0.3);
    }

    .track-names {
      color: rgba(147, 51, 234, 0.7);
      font-style: italic;
    }

    .delete-btn {
      opacity: 0.3;
      transition: all 0.2s;
    }

    .delete-btn:hover {
      opacity: 1;
      color: #ef4444;
      transform: scale(1.1);
    }


    .empty-state {
      padding: 48px;
      text-align: center;
      color: rgba(255, 255, 255, 0.5);
    }

    .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin: 0 auto 16px;
      opacity: 0.3;
    }

    ::ng-deep .mat-mdc-dialog-actions .mat-mdc-button:not(.mat-mdc-unelevated-button) {
      color: rgba(255, 255, 255, 0.7) !important;
    }

    ::ng-deep .mat-mdc-dialog-actions .mat-mdc-button:not(.mat-mdc-unelevated-button):hover {
      background: rgba(255, 255, 255, 0.1) !important;
      color: rgba(255, 255, 255, 0.9) !important;
    }

    ::ng-deep .mat-mdc-dialog-actions .mat-mdc-unelevated-button.mat-primary {
      background-color: #9333ea !important;
      color: #ffffff !important;
    }

    ::ng-deep .mat-mdc-dialog-actions .mat-mdc-unelevated-button.mat-primary:hover {
      background-color: #a855f7 !important;
    }

    ::ng-deep .mat-mdc-dialog-actions .mat-mdc-unelevated-button.mat-primary:disabled {
      background-color: rgba(147, 51, 234, 0.3) !important;
      color: rgba(255, 255, 255, 0.5) !important;
    }
  `]
})
export class LoadArrangementDialogComponent {
  searchTerm = '';
  selectedArrangement: SavedArrangement[] = [];
  savedArrangements = signal<SavedArrangement[]>([]);

  filteredArrangements = computed(() => {
    const term = this.searchTerm.toLowerCase();
    if (!term) return this.savedArrangements();
    
    return this.savedArrangements().filter(arr => 
      arr.arrangement.name.toLowerCase().includes(term) ||
      arr.arrangement.tracks.some(t => t.name.toLowerCase().includes(term))
    );
  });

  constructor(
    public dialogRef: MatDialogRef<LoadArrangementDialogComponent>,
    private storage: ArrangementStorageService,
    private dialog: MatDialog
  ) {
    this.savedArrangements.set(storage.savedArrangements());
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return diffMinutes <= 1 ? 'Just now' : `${diffMinutes} min ago`;
      }
      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  selectArrangement(arrangement: SavedArrangement) {
    this.selectedArrangement = [arrangement];
  }

  getTrackNames(tracks: TrackDefinition[]): string {
    if (tracks.length === 0) return '';
    const names = tracks.slice(0, 3).map(t => t.name).join(', ');
    if (tracks.length > 3) {
      return `${names}, +${tracks.length - 3} more`;
    }
    return names;
  }

  deleteArrangement(event: Event, arrangement: SavedArrangement) {
    event.stopPropagation();
    
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Arrangement',
        message: `Are you sure you want to delete "${arrangement.arrangement.name}"? This action cannot be undone.`,
        confirmText: 'Delete',
        icon: 'delete_forever'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.storage.deleteArrangement(arrangement.id);
        this.savedArrangements.set(this.storage.savedArrangements());
        
        // Clear selection if deleted item was selected
        if (this.selectedArrangement[0]?.id === arrangement.id) {
          this.selectedArrangement = [];
        }
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onLoad(): void {
    if (this.selectedArrangement.length > 0) {
      this.dialogRef.close(this.selectedArrangement[0]);
    }
  }
}