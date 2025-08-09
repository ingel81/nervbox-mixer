import { Component } from '@angular/core';
import { AudioEditorComponent } from './audio/audio-editor.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [AudioEditorComponent],
  template: `<audio-editor></audio-editor>`
})
export class AppComponent {}
