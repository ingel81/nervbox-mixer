import { Injectable, inject } from '@angular/core';
import { CookieConsentService } from './cookie-consent.service';

interface AnalyticsEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private cookieConsent = inject(CookieConsentService);

  // Audio Playback Events
  trackAudioPlay(soundName: string, category: string): void {
    this.trackEvent({
      action: 'play_audio',
      category: 'audio_interaction',
      label: `${category}/${soundName}`
    });
  }

  trackPlayback(action: 'play' | 'pause' | 'stop' | 'loop_toggle'): void {
    this.trackEvent({
      action: `playback_${action}`,
      category: 'playback_control',
    });
  }

  // Clip Operations
  trackClipAction(action: 'add' | 'delete' | 'move' | 'copy' | 'paste' | 'duplicate' | 'split', clipType?: string): void {
    this.trackEvent({
      action: `clip_${action}`,
      category: 'clip_operations',
      label: clipType
    });
  }

  trackClipTrim(type: 'start' | 'end', amount: number): void {
    this.trackEvent({
      action: 'clip_trim',
      category: 'clip_editing',
      label: type,
      value: Math.round(amount * 1000) // Convert to ms
    });
  }

  trackClipResize(duration: number): void {
    this.trackEvent({
      action: 'clip_resize',
      category: 'clip_editing',
      value: Math.round(duration * 1000)
    });
  }

  trackClipDrag(sourceTrack: number, targetTrack: number, distance: number): void {
    this.trackEvent({
      action: 'clip_drag',
      category: 'clip_operations',
      label: `track_${sourceTrack}_to_${targetTrack}`,
      value: Math.round(distance * 1000)
    });
  }

  // Track Operations
  trackTrackAction(action: 'add' | 'delete' | 'rename' | 'reorder', trackIndex?: number): void {
    this.trackEvent({
      action: `track_${action}`,
      category: 'track_management',
      label: trackIndex !== undefined ? `track_${trackIndex}` : undefined
    });
  }

  trackTrackControl(action: 'mute' | 'unmute' | 'solo' | 'unsolo', trackIndex: number): void {
    this.trackEvent({
      action: `track_${action}`,
      category: 'track_control',
      label: `track_${trackIndex}`
    });
  }

  // Timeline Interactions
  trackTimelineAction(action: 'zoom' | 'pan' | 'seek' | 'scroll'): void {
    this.trackEvent({
      action: action,
      category: 'timeline_interaction'
    });
  }

  trackZoomLevel(zoomLevel: number): void {
    this.trackEvent({
      action: 'zoom_change',
      category: 'timeline_interaction',
      value: Math.round(zoomLevel)
    });
  }

  trackSeek(position: number): void {
    this.trackEvent({
      action: 'seek_position',
      category: 'timeline_interaction',
      value: Math.round(position * 1000)
    });
  }

  // Loop Region
  trackLoopRegion(action: 'enable' | 'disable' | 'set_start' | 'set_end' | 'resize'): void {
    this.trackEvent({
      action: `loop_${action}`,
      category: 'loop_region'
    });
  }

  trackLoopDuration(duration: number): void {
    this.trackEvent({
      action: 'loop_duration_set',
      category: 'loop_region',
      value: Math.round(duration * 1000)
    });
  }

  // Sound Browser
  trackSoundBrowserAction(action: 'search' | 'category_filter' | 'preview' | 'load' | 'drag_start'): void {
    this.trackEvent({
      action: action,
      category: 'sound_browser'
    });
  }

  trackSoundSearch(searchTerm: string, resultCount: number): void {
    this.trackEvent({
      action: 'sound_search',
      category: 'sound_browser',
      label: searchTerm.substring(0, 50),
      value: resultCount
    });
  }

  trackSoundPreview(soundName: string, duration: number): void {
    this.trackEvent({
      action: 'sound_preview',
      category: 'sound_browser',
      label: soundName,
      value: Math.round(duration * 1000)
    });
  }

  // Arrangement Management
  trackArrangementAction(action: 'save' | 'load' | 'new' | 'delete' | 'rename'): void {
    this.trackEvent({
      action: `arrangement_${action}`,
      category: 'arrangement_management'
    });
  }

  trackArrangementLoad(name: string, trackCount: number): void {
    this.trackEvent({
      action: 'arrangement_loaded',
      category: 'arrangement_management',
      label: name,
      value: trackCount
    });
  }

  // Export
  trackExport(format: 'wav' | 'mp3', duration: number): void {
    this.trackEvent({
      action: 'export_audio',
      category: 'export',
      label: format,
      value: Math.round(duration)
    });
  }

  trackExportSettings(sampleRate: number, bitRate?: number): void {
    this.trackEvent({
      action: 'export_settings',
      category: 'export',
      label: bitRate ? `${sampleRate}Hz_${bitRate}kbps` : `${sampleRate}Hz`,
      value: sampleRate
    });
  }

  // Keyboard Shortcuts
  trackKeyboardShortcut(shortcut: string): void {
    this.trackEvent({
      action: 'keyboard_shortcut',
      category: 'user_interaction',
      label: shortcut
    });
  }

  // File Import
  trackFileImport(fileType: string, fileSize: number): void {
    this.trackEvent({
      action: 'file_import',
      category: 'file_operations',
      label: fileType,
      value: Math.round(fileSize / 1024) // Convert to KB
    });
  }

  trackDragDropFile(fileCount: number): void {
    this.trackEvent({
      action: 'drag_drop_files',
      category: 'file_operations',
      value: fileCount
    });
  }

  // Recording
  trackRecording(action: 'start' | 'stop' | 'cancel', duration?: number): void {
    this.trackEvent({
      action: `recording_${action}`,
      category: 'recording',
      value: duration ? Math.round(duration * 1000) : undefined
    });
  }

  // UI Interactions
  trackUIAction(component: string, action: string): void {
    this.trackEvent({
      action: action,
      category: 'ui_interaction',
      label: component
    });
  }

  trackModalOpen(modalName: string): void {
    this.trackEvent({
      action: 'modal_open',
      category: 'ui_interaction',
      label: modalName
    });
  }

  trackBottomPanelToggle(isOpen: boolean): void {
    this.trackEvent({
      action: isOpen ? 'bottom_panel_open' : 'bottom_panel_close',
      category: 'ui_interaction'
    });
  }

  // Mobile Interactions
  trackMobileGesture(gesture: 'pinch_zoom' | 'swipe' | 'long_press' | 'double_tap'): void {
    this.trackEvent({
      action: `mobile_${gesture}`,
      category: 'mobile_interaction'
    });
  }

  // Feature Usage
  trackFeatureUsage(feature: string): void {
    this.trackEvent({
      action: 'feature_used',
      category: 'feature_adoption',
      label: feature
    });
  }

  // Performance Metrics
  trackPerformanceMetric(metric: 'load_time' | 'audio_latency' | 'render_time', value: number): void {
    this.trackEvent({
      action: 'performance_metric',
      category: 'app_performance',
      label: metric,
      value: Math.round(value)
    });
  }

  // Error Tracking
  trackError(errorType: string, errorMessage: string): void {
    this.trackEvent({
      action: 'error_occurred',
      category: 'app_errors',
      label: `${errorType}: ${errorMessage.substring(0, 100)}`
    });
  }

  // Session Tracking
  trackSessionStart(): void {
    this.trackEvent({
      action: 'session_start',
      category: 'app_usage'
    });
  }

  trackSessionDuration(duration: number): void {
    this.trackEvent({
      action: 'session_duration',
      category: 'app_usage',
      value: Math.round(duration / 1000) // Convert to seconds
    });
  }

  // Page Views (for SPA Navigation)
  trackPageView(pageName: string): void {
    if (!this.cookieConsent.getConsentStatus()()) {
      return;
    }

    this.cookieConsent.trackEvent('page_view', {
      page_title: `NervBox Mixer - ${pageName}`,
      page_location: window.location.href,
      page_path: window.location.pathname
    });
  }

  // Generic event tracking
  private trackEvent(event: AnalyticsEvent): void {
    if (!this.cookieConsent.getConsentStatus()()) {
      return; // Tracking nur mit Consent
    }

    this.cookieConsent.trackEvent(event.action, {
      event_category: event.category,
      event_label: event.label,
      value: event.value
    });
  }
}