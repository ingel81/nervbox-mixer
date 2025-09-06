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
      <!-- Alle Controls in einem Flow-Container -->
      <div class="controls-flow">
        <!-- Grid Toggles Gruppe -->
        <div class="toggle-group">
          <mat-slide-toggle [ngModel]="editorState.showGrid()"
                            (ngModelChange)="editorState.showGrid.set($event)">
            <span class="toggle-label">
              <mat-icon>grid_on</mat-icon>
              Show Grid
            </span>
          </mat-slide-toggle>
          
          <mat-slide-toggle [ngModel]="editorState.snapToGrid()"
                            (ngModelChange)="editorState.snapToGrid.set($event)">
            <span class="toggle-label">
              <mat-icon>straighten</mat-icon>
              Snap to Grid
            </span>
          </mat-slide-toggle>
        </div>
        
        <!-- BPM Gruppe -->
        <div class="bpm-group">
          <mat-form-field subscriptSizing="dynamic" class="bpm-field">
            <mat-label>BPM</mat-label>
            <input matInput 
                   type="number" 
                   [ngModel]="editorState.bpm()"
                   (ngModelChange)="setBPM($event)"
                   min="60" 
                   max="200" 
                   step="1"
                   matTooltip="Beats per minute">
          </mat-form-field>
          
          <button mat-button 
                  class="bpm-preset"
                  (click)="setBPM(90)" 
                  [class.active]="editorState.bpm() === 90"
                  matTooltip="Hip-Hop">
            90
          </button>
          <button mat-button 
                  class="bpm-preset"
                  (click)="setBPM(120)" 
                  [class.active]="editorState.bpm() === 120"
                  matTooltip="House">
            120
          </button>
          <button mat-button 
                  class="bpm-preset"
                  (click)="setBPM(140)" 
                  [class.active]="editorState.bpm() === 140"
                  matTooltip="Dubstep">
            140
          </button>
          <button mat-button 
                  class="bpm-preset"
                  (click)="setBPM(174)" 
                  [class.active]="editorState.bpm() === 174"
                  matTooltip="Drum & Bass">
            174
          </button>
        </div>
        
        <!-- Time Signature -->
        <mat-form-field subscriptSizing="dynamic">
          <mat-label>Time Signature</mat-label>
          <mat-select [ngModel]="getTimeSignatureString()" 
                      (ngModelChange)="setTimeSignature($event)"
                      matTooltip="Beats per bar">
            <mat-option value="4/4">4/4</mat-option>
            <mat-option value="3/4">3/4</mat-option>
            <mat-option value="6/8">6/8</mat-option>
            <mat-option value="7/8">7/8</mat-option>
          </mat-select>
        </mat-form-field>
        
        <!-- Grid Resolution -->
        <mat-form-field subscriptSizing="dynamic">
          <mat-label>Grid</mat-label>
          <mat-select [ngModel]="editorState.gridSubdivision()"
                      (ngModelChange)="editorState.gridSubdivision.set($event)"
                      matTooltip="{{ getGridSpacingInMs() }}ms spacing">
            <mat-option value="bar">Bars</mat-option>
            <mat-option value="1/2">1/2 Notes</mat-option>
            <mat-option value="1/4">1/4 Notes</mat-option>
            <mat-option value="1/8">1/8 Notes</mat-option>
            <mat-option value="1/16">1/16 Notes</mat-option>
          </mat-select>
        </mat-form-field>
        
        <!-- Grid Info Gruppe -->
        <div class="info-group">
          <div class="info-item">
            <span class="label">Beat Duration</span>
            <span class="value">{{ getBeatDurationMs() }}ms</span>
          </div>
          <div class="info-item">
            <span class="label">Bar Duration</span>
            <span class="value">{{ getBarDurationMs() }}ms</span>
          </div>
          <div class="info-item">
            <span class="label">Grid Spacing</span>
            <span class="value">{{ getGridSpacingInMs() }}ms</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .grid-controls {
      padding: 12px;
      width: 100%;
      box-sizing: border-box;
      overflow-x: hidden;
    }
    
    /* Flow-Layout mit automatischem Umbruch */
    .controls-flow {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      align-items: center;
      width: 100%;
      box-sizing: border-box;
    }
    
    /* Alle direkten Kinder als Gruppen */
    .controls-flow > * {
      flex: 0 0 auto;
    }
    
    /* Toggle Gruppe */
    .toggle-group {
      display: flex;
      gap: 12px;
      align-items: center;
    }
    
    /* BPM Gruppe */
    .bpm-group {
      display: flex;
      gap: 6px;
      align-items: center;
    }
    
    /* BPM Field kompakt */
    .bpm-field {
      width: 90px !important;
    }
    
    /* Info Gruppe */
    .info-group {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }
    
    /* BPM Preset Buttons inline */
    .bpm-preset {
      min-width: 38px;
      height: 36px;
      background: rgba(147, 51, 234, 0.1);
      border: 1px solid rgba(147, 51, 234, 0.3);
      color: rgba(255, 255, 255, 0.7);
      transition: all 0.2s ease;
      padding: 0 6px;
      font-size: 12px;
    }
    
    .bpm-preset:hover {
      background: rgba(147, 51, 234, 0.2);
      border-color: rgba(147, 51, 234, 0.5);
      color: rgba(255, 255, 255, 0.9);
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(147, 51, 234, 0.3);
    }
    
    .bpm-preset.active {
      background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
      border-color: #9333ea;
      color: white;
      box-shadow: 0 0 15px rgba(147, 51, 234, 0.5);
    }
    
    /* Toggle with NervBox purple theme */
    .toggle-label {
      display: flex;
      align-items: center;
      gap: 4px;
      color: rgba(255, 255, 255, 0.85);
      font-size: 13px;
    }
    
    .toggle-label mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: rgba(147, 51, 234, 0.7);
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
    
    /* Info Items direkt im Flow */
    .info-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 6px 8px;
      background: rgba(10, 0, 15, 0.5);
      border: 1px solid rgba(147, 51, 234, 0.3);
      border-radius: 4px;
      transition: all 0.2s ease;
      flex: 0 0 auto;
      min-width: 65px;
    }
    
    .info-item:hover {
      border-color: rgba(147, 51, 234, 0.5);
    }
    
    .info-item .label {
      font-size: 8px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: rgba(147, 51, 234, 0.7);
      font-weight: 500;
      line-height: 1;
    }
    
    .info-item .value {
      font-size: 12px;
      font-weight: 400;
      color: rgba(255, 255, 255, 0.87);
      margin-top: 1px;
      line-height: 1.2;
    }
    
    /* Material Form Field Overrides for NervBox theme */
    ::ng-deep .mat-mdc-form-field {
      --mdc-outlined-text-field-focus-outline-color: #9333ea;
      --mdc-theme-primary: #9333ea;
      --mat-form-field-focus-select-arrow-color: #9333ea;
      --mat-form-field-container-height: 40px;
      --mat-form-field-container-vertical-padding: 6px;
      --mdc-outlined-text-field-container-shape: 4px;
    }
    
    
    ::ng-deep .mat-mdc-form-field .mdc-text-field--outlined .mdc-notched-outline__leading,
    ::ng-deep .mat-mdc-form-field .mdc-text-field--outlined .mdc-notched-outline__notch,
    ::ng-deep .mat-mdc-form-field .mdc-text-field--outlined .mdc-notched-outline__trailing {
      border-color: rgba(147, 51, 234, 0.3) !important;
      border-width: 1px !important;
    }
    
    ::ng-deep .mat-mdc-form-field:hover .mdc-text-field--outlined .mdc-notched-outline__leading,
    ::ng-deep .mat-mdc-form-field:hover .mdc-text-field--outlined .mdc-notched-outline__notch,
    ::ng-deep .mat-mdc-form-field:hover .mdc-text-field--outlined .mdc-notched-outline__trailing {
      border-color: rgba(147, 51, 234, 0.5) !important;
      border-width: 1px !important;
    }
    
    ::ng-deep .mat-mdc-form-field.mat-focused .mdc-text-field--outlined .mdc-notched-outline__leading,
    ::ng-deep .mat-mdc-form-field.mat-focused .mdc-text-field--outlined .mdc-notched-outline__notch,
    ::ng-deep .mat-mdc-form-field.mat-focused .mdc-text-field--outlined .mdc-notched-outline__trailing {
      border-color: #9333ea !important;
      border-width: 2px !important;
    }
    
    ::ng-deep .mat-mdc-form-field .mdc-text-field {
      background: rgba(40, 30, 50, 0.6) !important;
      caret-color: #9333ea !important;
    }
    
    ::ng-deep .mat-mdc-form-field:hover .mdc-text-field {
      background: rgba(45, 35, 55, 0.7) !important;
    }
    
    ::ng-deep .mat-mdc-form-field.mat-focused .mdc-text-field {
      background: rgba(50, 40, 60, 0.8) !important;
    }
    
    ::ng-deep .mat-mdc-form-field .mdc-text-field--outlined {
      padding: 0 !important;
    }
    
    ::ng-deep .mat-mdc-form-field input,
    ::ng-deep .mat-mdc-form-field .mat-mdc-select-value {
      color: rgba(255, 255, 255, 0.87) !important;
      font-size: 14px !important;
    }
    
    ::ng-deep .mat-mdc-form-field .mdc-floating-label {
      color: rgba(147, 51, 234, 0.7) !important;
      font-size: 11px !important;
      font-weight: 500 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
    }
    
    ::ng-deep .mat-mdc-form-field.mat-focused .mdc-floating-label {
      color: #9333ea !important;
    }
    
    ::ng-deep .mat-mdc-form-field .mat-mdc-form-field-hint {
      color: rgba(147, 51, 234, 0.5) !important;
      font-size: 11px !important;
    }
    
    ::ng-deep .mat-mdc-form-field .mat-mdc-select-arrow {
      color: rgba(147, 51, 234, 0.7) !important;
    }
    
    ::ng-deep .mat-mdc-form-field.mat-focused .mat-mdc-select-arrow {
      color: #9333ea !important;
    }
    
    /* Dropdown panel with better visibility */
    ::ng-deep .mat-mdc-select-panel {
      background: #0a0012 !important;
      border: 1px solid rgba(147, 51, 234, 0.3);
    }
    
    ::ng-deep .mat-mdc-option {
      color: white !important;
      background: #0a0012 !important;
    }
    
    ::ng-deep .mat-mdc-option:hover:not(.mat-mdc-option-disabled) {
      background: rgba(147, 51, 234, 0.3) !important;
    }
    
    ::ng-deep .mat-mdc-option.mat-mdc-option-active {
      background: rgba(147, 51, 234, 0.4) !important;
    }
    
    ::ng-deep .mat-mdc-option.mdc-list-item--selected {
      background: rgba(147, 51, 234, 0.35) !important;
    }
    
    /* Mobile - Einfaches Flow-Layout bleibt */
    @media (max-width: 768px) {
      .grid-controls {
        padding: 8px;
      }
      
      .controls-flow {
        gap: 8px;
      }
      
      /* BPM Field noch kompakter auf Mobile */
      .bpm-field {
        width: 80px !important;
      }
      
      /* Preset Buttons kompakter */
      .bpm-preset {
        min-width: 32px;
        padding: 0 4px;
        font-size: 11px;
        height: 32px;
      }
      
      /* Info Items kompakter */
      .info-item {
        min-width: 55px;
        padding: 4px 6px;
      }
      
      .info-item .label {
        font-size: 7px;
      }
      
      .info-item .value {
        font-size: 10px;
      }
      
      /* Form Fields kompakter */
      ::ng-deep .mat-mdc-form-field {
        --mat-form-field-container-height: 36px;
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