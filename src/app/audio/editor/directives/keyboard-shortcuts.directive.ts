import { Directive, HostListener, inject, Input } from '@angular/core';
import { EditorStateService } from '../services/editor-state.service';
import { Clip } from '../../shared/models/models';

export interface KeyboardShortcutActions {
  togglePlayback(): void;
  forceRegenerateAllWaveforms(): void;
}

@Directive({
  selector: '[appKeyboardShortcuts]',
  standalone: true,
})
export class KeyboardShortcutsDirective {
  private editorState = inject(EditorStateService);
  
  @Input() appKeyboardShortcuts!: KeyboardShortcutActions;

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Ignore if user is typing in input field
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }

    const selectedClip = this.getSelectedClip();

    // Copy (Ctrl+C)
    if (
      event.ctrlKey &&
      (event.key === 'c' || event.key === 'C') &&
      selectedClip
    ) {
      event.preventDefault();
      this.copyClip(selectedClip);
      return;
    }

    // Paste (Ctrl+V)
    if (event.ctrlKey && (event.key === 'v' || event.key === 'V')) {
      event.preventDefault();
      if (this.editorState.clipboardClip) {
        this.editorState.pasteClip();
      }
      return;
    }

    // Delete (Del)
    if (event.key === 'Delete' && selectedClip) {
      event.preventDefault();
      // Add small delay to ensure drag state has settled
      setTimeout(() => {
        this.editorState.removeClip(selectedClip.id);
      }, 10);
      return;
    }

    // Spacebar for play/pause
    if (event.code === 'Space') {
      event.preventDefault();
      this.appKeyboardShortcuts.togglePlayback();
      return;
    }

    // Alt+L for set loop to selected clip (check first!)
    if (event.altKey && event.code === 'KeyL') {
      event.preventDefault();
      this.editorState.setLoopToSelection();
      return;
    }

    // L for toggle loop (only if no modifiers)
    if (
      event.code === 'KeyL' &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.shiftKey
    ) {
      event.preventDefault();
      this.editorState.toggleLoop();
      return;
    }

    // Shift+I for set loop start to playhead (I = In-Point)
    if (event.shiftKey && event.code === 'KeyI') {
      event.preventDefault();
      this.editorState.loopStart.set(this.editorState.playhead());
      this.editorState.loopEnabled.set(true);
      return;
    }

    // Shift+O for set loop end to playhead (O = Out-Point)
    if (event.shiftKey && event.code === 'KeyO') {
      event.preventDefault();
      this.editorState.loopEnd.set(this.editorState.playhead());
      this.editorState.loopEnabled.set(true);
      return;
    }

    // S for split at playhead
    if (
      event.code === 'KeyS' &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.shiftKey
    ) {
      event.preventDefault();
      this.editorState.splitAtPlayhead();
      // Split already generates correct waveforms, no need to regenerate
      return;
    }
  }

  private getSelectedClip(): Clip | null {
    const selectedId = this.editorState.selectedClipId();
    if (!selectedId) return null;

    return this.editorState.flattenedClips().find(c => c.id === selectedId) || null;
  }

  private copyClip(clip: Clip): void {
    // Create a deep copy of the clip (without the buffer reference)
    this.editorState.clipboardClip = {
      ...clip,
      id: crypto.randomUUID(), // New ID for the copy
      startTime: 0, // Reset position for pasting
    };
  }
}