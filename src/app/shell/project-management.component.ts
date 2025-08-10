import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { EditorStateService } from '../audio/services/editor-state.service';
import { ArrangementStorageService } from '../audio/services/arrangement-storage.service';
import { DefaultArrangementService } from '../audio/services/default-arrangement.service';
import { SaveArrangementDialogComponent } from '../audio/components/dialogs/save-arrangement-dialog.component';
import { LoadArrangementDialogComponent } from '../audio/components/dialogs/load-arrangement-dialog.component';
import { ConfirmDialogComponent } from '../audio/components/dialogs/confirm-dialog.component';

@Component({
  selector: 'project-management',
  standalone: true,
  imports: [
    CommonModule, 
    MatButtonModule, 
    MatIconModule, 
    MatMenuModule, 
    MatDividerModule,
    MatTooltipModule,
    MatSnackBarModule
  ],
  template: `
    <button mat-button 
            [matMenuTriggerFor]="arrangementMenu" 
            class="arrangement-btn" 
            matTooltip="Arrangements">
      <mat-icon>folder</mat-icon>
      <span class="btn-text">Arrangements</span>
      <mat-icon class="dropdown-icon">arrow_drop_down</mat-icon>
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
    </mat-menu>
  `,
  styles: [`
    :host {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      height: 48px;
    }
    
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
    
    .dropdown-icon {
      margin-left: 2px !important;
      margin-right: 0 !important;
    }
    
    /* Mobile styles */
    @media (max-width: 768px) {
      :host {
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: flex-start;
      }
      
      .btn-text {
        display: none;
      }
      
      .dropdown-icon {
        display: none;
      }
      
      .arrangement-btn {
        min-width: auto !important;
        width: 40px !important;
        height: 40px !important;
        padding: 0 !important;
        margin: 0 !important;
        background: transparent !important;
        border: none !important;
        border-radius: 0 !important;
        box-shadow: none !important;
      }
      
      .arrangement-btn:hover {
        background: rgba(147, 51, 234, 0.1) !important;
        transform: none;
        box-shadow: none !important;
      }
      
      .arrangement-btn mat-icon {
        margin: 0 !important;
        font-size: 20px !important;
        width: 20px !important;
        height: 20px !important;
        color: rgba(255, 255, 255, 0.9) !important;
      }
    }
  `]
})
export class ProjectManagementComponent {
  
  constructor(
    private editorState: EditorStateService,
    private arrangementStorage: ArrangementStorageService,
    private defaultArrangement: DefaultArrangementService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}
  
  saveArrangement(): void {
    const currentName = this.editorState.currentArrangementName();
    
    const dialogRef = this.dialog.open(SaveArrangementDialogComponent, {
      width: '500px',
      data: { currentName: currentName === 'Untitled' ? '' : currentName }
    });

    dialogRef.afterClosed().subscribe(name => {
      if (name) {
        this.arrangementStorage.saveArrangement(name, this.editorState.tracks());
        this.editorState.setArrangementName(name);
        this.snackBar.open(`Arrangement "${name}" saved successfully`, 'Close', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
      }
    });
  }
  
  loadArrangement(): void {
    const dialogRef = this.dialog.open(LoadArrangementDialogComponent, {
      width: '600px',
      maxHeight: '80vh'
    });

    dialogRef.afterClosed().subscribe(async (selectedArrangement) => {
      if (selectedArrangement) {
        const tracks = await this.arrangementStorage.loadArrangement(selectedArrangement.id);
        if (tracks) {
          this.editorState.tracks.set(tracks);
          this.editorState.setArrangementName(selectedArrangement.arrangement.name);
          this.editorState.stop();
          this.snackBar.open(`Arrangement "${selectedArrangement.arrangement.name}" loaded`, 'Close', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom'
          });
        } else {
          this.snackBar.open('Failed to load arrangement', 'Close', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom'
          });
        }
      }
    });
  }
  
  async newArrangement(): Promise<void> {
    if (this.editorState.tracks().length > 0) {
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: 'New Arrangement',
          message: 'This will clear the current arrangement. Any unsaved changes will be lost. Continue?',
          confirmText: 'Create New',
          cancelText: 'Cancel',
          icon: 'warning'
        }
      });

      const confirmed = await dialogRef.afterClosed().toPromise();
      if (!confirmed) return;
    }
    
    this.editorState.clearArrangement();
    this.editorState.setArrangementName('Untitled');
    
    // Add a single empty track
    this.editorState.addTrack();
    
    this.snackBar.open('New arrangement created', 'Close', {
      duration: 2000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }
}