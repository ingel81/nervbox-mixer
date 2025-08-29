import { Injectable, signal, computed } from '@angular/core';

export type TabType = 'sounds' | 'mixer' | 'effects' | 'piano' | 'analysis' | 'settings';

export interface TabConfig {
  id: TabType;
  label: string;
  icon: string;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class BottomPanelService {
  // Panel state
  private _isOpen = signal(false);
  private _activeTab = signal<TabType>('sounds');
  private _height = signal(this.getInitialHeight()); // Default height based on screen size
  private _isResizing = signal(false);

  // Tab configurations
  readonly tabs: TabConfig[] = [
    { id: 'sounds', label: 'Sounds', icon: 'library_music', description: 'Browse and add sounds to your project' }
  ];

  // Public readonly signals
  readonly isOpen = this._isOpen.asReadonly();
  readonly activeTab = this._activeTab.asReadonly();
  readonly height = this._height.asReadonly();
  readonly isResizing = this._isResizing.asReadonly();

  // Computed signals
  readonly activeTabConfig = computed(() => 
    this.tabs.find(tab => tab.id === this._activeTab()) || this.tabs[0]
  );

  readonly maxHeight = computed(() => {
    // Allow near-fullscreen (leave minimal space for tab bar and some UI)
    return window.innerHeight - 80; // Leave space for tab bar (56px) + some margin
  });

  // Helper methods
  private getInitialHeight(): number {
    const isMobile = window.innerWidth <= 768;
    const isLandscape = window.innerWidth > window.innerHeight;
    
    if (isMobile) {
      if (isLandscape) {
        return Math.min(window.innerHeight * 0.3, 250); // Default 30% in landscape, max 250px
      }
      return Math.min(window.innerHeight * 0.4, 350); // Default 40% in portrait, max 350px
    }
    return 400; // Default desktop height
  }

  // Actions
  openTab(tabId: TabType) {
    if (this._activeTab() === tabId && this._isOpen()) {
      // Clicking active tab closes panel
      this._isOpen.set(false);
    } else {
      // Open with selected tab
      this._activeTab.set(tabId);
      this._isOpen.set(true);
      // Reset to appropriate height for current screen size
      const currentHeight = this._height();
      const maxHeight = this.maxHeight();
      if (currentHeight > maxHeight) {
        this.setHeight(Math.min(currentHeight, maxHeight));
      }
    }
  }

  closePanel() {
    this._isOpen.set(false);
  }

  togglePanel() {
    this._isOpen.set(!this._isOpen());
  }

  setHeight(height: number) {
    const maxHeight = this.maxHeight();
    const minHeight = 100; // Allow very compact panel size
    
    const constrainedHeight = Math.max(minHeight, Math.min(height, maxHeight));
    this._height.set(constrainedHeight);
  }

  startResize() {
    this._isResizing.set(true);
  }

  stopResize() {
    this._isResizing.set(false);
  }

  getTabConfig(tabId: TabType): TabConfig | undefined {
    return this.tabs.find(tab => tab.id === tabId);
  }
}