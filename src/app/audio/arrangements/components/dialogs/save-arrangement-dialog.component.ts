import { Component, Inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ArrangementStorageService, SavedArrangement } from '../../services/arrangement-storage.service';
import { TrackDefinition } from '../../../shared/models/models';

export interface SaveArrangementDialogData {
  currentName?: string;
}

@Component({
    selector: 'save-arrangement-dialog',
    imports: [
        CommonModule,
        FormsModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule
    ],
    template: `
    <h2 mat-dialog-title>
      <mat-icon class="dialog-icon">save</mat-icon>
      Save Arrangement
    </h2>
    
    <mat-dialog-content>
      <div class="custom-input-container">
        <label class="input-label" for="arrangement-name-input">Arrangement Name</label>
        <input class="custom-input" 
               id="arrangement-name-input" 
               [(ngModel)]="arrangementName" 
               (input)="checkExisting()"
               placeholder="Enter a name for your arrangement"
               cdkFocusInitial>
        <div class="input-hint" *ngIf="existingArrangement()">
          <mat-icon class="warning-icon">warning</mat-icon>
          <span class="warning-text">This will overwrite the existing arrangement</span>
        </div>
      </div>

      <div class="existing-arrangements" *ngIf="savedArrangements().length > 0">
        <h3>Existing Arrangements</h3>
        <div class="arrangement-list nervbox-scrollbar">
          <div *ngFor="let arr of savedArrangements()" 
               class="arrangement-item"
               [class.selected]="arr.arrangement.name === arrangementName"
               (click)="arrangementName = arr.arrangement.name">
            <div class="item-content">
              <mat-icon class="item-icon">music_note</mat-icon>
              <div class="item-info">
                <div class="item-title">{{ arr.arrangement.name }}</div>
                <div class="item-meta">
                  <span>{{ formatDate(arr.updatedAt) }}</span>
                  <span class="separator">•</span>
                  <span>{{ arr.arrangement.tracks.length }} tracks</span>
                  <span class="separator">•</span>
                  <span>{{ arr.arrangement.bpm || 120 }} BPM</span>
                  <span class="track-names" *ngIf="arr.arrangement.tracks.length > 0">
                    <span class="separator">•</span>
                    {{ getTrackNames(arr.arrangement.tracks) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </mat-dialog-content>
    
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-flat-button 
              color="primary" 
              [disabled]="!arrangementName.trim()"
              (click)="onSave()">
        {{ existingArrangement() ? 'Overwrite' : 'Save' }}
      </button>
    </mat-dialog-actions>
  `,
    styleUrls: ['./dialog-shared.styles.scss'],
    styles: [`

    .custom-input-container {
      width: 100%;
      margin-bottom: 20px;
    }

    .input-label {
      display: block;
      font-size: 12px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.6);
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .custom-input {
      width: 100%;
      padding: 10px 12px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(147, 51, 234, 0.2);
      border-radius: 6px;
      color: #ffffff;
      font-size: 14px;
      font-family: Inter, sans-serif;
      transition: all 0.2s;
      outline: none;
      box-sizing: border-box;
    }

    .custom-input:focus {
      border-color: rgba(147, 51, 234, 0.5);
      background: rgba(255, 255, 255, 0.08);
      box-shadow: 0 0 0 2px rgba(147, 51, 234, 0.1);
    }

    .custom-input::placeholder {
      color: rgba(255, 255, 255, 0.3);
    }

    .input-hint {
      display: flex;
      align-items: center;
      margin-top: 6px;
      font-size: 11px;
      color: #ff9800;
    }

    .warning-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      margin-right: 6px;
      color: #ff9800;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .warning-text {
      line-height: 14px;
      display: flex;
      align-items: center;
    }

    .existing-arrangements {
      margin-top: 24px;
    }

    .existing-arrangements h3 {
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 8px;
      color: rgba(255, 255, 255, 0.7);
    }

    /* Shared styles imported via styleUrls */
  `]
})
export class SaveArrangementDialogComponent {
  arrangementName = '';
  savedArrangements = signal<SavedArrangement[]>([]);
  existingArrangement = signal<SavedArrangement | null>(null);

  constructor(
    public dialogRef: MatDialogRef<SaveArrangementDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SaveArrangementDialogData,
    private storage: ArrangementStorageService
  ) {
    this.arrangementName = data.currentName || '';
    // Sort arrangements by date, newest first
    const sortedArrangements = storage.savedArrangements().sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    this.savedArrangements.set(sortedArrangements);
    this.checkExisting();
  }

  checkExisting() {
    const existing = this.savedArrangements().find(
      arr => arr.arrangement.name === this.arrangementName
    );
    this.existingArrangement.set(existing || null);
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

  onCancel(): void {
    this.dialogRef.close();
  }

  getTrackNames(tracks: TrackDefinition[]): string {
    if (tracks.length === 0) return '';
    const names = tracks.slice(0, 3).map(t => t.name).join(', ');
    if (tracks.length > 3) {
      return `${names}, +${tracks.length - 3} more`;
    }
    return names;
  }

  onSave(): void {
    if (this.arrangementName.trim()) {
      this.dialogRef.close(this.arrangementName.trim());
    }
  }
}