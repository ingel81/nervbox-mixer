import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { CookieConsentService } from '../services/cookie-consent.service';
import { trigger, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-cookie-banner',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatIconModule],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateY(100%)', opacity: 0 }),
        animate('300ms ease-out', 
          style({ transform: 'translateY(0)', opacity: 1 }))
      ])
    ])
  ],
  template: `
    <div class="cookie-banner" *ngIf="!consentService.getConsentStatus()()">
      <mat-card class="cookie-card" [@slideIn]>
        <mat-card-content>
          <div class="cookie-content">
            <div class="cookie-main">
              <mat-icon class="cookie-icon">insights</mat-icon>
              <div class="cookie-text">
                <h3>Help us improve</h3>
                <p class="description">
                  We use anonymous analytics to improve NervBox Mixer. 
                  Your data remains anonymous and is never sold.
                </p>
                
                <div class="benefits" *ngIf="!showDetails">
                  <span class="benefit">
                    <mat-icon>check</mat-icon>
                    Performance optimization
                  </span>
                  <span class="benefit">
                    <mat-icon>check</mat-icon>
                    Better features
                  </span>
                  <span class="benefit">
                    <mat-icon>check</mat-icon>
                    100% anonymous
                  </span>
                </div>

                <button mat-button 
                        class="details-toggle"
                        (click)="showDetails = !showDetails">
                  <mat-icon>{{ showDetails ? 'expand_less' : 'expand_more' }}</mat-icon>
                  {{ showDetails ? 'Less' : 'Details' }}
                </button>

                <div class="cookie-details" *ngIf="showDetails">
                  <p class="detail-item">
                    <strong>What we track:</strong> Page views, feature usage, errors
                  </p>
                  <p class="detail-item">
                    <strong>Tool:</strong> Google Analytics (anonymized)
                  </p>
                  <p class="detail-item">
                    <strong>Storage:</strong> Maximum 2 months
                  </p>
                  <p class="detail-item">
                    <strong>Opt-out:</strong> Available anytime
                  </p>
                </div>
              </div>
            </div>
            
            <mat-card-actions class="cookie-actions">
              <button mat-raised-button 
                      color="primary"
                      class="accept-button"
                      (click)="acceptCookies()">
                <mat-icon>check</mat-icon>
                Accept
              </button>
              
              <button mat-stroked-button 
                      class="reject-button"
                      (click)="rejectCookies()">
                Decline
              </button>
            </mat-card-actions>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .cookie-banner {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      max-width: 420px;
      width: calc(100vw - 40px);
    }

    .cookie-card {
      background: rgba(20, 20, 25, 0.96);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(147, 51, 234, 0.2);
      border-radius: 12px;
      color: white;
      box-shadow: 
        0 8px 24px rgba(0, 0, 0, 0.4),
        0 2px 8px rgba(147, 51, 234, 0.2);
      padding: 0;
    }

    .cookie-content {
      padding: 0;
    }

    .cookie-main {
      display: flex;
      gap: 16px;
      margin-bottom: 20px;
    }

    .cookie-icon {
      color: #9333ea;
      font-size: 28px;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .cookie-text {
      flex: 1;
    }

    .cookie-text h3 {
      margin: 0 0 8px 0;
      font-size: 18px;
      font-weight: 600;
      color: white;
    }

    .description {
      margin: 0 0 16px 0;
      font-size: 14px;
      line-height: 1.5;
      color: rgba(255, 255, 255, 0.85);
    }

    .benefits {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 12px;
    }

    .benefit {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: rgba(255, 255, 255, 0.8);
    }

    .benefit mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #4CAF50;
    }

    .details-toggle {
      padding: 4px 12px;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.6);
      min-width: auto;
    }

    .details-toggle:hover {
      background: rgba(147, 51, 234, 0.1);
      color: rgba(255, 255, 255, 0.9);
    }

    .details-toggle mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      margin-right: 4px;
    }

    .cookie-details {
      margin-top: 12px;
      padding: 12px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 8px;
      border: 1px solid rgba(147, 51, 234, 0.1);
    }

    .detail-item {
      margin: 0 0 8px 0;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.7);
      line-height: 1.4;
    }

    .detail-item:last-child {
      margin-bottom: 0;
    }

    .detail-item strong {
      color: rgba(255, 255, 255, 0.9);
    }

    .cookie-actions {
      display: flex;
      gap: 12px;
      margin: 0;
      padding: 0;
    }

    .accept-button {
      flex: 1;
      background: linear-gradient(135deg, #9333ea, #ec4899) !important;
      border: none !important;
      font-size: 14px !important;
      font-weight: 600 !important;
      padding: 10px 20px !important;
      border-radius: 8px !important;
    }

    .accept-button:hover {
      background: linear-gradient(135deg, #a855f7, #f472b6) !important;
      box-shadow: 0 4px 12px rgba(147, 51, 234, 0.3) !important;
    }

    .accept-button mat-icon {
      font-size: 18px;
      margin-right: 4px;
    }

    .reject-button {
      flex: 1;
      border-color: rgba(147, 51, 234, 0.3) !important;
      color: rgba(255, 255, 255, 0.7) !important;
      font-size: 14px !important;
      font-weight: 500 !important;
      padding: 10px 20px !important;
      border-radius: 8px !important;
    }

    .reject-button:hover {
      background: rgba(147, 51, 234, 0.1) !important;
      border-color: rgba(147, 51, 234, 0.5) !important;
      color: rgba(255, 255, 255, 0.9) !important;
    }

    @media (max-width: 600px) {
      .cookie-banner {
        bottom: 0;
        left: 0;
        transform: none;
        max-width: 100%;
        width: 100%;
      }
      
      .cookie-card {
        border-radius: 12px 12px 0 0;
        border-bottom: none;
      }

      .cookie-main {
        flex-direction: column;
        gap: 12px;
      }

      .cookie-icon {
        align-self: center;
      }

      .benefits {
        margin-bottom: 16px;
      }
    }
  `]
})
export class CookieBannerComponent {
  consentService = inject(CookieConsentService);
  showDetails = false;

  acceptCookies(): void {
    this.consentService.grantConsent();
  }

  rejectCookies(): void {
    this.consentService.revokeConsent();
  }
}