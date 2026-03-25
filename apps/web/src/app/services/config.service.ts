import { Injectable, signal, computed } from "@angular/core";

export interface AppConfig {
  bookmarkBaseUrl: string;
  apodBaseUrl: string;
}

const CONFIG_KEY = "app_config";

@Injectable({
  providedIn: "root",
})
export class ConfigService {
  private readonly _config = signal<AppConfig | null>(this.loadFromStorage());

  readonly isConfigured = computed(() => this._config() !== null);

  get(): AppConfig | null {
    return this._config();
  }

  save(config: AppConfig): void {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    this._config.set(config);
  }

  clear(): void {
    localStorage.removeItem(CONFIG_KEY);
    this._config.set(null);
  }

  private loadFromStorage(): AppConfig | null {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as AppConfig;
      if (!parsed.bookmarkBaseUrl || !parsed.apodBaseUrl) return null;
      return parsed;
    } catch {
      return null;
    }
  }
}
