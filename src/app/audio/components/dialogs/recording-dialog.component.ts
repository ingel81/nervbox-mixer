import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RecordingService } from '../../services/recording.service';

@Component({
  selector: 'recording-dialog',
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="dialog-icon">mic</mat-icon>
      Microphone Recording
    </h2>
    
    <mat-dialog-content>
      <div class="recording-container">
        <div class="recording-status" [class.active]="recordingService.isRecording()">
          <div class="status-indicator">
            <div class="pulse-ring" *ngIf="recordingService.isRecording()"></div>
            <mat-icon class="mic-icon">
              {{ recordingService.isRecording() ? 'mic' : 'mic_none' }}
            </mat-icon>
          </div>
          
          <div class="timer">
            {{ recordingService.formattedDuration() }}
          </div>
          
          <div class="level-meter">
            <mat-progress-bar 
              mode="determinate" 
              [value]="recordingService.audioLevel() * 100"
              [class.active]="recordingService.isRecording()">
            </mat-progress-bar>
            <span class="level-label">Audio Level</span>
          </div>
        </div>
        
        <div class="instructions" *ngIf="!recordingService.isRecording() && !hasRecording">
          <p>Click the record button to start recording from your microphone.</p>
          <p class="hint">Make sure to allow microphone access when prompted.</p>
        </div>
        
        <div class="instructions recording" *ngIf="recordingService.isRecording()">
          <p>Recording in progress...</p>
          <p class="hint">Click stop when you're done.</p>
        </div>
        
        <div class="instructions completed" *ngIf="hasRecording && !recordingService.isRecording()">
          <p>Recording complete!</p>
          <p class="hint">Click "Add to Track" to use this recording or record again.</p>
        </div>
      </div>
    </mat-dialog-content>
    
    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancel</button>
      
      <button mat-raised-button 
              color="warn"
              (click)="toggleRecording()"
              [disabled]="isProcessing">
        <mat-icon>{{ recordingService.isRecording() ? 'stop' : 'fiber_manual_record' }}</mat-icon>
        {{ recordingService.isRecording() ? 'Stop' : hasRecording ? 'Record Again' : 'Record' }}
      </button>
      
      <button mat-raised-button 
              color="primary"
              (click)="addToTrack()"
              [disabled]="!hasRecording || recordingService.isRecording() || isProcessing">
        <mat-icon>add</mat-icon>
        Add to Track
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host {
      display: block;
    }
    
    h2 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      padding: 16px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .dialog-icon {
      vertical-align: middle;
      margin-right: 8px;
      background: linear-gradient(135deg, #ef4444, #ec4899);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    mat-dialog-content {
      padding: 16px 24px !important;
      min-height: 140px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      overflow: hidden;
    }
    
    .recording-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    
    .recording-status {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 12px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.05);
      transition: all 0.3s ease;
      width: 100%;
    }
    
    .recording-status.active {
      background: rgba(239, 68, 68, 0.1);
      box-shadow: 0 0 20px rgba(239, 68, 68, 0.2);
    }
    
    .status-indicator {
      position: relative;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .pulse-ring {
      position: absolute;
      width: 100%;
      height: 100%;
      border: 3px solid #ef4444;
      border-radius: 50%;
      animation: pulse 1.5s ease-out infinite;
    }
    
    @keyframes pulse {
      0% {
        transform: scale(0.95);
        opacity: 1;
      }
      70% {
        transform: scale(1.3);
        opacity: 0;
      }
      100% {
        transform: scale(1.3);
        opacity: 0;
      }
    }
    
    .mic-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: #ef4444;
      z-index: 1;
    }
    
    .timer {
      font-size: 20px;
      font-weight: 300;
      font-family: 'Roboto Mono', monospace;
      color: rgba(255, 255, 255, 0.9);
      line-height: 1;
    }
    
    .level-meter {
      width: 100%;
      max-width: 250px;
    }
    
    .level-meter mat-progress-bar {
      height: 6px;
      border-radius: 3px;
    }
    
    .level-meter mat-progress-bar.active ::ng-deep .mat-mdc-progress-bar-fill::after {
      background-color: #ef4444 !important;
    }
    
    .level-label {
      display: block;
      text-align: center;
      margin-top: 4px;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.5);
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .instructions {
      text-align: center;
      color: rgba(255, 255, 255, 0.8);
    }
    
    .instructions p {
      margin: 2px 0;
      font-size: 13px;
    }
    
    .instructions .hint {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.5);
      font-style: italic;
    }
    
    .instructions.recording p:first-child {
      color: #ef4444;
      font-weight: 500;
    }
    
    .instructions.completed p:first-child {
      color: #10b981;
      font-weight: 500;
    }
    
    mat-dialog-actions {
      padding: 12px 24px !important;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      gap: 8px;
    }
    
    mat-dialog-actions button {
      min-width: 100px;
    }
    
    ::ng-deep .mat-mdc-dialog-actions .mat-mdc-button:not(.mat-mdc-unelevated-button):not(.mat-warn) {
      color: rgba(255, 255, 255, 0.7) !important;
    }

    ::ng-deep .mat-mdc-dialog-actions .mat-mdc-button:not(.mat-mdc-unelevated-button):not(.mat-warn):hover {
      background: rgba(255, 255, 255, 0.1) !important;
      color: rgba(255, 255, 255, 0.9) !important;
    }

    ::ng-deep .mat-mdc-dialog-actions .mat-mdc-unelevated-button.mat-primary {
      background-color: #9333ea !important;
      color: #ffffff !important;
    }

    ::ng-deep .mat-mdc-dialog-actions .mat-mdc-unelevated-button.mat-primary:hover {
      background-color: #a855f7 !important;
    }

    ::ng-deep .mat-mdc-dialog-actions .mat-mdc-unelevated-button.mat-primary:disabled {
      background-color: rgba(147, 51, 234, 0.3) !important;
      color: rgba(255, 255, 255, 0.5) !important;
    }
    
    ::ng-deep .mat-mdc-dialog-actions .mat-mdc-unelevated-button.mat-warn {
      background-color: #ef4444 !important;
      color: #ffffff !important;
    }
    
    ::ng-deep .mat-mdc-dialog-actions .mat-mdc-unelevated-button.mat-warn:hover {
      background-color: #f87171 !important;
    }
  `]
})
export class RecordingDialogComponent implements OnDestroy {
  hasRecording = false;
  isProcessing = false;
  recordedBuffer: AudioBuffer | null = null;
  
  constructor(
    public recordingService: RecordingService,
    private dialogRef: MatDialogRef<RecordingDialogComponent>
  ) {}
  
  async toggleRecording(): Promise<void> {
    if (this.recordingService.isRecording()) {
      this.isProcessing = true;
      try {
        this.recordedBuffer = await this.recordingService.stopRecording();
        this.hasRecording = true;
      } catch (error) {
        console.error('Failed to stop recording:', error);
        alert('Failed to stop recording. Please try again.');
      } finally {
        this.isProcessing = false;
      }
    } else {
      this.hasRecording = false;
      this.recordedBuffer = null;
      try {
        await this.recordingService.startRecording();
      } catch (error) {
        console.error('Failed to start recording:', error);
        alert('Failed to access microphone. Please check your permissions and try again.');
      }
    }
  }
  
  addToTrack(): void {
    if (this.recordedBuffer) {
      this.dialogRef.close(this.recordedBuffer);
    }
  }
  
  cancel(): void {
    if (this.recordingService.isRecording()) {
      this.recordingService.cancelRecording();
    }
    this.dialogRef.close();
  }
  
  ngOnDestroy(): void {
    if (this.recordingService.isRecording()) {
      this.recordingService.cancelRecording();
    }
  }
}