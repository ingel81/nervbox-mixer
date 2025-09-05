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
          <mat-label>Time Signature</mat-label>
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
          <mat-label>Grid Resolution</mat-label>
          <mat-select [ngModel]="editorState.gridSubdivision()"
                      (ngModelChange)="editorState.gridSubdivision.set($event)">
            <mat-option value="bar">Bars</mat-option>
            <mat-option value="1/2">1/2 Notes</mat-option>
            <mat-option value="1/4">1/4 Notes</mat-option>
            <mat-option value="1/8">1/8 Notes</mat-option>
            <mat-option value="1/16">1/16 Notes</mat-option>
          </mat-select>
          <mat-hint>{{ getGridSpacingInMs() }}ms spacing</mat-hint>
        </mat-form-field>
      </div>
      
      <!-- Snap Toggle -->
      <div class="control-group">
        <mat-slide-toggle [ngModel]="editorState.snapToGrid()"
                          (ngModelChange)="editorState.snapToGrid.set($event)">
          <span class="toggle-label">
            Snap to Grid
            <mat-icon class="info-icon" 
                      matTooltip="Clips automatically snap to grid positions">
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
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      max-width: 600px;
      background: rgba(10, 0, 15, 0.6);
      border-radius: 8px;
      border: 1px solid rgba(147, 51, 234, 0.2);
    }
    
    .control-group {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    
    /* BPM Preset Buttons - NervBox Style */
    .bpm-presets {
      display: flex;
      gap: 8px;
    }
    
    .bpm-presets button {
      min-width: 50px;
      background: rgba(147, 51, 234, 0.1);
      border: 1px solid rgba(147, 51, 234, 0.3);
      color: rgba(255, 255, 255, 0.7);
      transition: all 0.2s ease;
    }
    
    .bpm-presets button:hover {
      background: rgba(147, 51, 234, 0.2);
      border-color: rgba(147, 51, 234, 0.5);
      color: rgba(255, 255, 255, 0.9);
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(147, 51, 234, 0.3);
    }
    
    .bpm-presets button.active {
      background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
      border-color: #9333ea;
      color: white;
      box-shadow: 0 0 15px rgba(147, 51, 234, 0.5);
    }
    
    /* Toggle with NervBox purple theme */
    .toggle-label {
      display: flex;
      align-items: center;
      gap: 8px;
      color: rgba(255, 255, 255, 0.85);
    }
    
    ::ng-deep .mat-mdc-slide-toggle.mat-accent {
      --mdc-switch-selected-track-color: #9333ea;
      --mdc-switch-selected-handle-color: #ec4899;
      --mdc-switch-selected-hover-track-color: #a855f7;
      --mdc-switch-selected-pressed-track-color: #7c3aed;
    }
    
    .info-icon {
      font-size: 18px;
      opacity: 0.5;
      color: #9333ea;
      transition: opacity 0.2s ease;
    }
    
    .info-icon:hover {
      opacity: 0.8;
    }
    
    /* Grid Info Panel - Glassmorphism style */
    .grid-info {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      padding: 16px;
      background: linear-gradient(135deg, 
        rgba(147, 51, 234, 0.08) 0%, 
        rgba(236, 72, 153, 0.08) 100%);
      border-radius: 6px;
      border: 1px solid rgba(147, 51, 234, 0.2);
      backdrop-filter: blur(10px);
      box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.05);
    }
    
    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .info-item .label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.5;
      color: #a855f7;
    }
    
    .info-item .value {
      font-size: 16px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.9);
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    }
    
    /* Material Form Field Overrides for NervBox theme */
    ::ng-deep .mat-mdc-form-field {
      --mdc-outlined-text-field-focus-outline-color: #9333ea;
      --mdc-theme-primary: #9333ea;
      --mat-form-field-focus-select-arrow-color: #9333ea;
    }
    
    ::ng-deep .mat-mdc-form-field .mdc-text-field--outlined .mdc-notched-outline__leading,
    ::ng-deep .mat-mdc-form-field .mdc-text-field--outlined .mdc-notched-outline__notch,
    ::ng-deep .mat-mdc-form-field .mdc-text-field--outlined .mdc-notched-outline__trailing {
      border-color: rgba(147, 51, 234, 0.3) !important;
    }
    
    ::ng-deep .mat-mdc-form-field:hover .mdc-text-field--outlined .mdc-notched-outline__leading,
    ::ng-deep .mat-mdc-form-field:hover .mdc-text-field--outlined .mdc-notched-outline__notch,
    ::ng-deep .mat-mdc-form-field:hover .mdc-text-field--outlined .mdc-notched-outline__trailing {
      border-color: rgba(147, 51, 234, 0.5) !important;
    }
    
    ::ng-deep .mat-mdc-form-field.mat-focused .mdc-text-field--outlined .mdc-notched-outline__leading,
    ::ng-deep .mat-mdc-form-field.mat-focused .mdc-text-field--outlined .mdc-notched-outline__notch,
    ::ng-deep .mat-mdc-form-field.mat-focused .mdc-text-field--outlined .mdc-notched-outline__trailing {
      border-color: #9333ea !important;
    }
    
    ::ng-deep .mat-mdc-form-field .mdc-text-field {
      background: rgba(10, 0, 15, 0.5);
    }
    
    ::ng-deep .mat-mdc-form-field input,
    ::ng-deep .mat-mdc-form-field .mat-mdc-select-value {
      color: rgba(255, 255, 255, 0.9);
    }
    
    ::ng-deep .mat-mdc-form-field .mdc-floating-label {
      color: rgba(147, 51, 234, 0.7);
    }
    
    ::ng-deep .mat-mdc-form-field.mat-focused .mdc-floating-label {
      color: #9333ea;
    }
    
    ::ng-deep .mat-mdc-form-field .mat-mdc-form-field-hint {
      color: rgba(147, 51, 234, 0.5);
    }
    
    ::ng-deep .mat-mdc-select-panel {
      background: #1a0f1f;
      border: 1px solid rgba(147, 51, 234, 0.3);
    }
    
    ::ng-deep .mat-mdc-option:hover:not(.mat-mdc-option-disabled) {
      background: rgba(147, 51, 234, 0.1);
    }
    
    ::ng-deep .mat-mdc-option.mat-mdc-option-active {
      background: rgba(147, 51, 234, 0.2);
    }
    
    @media (max-width: 768px) {
      .grid-controls {
        padding: 16px;
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