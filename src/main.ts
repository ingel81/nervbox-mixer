import { provideZoneChangeDetection } from '@angular/core';
import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import {
  provideHttpClient,
  withInterceptors,
  withXhr,
} from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { jwtInterceptor } from './app/core/interceptors/jwt.interceptor';

bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection(),
    provideAnimations(),
    provideHttpClient(withXhr(), withInterceptors([jwtInterceptor])),
  ],
}).catch(err => console.error(err));
