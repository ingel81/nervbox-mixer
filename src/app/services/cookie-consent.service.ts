import { Injectable, signal } from '@angular/core';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

@Injectable({
  providedIn: 'root'
})
export class CookieConsentService {
  private readonly CONSENT_KEY = 'nervbox-analytics-consent-en';
  
  private consentGiven = signal(this.getStoredConsent());
  private analyticsLoaded = false;

  constructor() {
    // Lade Analytics wenn Consent bereits erteilt wurde
    if (this.consentGiven()) {
      this.loadGoogleAnalytics();
    }
  }

  getConsentStatus() {
    return this.consentGiven.asReadonly();
  }

  private getStoredConsent(): boolean {
    return localStorage.getItem(this.CONSENT_KEY) === 'true';
  }

  grantConsent(): void {
    localStorage.setItem(this.CONSENT_KEY, 'true');
    this.consentGiven.set(true);
    this.loadGoogleAnalytics();
  }

  revokeConsent(): void {
    localStorage.removeItem(this.CONSENT_KEY);
    this.consentGiven.set(false);
    // Analytics Cookies löschen
    this.clearAnalyticsCookies();
  }

  private loadGoogleAnalytics(): void {
    if (this.analyticsLoaded) {
      return;
    }

    // Prüfe ob gtag bereits via index.html geladen wurde
    if (typeof window.gtag === 'function') {
      // Aktiviere Analytics über die globale Funktion
      if (typeof (window as any).enableAnalytics === 'function') {
        (window as any).enableAnalytics();
      }
      
      this.analyticsLoaded = true;
      return;
    }

    // Fallback: Sollte nicht passieren da Script in index.html ist
  }

  private clearAnalyticsCookies(): void {
    // Clear Google Analytics Cookies
    const cookiesToClear = [
      '_ga',
      '_ga_901EP95FGV',
      '_gid',
      '_gat',
      '_gat_gtag_G-901EP95FGV'
    ];

    cookiesToClear.forEach(cookieName => {
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${window.location.hostname}`;
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    });
  }

  // Tracking Events (only with consent)
  trackEvent(eventName: string, parameters?: Record<string, unknown>): void {
    if (!this.consentGiven() || !this.analyticsLoaded) {
      return;
    }
    
    // Sende Event ohne zusätzliche Parameter (keine cookie_domain etc.)
    window.gtag('event', eventName, parameters);
  }
}