import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { SoundLibraryService } from '../audio/sound-browser/services/sound-library.service';
import { UploadService } from '../core/services/upload.service';

export interface UploadDialogData {
  name: string;
}

export interface UploadDialogResult {
  name: string;
  tags: string[];
}

@Component({
  selector: 'app-upload-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <mat-icon class="header-icon">cloud_upload</mat-icon>
        <h2>Upload to nervbox</h2>
      </div>

      <div class="dialog-content">
        @if (isLoading()) {
          <div class="loading">
            <mat-spinner diameter="24"></mat-spinner>
            <span>Lade Sound-Liste...</span>
          </div>
        } @else {
          <!-- Name Input -->
          <mat-form-field appearance="outline" class="name-field">
            <mat-label>Name</mat-label>
            <input matInput
                   [value]="name()"
                   (input)="onNameInput($any($event.target).value)"
                   (blur)="onNameBlur()"
                   placeholder="Mein Remix" />
            @if (nameExists()) {
              <mat-error>Name existiert bereits!</mat-error>
            }
            <mat-hint>Ohne Dateiendung</mat-hint>
          </mat-form-field>

          @if (nameExists()) {
            <div class="name-warning">
              <mat-icon>warning</mat-icon>
              <span>Ein Sound mit diesem Namen existiert bereits. Bitte wähle einen anderen Namen.</span>
            </div>
          }

          <!-- Tag Selection -->
          <div class="tag-section">
            <label class="tag-label">Tags auswählen:</label>
            <div class="tag-chips">
              @for (tag of availableTags(); track tag) {
                <button
                  type="button"
                  class="tag-chip"
                  [class.selected]="selectedTags().includes(tag)"
                  (click)="toggleTag(tag)">
                  {{ tag }}
                </button>
              }
            </div>
            <div class="remix-hint">
              <mat-icon>info</mat-icon>
              <span>"remix" wird automatisch hinzugefügt</span>
            </div>
          </div>
        }
      </div>

      <div class="dialog-actions">
        <button mat-button (click)="cancel()">Abbrechen</button>
        <button mat-flat-button
                class="upload-btn"
                [disabled]="!canUpload()"
                (click)="confirm()">
          <mat-icon>cloud_upload</mat-icon>
          Upload
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dialog-container {
      padding: 0;
      min-width: 350px;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 20px 24px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .header-icon {
      color: #a855f7;
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: white;
    }

    .dialog-content {
      padding: 20px 24px;
    }

    .loading {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 20px 0;
      color: rgba(255, 255, 255, 0.7);
    }

    .name-field {
      width: 100%;
    }

    /* Material form field overrides for dark theme */
    ::ng-deep .name-field .mdc-floating-label {
      color: rgba(255, 255, 255, 0.7) !important;
    }

    ::ng-deep .name-field .mdc-text-field__input {
      color: white !important;
      caret-color: white !important;
    }

    ::ng-deep .name-field .mdc-text-field__input::placeholder {
      color: rgba(255, 255, 255, 0.4) !important;
      opacity: 1 !important;
    }

    ::ng-deep .name-field .mat-mdc-form-field-hint {
      color: rgba(255, 255, 255, 0.5) !important;
    }

    ::ng-deep .name-field .mdc-notched-outline__leading,
    ::ng-deep .name-field .mdc-notched-outline__notch,
    ::ng-deep .name-field .mdc-notched-outline__trailing {
      border-color: rgba(147, 51, 234, 0.5) !important;
    }

    .name-warning {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin-top: 8px;
      padding: 10px 12px;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 6px;
      color: #fca5a5;
      font-size: 13px;
    }

    .name-warning mat-icon {
      color: #ef4444;
      font-size: 18px;
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .tag-section {
      margin-top: 20px;
    }

    .tag-label {
      display: block;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: 10px;
    }

    .tag-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .tag-chip {
      background: rgba(147, 51, 234, 0.2);
      border: 1px solid rgba(147, 51, 234, 0.3);
      color: rgba(255, 255, 255, 0.8);
      padding: 6px 14px;
      border-radius: 16px;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .tag-chip:hover {
      background: rgba(147, 51, 234, 0.3);
      border-color: rgba(147, 51, 234, 0.5);
    }

    .tag-chip.selected {
      background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
      border-color: transparent;
      color: white;
      font-weight: 500;
    }

    .remix-hint {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 14px;
      font-size: 12px;
      color: rgba(147, 51, 234, 0.8);
    }

    .remix-hint mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .dialog-actions button:first-child {
      color: rgba(255, 255, 255, 0.7) !important;
    }

    .dialog-actions button:first-child:hover {
      background: rgba(255, 255, 255, 0.1) !important;
    }

    .upload-btn {
      background: linear-gradient(45deg, #9333ea 0%, #ec4899 100%) !important;
      color: white !important;
      font-weight: 500 !important;
    }

    .upload-btn mat-icon {
      margin-right: 6px;
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .upload-btn:disabled {
      opacity: 0.5;
    }
  `]
})
export class UploadDialogComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<UploadDialogComponent>);
  private readonly soundLibrary = inject(SoundLibraryService);
  private readonly uploadService = inject(UploadService);
  private readonly data = inject<UploadDialogData>(MAT_DIALOG_DATA);

  readonly name = signal('');
  readonly selectedTags = signal<string[]>([]);
  readonly availableTags = this.soundLibrary.availableTags;
  readonly isLoading = signal(true);
  readonly nameExists = signal(false);

  readonly canUpload = computed(() => {
    return this.name().trim().length > 0 && !this.nameExists() && !this.isLoading();
  });

  ngOnInit(): void {
    // Pre-fill name from data (but not if it's "Untitled")
    if (this.data?.name && this.data.name !== 'Untitled') {
      this.name.set(this.sanitizeName(this.data.name));
    }

    // Load existing sound names
    this.uploadService.loadExistingSoundNames().subscribe(() => {
      this.isLoading.set(false);
      this.checkName();
    });
  }

  /** Sanitize name to be filesystem-compatible */
  sanitizeName(value: string): string {
    return value
      .replace(/[<>:"/\\|?*]/g, '_')  // Windows forbidden chars
      .replace(/[\x00-\x1f]/g, '')     // Control characters
      .replace(/\.+$/g, '')            // Trailing dots
      .replace(/\s+/g, ' ')            // Multiple spaces to single
      .trim();
  }

  onNameInput(value: string): void {
    this.name.set(value);
    this.checkName();
  }

  onNameBlur(): void {
    // Sanitize when user leaves the field
    this.name.set(this.sanitizeName(this.name()));
    this.checkName();
  }

  checkName(): void {
    if (this.name().trim()) {
      this.nameExists.set(this.uploadService.nameExists(this.name()));
    } else {
      this.nameExists.set(false);
    }
  }

  toggleTag(tag: string): void {
    this.selectedTags.update(tags => {
      if (tags.includes(tag)) {
        return tags.filter(t => t !== tag);
      } else {
        return [...tags, tag];
      }
    });
  }

  cancel(): void {
    this.dialogRef.close(null);
  }

  confirm(): void {
    if (!this.canUpload()) return;

    const result: UploadDialogResult = {
      name: this.name().trim(),
      tags: this.selectedTags()
    };
    this.dialogRef.close(result);
  }
}
