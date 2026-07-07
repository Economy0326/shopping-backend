# 🛒 Shopping Backend

쇼핑몰 프론트엔드와 연동하기 위해 만든 NestJS 기반 백엔드 API 서버입니다.

회원 인증, 상품, 주문, 반품, 공지, QnA, 관리자 기능을 다룹니다.

이 프로젝트에서는 상품 조회보다 주문 생성 이후의 상태 흐름에 더 집중했습니다.  
회원/비회원 주문 생성, 주문 조회, 취소 요청, 반품 요청, 관리자 입금 확인, 배송 처리, 반품 승인/거절 흐름을 프론트엔드와 함께 확인할 수 있도록 구성했습니다.

외부 PG 결제와 택배사 API 연동은 구현 범위에서 제외했습니다.  
결제는 무통장입금 기준으로 두고, 배송은 우체국 직접 발송을 가정한 관리자 수동 배송 처리 흐름으로 정리했습니다.

---

## 관련 저장소

- Frontend: [shopping-frontend](https://github.com/Economy0326/shopping-frontend)
- Backend: [shopping-backend](https://github.com/Economy0326/shopping-backend)

---

## 🧰 Tech Stack

| 구분 | 기술 |
| --- | --- |
| Framework | NestJS |
| Language | TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT / Passport / Refresh Token Cookie |
| Validation | class-validator / class-transformer |
| Password | bcryptjs |
| File Upload | Multer |
| Storage | AWS S3 SDK |
| Test | Jest / Supertest 실행 환경 |
| Build | Nest CLI |

---

## 📌 프로젝트 범위

| 구분 | 내용 |
| --- | --- |
| 프로젝트 성격 | 개인 프로젝트 / 쇼핑몰 백엔드 API |
| Frontend 연동 | shopping-frontend와 연동 |
| 결제 기준 | 외부 PG 대신 무통장입금 기준 |
| 배송 기준 | 택배사 API 대신 우체국 직접 발송을 가정한 관리자 수동 배송 처리 |
| 핵심 구현 | 회원/비회원 주문, 주문 조회, 취소 요청, 반품 요청, 입금 확인, 배송 처리, 반품 승인/거절 |
| 제외 범위 | 카드 PG 결제 연동, 택배사 API 연동, 이메일 발송 서비스 연동 |

---

## ✨ 주요 기능

### 사용자 / 인증

- 회원가입
- 로그인 / 로그아웃
- Access Token 발급
- Refresh Token HttpOnly Cookie 발급
- Access Token 재발급
- 내 정보 조회
- 회원 프로필 수정
- 기본 배송지 저장
- 비밀번호 변경
- 비밀번호 재설정 요청 / 확인

### 상품 / 카테고리

- 카테고리 목록 조회
- 상품 목록 조회
- 상품 상세 조회
- 활성 상품만 노출
- 카테고리 기준 필터링
- 상품 이미지 목록 제공
- 상품 옵션 / 재고 정보 제공
- 옵션 조합 기준 variant 탐색

### 주문

- 회원 주문 생성
- 비회원 주문 생성
- 회원 주문 목록 조회
- 주문 상세 조회
- 비회원 주문 조회
- 배송 완료 확인
- 주문 취소 요청
- 반품 요청
- 무통장입금 기반 주문 상태 관리
- 주문 시점 상품 정보 스냅샷 저장
- 주문 생성 시 재고 차감
- 미입금 취소 시 재고 복구

### 반품 / 환불

- 내 반품 목록 조회
- 내 반품 상세 조회
- 관리자 반품 목록 조회
- 관리자 반품 승인
- 관리자 반품 거절
- 환불 로그 생성
- 환불 완료 시 재고 복구
- 중복 환불 방지

### 관리자

- 상품 등록 / 수정 / 삭제
- 상품 이미지 업로드
- 주문 목록 조회
- 주문 상세 조회
- 입금 확인
- 배송 처리
- 배송 완료 처리
- 반품 목록 조회
- 반품 승인 / 거절
- 환불 로그 생성
- 공지 등록 / 수정 / 삭제
- FAQ 정책 수정

### 기타

- 공지 조회
- QnA 작성 / 조회 / 답변
- FAQ / 반품 정책 / 배송 정책 / 계좌 정보 조회
- 공통 응답 포맷 변환
- 공통 예외 응답 처리

---

## 📌 핵심 문제

쇼핑몰은 상품 목록, 장바구니, 주문 생성처럼 사용자에게 익숙한 흐름도 중요하지만, 실제 서비스처럼 동작하려면 주문 이후의 상태 변화가 더 중요하다고 생각했습니다.

특히 비회원 주문은 로그인 정보가 없기 때문에 주문 이후 조회, 취소 요청, 반품 요청을 어떤 기준으로 허용할지 정해야 했습니다.

또한 관리자는 주문 상태와 반품 상태를 빠르게 확인하고, 입금 확인, 배송 처리, 반품 승인/거절 같은 상태 변경 액션을 수행할 수 있어야 했습니다.

그래서 이 프로젝트에서는 단순 상품 CRUD보다 주문 생성 이후의 운영 흐름과 회원/비회원 주문 접근 기준을 명확히 정리하는 데 집중했습니다.

---

## 🧭 핵심 의사결정

이 프로젝트에서는 모든 외부 연동을 한 번에 붙이기보다, 쇼핑몰의 주문 상태 흐름을 먼저 완성하는 방향으로 범위를 정했습니다.

| 결정 | 이유 | API / 기능 반영 |
| --- | --- | --- |
| 무통장입금 기준 결제 | 외부 PG 연동보다 주문 상태 흐름을 먼저 검증하기 위해 | `AWAITING_DEPOSIT`, 입금 확인 API |
| 우체국 직접 발송 기준 배송 | 택배사 API 연동 범위를 줄이고 운영 흐름을 먼저 구현하기 위해 | `SHIPPED`, `DELIVERED`, carrier / trackingNo 저장 |
| 비회원 주문 허용 | 로그인하지 않은 사용자도 주문 이후 흐름을 이어갈 수 있게 하기 위해 | 주문번호 + 휴대폰 번호 검증 |
| optionValues 기반 주문 | 프론트가 내부 variant 구조를 직접 알지 않도록 하기 위해 | 서버에서 option 조합과 재고 검증 |
| 환불 로그 분리 | 반품 승인과 실제 환불 완료 시점을 분리하기 위해 | RefundLog 생성 후 `REFUNDED` 처리 |

외부 PG와 택배사 API를 붙이면 결제/배송 연동 자체의 범위가 커질 수 있다고 판단했습니다.

그래서 1차 구현에서는 무통장입금과 우체국 직접 발송을 가정한 관리자 수동 배송 처리 기준으로 결제/배송 정책을 확정하고, 그 기준 안에서 주문 생성, 주문 조회, 취소 요청, 반품 요청, 입금 확인, 배송 처리 흐름을 구현했습니다.

---

## 🧱 전체 구조

```mermaid
flowchart TD
  A["Client / Frontend"] --> B["NestJS API Server"]
  B --> C["Feature Modules"]
  C --> D["Prisma ORM"]
  D --> E["PostgreSQL"]

  B --> F["JWT Auth"]
  B --> G["ValidationPipe"]
  B --> H["Response Transform Interceptor"]
  B --> I["Http Exception Filter"]
```

---

## 🔐 인증 / 세션 정책

로그인 이후 인증이 필요한 요청은 Access Token을 사용하고, 로그인 유지는 Refresh Token Cookie를 기준으로 처리했습니다.

- Access Token은 로그인 성공 시 발급
- 인증 API 요청 시 `Authorization` 헤더로 전달
- Refresh Token은 HttpOnly Cookie로 전달
- Refresh Token 원본은 프론트엔드 JavaScript에서 접근하지 않음
- DB에는 refresh token hash만 저장
- 로그인 / 재발급 시 기존 active refresh session 정리
- 로그아웃 / 비밀번호 변경 / 비밀번호 재설정 성공 시 refresh session 정리

```mermaid
sequenceDiagram
  participant FE as "Frontend"
  participant BE as "Backend"
  participant DB as "Database"

  FE->>BE: "POST /auth/login"
  BE->>DB: "사용자 확인"
  BE->>DB: "기존 RefreshSession revoke"
  BE->>DB: "새 RefreshSession 저장"
  BE-->>FE: "Access Token + Refresh Cookie"
  FE->>BE: "Authorization 헤더로 인증 요청"
  BE-->>FE: "인증 API 응답"
```

---

## 🔁 토큰 갱신 정책

Access Token이 없는 상태로 앱에 진입하면 프론트엔드에서 `/auth/refresh`를 한 번 시도합니다.

일반 API 요청 중 401이 발생한 경우에는 자동 refresh/retry를 반복하지 않고, 프론트엔드에서 로그인 필요 상태로 처리하도록 했습니다.

- 앱 최초 진입 시 refresh 1회 시도
- refresh 성공 시 새 Access Token 발급
- refresh 시 새 Refresh Token 발급 및 기존 세션 revoke
- 일반 API 요청 중 401 발생 시 프론트엔드는 로그인 필요 상태 처리
- refresh 실패 시 비로그인 상태 유지

```mermaid
sequenceDiagram
  participant FE as "Frontend"
  participant API as "Backend API"
  participant Auth as "Auth Context"

  FE->>API: "일반 API 요청"
  API-->>FE: "401 Unauthorized"
  FE->>Auth: "로그인 필요 상태 처리"
  Auth-->>FE: "로그인 모달 표시"
```

이 방식은 일반 API 요청 중 refresh/retry가 반복되는 상황을 막고, 인증 만료 상황에서 사용자가 현재 화면을 유지한 채 다시 로그인할 수 있도록 하기 위한 선택입니다.

---

## 🔑 Auth API

| Method | Endpoint | 설명 |
| --- | --- | --- |
| POST | `/api/v1/auth/register` | 회원가입 |
| POST | `/api/v1/auth/login` | 로그인 |
| POST | `/api/v1/auth/logout` | 로그아웃 |
| POST | `/api/v1/auth/refresh` | Access Token 재발급 |
| GET | `/api/v1/auth/me` | 현재 로그인 사용자 조회 |
| POST | `/api/v1/auth/change-password` | 비밀번호 변경 |
| POST | `/api/v1/auth/password-reset/request` | 비밀번호 재설정 요청 |
| POST | `/api/v1/auth/password-reset/confirm` | 비밀번호 재설정 확인 |

---

## 👤 Users API

| Method | Endpoint | 설명 |
| --- | --- | --- |
| GET | `/api/v1/users/me` | 내 정보 조회 |
| PATCH | `/api/v1/users/me/profile` | 프로필 수정 |
| PUT | `/api/v1/users/default-address` | 기본 배송지 저장 |

---

## 🔒 비밀번호 재설정 범위

비밀번호 재설정 요청과 확인 API 흐름은 구현했습니다.

다만 이메일 발송 서비스 연동은 프로젝트 범위에서 제외했습니다.  
개발 환경에서는 재설정 토큰을 서버 콘솔에서 확인하는 방식으로 처리했습니다.

---

## 🌐 CORS / API 공통 설정

서버는 `/api/v1` prefix를 기준으로 API를 제공합니다.

- API Prefix: `/api/v1`
- `Access-Control-Allow-Credentials: true`
- 허용 origin은 `CORS_ORIGIN` 환경변수 기준
- `*` origin 허용 금지
- 허용 메서드: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`
- 허용 헤더: `Content-Type`, `Authorization`, `x-silent-auth`, `idempotency-key`

---

## 📦 공통 응답 포맷

프론트엔드에서 응답 구조를 일관되게 다룰 수 있도록 성공 응답은 `{ data }` 기준으로 맞췄습니다.

### 성공 응답

```json
{
  "data": {}
}
```

### 리스트 응답

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "size": 20,
    "total": 123
  }
}
```

### 에러 응답

```json
{
  "error": {
    "code": "INVALID_OPTION_COMBINATION",
    "message": "선택한 옵션 조합이 존재하지 않습니다",
    "details": {
      "path": "/api/v1/orders"
    }
  }
}
```

### 응답 변환 규칙

- 이미 `{ data, meta }` 구조인 경우 그대로 반환
- 그 외 성공 응답은 `{ data: payload }` 형태로 변환
- 예외 응답은 `{ error: { code, message, details } }` 형태로 반환
- validation error는 `VALIDATION_ERROR` 코드로 변환

---

## 🛍️ 상품 / 카테고리 정책

### Categories

| Method | Endpoint | 설명 |
| --- | --- | --- |
| GET | `/api/v1/categories` | 카테고리 목록 조회 |

카테고리는 `id`, `slug`, `name`을 포함합니다.  
프론트엔드는 `slug` 기준으로 상품 목록을 필터링할 수 있습니다.

### Products

| Method | Endpoint | 설명 |
| --- | --- | --- |
| GET | `/api/v1/products` | 상품 목록 조회 |
| GET | `/api/v1/products/:id` | 상품 상세 조회 |

### 상품 목록 정책

- `isActive=true` 상품만 노출
- `category` 또는 `categoryId` 기준 필터 가능
- 응답에는 대표 이미지 기준 `thumbnailUrl` 포함
- 페이지네이션 응답은 `{ data, meta }` 구조 사용

### 상품 상세 정책

- `images`는 URL 배열로 제공
- `optionGroups`는 `key`, `label`, `options` 구조로 제공
- 각 option에는 `value`, `stock` 제공
- 프론트엔드가 직접 `variantId`를 결정하지 않도록 사용자 상세 응답에서 내부 variant 구조를 숨김
- `look` 카테고리는 옵션 그룹이 없을 수 있음

---

## 🧾 회원 / 비회원 주문 생성

주문은 회원과 비회원 모두 가능합니다.

회원은 Access Token 기준으로 주문과 사용자를 연결합니다.  
비회원은 체크아웃 화면에서 입력한 주문자 정보와 배송 정보를 기준으로 주문합니다.

- 회원 주문: Access Token 기준으로 본인 주문 조회 / 취소 요청 / 반품 요청
- 비회원 주문: 주문번호와 주문 시 입력한 휴대폰 번호 기준으로 주문 조회 / 취소 요청 / 반품 요청
- 회원 / 비회원 모두 동일하게 옵션 조합 검증과 재고 차감 정책 적용
- 비회원 주문도 관리자 주문 목록과 반품 목록에서 함께 관리

| Method | Endpoint | 설명 |
| --- | --- | --- |
| POST | `/api/v1/orders` | 회원 / 비회원 주문 생성 |
| POST | `/api/v1/orders/guest/lookup` | 비회원 주문 조회 |
| GET | `/api/v1/orders` | 회원 주문 목록 조회 |
| GET | `/api/v1/orders/:id` | 주문 상세 조회 |
| POST | `/api/v1/orders/:id/confirm` | 배송 완료 확인 |
| POST | `/api/v1/orders/:id/cancel-request` | 주문 취소 요청 |
| POST | `/api/v1/orders/:id/return-request` | 반품 요청 |

```mermaid
flowchart TD
  A["주문 생성 요청"] --> B{"로그인 사용자 여부"}
  B -->|회원| C["userId 연결"]
  B -->|비회원| D["receiverName / phone / address 기준 주문"]

  C --> E["optionValues 기준 variant 탐색"]
  D --> E

  E --> F["재고 확인"]
  F --> G["재고 차감"]
  G --> H["AWAITING_DEPOSIT 주문 생성"]
  H --> I["주문번호 발급"]

  I --> J{"주문 이후 접근"}
  J -->|회원| K["Access Token 기준 조회 / 취소 / 반품"]
  J -->|비회원| L["주문번호 + 휴대폰 번호 기준 조회 / 취소 / 반품"]
```

---

## 🧩 옵션 조합 / 재고 검증

프론트엔드는 주문 요청 시 `optionId`, `variantId`를 직접 보내지 않습니다.

사용자가 선택한 옵션 값을 `optionValues` 형태로 전달하고, 서버가 실제 옵션 조합과 재고를 검증합니다.

### 처리 순서

```text
1. productId 조회
2. optionValues 기준 optionId 매핑
3. optionId 조합으로 variant 탐색
4. variant가 해당 product 소속인지 확인
5. 재고 확인
6. 재고 차감
7. 주문 시점 상품 정보 스냅샷 저장
8. 주문 생성
```

### 에러 조건

- 주문 items가 비어 있음
- 옵션이 있는 상품인데 optionValues가 없음
- optionValues 값이 공백임
- 존재하지 않는 옵션 값
- 존재하지 않는 variant 조합
- variant가 해당 product 소속이 아님
- 재고 부족
- 비활성 상품 주문 시도

### 주문 요청 예시

```json
{
  "items": [
    {
      "productId": 1,
      "qty": 2,
      "optionValues": {
        "size": "M",
        "color": "black"
      }
    }
  ],
  "receiver": {
    "name": "홍길동",
    "phone": "01012345678",
    "email": "user@example.com",
    "address": {
      "zip": "12345",
      "address1": "서울시 어딘가",
      "address2": "101호"
    },
    "memo": "문 앞에 놓아주세요"
  },
  "payment": {
    "method": "BANK_TRANSFER",
    "depositor": "홍길동"
  }
}
```

---

## 💳 무통장입금 / 배송 운영 흐름

현재 주문 결제 방식은 무통장입금 기준입니다.

카드 결제 PG와 택배사 API 연동은 1차 프로젝트 범위에서 제외했습니다.

사용자가 주문을 생성하면 입금 대기 상태가 됩니다.  
관리자가 입금을 확인하면 입금 확인 상태로 바뀌고, 이후 배송 정보를 등록하면 배송 중 상태가 됩니다.

배송은 우체국 직접 발송을 가정했습니다.  
서버에서는 택배사 API를 호출하지 않고, 관리자 화면에서 입력한 `carrier`, `trackingNo`를 저장하고 주문 상태를 변경하는 흐름에 집중했습니다.

### 주문 상태

| 상태 | 의미 |
| --- | --- |
| `AWAITING_DEPOSIT` | 입금 대기 |
| `DEPOSIT_CONFIRMED` | 입금 확인 |
| `SHIPPED` | 배송 중 |
| `DELIVERED` | 배송 완료 |
| `CANCELED` | 주문 취소 |

```mermaid
flowchart LR
  A["주문 생성"] --> B["AWAITING_DEPOSIT"]
  B --> C["관리자 입금 확인"]
  C --> D["DEPOSIT_CONFIRMED"]
  D --> E["관리자 배송 처리"]
  E --> F["SHIPPED"]
  F --> G["배송 완료 / 구매 확정"]
  G --> H["DELIVERED"]

  B --> I["미입금 취소"]
  I --> J["CANCELED"]
```

### 미입금 취소

- 입금 대기 상태의 주문은 취소 요청 가능
- 취소 시 주문 상태는 `CANCELED`로 변경
- 취소 시 주문 생성 때 차감한 재고 복구
- 입금 확인 이후에는 일반 취소 요청 불가

---

## 🔁 반품 / 환불 운영 흐름

반품은 배송 완료된 주문을 기준으로 요청할 수 있습니다.

관리자는 반품 요청을 확인한 뒤 승인 또는 거절할 수 있습니다.  
승인된 반품에 대해 환불 로그를 생성하면 환불 완료 상태로 전환됩니다.

### 반품 상태

| 상태 | 의미 |
| --- | --- |
| `REQUESTED` | 반품 요청 |
| `APPROVED` | 반품 승인 |
| `REJECTED` | 반품 거절 |
| `REFUNDED` | 환불 완료 |

### 사용자 반품 API

| Method | Endpoint | 설명 |
| --- | --- | --- |
| GET | `/api/v1/returns` | 내 반품 목록 조회 |
| GET | `/api/v1/returns/:id` | 내 반품 상세 조회 |

### 관리자 반품 처리

| Method | Endpoint | 설명 |
| --- | --- | --- |
| GET | `/api/v1/admin/returns` | 전체 반품 목록 조회 |
| GET | `/api/v1/admin/returns/:id` | 반품 상세 조회 |
| POST | `/api/v1/admin/returns/:id/approve` | 반품 승인 |
| POST | `/api/v1/admin/returns/:id/reject` | 반품 거절 |

### 관리자 환불 로그

| Method | Endpoint | 설명 |
| --- | --- | --- |
| POST | `/api/v1/admin/orders/:id/refund-log` | 환불 로그 생성 및 환불 완료 처리 |

```mermaid
flowchart LR
  A["DELIVERED 주문"] --> B["반품 요청"]
  B --> C["REQUESTED"]
  C --> D{"관리자 판단"}
  D -->|승인| E["APPROVED"]
  D -->|거절| F["REJECTED"]
  E --> G["환불 로그 생성"]
  G --> H["REFUNDED"]
```

### 재고 정책

- 주문 생성 시 재고 차감
- 미입금 취소 시 재고 복구
- 반품 승인 단계에서는 재고 복구하지 않음
- `REFUNDED` 전환 시 재고 복구
- 환불 로그가 이미 있으면 중복 환불 처리 방지

---

## 🛠️ 관리자 운영 API

관리자 API에서는 상품, 주문, 반품, 공지, 업로드 기능을 다룹니다.

### 상품 관리

| Method | Endpoint | 설명 |
| --- | --- | --- |
| POST | `/api/v1/admin/products` | 상품 등록 |
| PATCH | `/api/v1/admin/products/:id` | 상품 수정 |
| DELETE | `/api/v1/admin/products/:id` | 상품 삭제 |

### 이미지 업로드

| Method | Endpoint | 설명 |
| --- | --- | --- |
| POST | `/api/v1/admin/uploads` | 상품 이미지 업로드 |

### 주문 관리

| Method | Endpoint | 설명 |
| --- | --- | --- |
| GET | `/api/v1/admin/orders` | 전체 주문 목록 조회 |
| GET | `/api/v1/admin/orders/:id` | 주문 상세 조회 |
| POST | `/api/v1/admin/orders/:id/deposit-confirm` | 입금 확인 |
| POST | `/api/v1/admin/orders/:id/ship` | 배송 처리 |
| POST | `/api/v1/admin/orders/:id/deliver` | 배송 완료 처리 |
| POST | `/api/v1/admin/orders/:id/refund-log` | 환불 로그 생성 |

### 반품 관리

| Method | Endpoint | 설명 |
| --- | --- | --- |
| GET | `/api/v1/admin/returns` | 전체 반품 목록 조회 |
| GET | `/api/v1/admin/returns/:id` | 반품 상세 조회 |
| POST | `/api/v1/admin/returns/:id/approve` | 반품 승인 |
| POST | `/api/v1/admin/returns/:id/reject` | 반품 거절 |

### 공지 관리

| Method | Endpoint | 설명 |
| --- | --- | --- |
| GET | `/api/v1/notices` | 공지 목록 조회 |
| GET | `/api/v1/notices/:id` | 공지 상세 조회 |
| POST | `/api/v1/admin/notices` | 관리자 공지 등록 |
| PATCH | `/api/v1/admin/notices/:id` | 관리자 공지 수정 |
| DELETE | `/api/v1/admin/notices/:id` | 관리자 공지 삭제 |

```mermaid
flowchart TD
  A["Admin"] --> B["상품 등록 / 수정"]
  A --> C["주문 확인"]
  A --> D["입금 확인"]
  A --> E["배송 처리"]
  A --> F["반품 승인 / 거절"]
  A --> G["환불 로그 생성"]
  A --> H["공지 관리"]
```

---

## 💬 QnA / 시스템 정책

### QnA

- 사용자는 QnA 작성 가능
- 사용자는 본인 QnA 조회 가능
- 관리자는 전체 QnA 조회 가능
- QnA 상세는 작성자 또는 관리자만 접근 가능
- QnA 삭제는 soft delete 방식
- 관리자는 QnA 답변 작성 가능

### System Policy

다음 항목은 system policy로 조회합니다.

- FAQ
- 반품 정책
- 계좌 정보
- 배송 정책

정책 값이 없어도 404를 반환하지 않고, 빈 값도 정상 응답으로 처리합니다.

관리자 수정 API는 현재 FAQ 정책 수정만 열어두었습니다.

| Method | Endpoint | 설명 |
| --- | --- | --- |
| GET | `/api/v1/system/policies/:key` | 정책 조회 |
| PUT | `/api/v1/system/policies/faq` | FAQ 정책 수정 |

---

## 🗂️ 데이터 모델 요약

Prisma schema 기준 주요 모델은 다음과 같습니다.

```text
User
├─ RefreshSession
├─ Order
├─ Ask
└─ AskReply

Category
└─ Product

Product
├─ ProductImage
├─ ProductOption
├─ ProductVariant
└─ OrderItem

Order
├─ OrderItem
├─ Return
└─ RefundLog

SystemPolicy
Notice
Ask
AskReply
```

```mermaid
erDiagram
  User ||--o{ Order : creates
  User ||--o{ RefreshSession : has
  User ||--o{ Ask : writes
  User ||--o{ AskReply : writes

  Category ||--o{ Product : contains

  Product ||--o{ ProductImage : has
  Product ||--o{ ProductOption : has
  Product ||--o{ ProductVariant : has
  Product ||--o{ OrderItem : ordered_as

  Order ||--o{ OrderItem : contains
  Order ||--o| Return : has
  Order ||--o{ RefundLog : has

  Ask ||--o{ AskReply : has
```

---

## 📁 프로젝트 구조

```text
shopping-backend
├─ prisma
│  ├─ migrations
│  ├─ schema.prisma
│  └─ seed.ts
│
├─ scripts
│  └─ make-admin.ts
│
├─ src
│  ├─ features
│  │  ├─ admin
│  │  │  ├─ dto
│  │  │  ├─ admin-notices.controller.ts
│  │  │  ├─ admin-orders.controller.ts
│  │  │  ├─ admin-orders.service.ts
│  │  │  ├─ admin-products.controller.ts
│  │  │  ├─ admin-products.service.ts
│  │  │  ├─ admin-returns.controller.ts
│  │  │  ├─ admin-uploads.controller.ts
│  │  │  └─ admin.module.ts
│  │  │
│  │  ├─ auth
│  │  │  ├─ dto
│  │  │  ├─ guards
│  │  │  ├─ strategies
│  │  │  ├─ auth.controller.ts
│  │  │  ├─ auth.cookies.ts
│  │  │  ├─ auth.module.ts
│  │  │  └─ auth.service.ts
│  │  │
│  │  ├─ catalog
│  │  │  ├─ categories.controller.ts
│  │  │  ├─ categories.module.ts
│  │  │  ├─ products.controller.ts
│  │  │  ├─ products.module.ts
│  │  │  └─ products.service.ts
│  │  │
│  │  ├─ notices
│  │  ├─ orders
│  │  │  ├─ dto
│  │  │  ├─ mappers
│  │  │  ├─ orders.controller.ts
│  │  │  ├─ orders.maintenance.ts
│  │  │  ├─ orders.module.ts
│  │  │  └─ orders.service.ts
│  │  │
│  │  ├─ qna
│  │  ├─ returns
│  │  ├─ system
│  │  └─ users
│  │
│  ├─ prisma
│  │  ├─ prisma.module.ts
│  │  └─ prisma.service.ts
│  │
│  ├─ shared
│  │  ├─ constants
│  │  ├─ decorators
│  │  ├─ guards
│  │  ├─ app-error.ts
│  │  ├─ current-user.ts
│  │  ├─ errors.ts
│  │  ├─ http-exception.filter.ts
│  │  ├─ ids.ts
│  │  ├─ name.ts
│  │  ├─ pagination.ts
│  │  └─ response-transform.interceptor.ts
│  │
│  ├─ app.controller.ts
│  ├─ app.module.ts
│  ├─ app.service.ts
│  └─ main.ts
│
├─ test
│  ├─ app.e2e-spec.ts
│  └─ jest-e2e.json
│
├─ docker-compose.yml
├─ package.json
└─ README.md
```

---

## 🔧 환경 변수

`.env` 파일을 생성하고 아래 값을 설정합니다.

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"

PORT=8080
CORS_ORIGIN=http://localhost:3000

JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_PASSWORD_RESET_SECRET=your_password_reset_secret

ACCESS_EXPIRES_IN=15m
REFRESH_EXPIRES_IN=14d
PW_RESET_EXPIRES_IN=1h

COOKIE_SECURE=false
COOKIE_SAMESITE=lax
COOKIE_DOMAIN=

AWS_REGION=ap-northeast-2
AWS_S3_BUCKET=your_bucket_name
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

| 변수 | 설명 |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 연결 문자열 |
| `PORT` | 백엔드 서버 포트 |
| `CORS_ORIGIN` | 허용할 프론트엔드 origin. 여러 개일 경우 쉼표로 구분 |
| `JWT_ACCESS_SECRET` | Access Token 서명 secret |
| `JWT_REFRESH_SECRET` | Refresh Token 서명 secret |
| `JWT_PASSWORD_RESET_SECRET` | 비밀번호 재설정 토큰 서명 secret |
| `ACCESS_EXPIRES_IN` | Access Token 만료 시간 |
| `REFRESH_EXPIRES_IN` | Refresh Token 및 refresh cookie 만료 시간 |
| `PW_RESET_EXPIRES_IN` | 비밀번호 재설정 토큰 만료 시간 |
| `COOKIE_SECURE` | HTTPS 환경 cookie secure 옵션 |
| `COOKIE_SAMESITE` | refresh cookie sameSite 옵션 |
| `COOKIE_DOMAIN` | 배포 환경 cookie domain |
| `AWS_REGION` | S3 region |
| `AWS_S3_BUCKET` | 상품 이미지 업로드용 S3 bucket |
| `AWS_ACCESS_KEY_ID` | S3 접근 key |
| `AWS_SECRET_ACCESS_KEY` | S3 secret key |

실제 환경변수 값은 Git에 포함하지 않습니다.

---

## 🚀 실행 방법

```bash
npm install
npm run start:dev
```

기본 실행 포트는 `8080`입니다.

```text
http://localhost:8080/api/v1
```

---

## 🗃️ Prisma

### Prisma Client 생성

```bash
npx prisma generate
```

### Migration 적용

```bash
npx prisma migrate dev
```

### Seed 실행

```bash
npm run seed
```

배포 환경에서는 `prisma migrate deploy`를 사용합니다.

```bash
npx prisma migrate deploy
```

---

## 🛠️ 관리자 계정 생성

관리자 권한이 필요한 경우 스크립트를 사용해 관리자 계정을 생성하거나 권한을 변경합니다.

```bash
npm run make:admin
```

---

## 📦 Build

```bash
npm run build
```

---

## 🚀 Production 실행

```bash
npm run start:prod
```

---

## 🧪 Test

테스트 실행 환경은 Jest와 Supertest 기준으로 구성되어 있습니다.

현재 저장소에는 기본 e2e 테스트 파일이 포함되어 있으며, 주문/반품 정책 테스트를 별도로 강조할 만큼 확장한 상태는 아닙니다.

```bash
npm test
```

E2E 테스트:

```bash
npm run test:e2e
```

---

## 🚢 배포 운영 기준

Render 같은 Node 서버 배포 환경에서는 아래 흐름을 기준으로 운영할 수 있습니다.

### Build

```bash
npm install
npm run build
npx prisma generate
```

### Pre-Deploy

```bash
npx prisma migrate deploy
```

### Start

```bash
npm run start:prod
```

### 운영 원칙

- build 시 `prisma generate` 실행
- 배포 전 `prisma migrate deploy` 실행
- seed 자동 실행 금지
- 운영 DB에는 수동 seed만 허용
- migrations 폴더와 DB migration history 정합성 확인

---

## 🧯 Troubleshooting / Lessons Learned

### 1. 인증 만료 처리 책임이 모호해지는 문제

| 항목 | 내용 |
| --- | --- |
| Problem | 일반 API 요청 중 401이 발생했을 때 프론트에서 자동 refresh/retry를 반복하면 인증 상태가 예측하기 어려워질 수 있었습니다. |
| Cause | Access Token 만료, Refresh Token 존재 여부, 로그인 모달 표시 책임이 명확히 나뉘어 있지 않았습니다. |
| Fix | 서버는 401을 명확히 반환하고, 프론트는 일반 API 요청 중 자동 refresh/retry를 반복하지 않도록 정책을 정리했습니다. 앱 최초 진입 시에만 refresh를 1회 시도하도록 분리했습니다. |
| Result | 인증 만료 상황에서 현재 화면을 유지한 채 로그인 모달을 표시할 수 있고, 인증 상태 처리 흐름도 예측하기 쉬워졌습니다. |

### 2. 주문 생성 시 옵션 조합 검증 책임이 모호한 문제

| 항목 | 내용 |
| --- | --- |
| Problem | 프론트에서 `variantId`를 직접 보내면 잘못된 옵션 조합이나 재고 상태를 신뢰하게 될 수 있었습니다. |
| Cause | 옵션 조합과 재고는 서버 DB 기준으로 검증되어야 하지만, 프론트가 내부 variant 구조를 직접 알면 책임이 흐려질 수 있었습니다. |
| Fix | 프론트는 `optionValues`만 보내고, 서버가 optionId 조합과 variant를 탐색한 뒤 재고를 검증하도록 정리했습니다. |
| Result | 주문 가능 여부를 서버 기준으로 판단할 수 있게 되었고, 옵션 조합 오류와 재고 부족 상황을 일관된 에러로 처리할 수 있게 되었습니다. |

### 3. 회원 / 비회원 주문 이후 접근 기준이 모호해지는 문제

| 항목 | 내용 |
| --- | --- |
| Problem | 회원 주문과 비회원 주문은 사용자 식별 방식이 달라, 주문 생성 이후 조회/취소/반품 요청 기준이 필요했습니다. |
| Cause | 회원은 Access Token 기준으로 본인 여부를 확인할 수 있지만, 비회원은 계정 정보가 없어 주문번호와 주문 시 입력한 휴대폰 번호를 기준으로 접근 권한을 확인해야 했습니다. |
| Fix | 주문 생성 API는 Optional JWT 인증을 사용해 회원/비회원 모두 접근 가능하게 두고, 주문 상세/취소/반품 요청은 회원이면 Access Token 기준, 비회원이면 주문번호와 휴대폰 번호 기준으로 검증했습니다. |
| Result | 로그인하지 않은 사용자도 주문할 수 있고, 주문 이후에도 주문번호와 휴대폰 번호로 주문 조회, 취소 요청, 반품 요청을 진행할 수 있게 되었습니다. |

### 4. 결제와 배송 연동 범위를 정하는 문제

| 항목 | 내용 |
| --- | --- |
| Problem | 쇼핑몰 백엔드를 구현하면서 실제 카드 결제 PG와 택배사 API까지 연동해야 하는지 범위가 명확하지 않았습니다. |
| Cause | 외부 결제/배송 연동까지 포함하면 API 정책과 주문 상태 흐름을 정리하기 전에 프로젝트 범위가 커질 수 있었습니다. |
| Fix | 1차 구현에서는 결제는 무통장입금, 배송은 우체국 직접 발송을 가정한 관리자 수동 배송 처리 방식으로 범위를 정했습니다. 백엔드에서는 입금 확인과 배송 상태 변경을 관리했습니다. |
| Result | 외부 결제/배송 API 없이도 주문 생성, 입금 확인, 배송 처리, 배송 완료, 취소 요청, 반품 요청으로 이어지는 쇼핑몰 운영 흐름을 확인할 수 있었습니다. |
