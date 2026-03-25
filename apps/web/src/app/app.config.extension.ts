import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from "@angular/core";
import { provideHttpClient } from "@angular/common/http";
import { provideRouter, withHashLocation } from "@angular/router";

import { routes } from "./app.routes";

// Extension-specific config: uses hash-based routing so paths like
// chrome-extension://[id]/#/settings work without a server rewrite.
// The Angular service worker is intentionally omitted — extensions
// have their own caching mechanisms.
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRouter(routes, withHashLocation()),
  ],
};
