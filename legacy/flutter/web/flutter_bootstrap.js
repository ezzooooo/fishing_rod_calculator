{{flutter_js}}
{{flutter_build_config}}

const SERVICE_WORKER_RESET_KEY = "fishjoongo-sw-reset";
const VERSION_CHECK_INTERVAL_MS = 60 * 1000;
const ENTRYPOINT_PATH = "/main.dart.js";
let currentEntrypointTag = null;

async function unregisterServiceWorkers() {
  if (!("serviceWorker" in navigator)) {
    return false;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  if (registrations.length === 0) {
    return false;
  }

  await Promise.all(
    registrations.map((registration) => registration.unregister()),
  );

  return navigator.serviceWorker.controller != null;
}

async function fetchEntrypointTag() {
  const response = await fetch(`${ENTRYPOINT_PATH}?v=${Date.now()}`, {
    method: "HEAD",
    cache: "no-store",
  });
  if (!response.ok) {
    return null;
  }

  return response.headers.get("etag") ?? response.headers.get("last-modified");
}

function startBuildVersionPolling() {
  window.setInterval(async () => {
    try {
      const latestEntrypointTag = await fetchEntrypointTag();
      if (latestEntrypointTag == null) {
        return;
      }

      if (currentEntrypointTag == null) {
        currentEntrypointTag = latestEntrypointTag;
        return;
      }

      if (latestEntrypointTag !== currentEntrypointTag) {
        window.location.reload();
      }
    } catch (error) {
      console.warn("Failed to check for a newer build.", error);
    }
  }, VERSION_CHECK_INTERVAL_MS);
}

async function bootstrap() {
  const isControlledByOldServiceWorker = await unregisterServiceWorkers();
  if (
    isControlledByOldServiceWorker &&
    sessionStorage.getItem(SERVICE_WORKER_RESET_KEY) == null
  ) {
    sessionStorage.setItem(SERVICE_WORKER_RESET_KEY, "1");
    window.location.reload();
    return;
  }

  sessionStorage.removeItem(SERVICE_WORKER_RESET_KEY);

  await _flutter.loader.load({
    onEntrypointLoaded: async (engineInitializer) => {
      const appRunner = await engineInitializer.initializeEngine();
      const app = await appRunner.runApp();
      currentEntrypointTag = await fetchEntrypointTag();
      startBuildVersionPolling();
      return app;
    },
  });
}

bootstrap();
