import { Injectable, signal, computed, inject } from "@angular/core";
import { ExtensionStorageService } from "./extension-storage.service";

export interface AppConfig {
  bookmarkBaseUrl: string;
  apodBaseUrl: string;
}

const CONFIG_KEY = "app_config";

@Injectable({
  providedIn: "root",
})
export class ConfigService {
  private readonly storage = inject(ExtensionStorageService);
  private readonly _config = signal<AppConfig | null>(null);

  readonly isConfigured = computed(() => this._config() !== null);

  constructor() {
    void this.loadFromStorage();
  }

  get(): AppConfig | null {
    return this._config();
  }

  save(config: AppConfig): void {
    this._config.set(config);
    void this.storage.setJson(CONFIG_KEY, config);
  }

  clear(): void {
    this._config.set(null);
    void this.storage.remove(CONFIG_KEY);
  }

  private async loadFromStorage(): Promise<void> {
    const parsed = await this.storage.getJson<AppConfig>(CONFIG_KEY);
    if (!parsed?.bookmarkBaseUrl || !parsed?.apodBaseUrl) {
      this._config.set(null);
      return;
    }
    this._config.set(parsed);
  }
}
