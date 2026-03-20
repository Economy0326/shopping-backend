# Backend API / 운영 기준 문서

## 인증 & 보안 정책

### JWT 인증 구조

#### Access Token

- 프론트 메모리(tokenMemory)에만 저장
- localStorage / sessionStorage 저장 금지
- 모든 인증 요청에 자동 포함
  Authorization: Bearer <accessToken>

#### Refresh Token

- 서버 발급
- HttpOnly + Secure Cookie
- 프론트 JS 접근 불가
- DB에는 hash만 저장 (RefreshSession)

---

## 토큰 갱신 정책

- 일반 API 요청 중 401 발생 시 /auth/refresh 자동 재시도 금지
- 앱 최초 진입 시(accessToken 없음)에만 /auth/refresh 1회 허용
- refresh 요청 시 헤더
  x-silent-auth: true
- refresh 실패 시 비로그인 상태 유지 + 로그인 모달 표시

---

## 401 처리 UX 연동 정책

- accessToken 제거
- AUTH_REQUIRED 이벤트 발생
- 강제 라우팅 금지
- 현재 화면 유지 + 로그인 모달

---

## CORS 정책

- 프론트: withCredentials: true

- 서버:
  - Access-Control-Allow-Credentials: true
  - Access-Control-Allow-Origin: 정확한 Origin만 허용
  - * 금지

---

## 공통 응답 포맷

### 성공 응답 (단건)

{
  "data": {}
}

### 리스트 응답

{
  "data": [],
  "meta": { "page": 1, "size": 20, "total": 123 }
}

### 에러 응답

{
  "error": {
    "code": "INVALID_OPTION_COMBINATION",
    "message": "선택한 옵션 조합이 존재하지 않습니다",
    "details": {}
  }
}

---

## 응답 변환 규칙

- 모든 성공 응답은 { data: ... }
- { id: ... } → { data: { id: ... } }로 변환
- 이미 { data }면 그대로 유지
- 값이 비어 있는 상태(empty value)는 정상 응답일 수 있다
- 이 경우에도 404 대신 200 + { data: ... } 형태로 반환한다

---

## Users / Profile 운영 규칙

### API

- GET /users/me
- PATCH /users/me/profile
- PUT /users/default-address

### 정책

- 인증 필요
- 프론트는 name으로 보내고 서버는 displayName으로 매핑한다
- address.zip/address1/address2는 각각
  defaultZip / defaultAddress1 / defaultAddress2로 저장된다
- 응답은 사용자 요약 객체 전체를 반환한다

---

## Categories 운영 규칙

### API

- GET /categories

### 응답

- id, slug, name 포함
- 프론트는 slug 기준으로 필터링

---

## Products 운영 규칙

### API

- GET /products
- GET /products/{id}

### 목록 정책

- isActive=true 상품만 노출
- category 또는 categoryId 기준 필터 가능
- 응답에는 thumbnailUrl 포함

### 상세 정책

- images는 string[] URL 배열
- optionId / variantId / variants는 응답에서 제거
- optionGroups.options[].stock 기준으로 재고 처리
- look 카테고리는 optionGroups가 없을 수 있음

### stock 계산 정책

- 각 옵션 stock은 해당 옵션이 포함된 variant stock의 합산값

---

## Orders 운영 정책

### 주문 상태

- AWAITING_DEPOSIT
- DEPOSIT_CONFIRMED
- SHIPPED
- DELIVERED
- CANCELED

### 결제 수단

- BANK_TRANSFER

### 주문 생성 정책

- optionValues(groupKey, value) 기반으로 variant 탐색

#### 처리 순서

1. productId 조회
2. optionValues → optionId 매핑
3. optionId 조합으로 variant 탐색
4. 재고 확인 후 주문 확정

### 400 에러 조건

- optionValues 누락
- 옵션 없음
- variant 없음
- 재고 부족

---

## 무통장 + 택배 운영법

1. 주문 생성 → AWAITING_DEPOSIT (12시간, 재고 차감)
2. 입금 확인 → DEPOSIT_CONFIRMED
3. 발송 등록 → SHIPPED
4. 구매확정 또는 7일 후 자동 → DELIVERED

### 미입금 취소

- 12시간 후 CANCELED
- 재고 복구

---

## 반품 / 환불 운영법

### 상태

- REQUESTED
- APPROVED
- REJECTED
- REFUNDED

### 처리

- 반품 신청: DELIVERED 상태만 가능
- 승인: POST /admin/returns/{id}/approve
- 거절: POST /admin/returns/{id}/reject

### 환불

- refund-log 생성
- REFUNDED 상태 변경

---

## 재고 정책

- 주문 시 차감
- 미입금 취소 시 복구
- 반품 승인 단계에서는 복구 안 함
- REFUNDED 시 복구

---

## refund-log 제약

- APPROVED 상태에서만 생성 가능
- 생성 시 REFUNDED 전환
- 중복 실행 불가

---

## Notice 운영 규칙

### 공개 API

- GET /notices
- GET /notices/{id}

### 관리자 API

- GET /admin/notices
- POST /admin/notices
- PATCH /admin/notices/{id}
- DELETE /admin/notices/{id}

### 정책

- 공지 조회는 공개
- 생성/수정/삭제는 admin만 가능
- 응답은 { data: ... } 형식
- 목록: { data: [...], meta: ... }
- 생성: { data: { id } }
- 수정/삭제: { data: true }

---

## QnA 운영 규칙

- user: 본인 데이터만 조회
- admin: 전체 조회
- detail: 작성자 또는 admin만 접근 가능
- 삭제: soft delete

---

## System Policy 운영 규칙

다음 항목은 system policy로 관리한다

- faq
- returns
- bankAccount
- shipping

### 공통 정책

- 값이 없어도 404 반환하지 않음
- 빈 값으로 정상 응답
- 응답은 { data: ... }

### FAQ 정책

- FAQ 조회는 공개
- 수정은 admin만 가능
- plain text + 줄바꿈 유지
- 값이 없어도 정상 상태

---

## 비API 페이지 메모

현재 아래는 백엔드 API 없이 프론트 정적 페이지로 운영한다

- Home
- Secret
- 이용약관
- 개인정보처리방침
- 환불정책
- 배송정책

---

## Prisma / 배포 운영 규칙

### 원칙

- build 시 prisma generate
- 배포 전 prisma migrate deploy
- seed 자동 실행 금지

### 점검 항목

- package.json 스크립트 확인
- migrations 폴더 정합성 확인
- schema만 수정된 상태 여부 확인
- DB migration history 일치 여부 확인

---

## Render 운영 체크

- Build Command: 의존성 설치 + 빌드
- Pre-Deploy: prisma migrate deploy
- Start Command: 서버 실행
- seed: 수동 실행만 허용
