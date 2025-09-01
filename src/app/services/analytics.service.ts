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

  // App-specific Tracking Events
  trackAudioPlay(soundName: string, category: string): void {
    this.trackEvent({
      action: 'play_audio',
      category: 'audio_interaction',
      label: `${category}/${soundName}`
    });
  }

  trackClipAction(action: 'add' | 'delete' | 'move' | 'copy', clipType: string): void {
    this.trackEvent({
      action: `clip_${action}`,
      category: 'clip_operations',
      label: clipType
    });
  }

  trackExport(format: 'wav' | 'mp3', duration: number): void {
    this.trackEvent({
      action: 'export_audio',
      category: 'export',
      label: format,
      value: Math.round(duration)
    });
  }

  trackArrangementAction(action: 'save' | 'load' | 'new'): void {
    this.trackEvent({
      action: `arrangement_${action}`,
      category: 'arrangement_management'
    });
  }

  trackKeyboardShortcut(shortcut: string): void {
    this.trackEvent({
      action: 'keyboard_shortcut',
      category: 'user_interaction',
      label: shortcut
    });
  }

  trackSoundBrowserAction(action: 'search' | 'category_filter' | 'preview'): void {
    this.trackEvent({
      action: action,
      category: 'sound_browser'
    });
  }

  trackTimelineAction(action: 'zoom' | 'pan' | 'seek'): void {
    this.trackEvent({
      action: action,
      category: 'timeline_interaction'
    });
  }

  trackPerformanceMetric(metric: 'load_time' | 'audio_latency', value: number): void {
    this.trackEvent({
      action: 'performance_metric',
      category: 'app_performance',
      label: metric,
      value: Math.round(value)
    });
  }

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

  trackFeatureUsage(feature: string): void {
    this.trackEvent({
      action: 'feature_used',
      category: 'feature_adoption',
      label: feature
    });
  }

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

  // Page Views (for SPA Navigation)
  trackPageView(pageName: string): void {
    if (!this.cookieConsent.getConsentStatus()()) {
      return;
    }

    this.cookieConsent.trackEvent('page_view', {
      page_title: `NervBox Mixer - ${pageName}`,
      page_location: window.location.href
    });
  }
}