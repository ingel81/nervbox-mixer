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
  private readonly GA_MEASUREMENT_ID = 'G-901EP95FGV';
  
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
    if (this.analyticsLoaded || typeof document === 'undefined') {
      return;
    }

    // DataLayer und gtag zuerst initialisieren
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(...args: unknown[]) {
      window.dataLayer.push(args);
    };

    // gtag.js Script laden
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.GA_MEASUREMENT_ID}`;
    
    // Warten bis Script geladen ist
    script.onload = () => {
      // Erst nach dem Laden konfigurieren
      window.gtag('js', new Date());
      window.gtag('config', this.GA_MEASUREMENT_ID, {
        anonymize_ip: true,
        cookie_expires: 63072000, // 2 Jahre
        cookie_flags: 'secure;samesite=lax',
        cookie_domain: 'auto',
        storage: 'cookies'
      });

      // Jetzt erst als geladen markieren
      this.analyticsLoaded = true;
    };

    document.head.appendChild(script);
  }

  private clearAnalyticsCookies(): void {
    // Clear Google Analytics Cookies
    const cookiesToClear = [
      '_ga',
      '_ga_901EP95FGV',
      '_gid',
      '_gat',
      '_gat_gtag_' + this.GA_MEASUREMENT_ID
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
    window.gtag('event', eventName, parameters);
  }
}