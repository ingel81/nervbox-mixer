import { Component, inject, OnInit } from '@angular/core';
import { ShellComponent } from './shell/shell.component';
import { CookieBannerComponent } from './components/cookie-banner.component';
import { AnalyticsService } from './services/analytics.service';

@Component({
    selector: 'app-root',
    imports: [ShellComponent, CookieBannerComponent],
    template: `
      <app-shell></app-shell>
      <app-cookie-banner></app-cookie-banner>
    `
})
export class AppComponent implements OnInit {
  private analytics = inject(AnalyticsService);

  ngOnInit(): void {
    this.analytics.trackSessionStart();
    this.analytics.trackPageView('Audio Editor');
  }
}
