import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { appRoutes } from './app.routes';
import { TASKS_API_BASE_PATH } from './generated/tasks-api/api-base-path.token';
import { FLIGHT_API_BASE_PATH } from './generated/flight-api/api-base-path.token';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes),
    provideHttpClient(withFetch()),
    { provide: TASKS_API_BASE_PATH, useValue: '' },
    { provide: FLIGHT_API_BASE_PATH, useValue: 'https://demo.angulararchitects.io' },
  ],
};
