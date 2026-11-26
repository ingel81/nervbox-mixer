import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  ChangeDetectionStrategy,
} from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BottomPanelService } from '../services/bottom-panel.service';
import { SoundBrowserComponent } from '../../sound-browser/components/sound-browser.component';
import { GridControlsComponent } from './grid-controls.component';
import { EffectsPanelComponent } from './effects-panel.component';

@Component({
  selector: 'bottom-panel',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    SoundBrowserComponent,
    GridControlsComponent,
    EffectsPanelComponent,
  ],
  template: `
    <!-- Tab Bar -->
    <div class="panel-tabs" [class.panel-open]="panelService.isOpen()">
      <div class="tab-container">
        @for (tab of panelService.tabs(); track tab) {
          <button
            class="panel-tab"
            [class.active]="panelService.activeTab() === tab.id"
            [class.raised]="
              panelService.isOpen() && panelService.activeTab() === tab.id
            "
            (click)="panelService.openTab(tab.id)"
            [matTooltip]="tab.description"
            matTooltipPosition="above"
          >
            <mat-icon>{{ tab.icon }}</mat-icon>
            <span class="tab-label">{{ tab.label }}</span>
          </button>
        }
      </div>
    </div>

    <!-- Panel Content -->
    <div
      class="panel-content"
      [class.open]="panelService.isOpen()"
      [style.height.px]="panelService.height()"
      [class.resizing]="panelService.isResizing()"
    >
      <!-- Resize Handle -->
      <div
        class="resize-handle"
        (mousedown)="startResize($event)"
        (touchstart)="startResize($event)"
      >
        <div class="resize-grip"></div>
      </div>

      <!-- Tab Content -->
      <div class="tab-content nervbox-scrollbar">
        <!-- Sounds Tab -->
        @if (panelService.activeTab() === 'sounds') {
          <div class="sounds-content">
            <sound-browser
              [openedFromCta]="false"
              [panelMode]="true"
              (soundSelected)="onSoundSelected($event)"
              (browserToggled)="panelService.closePanel()"
            >
            </sound-browser>
          </div>
        }

        <!-- Grid Tab -->
        @if (panelService.activeTab() === 'grid') {
          <div class="grid-content">
            <grid-controls></grid-controls>
          </div>
        }

        <!-- Effects Tab -->
        @if (panelService.activeTab() === 'effects') {
          <div class="effects-content">
            <effects-panel></effects-panel>
          </div>
        }

        <!-- Placeholder for other tabs -->
        @if (
          panelService.activeTab() !== 'sounds' &&
          panelService.activeTab() !== 'grid' &&
          panelService.activeTab() !== 'effects'
        ) {
          <div class="placeholder-content">
            <div class="placeholder-icon">
              <mat-icon>{{ panelService.activeTabConfig().icon }}</mat-icon>
            </div>
            <h3>{{ panelService.activeTabConfig().label }}</h3>
            <p>{{ panelService.activeTabConfig().description }}</p>
            <p class="coming-soon">Coming Soon</p>
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./bottom-panel.component.css'],
})
export class BottomPanelComponent implements OnInit, OnDestroy {
  private resizeStartY = 0;
  private resizeStartHeight = 0;

  constructor(public panelService: BottomPanelService) {}

  ngOnInit() {
    // Handle window resize to update max height
    window.addEventListener('resize', this.onWindowResize);
  }

  ngOnDestroy() {
    window.removeEventListener('resize', this.onWindowResize);
    this.panelService.stopResize();
  }

  private onWindowResize = () => {
    // Ensure panel height doesn't exceed new window size
    const currentHeight = this.panelService.height();
    const maxHeight = this.panelService.maxHeight();
    if (currentHeight > maxHeight) {
      this.panelService.setHeight(maxHeight);
    }
  };

  startResize(event: MouseEvent | TouchEvent) {
    event.preventDefault();

    const clientY =
      'touches' in event ? event.touches[0].clientY : event.clientY;
    this.resizeStartY = clientY;
    this.resizeStartHeight = this.panelService.height();

    this.panelService.startResize();

    // Add global listeners
    document.addEventListener('mousemove', this.onResize);
    document.addEventListener('mouseup', this.stopResize);
    document.addEventListener('touchmove', this.onResize);
    document.addEventListener('touchend', this.stopResize);
  }

  private onResize = (event: MouseEvent | TouchEvent) => {
    if (!this.panelService.isResizing()) return;

    const clientY =
      'touches' in event ? event.touches[0].clientY : event.clientY;
    const deltaY = this.resizeStartY - clientY; // Inverted because we're resizing from bottom
    const newHeight = this.resizeStartHeight + deltaY;

    this.panelService.setHeight(newHeight);
  };

  private stopResize = () => {
    this.panelService.stopResize();

    // Remove global listeners
    document.removeEventListener('mousemove', this.onResize);
    document.removeEventListener('mouseup', this.stopResize);
    document.removeEventListener('touchmove', this.onResize);
    document.removeEventListener('touchend', this.stopResize);
  };

  onSoundSelected(
    sound: AudioBuffer & { name: string; category: string; id: string }
  ) {
    // Forward to parent component (AudioEditor)
    // This will be handled by the parent component's event binding
    const event = new CustomEvent('soundSelected', { detail: sound });
    document.dispatchEvent(event);
  }

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    if (this.panelService.isOpen()) {
      this.panelService.closePanel();
    }
  }
}
