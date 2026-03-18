# AGENTS.md

## Deployment

- Cloudflare Pages project: `fishjoongo-helper`
- Production domain: `https://fishjoongo-helper.pages.dev`
- Production branch: `master`
- Web deploy command:
  `npx wrangler pages deploy build/web --project-name fishjoongo-helper --branch master`

## Build

- Web build command:
  `flutter build web --release --dart-define=FIREBASE_WEB_API_KEY=$FIREBASE_WEB_API_KEY`
