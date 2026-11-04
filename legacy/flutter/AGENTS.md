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

## UI

- For new text inputs, use `AppTextField` or `AppTextFormField` from `lib/widgets/app_text_fields.dart` instead of raw `TextField` or `TextFormField`.
- Reason: app text inputs select all text on focus, including keyboard Tab navigation.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
