import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

async function prepareApp() {
  // Start MSW in development mode
  if (typeof window !== 'undefined') {
    const { worker } = await import('./mocks/browser');
    await worker.start({
      onUnhandledRequest: 'bypass',
    });
  }
  return bootstrapApplication(App, appConfig);
}

prepareApp().catch((err) => console.error(err));
