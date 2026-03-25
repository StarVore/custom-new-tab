import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { ConfigService } from "../services/config.service";

export const configGuard: CanActivateFn = () => {
  const config = inject(ConfigService);
  const router = inject(Router);
  return config.isConfigured() ? true : router.createUrlTree(["/setup"]);
};
