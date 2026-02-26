# 낚시대 계산기 (웹/직원용)

Flutter 기반 낚시대 계산기입니다.

- 인증: Firebase Auth (이메일/비밀번호)
- 데이터: Cloud Firestore (직원 공용 데이터)
- 배포: Cloudflare Pages

## 핵심 동작

- 모든 직원이 같은 브랜드/낚시대 데이터를 공유합니다.
- 로그인한 계정이라도 `staff/{uid}.enabled == true` 인 경우만 접근 허용됩니다.
- 소셜 로그인은 사용하지 않습니다.

## Firestore 컬렉션 구조

- `staff/{uid}`
  - `enabled: true` 이어야 앱 접근 허용
- `brands/{brandId}`
- `fishing_rods/{rodId}`

## 1) Firebase 설정

### 기본 설정

```bash
flutter pub get
flutterfire configure \
  --project=frc-staff-juwon-20260226 \
  --platforms=android,ios,macos,web,windows \
  --yes
```

`flutterfire configure`가 아래 파일을 생성/갱신합니다.

- `lib/firebase_options.dart`
- `android/app/google-services.json`
- `ios/Runner/GoogleService-Info.plist`
- `macos/Runner/GoogleService-Info.plist`

보안 주의:
- 위 파일에는 API Key가 포함될 수 있으므로 그대로 커밋하지 마세요.
- 저장소에는 플레이스홀더만 유지하고, 실제 키는 로컬/CI에서 주입하세요.

### dart-define 주입

`lib/firebase_options.dart`는 API Key를 `--dart-define`으로 받습니다.

```bash
export FIREBASE_WEB_API_KEY="<your-web-api-key>"
export FIREBASE_ANDROID_API_KEY="<your-android-api-key>"
export FIREBASE_IOS_API_KEY="<your-ios-api-key>"
# 선택: Windows에서 web 키와 다를 때만
export FIREBASE_WINDOWS_API_KEY="<your-windows-api-key>"
```

### Firebase Console 설정

1. Authentication -> Sign-in method -> Email/Password 활성화
2. Firestore Database 생성 (Production mode 권장)
3. 보안 규칙 배포

```bash
firebase deploy --only firestore:rules --project frc-staff-juwon-20260226
```

### 직원 계정 준비

1. Authentication에서 직원 이메일/비밀번호 계정 생성
2. 계정 `uid` 확인
3. Firestore `staff/{uid}` 문서 생성 후 `enabled: true` 저장

## 2) 로컬 실행

```bash
flutter run -d chrome \
  --dart-define=FIREBASE_WEB_API_KEY=$FIREBASE_WEB_API_KEY
```

## 3) Cloudflare Pages 배포

### 빌드

```bash
flutter build web --release \
  --dart-define=FIREBASE_WEB_API_KEY=$FIREBASE_WEB_API_KEY
```

### 배포

```bash
npx wrangler whoami
npx wrangler pages deploy build/web --project-name <your-pages-project>
```

- `wrangler.toml`에 `pages_build_output_dir = "build/web"` 설정됨
- SPA 라우팅용 `web/_redirects` 포함

## 개발 검증

```bash
flutter analyze
flutter test
```
