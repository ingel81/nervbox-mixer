import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSliderModule } from '@angular/material/slider';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { EditorStateService } from '../services/editor-state.service';
import { EffectsService, EffectMeta, FactoryPreset } from '../../audio-engine/services/effects.service';
import {
  ClipEffect,
  EffectType,
  ReverbParams,
  DelayParams,
  EQParams,
  DistortionParams,
  CompressorParams,
  FilterParams,
  PitchShiftParams,
  ChorusParams,
  AutotuneParams,
} from '../../shared/models/models';
import { generateUUID } from '../../shared/utils/uuid.util';

@Component({
  selector: 'effects-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSliderModule,
    MatSelectModule,
    MatFormFieldModule,
    MatMenuModule,
    MatSlideToggleModule,
  ],
  template: `
    <div class="effects-panel">
      <!-- No clip selected -->
      @if (!selectedClip()) {
        <div class="no-selection">
          <mat-icon>touch_app</mat-icon>
          <p>Select a clip to add effects</p>
        </div>
      }

      <!-- Clip selected -->
      @if (selectedClip()) {
        <div class="effects-content">
          <!-- Left side: Effect Stack -->
          <div class="effect-stack-container">
            <div class="stack-header">
              <span class="stack-title">Effects</span>
              <button mat-icon-button class="add-effect-btn" [matMenuTriggerFor]="addMenu" matTooltip="Add Effect">
                <mat-icon>add</mat-icon>
              </button>
            </div>

            <div
              cdkDropList
              class="effect-list"
              (cdkDropListDropped)="onDrop($event)">
              @for (effect of clipEffects(); track effect.id) {
                <div
                  cdkDrag
                  class="effect-item"
                  [class.selected]="selectedEffectId() === effect.id"
                  [class.disabled]="!effect.enabled"
                  (click)="selectEffect(effect)">
                  <div class="drag-handle" cdkDragHandle>
                    <mat-icon>drag_indicator</mat-icon>
                  </div>
                  <mat-icon class="effect-type-icon">{{ getEffectIcon(effect.type) }}</mat-icon>
                  <span class="effect-name">{{ getEffectName(effect.type) }}</span>
                  <button mat-icon-button (click)="toggleEnabled($event, effect)" class="toggle-btn"
                          [matTooltip]="effect.enabled ? 'Disable' : 'Enable'">
                    <mat-icon>{{ effect.enabled ? 'visibility' : 'visibility_off' }}</mat-icon>
                  </button>
                  <button mat-icon-button (click)="removeEffect($event, effect)" class="remove-btn"
                          matTooltip="Remove">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
              }
            </div>

            <mat-menu #addMenu="matMenu">
              @for (meta of effectsService.effectMetas; track meta.type) {
                <button mat-menu-item (click)="addEffect(meta.type)">
                  <mat-icon>{{ meta.icon }}</mat-icon>
                  <span>{{ meta.name }}</span>
                </button>
              }
            </mat-menu>
          </div>

          <!-- Right side: Detail Panel -->
          <div class="effect-detail-container">
            @if (selectedEffect()) {
              <div class="effect-detail">
                <div class="detail-header">
                  <mat-icon>{{ getEffectIcon(selectedEffect()!.type) }}</mat-icon>
                  <h3>{{ getEffectName(selectedEffect()!.type) }}</h3>
                  <mat-form-field class="preset-select" subscriptSizing="dynamic">
                    <mat-label>Preset</mat-label>
                    <mat-select [value]="selectedEffect()!.preset || 'custom'" (selectionChange)="applyPreset($event.value)">
                      <mat-option value="custom">Custom</mat-option>
                      @for (preset of getPresets(selectedEffect()!.type); track preset.name) {
                        <mat-option [value]="preset.name">{{ preset.name }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                </div>

                <div class="parameters">
                  <!-- Mix (always present) -->
                  <div class="param-row">
                    <label>Mix</label>
                    <mat-slider [min]="0" [max]="1" [step]="0.01" discrete>
                      <input matSliderThumb [ngModel]="selectedEffect()!.params.mix" (ngModelChange)="updateParam('mix', $event)">
                    </mat-slider>
                    <span class="value">{{ (selectedEffect()!.params.mix * 100).toFixed(0) }}%</span>
                  </div>

                  <!-- Type-specific parameters -->
                  @switch (selectedEffect()!.type) {
                    @case ('reverb') {
                      <div class="param-row">
                        <label>Decay</label>
                        <mat-slider [min]="0.1" [max]="10" [step]="0.1" discrete>
                          <input matSliderThumb [ngModel]="asReverb(selectedEffect()!.params).decay" (ngModelChange)="updateParam('decay', $event)">
                        </mat-slider>
                        <span class="value">{{ asReverb(selectedEffect()!.params).decay.toFixed(1) }}s</span>
                      </div>
                      <div class="param-row">
                        <label>Pre-Delay</label>
                        <mat-slider [min]="0" [max]="0.1" [step]="0.005" discrete>
                          <input matSliderThumb [ngModel]="asReverb(selectedEffect()!.params).preDelay" (ngModelChange)="updateParam('preDelay', $event)">
                        </mat-slider>
                        <span class="value">{{ (asReverb(selectedEffect()!.params).preDelay * 1000).toFixed(0) }}ms</span>
                      </div>
                    }
                    @case ('delay') {
                      <div class="param-row">
                        <label>Time</label>
                        <mat-slider [min]="0.01" [max]="1" [step]="0.01" discrete>
                          <input matSliderThumb [ngModel]="asDelay(selectedEffect()!.params).time" (ngModelChange)="updateParam('time', $event)">
                        </mat-slider>
                        <span class="value">{{ (asDelay(selectedEffect()!.params).time * 1000).toFixed(0) }}ms</span>
                      </div>
                      <div class="param-row">
                        <label>Feedback</label>
                        <mat-slider [min]="0" [max]="0.95" [step]="0.01" discrete>
                          <input matSliderThumb [ngModel]="asDelay(selectedEffect()!.params).feedback" (ngModelChange)="updateParam('feedback', $event)">
                        </mat-slider>
                        <span class="value">{{ (asDelay(selectedEffect()!.params).feedback * 100).toFixed(0) }}%</span>
                      </div>
                      <div class="param-row toggle-row">
                        <label>Ping Pong</label>
                        <mat-slide-toggle [ngModel]="asDelay(selectedEffect()!.params).pingPong" (ngModelChange)="updateParam('pingPong', $event)">
                        </mat-slide-toggle>
                      </div>
                    }
                    @case ('eq') {
                      <div class="param-row">
                        <label>Low</label>
                        <mat-slider [min]="-12" [max]="12" [step]="0.5" discrete>
                          <input matSliderThumb [ngModel]="asEQ(selectedEffect()!.params).low" (ngModelChange)="updateParam('low', $event)">
                        </mat-slider>
                        <span class="value">{{ asEQ(selectedEffect()!.params).low > 0 ? '+' : '' }}{{ asEQ(selectedEffect()!.params).low.toFixed(1) }}dB</span>
                      </div>
                      <div class="param-row">
                        <label>Mid</label>
                        <mat-slider [min]="-12" [max]="12" [step]="0.5" discrete>
                          <input matSliderThumb [ngModel]="asEQ(selectedEffect()!.params).mid" (ngModelChange)="updateParam('mid', $event)">
                        </mat-slider>
                        <span class="value">{{ asEQ(selectedEffect()!.params).mid > 0 ? '+' : '' }}{{ asEQ(selectedEffect()!.params).mid.toFixed(1) }}dB</span>
                      </div>
                      <div class="param-row">
                        <label>High</label>
                        <mat-slider [min]="-12" [max]="12" [step]="0.5" discrete>
                          <input matSliderThumb [ngModel]="asEQ(selectedEffect()!.params).high" (ngModelChange)="updateParam('high', $event)">
                        </mat-slider>
                        <span class="value">{{ asEQ(selectedEffect()!.params).high > 0 ? '+' : '' }}{{ asEQ(selectedEffect()!.params).high.toFixed(1) }}dB</span>
                      </div>
                    }
                    @case ('distortion') {
                      <div class="param-row">
                        <label>Drive</label>
                        <mat-slider [min]="0" [max]="1" [step]="0.01" discrete>
                          <input matSliderThumb [ngModel]="asDistortion(selectedEffect()!.params).drive" (ngModelChange)="updateParam('drive', $event)">
                        </mat-slider>
                        <span class="value">{{ (asDistortion(selectedEffect()!.params).drive * 100).toFixed(0) }}%</span>
                      </div>
                    }
                    @case ('compressor') {
                      <div class="param-row">
                        <label>Threshold</label>
                        <mat-slider [min]="-60" [max]="0" [step]="1" discrete>
                          <input matSliderThumb [ngModel]="asCompressor(selectedEffect()!.params).threshold" (ngModelChange)="updateParam('threshold', $event)">
                        </mat-slider>
                        <span class="value">{{ asCompressor(selectedEffect()!.params).threshold }}dB</span>
                      </div>
                      <div class="param-row">
                        <label>Ratio</label>
                        <mat-slider [min]="1" [max]="20" [step]="0.5" discrete>
                          <input matSliderThumb [ngModel]="asCompressor(selectedEffect()!.params).ratio" (ngModelChange)="updateParam('ratio', $event)">
                        </mat-slider>
                        <span class="value">{{ asCompressor(selectedEffect()!.params).ratio.toFixed(1) }}:1</span>
                      </div>
                      <div class="param-row">
                        <label>Attack</label>
                        <mat-slider [min]="0.001" [max]="1" [step]="0.001" discrete>
                          <input matSliderThumb [ngModel]="asCompressor(selectedEffect()!.params).attack" (ngModelChange)="updateParam('attack', $event)">
                        </mat-slider>
                        <span class="value">{{ (asCompressor(selectedEffect()!.params).attack * 1000).toFixed(0) }}ms</span>
                      </div>
                      <div class="param-row">
                        <label>Release</label>
                        <mat-slider [min]="0.01" [max]="1" [step]="0.01" discrete>
                          <input matSliderThumb [ngModel]="asCompressor(selectedEffect()!.params).release" (ngModelChange)="updateParam('release', $event)">
                        </mat-slider>
                        <span class="value">{{ (asCompressor(selectedEffect()!.params).release * 1000).toFixed(0) }}ms</span>
                      </div>
                    }
                    @case ('filter') {
                      <div class="param-row">
                        <label>Type</label>
                        <mat-form-field subscriptSizing="dynamic" class="filter-type-select">
                          <mat-select [ngModel]="asFilter(selectedEffect()!.params).type" (ngModelChange)="updateParam('type', $event)">
                            <mat-option value="lowpass">Low Pass</mat-option>
                            <mat-option value="highpass">High Pass</mat-option>
                            <mat-option value="bandpass">Band Pass</mat-option>
                          </mat-select>
                        </mat-form-field>
                      </div>
                      <div class="param-row">
                        <label>Frequency</label>
                        <mat-slider [min]="20" [max]="20000" [step]="10" discrete>
                          <input matSliderThumb [ngModel]="asFilter(selectedEffect()!.params).frequency" (ngModelChange)="updateParam('frequency', $event)">
                        </mat-slider>
                        <span class="value">{{ asFilter(selectedEffect()!.params).frequency }}Hz</span>
                      </div>
                      <div class="param-row">
                        <label>Resonance</label>
                        <mat-slider [min]="0" [max]="20" [step]="0.1" discrete>
                          <input matSliderThumb [ngModel]="asFilter(selectedEffect()!.params).resonance" (ngModelChange)="updateParam('resonance', $event)">
                        </mat-slider>
                        <span class="value">{{ asFilter(selectedEffect()!.params).resonance.toFixed(1) }}</span>
                      </div>
                    }
                    @case ('pitch-shift') {
                      <div class="param-row">
                        <label>Semitones</label>
                        <mat-slider [min]="-12" [max]="12" [step]="1" discrete>
                          <input matSliderThumb [ngModel]="asPitchShift(selectedEffect()!.params).semitones" (ngModelChange)="updateParam('semitones', $event)">
                        </mat-slider>
                        <span class="value">{{ asPitchShift(selectedEffect()!.params).semitones > 0 ? '+' : '' }}{{ asPitchShift(selectedEffect()!.params).semitones }}</span>
                      </div>
                    }
                    @case ('chorus') {
                      <div class="param-row">
                        <label>Rate</label>
                        <mat-slider [min]="0.1" [max]="10" [step]="0.1" discrete>
                          <input matSliderThumb [ngModel]="asChorus(selectedEffect()!.params).rate" (ngModelChange)="updateParam('rate', $event)">
                        </mat-slider>
                        <span class="value">{{ asChorus(selectedEffect()!.params).rate.toFixed(1) }}Hz</span>
                      </div>
                      <div class="param-row">
                        <label>Depth</label>
                        <mat-slider [min]="0" [max]="1" [step]="0.01" discrete>
                          <input matSliderThumb [ngModel]="asChorus(selectedEffect()!.params).depth" (ngModelChange)="updateParam('depth', $event)">
                        </mat-slider>
                        <span class="value">{{ (asChorus(selectedEffect()!.params).depth * 100).toFixed(0) }}%</span>
                      </div>
                      <div class="param-row">
                        <label>Feedback</label>
                        <mat-slider [min]="0" [max]="0.95" [step]="0.01" discrete>
                          <input matSliderThumb [ngModel]="asChorus(selectedEffect()!.params).feedback" (ngModelChange)="updateParam('feedback', $event)">
                        </mat-slider>
                        <span class="value">{{ (asChorus(selectedEffect()!.params).feedback * 100).toFixed(0) }}%</span>
                      </div>
                    }
                    @case ('autotune') {
                      <div class="param-row">
                        <label>Key</label>
                        <mat-form-field subscriptSizing="dynamic" class="autotune-key-select">
                          <mat-select [ngModel]="asAutotune(selectedEffect()!.params).key" (ngModelChange)="updateParam('key', $event)">
                            <mat-option value="C">C</mat-option>
                            <mat-option value="C#">C#</mat-option>
                            <mat-option value="D">D</mat-option>
                            <mat-option value="D#">D#</mat-option>
                            <mat-option value="E">E</mat-option>
                            <mat-option value="F">F</mat-option>
                            <mat-option value="F#">F#</mat-option>
                            <mat-option value="G">G</mat-option>
                            <mat-option value="G#">G#</mat-option>
                            <mat-option value="A">A</mat-option>
                            <mat-option value="A#">A#</mat-option>
                            <mat-option value="B">B</mat-option>
                          </mat-select>
                        </mat-form-field>
                      </div>
                      <div class="param-row">
                        <label>Scale</label>
                        <mat-form-field subscriptSizing="dynamic" class="autotune-scale-select">
                          <mat-select [ngModel]="asAutotune(selectedEffect()!.params).scale" (ngModelChange)="updateParam('scale', $event)">
                            <mat-option value="chromatic">Chromatic</mat-option>
                            <mat-option value="major">Major</mat-option>
                            <mat-option value="minor">Minor</mat-option>
                          </mat-select>
                        </mat-form-field>
                      </div>
                      <div class="param-row">
                        <label>Strength</label>
                        <mat-slider [min]="0" [max]="1" [step]="0.01" discrete>
                          <input matSliderThumb [ngModel]="asAutotune(selectedEffect()!.params).strength" (ngModelChange)="updateParam('strength', $event)">
                        </mat-slider>
                        <span class="value">{{ (asAutotune(selectedEffect()!.params).strength * 100).toFixed(0) }}%</span>
                      </div>
                      <div class="param-row">
                        <label>Speed</label>
                        <mat-slider [min]="0" [max]="1" [step]="0.01" discrete>
                          <input matSliderThumb [ngModel]="asAutotune(selectedEffect()!.params).speed" (ngModelChange)="updateParam('speed', $event)">
                        </mat-slider>
                        <span class="value">{{ (asAutotune(selectedEffect()!.params).speed * 100).toFixed(0) }}%</span>
                      </div>
                    }
                  }
                </div>
              </div>
            } @else {
              <div class="no-effect-selected">
                <mat-icon>tune</mat-icon>
                <p>Select an effect to edit parameters</p>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './effects-panel.component.css',
})
export class EffectsPanelComponent {
  editorState = inject(EditorStateService);
  effectsService = inject(EffectsService);

  selectedClip = this.editorState.selectedClip;
  selectedEffectId = signal<string | null>(null);

  clipEffects = computed(() => {
    const clip = this.selectedClip();
    return clip?.effects || [];
  });

  selectedEffect = computed(() => {
    const effectId = this.selectedEffectId();
    if (!effectId) return null;
    return this.clipEffects().find((e) => e.id === effectId) || null;
  });

  getEffectIcon(type: EffectType): string {
    return this.effectsService.getEffectMeta(type)?.icon || 'auto_fix_high';
  }

  getEffectName(type: EffectType): string {
    return this.effectsService.getEffectMeta(type)?.name || type;
  }

  getPresets(type: EffectType): FactoryPreset[] {
    return this.effectsService.factoryPresets.get(type) || [];
  }

  selectEffect(effect: ClipEffect): void {
    this.selectedEffectId.set(effect.id);
  }

  addEffect(type: EffectType): void {
    const clip = this.selectedClip();
    if (!clip) return;

    const newEffect = this.effectsService.createEffect(type);

    // Update clip effects
    const effects = [...(clip.effects || []), newEffect];
    this.updateClipEffects(effects);

    // Select the new effect
    this.selectedEffectId.set(newEffect.id);
  }

  removeEffect(event: Event, effect: ClipEffect): void {
    event.stopPropagation();
    const clip = this.selectedClip();
    if (!clip) return;

    const effects = (clip.effects || []).filter((e) => e.id !== effect.id);
    this.updateClipEffects(effects);

    // Clear selection if removed effect was selected
    if (this.selectedEffectId() === effect.id) {
      this.selectedEffectId.set(null);
    }
  }

  toggleEnabled(event: Event, effect: ClipEffect): void {
    event.stopPropagation();
    const clip = this.selectedClip();
    if (!clip) return;

    const effects = (clip.effects || []).map((e) => (e.id === effect.id ? { ...e, enabled: !e.enabled } : e));
    this.updateClipEffects(effects);
  }

  onDrop(event: CdkDragDrop<ClipEffect[]>): void {
    const clip = this.selectedClip();
    if (!clip || !clip.effects) return;

    const effects = [...clip.effects];
    moveItemInArray(effects, event.previousIndex, event.currentIndex);
    this.updateClipEffects(effects);
  }

  updateParam(paramName: string, value: unknown): void {
    const clip = this.selectedClip();
    const effectId = this.selectedEffectId();
    if (!clip || !effectId) return;

    const effects = (clip.effects || []).map((e) => {
      if (e.id === effectId) {
        return {
          ...e,
          params: { ...e.params, [paramName]: value },
          preset: undefined, // Clear preset when manually changing params
        };
      }
      return e;
    });
    this.updateClipEffects(effects);

    // Update live effect if playing
    this.effectsService.updateEffectParam(clip.id, effectId, paramName, value);
  }

  applyPreset(presetName: string): void {
    const clip = this.selectedClip();
    const effect = this.selectedEffect();
    if (!clip || !effect) return;

    if (presetName === 'custom') {
      // Just clear the preset name
      const effects = (clip.effects || []).map((e) => (e.id === effect.id ? { ...e, preset: undefined } : e));
      this.updateClipEffects(effects);
      return;
    }

    const presets = this.effectsService.factoryPresets.get(effect.type);
    const preset = presets?.find((p) => p.name === presetName);
    if (!preset) return;

    const effects = (clip.effects || []).map((e) =>
      e.id === effect.id
        ? {
            ...e,
            params: { ...preset.params },
            preset: presetName,
          }
        : e
    );
    this.updateClipEffects(effects);
  }

  private updateClipEffects(effects: ClipEffect[]): void {
    const clip = this.selectedClip();
    if (!clip) return;

    // Update the clip in the track
    this.editorState.tracks.update((tracks) =>
      tracks.map((track) => ({
        ...track,
        clips: track.clips.map((c) => (c.id === clip.id ? { ...c, effects } : c)),
      }))
    );
  }

  // Type casting helpers for template
  asReverb(params: unknown): ReverbParams {
    return params as ReverbParams;
  }
  asDelay(params: unknown): DelayParams {
    return params as DelayParams;
  }
  asEQ(params: unknown): EQParams {
    return params as EQParams;
  }
  asDistortion(params: unknown): DistortionParams {
    return params as DistortionParams;
  }
  asCompressor(params: unknown): CompressorParams {
    return params as CompressorParams;
  }
  asFilter(params: unknown): FilterParams {
    return params as FilterParams;
  }
  asPitchShift(params: unknown): PitchShiftParams {
    return params as PitchShiftParams;
  }
  asChorus(params: unknown): ChorusParams {
    return params as ChorusParams;
  }
  asAutotune(params: unknown): AutotuneParams {
    return params as AutotuneParams;
  }
}
