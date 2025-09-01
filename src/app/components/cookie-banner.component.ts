import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { CookieConsentService } from '../services/cookie-consent.service';

@Component({
  selector: 'app-cookie-banner',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatIconModule],
  template: `
    <div class="cookie-banner" *ngIf="!consentService.getConsentStatus()()">
      <mat-card class="cookie-card">
        <mat-card-content>
          <div class="cookie-content">
            <mat-icon class="cookie-icon">cookie</mat-icon>
            <div class="cookie-text">
              <h3>Cookie Settings</h3>
              <p>
                NervBox Mixer uses Google Analytics to analyze app usage 
                and improve user experience through anonymized usage statistics.
              </p>
              <p class="cookie-details">
                <strong>Data:</strong> Anonymized page views and interactions<br>
                <strong>Storage:</strong> 2 months maximum<br>
                <strong>Purpose:</strong> App improvement and error analysis
              </p>
            </div>
          </div>
          
          <mat-card-actions class="cookie-actions">
            <button mat-raised-button color="primary" (click)="acceptCookies()">
              <mat-icon>check</mat-icon>
              Accept
            </button>
            <button mat-stroked-button (click)="rejectCookies()">
              <mat-icon>close</mat-icon>
              Decline
            </button>
            <button mat-button class="settings-btn" (click)="showDetails = !showDetails">
              <mat-icon>settings</mat-icon>
              Details
            </button>
          </mat-card-actions>

          <div class="cookie-details-expanded" *ngIf="showDetails">
            <h4>Detailed Information</h4>
            <ul>
              <li><strong>Google Analytics:</strong> Collects anonymized usage statistics</li>
              <li><strong>Cookies:</strong> _ga, _ga_901EP95FGV, _gid</li>
              <li><strong>Legal Basis:</strong> Art. 6 (1)(a) GDPR (Consent)</li>
              <li><strong>Data Transfer:</strong> Google LLC, USA (Adequacy Decision)</li>
              <li><strong>Withdrawal:</strong> Possible at any time via cookie settings</li>
            </ul>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .cookie-banner {
      position: fixed;
      bottom: 20px;
      left: 20px;
      right: 20px;
      z-index: 1000;
      max-width: 600px;
      margin: 0 auto;
    }

    .cookie-card {
      background: rgba(20, 20, 25, 0.95);
      backdrop-filter: blur(15px);
      border: 1px solid rgba(147, 51, 234, 0.3);
      border-radius: 12px;
      color: white;
      box-shadow: 0 8px 32px rgba(147, 51, 234, 0.2);
    }

    .cookie-content {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 16px;
    }

    .cookie-icon {
      font-size: 24px;
      background: linear-gradient(135deg, #9333ea, #ec4899);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-top: 4px;
      flex-shrink: 0;
    }

    .cookie-text h3 {
      margin: 0 0 8px 0;
      font-size: 18px;
      font-weight: 600;
      background: linear-gradient(135deg, #9333ea, #ec4899);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .cookie-text p {
      margin: 0 0 8px 0;
      font-size: 14px;
      line-height: 1.5;
      color: rgba(255, 255, 255, 0.9);
    }

    .cookie-details {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.7);
      margin-top: 12px;
      padding: 12px;
      background: rgba(147, 51, 234, 0.1);
      border-radius: 6px;
      border: 1px solid rgba(147, 51, 234, 0.2);
    }

    .cookie-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      justify-content: flex-end;
      margin-top: 20px;
    }

    .cookie-actions button {
      border-radius: 6px;
    }

    .cookie-actions button[color="primary"] {
      background: linear-gradient(135deg, #9333ea, #ec4899) !important;
      border: none;
    }

    .cookie-actions button[mat-stroked-button] {
      border-color: rgba(147, 51, 234, 0.5);
      color: rgba(255, 255, 255, 0.9);
    }

    .cookie-actions button[mat-stroked-button]:hover {
      background: rgba(147, 51, 234, 0.1);
      border-color: rgba(147, 51, 234, 0.8);
    }

    .settings-btn {
      margin-left: auto;
      color: rgba(255, 255, 255, 0.7) !important;
    }

    .settings-btn:hover {
      background: rgba(147, 51, 234, 0.1) !important;
      color: rgba(255, 255, 255, 0.9) !important;
    }

    .cookie-details-expanded {
      margin-top: 20px;
      padding: 16px;
      background: rgba(147, 51, 234, 0.05);
      border: 1px solid rgba(147, 51, 234, 0.15);
      border-radius: 8px;
    }

    .cookie-details-expanded h4 {
      margin: 0 0 12px 0;
      font-size: 16px;
      font-weight: 600;
      color: white;
      background: linear-gradient(135deg, #9333ea, #ec4899);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .cookie-details-expanded ul {
      margin: 0;
      padding-left: 20px;
      list-style: none;
    }

    .cookie-details-expanded li {
      margin-bottom: 10px;
      font-size: 13px;
      color: rgba(255, 255, 255, 0.8);
      line-height: 1.5;
      position: relative;
    }

    .cookie-details-expanded li::before {
      content: "•";
      color: #9333ea;
      font-weight: bold;
      position: absolute;
      left: -15px;
    }

    @media (max-width: 600px) {
      .cookie-banner {
        left: 10px;
        right: 10px;
        bottom: 10px;
      }
      
      .cookie-content {
        flex-direction: column;
        gap: 12px;
      }
      
      .cookie-actions {
        flex-direction: column;
        gap: 8px;
      }
      
      .cookie-actions button {
        width: 100%;
      }
      
      .settings-btn {
        margin-left: 0;
        order: 3;
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