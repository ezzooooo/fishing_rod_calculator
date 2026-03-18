# AGENTS.md

## Deployment

- Cloudflare Pages project: `fishjoongo-helper`
- Production domain: `https://fishjoongo-helper.pages.dev`
- Production branch: `master`
- Always deploy with `scripts/deploy_pages.sh`
- Reason: this disables Flutter's offline-first PWA caching and keeps users on the latest web build
- The web bootstrap unregisters old service workers and reloads when a newer build is detected

## Build

- Web build command:
  `flutter build web --release --pwa-strategy=none --dart-define=FIREBASE_WEB_API_KEY=$FIREBASE_WEB_API_KEY`
