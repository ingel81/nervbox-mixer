import { Component, Inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ArrangementStorageService, SavedArrangement } from '../../services/arrangement-storage.service';

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
        <div class="arrangement-list">
          <div *ngFor="let arr of savedArrangements()" 
               class="arrangement-item"
               [class.selected]="arr.arrangement.name === arrangementName"
               (click)="arrangementName = arr.arrangement.name">
            <div class="item-content">
              <mat-icon class="item-icon">music_note</mat-icon>
              <div class="item-info">
                <div class="item-title">{{ arr.arrangement.name }}</div>
                <div class="item-meta">
                  {{ formatDate(arr.updatedAt) }} • {{ arr.arrangement.tracks.length }} tracks • {{ arr.arrangement.bpm || 120 }} BPM
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
    styles: [`
    .dialog-icon {
      vertical-align: middle;
      margin-right: 8px;
      background: linear-gradient(135deg, #9333ea, #ec4899);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

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

    .arrangement-list {
      max-height: 240px;
      overflow-y: auto;
      overflow-x: hidden;
      border: 1px solid rgba(147, 51, 234, 0.2);
      border-radius: 8px;
      background: rgba(20, 20, 25, 0.4);
      padding: 8px;
      box-sizing: border-box;
      width: 100%;
    }

    .arrangement-item {
      cursor: pointer;
      transition: all 0.2s;
      padding: 12px;
      margin-bottom: 6px;
      border-radius: 6px;
      border: 1px solid transparent;
      background: rgba(255, 255, 255, 0.02);
      box-sizing: border-box;
      width: 100%;
    }

    .arrangement-item:last-child {
      margin-bottom: 0;
    }

    .arrangement-item:hover {
      background: linear-gradient(135deg, rgba(147, 51, 234, 0.1), rgba(236, 72, 153, 0.05));
      border-color: rgba(147, 51, 234, 0.2);
    }

    .arrangement-item.selected {
      background: linear-gradient(135deg, rgba(147, 51, 234, 0.15), rgba(236, 72, 153, 0.1));
      border-color: rgba(147, 51, 234, 0.4);
      border-left-width: 3px;
    }

    .item-content {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .item-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
      color: #9333ea;
      opacity: 0.8;
    }

    .item-info {
      flex: 1;
    }

    .item-title {
      font-size: 14px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.95);
      margin-bottom: 4px;
    }

    .item-meta {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.5);
    }

    mat-dialog-content {
      min-width: 400px;
      box-sizing: border-box;
      overflow-x: hidden;
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
    this.savedArrangements.set(storage.savedArrangements());
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
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.arrangementName.trim()) {
      this.dialogRef.close(this.arrangementName.trim());
    }
  }
}