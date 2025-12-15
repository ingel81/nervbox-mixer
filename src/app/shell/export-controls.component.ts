import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';

import { EditorStateService } from '../audio/editor/services/editor-state.service';
import { AudioEngineService } from '../audio/audio-engine/services/audio-engine.service';
import { AnalyticsService } from '../services/analytics.service';
import { UploadService } from '../core/services/upload.service';
import { UploadDialogComponent, UploadDialogResult } from './upload-dialog.component';
import { environment } from '../../environments/environment';

@Component({
    selector: 'export-controls',
    imports: [
      CommonModule,
      MatButtonModule,
      MatIconModule,
      MatMenuModule,
      MatSnackBarModule,
      MatProgressSpinnerModule,
      MatTooltipModule,
      MatDialogModule
    ],
    template: `
    <!-- Only show if there are clips -->
    @if (hasClips()) {
      <!-- LAN Mode -->
      @if (isLanMode) {
        @if (isLoggedIn()) {
          <!-- Logged in: Upload button -->
          <button mat-flat-button
                  class="upload-btn"
                  [disabled]="uploadService.isUploading()"
                  (click)="openUploadDialog()">
            @if (uploadService.isUploading()) {
              <mat-spinner diameter="18"></mat-spinner>
              <span>Uploading...</span>
            } @else {
              <ng-container>
                <mat-icon>cloud_upload</mat-icon>
                <span>Upload to nervbox</span>
              </ng-container>
            }
          </button>

          <!-- Local export dropdown -->
          <button mat-icon-button
                  [matMenuTriggerFor]="localExportMenu"
                  class="more-btn"
                  matTooltip="Lokal exportieren">
            <mat-icon>download</mat-icon>
          </button>

          <mat-menu #localExportMenu="matMenu">
            <button mat-menu-item (click)="exportLocal('mp3')">
              <mat-icon>audiotrack</mat-icon>
              <span>Lokal als MP3</span>
            </button>
            <button mat-menu-item (click)="exportLocal('wav')">
              <mat-icon>graphic_eq</mat-icon>
              <span>Lokal als WAV</span>
            </button>
          </mat-menu>
        } @else {
          <!-- Not logged in -->
          <button mat-stroked-button
                  class="login-btn"
                  matTooltip="Im Player einloggen um hochzuladen"
                  (click)="goToPlayer()">
            <mat-icon>login</mat-icon>
            <span>Login für Upload</span>
          </button>

          <button mat-icon-button
                  [matMenuTriggerFor]="localExportMenu2"
                  class="more-btn"
                  matTooltip="Lokal exportieren">
            <mat-icon>download</mat-icon>
          </button>

          <mat-menu #localExportMenu2="matMenu">
            <button mat-menu-item (click)="exportLocal('mp3')">
              <mat-icon>audiotrack</mat-icon>
              <span>Lokal als MP3</span>
            </button>
            <button mat-menu-item (click)="exportLocal('wav')">
              <mat-icon>graphic_eq</mat-icon>
              <span>Lokal als WAV</span>
            </button>
          </mat-menu>
        }
      } @else {
        <!-- Standalone Mode -->
        <button mat-flat-button
                [matMenuTriggerFor]="exportMenu"
                class="export-btn">
          <mat-icon>download</mat-icon>
          <span>Export</span>
          <mat-icon class="dropdown-icon">arrow_drop_down</mat-icon>
        </button>

        <mat-menu #exportMenu="matMenu">
          <button mat-menu-item (click)="exportLocal('mp3')">
            <mat-icon>audiotrack</mat-icon>
            <span>Export as MP3</span>
          </button>
          <button mat-menu-item (click)="exportLocal('wav')">
            <mat-icon>graphic_eq</mat-icon>
            <span>Export as WAV</span>
          </button>
        </mat-menu>
      }
    }
  `,
    styles: [`
    :host {
      display: flex;
      align-items: center;
      gap: 8px;
      height: 48px;
      margin-left: 8px;
    }

    /* Upload Button */
    .upload-btn {
      display: inline-flex !important;
      align-items: center !important;
      background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%) !important;
      color: white !important;
      font-weight: 500 !important;
      font-size: 13px !important;
      height: 36px !important;
      padding: 0 16px !important;
      border-radius: 6px !important;
    }

    .upload-btn:hover:not(:disabled) {
      box-shadow: 0 4px 20px rgba(147, 51, 234, 0.4) !important;
    }

    .upload-btn:disabled {
      opacity: 0.7;
    }

    .upload-btn mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      margin-right: 8px;
      vertical-align: middle;
      line-height: 1;
    }

    .upload-btn mat-spinner {
      margin-right: 8px;
    }

    /* Login Button */
    .login-btn {
      color: #fbbf24 !important;
      border-color: rgba(251, 191, 36, 0.5) !important;
      font-size: 13px !important;
      height: 36px !important;
      padding: 0 14px !important;
    }

    .login-btn:hover {
      background: rgba(251, 191, 36, 0.1) !important;
    }

    .login-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      margin-right: 6px;
    }

    /* More/Download button */
    .more-btn {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 36px !important;
      height: 36px !important;
      background: rgba(255, 255, 255, 0.05) !important;
      border: 1px solid rgba(255, 255, 255, 0.15) !important;
      border-radius: 6px !important;
    }

    .more-btn:hover {
      background: rgba(255, 255, 255, 0.1) !important;
    }

    .more-btn mat-icon {
      color: rgba(255, 255, 255, 0.7);
      vertical-align: middle;
      line-height: 1;
    }

    /* Export Button (Standalone) */
    .export-btn {
      background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%) !important;
      color: white !important;
      font-weight: 500 !important;
      font-size: 13px !important;
      height: 36px !important;
      padding: 0 12px !important;
      border-radius: 6px !important;
    }

    .export-btn mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .export-btn mat-icon:first-child {
      margin-right: 6px;
    }

    .dropdown-icon {
      margin-left: 2px;
      margin-right: -4px !important;
    }

    /* Mobile */
    @media (max-width: 768px) {
      .upload-btn span,
      .login-btn span,
      .export-btn span {
        display: none;
      }

      .upload-btn,
      .login-btn,
      .export-btn {
        min-width: 40px !important;
        width: 40px !important;
        padding: 0 !important;
      }

      .upload-btn mat-icon,
      .login-btn mat-icon {
        margin: 0 !important;
      }

      .dropdown-icon {
        display: none;
      }
    }
  `]
})
export class ExportControlsComponent {
  private readonly editorState = inject(EditorStateService);
  private readonly audio = inject(AudioEngineService);
  private readonly analytics = inject(AnalyticsService);
  readonly uploadService = inject(UploadService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  readonly isLanMode = !!environment.nervboxApi;

  // Check if there are any clips
  readonly hasClips = computed(() => {
    const tracks = this.editorState.tracks();
    return tracks.some(track => track.clips.length > 0);
  });

  // Duration for export
  readonly duration = computed(() => {
    const isLoopEnabled = this.editorState.loopEnabled();
    if (isLoopEnabled) {
      return this.editorState.loopEnd() - this.editorState.loopStart();
    }

    const tracks = this.editorState.tracks();
    let max = 0;
    for (const track of tracks) {
      for (const clip of track.clips) {
        const clipEnd = clip.startTime + clip.duration;
        if (clipEnd > max) max = clipEnd;
      }
    }
    return max;
  });

  isLoggedIn(): boolean {
    return this.uploadService.isLoggedIn();
  }

  goToPlayer(): void {
    window.location.href = '/';
  }

  /** Open upload dialog */
  openUploadDialog(): void {
    const arrangementName = this.editorState.currentArrangementName();

    const dialogRef = this.dialog.open(UploadDialogComponent, {
      width: '400px',
      panelClass: 'dark-dialog',
      data: { name: arrangementName }
    });

    dialogRef.afterClosed().subscribe(async (result: UploadDialogResult | null) => {
      if (result) {
        const success = await this.uploadToNervbox(result.name, result.tags);
        if (success) {
          // Add name to cache to prevent duplicate uploads
          this.uploadService.addNameToCache(result.name);
        }
      }
    });
  }

  /** Upload to nervbox */
  private async uploadToNervbox(name: string, tags: string[]): Promise<boolean> {
    const blob = await this.renderMixdown('mp3');
    if (!blob) return false;

    const sanitizedName = name.replace(/[^a-zA-Z0-9-_äöüÄÖÜß ]/g, '_');
    const filename = `${sanitizedName}.mp3`;

    try {
      await firstValueFrom(
        this.uploadService.uploadSound(blob, filename, tags)
      );
      this.snackBar.open('Erfolgreich zu nervbox hochgeladen!', 'OK', { duration: 3000 });
      return true;
    } catch (error) {
      console.error('Upload failed:', error);
      this.snackBar.open(`Upload fehlgeschlagen: ${error}`, 'OK', { duration: 5000 });
      return false;
    }
  }

  /** Export locally */
  async exportLocal(format: 'wav' | 'mp3'): Promise<void> {
    const blob = await this.renderMixdown(format);
    if (!blob) return;

    const arrangementName = this.editorState.currentArrangementName();
    const sanitizedName = arrangementName.replace(/[^a-zA-Z0-9-_]/g, '_');
    const filename = `${sanitizedName}.${format}`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    this.analytics.trackExport(format, this.duration());
  }

  /** Render mixdown */
  private async renderMixdown(format: 'wav' | 'mp3'): Promise<Blob | null> {
    const isLoopEnabled = this.editorState.loopEnabled();
    const loopStart = this.editorState.loopStart();
    const loopEnd = this.editorState.loopEnd();

    let allClips = this.editorState.flattenedClips();
    console.log('Export: Total clips found:', allClips.length);

    if (isLoopEnabled) {
      allClips = allClips.filter(clip => {
        const clipEnd = clip.startTime + clip.duration;
        return clipEnd > loopStart && clip.startTime < loopEnd;
      });
      console.log('Export: Clips after loop filter:', allClips.length);
    }

    const clips = allClips.map(c => {
      let startTime = c.startTime;
      let duration = c.duration;
      let offset = c.offset + (c.trimStart || 0);

      if (isLoopEnabled) {
        startTime = Math.max(0, c.startTime - loopStart);
        if (c.startTime < loopStart) {
          const clipOffset = loopStart - c.startTime;
          offset += clipOffset;
          duration -= clipOffset;
        }
        if (c.startTime + c.duration > loopEnd) {
          duration = Math.max(0, loopEnd - Math.max(c.startTime, loopStart));
        }
      }

      console.log('Export clip:', c.name, {
        startTime,
        duration,
        offset,
        bufferDuration: c.buffer?.duration,
        hasBuffer: !!c.buffer
      });

      return {
        buffer: c.buffer,
        startTime,
        duration: Math.max(0, duration),
        offset: Math.max(0, offset),
        gain: 1,
        pan: 0,
        muted: false,
      };
    }).filter(c => c.duration > 0);

    console.log('Export: Final clips to render:', clips.length);

    try {
      return format === 'mp3'
        ? await this.audio.renderToMp3({ clips, duration: this.duration() })
        : await this.audio.renderToWav({ clips, duration: this.duration() });
    } catch (error) {
      console.error('Render failed:', error);
      this.snackBar.open(`Export fehlgeschlagen: ${error}`, 'OK', { duration: 5000 });
      return null;
    }
  }
}
