import { lazy, type ComponentType } from "react";

const DYNAMIC_IMPORT_RELOAD_KEY = "lazy-dynamic-import-reload";
const PRELOAD_ERROR_RELOAD_KEY = "vite-preload-error-reload";

const browserWindow =
  typeof window === "undefined"
    ? null
    : (window as Window & { __lazyImportRecoveryInstalled?: boolean });

function reloadOnce(storageKey: string) {
  if (!browserWindow) return false;

  try {
    const alreadyReloaded = browserWindow.sessionStorage.getItem(storageKey) === "true";
    if (alreadyReloaded) {
      browserWindow.sessionStorage.removeItem(storageKey);
      return false;
    }

    browserWindow.sessionStorage.setItem(storageKey, "true");
  } catch {
    // Ignore storage access issues and still try a hard reload.
  }

  browserWindow.location.reload();
  return true;
}

function isDynamicImportFetchError(error: unknown) {
  return error instanceof TypeError && /Failed to fetch dynamically imported module/i.test(error.message);
}

function installPreloadErrorRecovery() {
  if (!browserWindow || browserWindow.__lazyImportRecoveryInstalled) return;

  browserWindow.__lazyImportRecoveryInstalled = true;
  browserWindow.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    reloadOnce(PRELOAD_ERROR_RELOAD_KEY);
  });
}

installPreloadErrorRecovery();

type ImportFactory<T extends ComponentType<any>> = () => Promise<{ default: T }>;

export function lazyWithRetry<T extends ComponentType<any>>(importFactory: ImportFactory<T>) {
  return lazy(async () => {
    try {
      const module = await importFactory();

      try {
        browserWindow?.sessionStorage.removeItem(DYNAMIC_IMPORT_RELOAD_KEY);
      } catch {
        // Ignore storage cleanup issues.
      }

      return module;
    } catch (error) {
      if (isDynamicImportFetchError(error) && reloadOnce(DYNAMIC_IMPORT_RELOAD_KEY)) {
        return new Promise<never>(() => {});
      }

      throw error;
    }
  });
}
