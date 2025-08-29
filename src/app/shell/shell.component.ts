import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';

import { ProjectManagementComponent } from './project-management.component';
import { ContentCreationComponent } from './content-creation.component';
import { ExportControlsComponent } from './export-controls.component';
import { AudioEditorComponent } from '../audio/components/editor/audio-editor.component';

@Component({
    selector: 'app-shell',
    imports: [
        CommonModule,
        MatToolbarModule,
        MatIconModule,
        ProjectManagementComponent,
        ContentCreationComponent,
        ExportControlsComponent,
        AudioEditorComponent
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
    </mat-toolbar>

    <!-- Main Editor -->
    <audio-editor></audio-editor>
  `,
    styleUrls: ['./shell.component.css']
})
export class ShellComponent {}