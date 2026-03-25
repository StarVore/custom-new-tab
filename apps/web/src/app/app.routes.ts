import { Routes } from "@angular/router";
import { configGuard } from "./guards/config.guard";

export const routes: Routes = [
  {
    path: "setup",
    loadComponent: () => import("./setup/setup").then((m) => m.SetupComponent),
  },
  {
    path: "settings",
    loadComponent: () =>
      import("./settings/settings").then((m) => m.SettingsComponent),
    canActivate: [configGuard],
  },
  {
    path: "",
    loadComponent: () => import("./home/home").then((m) => m.HomeComponent),
    canActivate: [configGuard],
  },
  { path: "**", redirectTo: "" },
];
