import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Track } from '../models/models';

export interface TrackMuteEvent {
  track: Track;
}

export interface TrackSoloEvent {
  track: Track;
}

export interface TrackDeleteEvent {
  track: Track;
}

export interface TrackRenameEvent {
  track: Track;
  newName: string;
}

@Component({
    selector: 'track-header',
    imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatTooltipModule],
    template: `
    <div class="track-head">
      <div class="track-controls">
        <div class="title" 
             [class.editing]="isEditing">
          <span *ngIf="!isEditing" class="title-content">
            {{ track.name }}
            <mat-icon class="edit-icon" (click)="startEditing()">edit</mat-icon>
          </span>
          <input *ngIf="isEditing" 
                 #nameInput
                 [(ngModel)]="editingName"
                 (keydown)="onEditKeyDown($event)"
                 (blur)="finishEditing()"
                 class="name-input" />
        </div>
        <div class="track-buttons">
          <button mat-icon-button 
                  class="track-btn" 
                  [class.active]="track.mute"
                  (click)="onToggleMute()" 
                  matTooltip="Mute">
            <mat-icon>{{ track.mute ? 'volume_off' : 'volume_up' }}</mat-icon>
          </button>
          <button mat-icon-button 
                  class="track-btn" 
                  [class.active]="track.solo"
                  (click)="onToggleSolo()" 
                  matTooltip="Solo">
            <mat-icon>headset</mat-icon>
          </button>
          <button mat-icon-button class="track-btn delete" (click)="onRemoveTrack()" matTooltip="Remove track">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </div>
    </div>
  `,
    styleUrls: ['./track-header.component.css']
})
export class TrackHeaderComponent implements AfterViewInit {
  @Input() track!: Track;
  
  @Output() muteToggled = new EventEmitter<TrackMuteEvent>();
  @Output() soloToggled = new EventEmitter<TrackSoloEvent>();
  @Output() trackDeleted = new EventEmitter<TrackDeleteEvent>();
  @Output() trackRenamed = new EventEmitter<TrackRenameEvent>();
  
  @ViewChild('nameInput') nameInputEl?: ElementRef<HTMLInputElement>;

  isEditing = false;
  editingName = '';

  ngAfterViewInit() {
    if (this.isEditing && this.nameInputEl) {
      this.nameInputEl.nativeElement.focus();
      this.nameInputEl.nativeElement.select();
    }
  }

  startEditing() {
    this.isEditing = true;
    this.editingName = this.track.name;
    
    setTimeout(() => {
      if (this.nameInputEl) {
        this.nameInputEl.nativeElement.focus();
        this.nameInputEl.nativeElement.select();
      }
    });
  }

  finishEditing() {
    if (this.isEditing && this.editingName.trim() && this.editingName !== this.track.name) {
      this.trackRenamed.emit({ track: this.track, newName: this.editingName.trim() });
    }
    this.isEditing = false;
  }

  onEditKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.finishEditing();
    } else if (event.key === 'Escape') {
      this.isEditing = false;
    }
  }

  onToggleMute() {
    this.muteToggled.emit({ track: this.track });
  }

  onToggleSolo() {
    this.soloToggled.emit({ track: this.track });
  }

  onRemoveTrack() {
    this.trackDeleted.emit({ track: this.track });
  }
}