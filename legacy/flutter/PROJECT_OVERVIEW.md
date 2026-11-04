# 낚시대 계산기 (Fishing Rod Calculator)

## 프로젝트 개요

Flutter를 사용하여 Windows 데스크톱용 낚시대 계산기 애플리케이션을 개발합니다.

## 기술 스택

- **Framework**: Flutter (Windows Desktop)
- **상태관리**: Riverpod
- **데이터 모델**: Freezed
- **라우팅**: Go Router

## 주요 기능

### 1. 브랜드 관리

- 낚시대 브랜드 추가
- 브랜드 수정
- 브랜드 삭제
- 브랜드 목록 조회

### 2. 낚시대 관리

- 낚시대 추가 (브랜드 선택 포함)
- 낚시대 수정
- 낚시대 삭제
- 낚시대 스펙 설정:
  - 최소값/최대값 설정
  - 홀수/짝수 여부 선택
  - 칸수 자동 생성 (예: 18,20,22~60 또는 17,19,21~59)
- 중고가 설정

### 3. 계산기 (홈 화면)

- 낚시대 선택/검색 기능
- 좌측: 선택된 낚시대의 칸수 목록
- 중앙: 대수 입력
- 우측: 가격 정보 및 계산
  - 중고가 표시
  - 수량 표시
  - 총 합가격 표시
  - 할인율 선택 (40%~70%, 5% 단위)
  - 최종 가격 표시
- 하단: 전체 총합 가격 및 총 대수

## 화면 구성

### 1. 홈 화면 (계산기)

- 메인 계산기 기능
- 낚시대 선택 및 계산 인터페이스

### 2. 브랜드 관리 화면

- 브랜드 목록
- 브랜드 추가/수정/삭제 폼

### 3. 낚시대 관리 화면

- 낚시대 목록
- 낚시대 추가/수정/삭제 폼
- 브랜드 선택 드롭다운

## 데이터 모델

### Brand

```dart
@freezed
class Brand with _$Brand {
  const factory Brand({
    required String id,
    required String name,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) = _Brand;
}
```

### FishingRod

```dart
@freezed
class FishingRod with _$FishingRod {
  const factory FishingRod({
    required String id,
    required String name,
    required String brandId,
    required int minValue,
    required int maxValue,
    required bool isEven, // true: 짝수, false: 홀수
    required double usedPrice,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) = _FishingRod;
}
```

### CalculationItem

```dart
@freezed
class CalculationItem with _$CalculationItem {
  const factory CalculationItem({
    required String fishingRodId,
    required int length,
    required int quantity,
    required double discountRate,
  }) = _CalculationItem;
}
```

## 개발 단계

1. ✅ 프로젝트 개요 문서 작성
2. 🔄 Flutter 프로젝트 초기화
3. ⏳ 의존성 추가 (Freezed, Riverpod, Go Router)
4. ⏳ 데이터 모델 생성
5. ⏳ Riverpod 프로바이더 설정
6. ⏳ Go Router 라우팅 설정
7. ⏳ 브랜드 관리 화면 구현
8. ⏳ 낚시대 관리 화면 구현
9. ⏳ 홈 화면 (계산기) 구현

## UI/UX 고려사항

- Windows 데스크톱 환경에 최적화된 UI
- 직관적인 사용자 인터페이스
- 반응형 레이아웃
- 키보드 단축키 지원
- 데이터 영속성 (로컬 저장소)
