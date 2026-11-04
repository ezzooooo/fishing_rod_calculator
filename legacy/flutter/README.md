# 낚시대 계산기 (웹/직원용)

Flutter 기반 낚시대 계산기입니다.

- 인증: Firebase Auth (이메일/비밀번호)
- 데이터: Cloud Firestore (직원 공용 데이터)
- 배포: Cloudflare Pages

## 핵심 동작

- 모든 직원이 같은 브랜드/낚시대 데이터를 공유합니다.
- **새 견적 만들기**에서 고객 정보와 여러 종류의 낚시대를 담고, 전체 수량·금액을 확인한 뒤 한 번에 저장합니다.
- 같은 낚시대를 다시 선택하면 기존 수량·적용율을 수정하며, 다른 종류를 담아도 이미 담은 항목은 유지합니다.
- 작성 중 매입/판매 구분을 바꾸면 낚시대를 담을 때의 가격표와 구분별 적용율로 전체 금액을 다시 계산합니다.
- 고객명·제목·메모와 함께 저장한 견적은 메뉴의 **견적 내역**에서 조회·수정·삭제할 수 있습니다.
- 견적에는 매입/판매 구분, 브랜드·낚시대명, 칸수별 수량·단가·적용율·최종 금액, 최초 기록 시간과 마지막 수정 시간을 저장합니다.
- 저장한 견적은 직원 간에 공유되며, 이후 가격표가 바뀌거나 낚시대가 삭제되어도 기록 당시의 이름과 금액을 유지합니다.
- 여러 직원이 같은 견적을 수정하면 먼저 저장한 변경을 보호하고 최신 내역을 다시 확인하도록 안내합니다.
- 로그인한 계정이라도 `staff/{uid}.enabled == true` 인 경우만 접근 허용됩니다.
- 소셜 로그인은 사용하지 않습니다.

## Firestore 컬렉션 구조

- `staff/{uid}`
  - `enabled: true` 이어야 앱 접근 허용
- `brands/{brandId}`
- `fishing_rods/{rodId}`
- `quote_records/{quoteId}`
  - `customerName`(선택), `title`, `note`, `mode`, `items`(기록 당시 이름·가격), `totalQuantity`, `totalPrice`
  - `createdBy`, `createdAt`, `updatedAt`, `revision`
  - 서버 시간 확정 전에는 `clientCreatedAt` / `clientUpdatedAt`으로 표시
  - 활성 직원만 읽기·쓰기 가능. 수정 시 최초 기록 시간과 작성자 유지

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

견적 기능을 처음 배포할 때는 위 명령으로 `quote_records` 보안 규칙을 함께 배포해야 합니다.

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
  --pwa-strategy=none \
  --dart-define=FIREBASE_WEB_API_KEY=$FIREBASE_WEB_API_KEY
```

### 배포

```bash
npx wrangler whoami
./scripts/deploy_pages.sh
```

- Cloudflare Pages 프로젝트명: `fishjoongo-helper`
- 운영 도메인: `https://fishjoongo-helper.pages.dev`
- 운영 배포 브랜치: `master`
- Flutter Web 서비스 워커는 배포 시 비활성화함 (`--pwa-strategy=none`)
- `web/flutter_bootstrap.js`에서 기존 서비스 워커를 제거하고, 새 빌드 감지 시 자동 새로고침함
- `wrangler.toml`에 `pages_build_output_dir = "build/web"` 설정됨
- SPA 라우팅용 `web/_redirects` 포함

## 개발 검증

```bash
flutter analyze
flutter test
```

테스트는 `test/support/firebase_test_environment.dart`의 메모리 저장소와 로그인 상태를 사용합니다.
실제 앱 프로바이더와 라우터를 검증하며, 테스트 실행에 Firebase 초기화나 운영 API 키가 필요하지 않습니다.
