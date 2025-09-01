import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ProjectManagementComponent } from './project-management.component';
import { ContentCreationComponent } from './content-creation.component';
import { ExportControlsComponent } from './export-controls.component';
import { AudioEditorComponent } from '../audio/editor/components/audio-editor.component';
import { KeyboardShortcutsHelpComponent } from './keyboard-shortcuts-help.component';

@Component({
    selector: 'app-shell',
    imports: [
        CommonModule,
        MatToolbarModule,
        MatIconModule,
        MatButtonModule,
        MatTooltipModule,
        ProjectManagementComponent,
        ContentCreationComponent,
        ExportControlsComponent,
        AudioEditorComponent,
        KeyboardShortcutsHelpComponent
    ],
    template: `
    <mat-toolbar color="primary" class="toolbar">
      <!-- Logo/Branding -->
      <span class="logo">
        <span class="logo-text">NervBox</span> 
        <span class="logo-subtitle">Mixer</span> 
      </span>
      <span class="spacer"></span>


      <!-- Project Management -->
      <project-management></project-management>

      <!-- Content Creation -->
      <content-creation></content-creation>

      <!-- Export Controls -->
      <export-controls></export-controls>
      
      <!-- Help Button -->
      <button mat-icon-button 
              (click)="showKeyboardShortcuts()" 
              matTooltip="Keyboard Shortcuts"
              class="help-button">
        <mat-icon>keyboard</mat-icon>
      </button>
    </mat-toolbar>

    <!-- Main Editor -->
    <audio-editor></audio-editor>
    
    <!-- Keyboard Shortcuts Help -->
    <app-keyboard-shortcuts-help #shortcutsHelp></app-keyboard-shortcuts-help>
  `,
    styleUrls: ['./shell.component.css']
})
export class ShellComponent {
  @ViewChild('shortcutsHelp') shortcutsHelp!: KeyboardShortcutsHelpComponent;
  
  showKeyboardShortcuts() {
    this.shortcutsHelp?.toggle();
  }
}