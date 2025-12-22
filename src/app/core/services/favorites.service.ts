import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

const TOKEN_KEY = 'nervbox_token';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly http = inject(HttpClient);

  private readonly _favorites = signal<Set<string>>(new Set());
  private readonly _loading = signal(false);
  private readonly _loaded = signal(false);

  readonly favorites = computed(() => this._favorites());
  readonly loading = computed(() => this._loading());

  // Check if user is authenticated (token exists)
  readonly isAuthenticated = computed(() => {
    return !!localStorage.getItem(TOKEN_KEY);
  });

  isFavorite(hash: string): boolean {
    return this._favorites().has(hash);
  }

  async loadFavorites(): Promise<void> {
    // Only load in LAN mode and when authenticated
    if (!environment.nervboxApi || !this.isAuthenticated()) {
      this._favorites.set(new Set());
      return;
    }

    // Don't reload if already loaded
    if (this._loaded()) return;

    this._loading.set(true);
    try {
      const hashes = await firstValueFrom(
        this.http.get<string[]>(`${environment.nervboxApi}/sound/favorites`)
      );
      this._favorites.set(new Set(hashes));
      this._loaded.set(true);
    } catch (error) {
      console.error('Failed to load favorites:', error);
      this._favorites.set(new Set());
    } finally {
      this._loading.set(false);
    }
  }

  toggleFavorite(hash: string): void {
    if (!this.isAuthenticated() || !environment.nervboxApi) return;

    if (this.isFavorite(hash)) {
      this.removeFavorite(hash);
    } else {
      this.addFavorite(hash);
    }
  }

  private addFavorite(hash: string): void {
    // Optimistic update
    const newFavorites = new Set(this._favorites());
    newFavorites.add(hash);
    this._favorites.set(newFavorites);

    this.http.post(`${environment.nervboxApi}/sound/${hash}/favorite`, {}).subscribe({
      error: () => {
        // Rollback on error
        const rollback = new Set(this._favorites());
        rollback.delete(hash);
        this._favorites.set(rollback);
      },
    });
  }

  private removeFavorite(hash: string): void {
    // Optimistic update
    const newFavorites = new Set(this._favorites());
    newFavorites.delete(hash);
    this._favorites.set(newFavorites);

    this.http.delete(`${environment.nervboxApi}/sound/${hash}/favorite`).subscribe({
      error: () => {
        // Rollback on error
        const rollback = new Set(this._favorites());
        rollback.add(hash);
        this._favorites.set(rollback);
      },
    });
  }

  clearFavorites(): void {
    this._favorites.set(new Set());
    this._loaded.set(false);
  }
}
