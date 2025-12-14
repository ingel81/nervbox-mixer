import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap, finalize, map, catchError, of } from 'rxjs';
import { ApiService } from './api.service';
import { Sound, UploadResponse } from '../models/sound.model';

@Injectable({ providedIn: 'root' })
export class UploadService {
  private readonly api = inject(ApiService);

  readonly isUploading = signal(false);
  readonly lastUploadedHash = signal<string | null>(null);

  // Cache of existing sound names (loaded once)
  private existingSoundNames = signal<Set<string>>(new Set());

  /**
   * Upload a sound file to nervbox backend.
   * Automatically adds 'remix' tag to all uploads from mixer.
   */
  uploadSound(file: Blob, filename: string, additionalTags: string[] = []): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file, filename);

    // Always add 'remix' tag for mixer uploads, plus any additional tags
    const allTags = ['remix', ...additionalTags.filter(t => t !== 'remix')];
    formData.append('tags', allTags.join(','));

    this.isUploading.set(true);
    this.lastUploadedHash.set(null);

    return this.api.postFormData<UploadResponse>('/sound/upload', formData).pipe(
      tap(response => {
        this.lastUploadedHash.set(response.hash);
      }),
      finalize(() => {
        this.isUploading.set(false);
      })
    );
  }

  /**
   * Check if user is logged in (has token)
   */
  isLoggedIn(): boolean {
    return !!localStorage.getItem('nervbox_token');
  }

  /**
   * Load existing sound names from backend
   */
  loadExistingSoundNames(): Observable<void> {
    return this.api.get<Sound[]>('/sound').pipe(
      tap(sounds => {
        const names = new Set(sounds.map(s => s.name.toLowerCase()));
        this.existingSoundNames.set(names);
      }),
      map(() => void 0),
      catchError(() => of(void 0))
    );
  }

  /**
   * Check if a sound name already exists (case-insensitive)
   */
  nameExists(name: string): boolean {
    return this.existingSoundNames().has(name.toLowerCase().trim());
  }

  /**
   * Add a name to the cache (after successful upload)
   */
  addNameToCache(name: string): void {
    this.existingSoundNames.update(names => {
      const newNames = new Set(names);
      newNames.add(name.toLowerCase().trim());
      return newNames;
    });
  }
}
