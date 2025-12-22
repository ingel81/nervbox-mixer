import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Tag } from '../models/tag.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TagService {
  private readonly http = inject(HttpClient);

  private readonly _tags = signal<Tag[]>([]);
  private readonly _loading = signal(false);
  private readonly _loaded = signal(false);

  readonly tags = computed(() => this._tags());
  readonly loading = computed(() => this._loading());

  // Map: tag name -> color
  readonly tagColorMap = computed(() => {
    const map: Record<string, string> = {};
    for (const tag of this._tags()) {
      map[tag.name] = tag.color;
    }
    return map;
  });

  // Pinned tag names (for priority display)
  readonly pinnedTagNames = computed(() => {
    return this._tags()
      .filter(t => t.isPinned)
      .map(t => t.name);
  });

  // All tag names sorted (pinned first, then alphabetically)
  readonly sortedTagNames = computed(() => {
    const pinned = this.pinnedTagNames();
    const all = this._tags().map(t => t.name);
    const nonPinned = all.filter(n => !pinned.includes(n)).sort();
    return [...pinned.sort(), ...nonPinned];
  });

  async loadTags(): Promise<void> {
    // Only load in LAN mode
    if (!environment.nervboxApi) return;

    // Don't reload if already loaded
    if (this._loaded()) return;

    this._loading.set(true);
    try {
      const tags = await firstValueFrom(
        this.http.get<Tag[]>(`${environment.nervboxApi}/tags`)
      );
      this._tags.set(tags);
      this._loaded.set(true);
    } catch (error) {
      console.error('Failed to load tags:', error);
    } finally {
      this._loading.set(false);
    }
  }

  getTagColor(tagName: string): string {
    return this.tagColorMap()[tagName] || '#9333ea'; // Default purple
  }

  isPinned(tagName: string): boolean {
    return this.pinnedTagNames().includes(tagName);
  }
}
