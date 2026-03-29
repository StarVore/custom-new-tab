import { Injectable } from "@angular/core";

interface PermissionRequest {
  origins?: string[];
  permissions?: string[];
}

type PermissionsApi = {
  request: (
    permissions: PermissionRequest,
    callback?: (result: boolean) => void,
  ) => Promise<boolean> | void;
};

@Injectable({
  providedIn: "root",
})
export class HostPermissionService {
  async ensureOriginPermissions(
    urls: string[],
  ): Promise<{ granted: boolean; denied: string[] }> {
    const originPatterns = Array.from(
      new Set(
        urls
          .map((url) => this.toOriginPattern(url))
          .filter((p): p is string => Boolean(p)),
      ),
    );

    if (!originPatterns.length) {
      return { granted: false, denied: urls };
    }

    const api = this.getPermissionsApi();
    if (!api) {
      // Website mode has no runtime extension permission API.
      return { granted: true, denied: [] };
    }

    // Request all required origins in one direct call from the user action.
    const granted = await this.request(api, { origins: originPatterns });
    if (granted) {
      return { granted: true, denied: [] };
    }

    return { granted: false, denied: urls };
  }

  async ensureOriginPermission(url: string): Promise<boolean> {
    const result = await this.ensureOriginPermissions([url]);
    return result.granted;
  }

  private toOriginPattern(url: string): string | null {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
        return null;
      return `${parsed.protocol}//${parsed.host}/*`;
    } catch {
      return null;
    }
  }

  private getPermissionsApi(): PermissionsApi | null {
    const g = globalThis as unknown as {
      browser?: { permissions?: PermissionsApi };
      chrome?: { permissions?: PermissionsApi };
    };

    return g.browser?.permissions ?? g.chrome?.permissions ?? null;
  }

  private async request(
    api: PermissionsApi,
    permission: PermissionRequest,
  ): Promise<boolean> {
    try {
      const maybePromise = api.request(permission);
      if (
        typeof (maybePromise as Promise<boolean> | undefined)?.then ===
        "function"
      ) {
        return await (maybePromise as Promise<boolean>);
      }
    } catch {
      // Fall back to callback style.
    }

    return new Promise<boolean>((resolve, reject) => {
      api.request(permission, (result: boolean) => {
        const runtime = (
          globalThis as unknown as {
            chrome?: { runtime?: { lastError?: Error } };
          }
        ).chrome?.runtime;
        if (runtime?.lastError) {
          reject(runtime.lastError);
          return;
        }
        resolve(Boolean(result));
      });
    });
  }
}
