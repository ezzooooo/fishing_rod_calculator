# 피싱중고 견적 관리

Next.js App Router, React, TypeScript, Tailwind CSS로 만든 직원용 낚시대 견적 도구입니다. `fishjoongo-renewal`과 같은 `src/app` · `src/components` · `src/lib` 구성을 사용합니다.

기존 Firebase Auth 계정과 Cloud Firestore 데이터를 그대로 연결합니다. 브랜드·낚시대·견적 기록을 다른 데이터베이스로 옮기지 않습니다.

## 실행

Node.js 22 LTS(22.13+) 또는 24 LTS를 사용합니다.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

`.env.local`에 기존 Firebase 웹 앱의 `NEXT_PUBLIC_FIREBASE_API_KEY`를 입력합니다. 나머지 Firebase 프로젝트 설정은 기존 프로젝트를 기본값으로 사용하며 `.env.example`에서 확인할 수 있습니다. 기존 `FIREBASE_WEB_API_KEY` 환경 변수나 로컬 `.vscode/dart_defines.local.json`이 있으면 개발·빌드 스크립트가 재사용합니다. 실제 설정 파일을 커밋하지 않습니다.

## 기능

- 이메일·비밀번호 로그인 및 `staff/{uid}.enabled == true` 직원 권한 확인
- 고객 한 명의 견적에 여러 종류의 낚시대와 칸수별 수량·적용율 추가
- 전체 합계 확인, 견적 한 번에 저장, 제목·고객명·메모·항목 수정
- 당시 이름·단가·적용율·금액·기록 시간을 보존하는 견적 내역
- 수정 버전(`revision`)을 확인하는 Firestore 트랜잭션으로 동시 수정 보호
- 전체 견적 복사, 한글 견적서 미리보기, 브라우저 인쇄·PDF 저장
- 브랜드·낚시대 관리, 칸수별 매입·판매 가격표와 일괄 가격 설정
- 관리자용 JSON 백업·가져오기 및 기본 데이터 불러오기
- 마우스·Tab 포커스 시 텍스트 전체 선택
- 노트북 1280×720·1366×768 중심의 상단 메뉴와 간결한 견적·가격표 목록
- 수량 입력에서 Enter로 다음 칸수 이동, Ctrl/⌘+Enter로 견적에 담기

매입은 적용율을 반영한 **대당 단가를 천 원 단위로 내림**, 판매는 **올림**한 뒤 수량을 곱합니다. 매입·판매 적용율은 따로 유지합니다. 기존 `lengthPrices`, `purchaseLengthPrices`, `saleLengthPrices`와 구형 별칭을 읽을 수 있습니다.

## 코드 구성

- `src/app`: Next.js 페이지와 전역 레이아웃
- `src/components`: 직원용 셸, 공통 입력·모달, 견적·카탈로그 화면과 CSS Modules
- `src/lib/domain.ts`: 데이터 호환과 계산 로직
- `src/lib/repository.ts`: Firebase 실시간 구독·CRUD·견적 트랜잭션
- `src/lib/app-context.tsx`: 로그인·직원 권한·공용 카탈로그 상태
- `src/lib/quote-draft-context.tsx`: 작성 중인 여러 낚시대 견적
- `src/lib/format.ts`: 한국 숫자·서울 시간 표시
- `public/defaults`: 기존 브랜드·낚시대 기본 데이터
- `tests`: 도메인·저장소 테스트 및 실제 브라우저 검증

## 검증

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:browser
npm run test:production
```

브라우저 검증은 개발 전용 메모리 저장소를 사용하고, 운영 Firebase 요청이 발생하지 않는지도 확인합니다. `NEXT_PUBLIC_DEMO_MODE=true npm run dev`로 같은 예시 화면을 볼 수 있습니다. 운영 빌드에서는 예시 모드를 켤 수 없으며 배포 스크립트도 이 설정을 거부합니다.

운영 빌드 검증은 `npm run build` 후 실행하며, 실제 로그인 시도 없이 정적 경로와 로그인 보호 화면을 확인합니다.

## 배포

현재 Cloudflare Pages 프로젝트와 주소를 유지합니다.

- 프로젝트: `fishjoongo-helper`
- 주소: `https://fishjoongo-helper.pages.dev`
- 운영 브랜치: `master`
- 산출물: Next.js 정적 export `out/`

```bash
./scripts/deploy_pages.sh
```

반드시 이 스크립트를 사용합니다. 로컬 Firebase 설정을 불러와 빌드한 뒤 기존 Pages 프로젝트에 배포합니다. 리뉴얼 프로젝트의 Workers·Postgres·R2는 이 도구에 필요하지 않아 가져오지 않았습니다. 견적 ID는 정적 경로에서 조회할 수 있도록 `/quotes/detail?id=...`로 표시합니다.

견적 기능을 처음 운영에 적용할 때는 보안 규칙도 반영해야 합니다.

```bash
firebase deploy --only firestore:rules --project frc-staff-juwon-20260226
```

`public/flutter_service_worker.js`와 앱의 정리 코드가 기존 Flutter 서비스 워커를 해제합니다. 새 앱은 오프라인 우선 캐시를 사용하지 않습니다.

## 이전 Flutter 코드

기존 구현과 이번 대화에서 작성한 Flutter 견적 기능은 삭제하지 않고 `legacy/flutter/`에 보관했습니다. 현재 앱은 Flutter SDK 없이 개발·빌드·배포할 수 있습니다. 이전 구현의 문서·테스트·플랫폼 프로젝트도 해당 폴더에서 확인할 수 있습니다. 운영 데이터는 변경하지 않습니다.
