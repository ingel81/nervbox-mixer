import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';

import { EditorStateService } from '../audio/services/editor-state.service';
import { ArrangementStorageService } from '../audio/services/arrangement-storage.service';
import { DefaultArrangementService } from '../audio/services/default-arrangement.service';

@Component({
  selector: 'project-management',
  standalone: true,
  imports: [
    CommonModule, 
    MatButtonModule, 
    MatIconModule, 
    MatMenuModule, 
    MatDividerModule,
    MatTooltipModule
  ],
  template: `
    <button mat-button 
            [matMenuTriggerFor]="arrangementMenu" 
            class="arrangement-btn" 
            matTooltip="Arrangements">
      <mat-icon>folder</mat-icon>
      Arrangements
      <mat-icon>arrow_drop_down</mat-icon>
    </button>
    
    <mat-menu #arrangementMenu="matMenu">
      <button mat-menu-item (click)="newArrangement()">
        <mat-icon>add</mat-icon>
        <span>New Arrangement</span>
      </button>
      <button mat-menu-item (click)="saveArrangement()">
        <mat-icon>save</mat-icon>
        <span>Save Arrangement</span>
      </button>
      <button mat-menu-item (click)="loadArrangement()">
        <mat-icon>folder_open</mat-icon>
        <span>Load Arrangement</span>
      </button>
      <mat-divider></mat-divider>
      <button mat-menu-item (click)="deleteArrangement()" class="delete-menu-item">
        <mat-icon>delete</mat-icon>
        <span>Delete Arrangement</span>
      </button>
    </mat-menu>
  `,
  styles: [`
    .arrangement-btn {
      background: rgba(147, 51, 234, 0.1) !important;
      color: rgba(147, 51, 234, 0.9) !important;
      font-weight: 600 !important;
      font-size: 11px !important;
      text-transform: uppercase !important;
      letter-spacing: 1px !important;
      font-family: 'JetBrains Mono', monospace !important;
      padding: 0 12px !important;
      height: 36px !important;
      margin-left: 8px !important;
      border: 1px solid rgba(147, 51, 234, 0.2) !important;
      transition: all 0.15s ease !important;
    }
    
    .arrangement-btn:hover {
      background: rgba(147, 51, 234, 0.2) !important;
      color: rgba(236, 72, 153, 1) !important;
      border-color: rgba(147, 51, 234, 0.5) !important;
      transform: translateY(-1px);
    }
    
    .arrangement-btn mat-icon {
      margin-right: 4px !important;
    }
    
    .delete-menu-item {
      color: #ef4444 !important;
    }
    
    .delete-menu-item mat-icon {
      color: #ef4444 !important;
    }
    
    .delete-menu-item:hover {
      background: rgba(239, 68, 68, 0.1) !important;
    }
  `]
})
export class ProjectManagementComponent {
  
  constructor(
    private editorState: EditorStateService,
    private arrangementStorage: ArrangementStorageService,
    private defaultArrangement: DefaultArrangementService
  ) {}
  
  saveArrangement(): void {
    const name = prompt('Enter arrangement name:');
    if (!name) return;
    
    this.arrangementStorage.saveArrangement(name, this.editorState.tracks());
    alert(`Arrangement "${name}" saved successfully.`);
  }
  
  loadArrangement(): void {
    const arrangements = this.arrangementStorage.savedArrangements();
    if (arrangements.length === 0) {
      alert('No saved arrangements found.');
      return;
    }
    
    // Create selection dialog
    let message = 'Select arrangement to load:\n\n';
    arrangements.forEach((arr, index) => {
      const date = arr.updatedAt.toLocaleDateString();
      const time = arr.updatedAt.toLocaleTimeString();
      message += `${index + 1}. ${arr.name} (${date} ${time})\n`;
    });
    message += '\nEnter number (1-' + arrangements.length + '):';
    
    const selection = prompt(message);
    const index = parseInt(selection || '') - 1;
    
    if (index >= 0 && index < arrangements.length) {
      const selectedArrangement = arrangements[index];
      this.editorState.tracks.set(selectedArrangement.tracks);
      this.editorState.stop();
      alert(`Arrangement "${selectedArrangement.name}" loaded.`);
    }
  }
  
  async newArrangement(): Promise<void> {
    if (this.editorState.tracks().length > 0) {
      const shouldContinue = confirm('This will clear the current arrangement. Continue?');
      if (!shouldContinue) return;
    }
    
    this.editorState.clearArrangement();
    
    // Add default hip hop track
    const defaultTracks = await this.defaultArrangement.createDefaultHipHopTracks();
    this.editorState.tracks.set(defaultTracks);
  }
  
  deleteArrangement(): void {
    const arrangements = this.arrangementStorage.savedArrangements();
    if (arrangements.length === 0) {
      alert('No saved arrangements found.');
      return;
    }
    
    // Create selection dialog
    let message = 'Select arrangement to delete:\n\n';
    arrangements.forEach((arr, index) => {
      const date = arr.updatedAt.toLocaleDateString();
      const time = arr.updatedAt.toLocaleTimeString();
      message += `${index + 1}. ${arr.name} (${date} ${time})\n`;
    });
    message += '\nEnter number (1-' + arrangements.length + '):';
    
    const selection = prompt(message);
    const index = parseInt(selection || '') - 1;
    
    if (index >= 0 && index < arrangements.length) {
      const selectedArrangement = arrangements[index];
      if (confirm(`Delete arrangement "${selectedArrangement.name}"? This cannot be undone.`)) {
        this.arrangementStorage.deleteArrangement(selectedArrangement.id);
        alert(`Arrangement "${selectedArrangement.name}" deleted.`);
      }
    }
  }
}