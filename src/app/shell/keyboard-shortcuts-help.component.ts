import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { animate, style, transition, trigger } from '@angular/animations';

// Interface für zukünftige Erweiterung der Shortcut-Kategorisierung
// interface ShortcutCategory {
//   title: string;
//   shortcuts: {
//     keys: string[];
//     description: string;
//   }[];
// }

@Component({
  selector: 'app-keyboard-shortcuts-help',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatCardModule, MatTooltipModule],
  template: `
    <div class="shortcuts-container" 
         *ngIf="isVisible()" 
         [@slideIn]>
      
      <mat-card class="shortcuts-card">
        <div class="shortcuts-header">
          <div class="header-title">
            <mat-icon>keyboard</mat-icon>
            <h3>Keyboard Shortcuts</h3>
          </div>
          <div class="header-actions">
            <button mat-icon-button (click)="hide()" matTooltip="Close">
              <mat-icon>close</mat-icon>
            </button>
          </div>
        </div>
        
        <div class="shortcuts-content">
          <div class="category" *ngFor="let category of categories">
            <h4>{{ category.title }}</h4>
            <div class="shortcut-list">
              <div class="shortcut-item" *ngFor="let shortcut of category.shortcuts">
                <div class="keys">
                  <ng-container *ngFor="let key of shortcut.keys; let last = last">
                    <kbd>{{ key }}</kbd>
                    <span *ngIf="!last" class="plus">+</span>
                  </ng-container>
                </div>
                <div class="description">{{ shortcut.description }}</div>
              </div>
            </div>
          </div>
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    .shortcuts-container {
      position: fixed;
      bottom: 32px;
      right: 16px;
      z-index: 1000;
      max-width: 480px;
      transition: all 0.3s ease;
    }
    
    .shortcuts-card {
      background: rgba(30, 30, 30, 0.98);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(156, 39, 176, 0.3);
      box-shadow: 0 8px 32px rgba(156, 39, 176, 0.2);
    }
    
    .shortcuts-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      border-bottom: 1px solid rgba(156, 39, 176, 0.2);
      
      .header-title {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
        
        mat-icon {
          color: #ba68c8;
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
        
        h3 {
          margin: 0;
          color: #9c27b0;
          font-size: 14px;
          font-weight: 500;
        }
      }
      
      
      .header-actions {
        display: flex;
        gap: 4px;
        
        button {
          color: rgba(186, 104, 200, 0.8);
          
          &:hover {
            color: #ba68c8;
            background: rgba(156, 39, 176, 0.2);
          }
        }
      }
    }
    
    
    .shortcuts-content {
      padding: 12px;
      max-height: 320px;
      overflow-y: auto;
      overflow-x: hidden;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      
      &::-webkit-scrollbar {
        width: 8px;
      }
      
      &::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.05);
      }
      
      &::-webkit-scrollbar-thumb {
        background: rgba(156, 39, 176, 0.4);
        border-radius: 4px;
        
        &:hover {
          background: rgba(156, 39, 176, 0.6);
        }
      }
    }
    
    .category {
      min-width: 0;
      
      h4 {
        color: #ba68c8;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin: 0 0 6px 0;
        padding-bottom: 4px;
        border-bottom: 1px solid rgba(156, 39, 176, 0.2);
      }
    }
    
    .shortcut-list {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    
    .shortcut-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 3px 4px;
      border-radius: 3px;
      transition: background 0.2s;
      min-width: 0;
      
      &:hover {
        background: rgba(156, 39, 176, 0.1);
      }
    }
    
    .keys {
      display: flex;
      align-items: center;
      gap: 2px;
      flex-shrink: 0;
      
      kbd {
        display: inline-flex;
        align-items: center;
        padding: 2px 4px;
        background: rgba(156, 39, 176, 0.12);
        border: 1px solid rgba(156, 39, 176, 0.25);
        border-radius: 3px;
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 10px;
        color: #e1bee7;
        font-weight: 500;
        line-height: 1.2;
      }
      
      .plus {
        margin: 0 1px;
        color: rgba(255, 255, 255, 0.3);
        font-size: 9px;
      }
    }
    
    .description {
      color: rgba(255, 255, 255, 0.7);
      font-size: 11px;
      line-height: 1.3;
      text-align: right;
      flex: 1;
      min-width: 0;
      white-space: nowrap;
    }
    
    
    @media (max-width: 600px) {
      .shortcuts-container {
        display: none;
      }
    }
  `],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateY(100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ transform: 'translateY(100%)', opacity: 0 }))
      ])
    ])
  ]
})
export class KeyboardShortcutsHelpComponent {
  isVisible = signal(false);
  
  categories = [
    {
      title: 'Playback',
      shortcuts: [
        { keys: ['Space'], description: 'Play/Pause' },
        { keys: ['L'], description: 'Toggle loop' },
        { keys: ['Alt', 'L'], description: 'Loop to clip' },
        { keys: ['Shift', 'I'], description: 'Loop start' },
        { keys: ['Shift', 'O'], description: 'Loop end' }
      ]
    },
    {
      title: 'Editing',
      shortcuts: [
        { keys: ['S'], description: 'Split at playhead' },
        { keys: ['Delete'], description: 'Delete clip' },
        { keys: ['Ctrl', 'C'], description: 'Copy clip' },
        { keys: ['Ctrl', 'V'], description: 'Paste clip' },
        { keys: ['Ctrl', 'Scroll'], description: 'Zoom timeline' },
        { keys: ['Shift', 'Drag'], description: 'Bypass grid snap' }
      ]
    }
  ];
  
  constructor() {
    // Show on initial load only on desktop
    if (!this.isTouchDevice()) {
      setTimeout(() => {
        this.show();
      }, 1000);
    }
  }
  
  show() {
    if (!this.isTouchDevice()) {
      this.isVisible.set(true);
    }
  }
  
  hide() {
    this.isVisible.set(false);
  }
  
  toggle() {
    if (!this.isTouchDevice()) {
      this.isVisible.update(v => !v);
    }
  }
  
  private isTouchDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }
}