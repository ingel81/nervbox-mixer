import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EditorStateService } from '../services/editor-state.service';

@Component({
  selector: 'grid-controls',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  template: `
    <div class="grid-controls">
      <!-- BPM Control -->
      <div class="control-group">
        <mat-form-field>
          <mat-label>BPM</mat-label>
          <input matInput 
                 type="number" 
                 [ngModel]="editorState.bpm()"
                 (ngModelChange)="setBPM($event)"
                 min="60" 
                 max="200" 
                 step="1">
          <mat-hint>Beats per minute</mat-hint>
        </mat-form-field>
        
        <!-- BPM Presets -->
        <div class="bpm-presets">
          <button mat-button 
                  (click)="setBPM(90)" 
                  [class.active]="editorState.bpm() === 90"
                  matTooltip="Hip-Hop">
            90
          </button>
          <button mat-button 
                  (click)="setBPM(120)" 
                  [class.active]="editorState.bpm() === 120"
                  matTooltip="House">
            120
          </button>
          <button mat-button 
                  (click)="setBPM(140)" 
                  [class.active]="editorState.bpm() === 140"
                  matTooltip="Dubstep">
            140
          </button>
          <button mat-button 
                  (click)="setBPM(174)" 
                  [class.active]="editorState.bpm() === 174"
                  matTooltip="Drum & Bass">
            174
          </button>
        </div>
      </div>
      
      <!-- Time Signature -->
      <div class="control-group">
        <mat-form-field>
          <mat-label>Taktart</mat-label>
          <mat-select [ngModel]="getTimeSignatureString()" 
                      (ngModelChange)="setTimeSignature($event)">
            <mat-option value="4/4">4/4</mat-option>
            <mat-option value="3/4">3/4</mat-option>
            <mat-option value="6/8">6/8</mat-option>
            <mat-option value="7/8">7/8</mat-option>
          </mat-select>
        </mat-form-field>
      </div>
      
      <!-- Grid Resolution -->
      <div class="control-group">
        <mat-form-field>
          <mat-label>Grid Auflösung</mat-label>
          <mat-select [ngModel]="editorState.gridSubdivision()"
                      (ngModelChange)="editorState.gridSubdivision.set($event)">
            <mat-option value="bar">Takte</mat-option>
            <mat-option value="1/2">1/2 Noten</mat-option>
            <mat-option value="1/4">1/4 Noten</mat-option>
            <mat-option value="1/8">1/8 Noten</mat-option>
            <mat-option value="1/16">1/16 Noten</mat-option>
          </mat-select>
          <mat-hint>{{ getGridSpacingInMs() }}ms Abstand</mat-hint>
        </mat-form-field>
      </div>
      
      <!-- Snap Toggle -->
      <div class="control-group">
        <mat-slide-toggle [ngModel]="editorState.snapToGrid()"
                          (ngModelChange)="editorState.snapToGrid.set($event)">
          <span class="toggle-label">
            Snap to Grid
            <mat-icon class="info-icon" 
                      matTooltip="Clips rasten automatisch am Grid ein">
              info_outline
            </mat-icon>
          </span>
        </mat-slide-toggle>
      </div>
      
      <!-- Grid Info Display -->
      <div class="grid-info">
        <div class="info-item">
          <span class="label">Beat Duration:</span>
          <span class="value">{{ getBeatDurationMs() }}ms</span>
        </div>
        <div class="info-item">
          <span class="label">Bar Duration:</span>
          <span class="value">{{ getBarDurationMs() }}ms</span>
        </div>
        <div class="info-item">
          <span class="label">Grid Spacing:</span>
          <span class="value">{{ getGridSpacingInMs() }}ms</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .grid-controls {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-width: 600px;
    }
    
    .control-group {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    
    .bpm-presets {
      display: flex;
      gap: 8px;
    }
    
    .bpm-presets button {
      min-width: 50px;
    }
    
    .bpm-presets button.active {
      background-color: var(--accent-color);
      color: white;
    }
    
    .toggle-label {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .info-icon {
      font-size: 18px;
      opacity: 0.7;
    }
    
    .grid-info {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
    }
    
    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .info-item .label {
      font-size: 12px;
      opacity: 0.7;
    }
    
    .info-item .value {
      font-size: 14px;
      font-weight: 500;
    }
    
    @media (max-width: 768px) {
      .grid-controls {
        padding: 12px;
      }
      
      .control-group {
        flex-direction: column;
        align-items: stretch;
      }
      
      .bpm-presets {
        justify-content: space-between;
      }
      
      .grid-info {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class GridControlsComponent {
  editorState = inject(EditorStateService);
  
  setBPM(value: number): void {
    if (value >= 60 && value <= 200) {
      this.editorState.bpm.set(value);
    }
  }
  
  getTimeSignatureString(): string {
    const sig = this.editorState.timeSignature();
    return `${sig.numerator}/${sig.denominator}`;
  }
  
  setTimeSignature(value: string): void {
    const [numerator, denominator] = value.split('/').map(Number);
    this.editorState.timeSignature.set({ numerator, denominator });
  }
  
  getBeatDurationMs(): string {
    return (this.editorState.beatDuration() * 1000).toFixed(1);
  }
  
  getBarDurationMs(): string {
    return (this.editorState.barDuration() * 1000).toFixed(1);
  }
  
  getGridSpacingInMs(): string {
    return (this.editorState.gridSpacing() * 1000).toFixed(1);
  }
}