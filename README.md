# 🛍️ Shopping Backend

쇼핑몰 서비스의 인증, 상품, 주문, 반품, 공지, QnA, 관리자 운영 기능을 제공하는 백엔드 API 서버입니다.

이 프로젝트는 단순 CRUD API를 만드는 것보다, 실제 쇼핑몰 운영에서 필요한 **JWT 인증, Refresh Token 세션 관리, 회원/비회원 주문, 옵션 조합 검증, 재고 차감/복구, 입금 확인, 배송 처리, 반품 승인/환불, 관리자 운영 정책**을 서버에서 일관되게 처리하는 것에 중점을 두었습니다.

프론트엔드와 연동하는 과정에서 요청/응답 포맷, 인증 만료 처리, 주문 payload 기준, 운영 상태 변경 규칙이 명확해야 서비스 흐름이 안정적으로 동작한다는 점을 확인했습니다.

이후 인증 정책, 공통 응답 포맷, 주문/반품 상태 정책, 관리자 처리 흐름을 백엔드 기준으로 정리했습니다.

---

## 🧰 Tech Stack

| 구분 | 기술 |
| --- | --- |
| Framework | NestJS |
| Language | TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT, Passport, Refresh Token Cookie |
| Validation | class-validator, class-transformer |
| Password | bcryptjs |
| File Upload | Multer |
| Storage | AWS S3 SDK |
| Test | Jest, Supertest |
| Deploy | Render |

---

## ✨ 주요 기능

### 👤 사용자 / 인증 기능

- 회원가입
- 로그인 / 로그아웃
- Access Token 발급
- Refresh Token HttpOnly Cookie 발급
- Access Token 재발급
- 내 정보 조회
- 비밀번호 변경
- 비밀번호 재설정 요청 / 확인
- 기본 배송지 저장
- 회원 프로필 수정

### 🛍️ 상품 / 카테고리 기능

- 카테고리 목록 조회
- 상품 목록 조회
- 상품 상세 조회
- 활성 상품만 노출
- 카테고리 기준 필터링
- 상품 이미지 목록 제공
- 상품 옵션 / 재고 정보 제공
- 옵션 조합 기준 variant 탐색

### 🧾 주문 기능

- 회원 주문 생성
- 비회원 주문 생성
- 회원 주문 목록 조회
- 주문 상세 조회
- 비회원 주문 조회
- 비회원 주문 취소 요청
- 비회원 반품 요청
- 배송 완료 확인
- 주문 취소 요청
- 반품 요청
- 무통장 입금 기반 주문 상태 관리
- 주문 시점 상품 정보 스냅샷 저장

### 🔁 반품 / 환불 기능

- 반품 요청 목록 조회
- 반품 상세 조회
- 관리자 반품 승인
- 관리자 반품 거절
- 환불 로그 생성
- 환불 완료 시 재고 복구
- 중복 환불 방지

### 🛠️ 관리자 기능

- 상품 등록 / 수정 / 삭제
- 상품 이미지 업로드
- 주문 목록 조회
- 주문 상세 조회
- 입금 확인
- 배송 처리
- 반품 목록 조회
- 반품 승인 / 거절
- 공지 등록 / 수정 / 삭제
- 시스템 정책 관리

### 📢 기타 기능

- 공지 조회
- QnA 작성 / 조회 / 답변
- FAQ / 환불정책 / 배송정책 / 계좌 정보 관리
- 공통 응답 포맷 변환
- 공통 예외 응답 처리

---

## 📌 핵심 문제

쇼핑몰 서비스는 상품 목록 조회뿐 아니라 주문, 결제 대기, 재고 차감, 배송 처리, 반품 승인, 환불 완료처럼 상태 변화가 많은 서비스입니다.

초기에는 프론트엔드 화면과 API가 맞물리는 과정에서 요청/응답 구조, 인증 방식, 주문 payload 기준, 관리자 처리 흐름을 명확히 맞추는 것이 중요했습니다.

그래서 이 프로젝트에서는 **인증 정책, 주문 생성 정책, 재고 정책, 반품/환불 정책을 백엔드 기준으로 일관되게 관리하는 것**을 핵심 문제로 잡았습니다.

---

## 🧱 전체 구조

```mermaid
flowchart TD
  A["Client / Frontend"] --> B["NestJS API Server"]
  B --> C["Feature Modules"]
  C --> D["Prisma ORM"]
  D --> E["PostgreSQL"]

  B --> F["JWT Auth"]
  B --> G["Global ValidationPipe"]
  B --> H["Response Transform Interceptor"]
  B --> I["Http Exception Filter"]
```

---

## 🔐 인증 / 보안 정책

Access Token은 프론트엔드 메모리에만 저장하고, Refresh Token은 HttpOnly Cookie로 관리하는 구조를 기준으로 구현했습니다.

### Access Token

- 로그인 성공 시 발급
- 프론트엔드 메모리에서 관리
- 인증 요청 시 `Authorization: Bearer <token>` 형식으로 전달
- localStorage / sessionStorage 저장을 전제로 하지 않음

### Refresh Token

- 서버에서 발급
- HttpOnly Cookie로 전달
- 프론트 JavaScript에서 접근 불가
- DB에는 token hash만 저장
- 로그아웃 또는 재발급 시 세션 관리

```mermaid
sequenceDiagram
  participant User as "User"
  participant FE as "Frontend"
  participant BE as "Backend"
  participant DB as "Database"

  User->>FE: "로그인 요청"
  FE->>BE: "POST /auth/login"
  BE->>DB: "사용자 확인 / RefreshSession 저장"
  BE-->>FE: "Access Token + HttpOnly Refresh Cookie"
  FE->>BE: "Authorization: Bearer Access Token"
  BE-->>FE: "인증 API 응답"
```

---

## 🔄 토큰 갱신 정책

일반 API 요청 중 401이 발생했을 때 백엔드가 무조건 refresh를 자동 재시도하도록 만들지 않았습니다.

프론트엔드에서는 일반 API 요청 중 401 발생 시 로그인 모달을 띄우고, 앱 최초 진입 시 Access Token이 없을 때만 `/auth/refresh`를 1회 시도하는 흐름으로 연동했습니다.

- 일반 API 요청 중 401 발생 시 자동 refresh/retry 반복 금지
- 앱 최초 진입 시 Access Token이 없을 때만 `/auth/refresh` 1회 허용
- refresh 요청 시 `x-silent-auth: true` 헤더 사용
- refresh 실패 시 비로그인 상태 유지
- 프론트엔드는 현재 화면을 유지하고 로그인 모달 표시

```mermaid
sequenceDiagram
  participant FE as "Frontend"
  participant API as "Backend API"
  participant Auth as "Auth Context"

  FE->>API: "일반 API 요청"
  API-->>FE: "401 Unauthorized"
  FE->>Auth: "Access Token 제거"
  Auth-->>FE: "AUTH_REQUIRED 이벤트"
  FE-->>FE: "현재 화면 유지 + 로그인 모달 표시"
```

---

## 🌐 CORS / API 공통 설정

서버는 `/api/v1` prefix를 기준으로 API를 제공합니다.

CORS는 credentials 요청을 허용하되, 모든 origin을 허용하지 않고 환경변수에 등록된 origin만 허용하도록 구성했습니다.

- API Prefix: `/api/v1`
- `Access-Control-Allow-Credentials: true`
- `Access-Control-Allow-Origin: CORS_ORIGIN 기준 허용`
- `*` origin 허용 금지
- 허용 메서드: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`
- 허용 헤더: `Content-Type`, `Authorization`, `x-silent-auth`, `idempotency-key`

---

## 📦 공통 응답 포맷

프론트엔드에서 응답 구조를 일관되게 처리할 수 있도록 성공 응답은 `{ data }` 기준으로 변환했습니다.

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
    "details": {}
  }
}
```

### 응답 변환 규칙

- 모든 성공 응답은 `{ data: ... }` 형태로 변환
- 이미 `{ data }` 구조인 경우 그대로 유지
- `{ id: ... }` 응답은 `{ data: { id: ... } }` 형태로 변환
- 값이 없는 상태도 정상 응답일 수 있음
- 빈 값은 404가 아니라 200 + `{ data: ... }` 형태로 반환 가능

---

## 🛍️ 상품 / 카테고리 정책

### Categories

| Method | Endpoint | 설명 |
| --- | --- | --- |
| GET | `/api/v1/categories` | 카테고리 목록 조회 |

카테고리는 `id`, `slug`, `name`을 포함하며, 프론트엔드는 `slug` 기준으로 필터링할 수 있습니다.

### Products

| Method | Endpoint | 설명 |
| --- | --- | --- |
| GET | `/api/v1/products` | 상품 목록 조회 |
| GET | `/api/v1/products/:id` | 상품 상세 조회 |

### 상품 목록 정책

- `isActive=true` 상품만 노출
- `category` 또는 `categoryId` 기준 필터 가능
- 응답에는 `thumbnailUrl` 포함

### 상품 상세 정책

- `images`는 URL 배열로 제공
- `optionGroups.options[].stock` 기준으로 재고 표시
- 프론트엔드가 직접 `variantId`를 결정하지 않도록 상세 응답에서 내부 variant 구조를 숨김
- `look` 카테고리는 옵션 그룹이 없을 수 있음

---

## 🧾 회원 / 비회원 주문 생성

주문 생성은 회원과 비회원 모두 가능하도록 구현했습니다.

회원은 Access Token 기준으로 사용자와 주문이 연결되고, 비회원은 체크아웃 단계에서 입력한 주문자 정보와 배송 정보로 주문을 생성합니다.

주문 생성 이후 접근 방식도 회원과 비회원이 다릅니다.

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

프론트엔드는 주문 요청 시 `optionId`, `variantId`를 직접 보내지 않고, 사용자가 선택한 옵션 값을 `optionValues` 형태로 전달합니다.

서버는 `optionValues`를 기준으로 실제 optionId 조합을 찾고, 해당 조합에 맞는 variant를 탐색한 뒤 재고를 확인합니다.

### 처리 순서

```text
1. productId 조회
2. optionValues(groupKey, value) 기준 optionId 매핑
3. optionId 조합으로 variant 탐색
4. 재고 확인
5. 주문 확정
6. 재고 차감
```

### 400 에러 조건

- `optionValues` 누락
- 존재하지 않는 옵션
- 존재하지 않는 variant 조합
- 재고 부족

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
  ]
}
```

---

## 💳 무통장 입금 / 배송 운영 흐름

현재 주문 결제 방식은 무통장 입금 기반으로 구성했습니다.

주문이 생성되면 `AWAITING_DEPOSIT` 상태가 되고, 관리자가 입금 확인을 하면 `DEPOSIT_CONFIRMED` 상태로 변경됩니다. 이후 배송 정보를 등록하면 `SHIPPED`, 구매 확정 또는 일정 기간 이후 `DELIVERED` 상태로 변경됩니다.

### 주문 상태

| 상태 | 의미 |
| --- | --- |
| AWAITING_DEPOSIT | 입금 대기 |
| DEPOSIT_CONFIRMED | 입금 확인 |
| SHIPPED | 배송 중 |
| DELIVERED | 배송 완료 |
| CANCELED | 주문 취소 |

```mermaid
flowchart LR
  A["주문 생성"] --> B["AWAITING_DEPOSIT"]
  B --> C["입금 확인"]
  C --> D["DEPOSIT_CONFIRMED"]
  D --> E["배송 처리"]
  E --> F["SHIPPED"]
  F --> G["배송 완료 / 구매 확정"]
  G --> H["DELIVERED"]

  B --> I["미입금 취소"]
  I --> J["CANCELED"]
```

### 미입금 취소

- 입금 대기 상태의 주문은 취소 요청 가능
- 취소 시 재고 복구
- 관리자는 주문 상태를 기준으로 입금 확인 / 배송 처리를 수행

---

## 🔁 반품 / 환불 운영 흐름

반품은 배송 완료된 주문을 기준으로 요청할 수 있습니다.

관리자는 반품 요청을 확인한 뒤 승인 또는 거절할 수 있고, 환불 로그가 생성되면 환불 완료 상태로 전환됩니다.

### 반품 상태

| 상태 | 의미 |
| --- | --- |
| REQUESTED | 반품 요청 |
| APPROVED | 반품 승인 |
| REJECTED | 반품 거절 |
| REFUNDED | 환불 완료 |

| Method | Endpoint | 설명 |
| --- | --- | --- |
| GET | `/api/v1/returns` | 내 반품 목록 조회 |
| GET | `/api/v1/returns/:id` | 내 반품 상세 조회 |

### 관리자 반품 처리

| Method | Endpoint | 설명 |
| --- | --- | --- |
| GET | `/api/v1/admin/returns` | 전체 반품 목록 조회 |
| POST | `/api/v1/admin/returns/:id/approve` | 반품 승인 |
| POST | `/api/v1/admin/returns/:id/reject` | 반품 거절 |

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

---

## 🛠️ 관리자 운영 API

관리자 API는 상품, 주문, 반품, 공지, 업로드 기능을 처리합니다.

### 상품 관리

- 상품 등록
- 상품 수정
- 상품 삭제
- 이미지 등록
- 옵션 / variant / 재고 관리

### 주문 관리

- 전체 주문 목록 조회
- 주문 상세 조회
- 입금 확인
- 배송 처리
- 주문 상태 관리

### 반품 관리

- 전체 반품 목록 조회
- 반품 상세 조회
- 반품 승인
- 반품 거절
- 환불 처리

### 공지 관리

- 공지 등록
- 공지 수정
- 공지 삭제
- 공지 목록 조회

```mermaid
flowchart TD
  A["Admin"] --> B["상품 등록 / 수정"]
  A --> C["주문 확인"]
  A --> D["입금 확인"]
  A --> E["배송 처리"]
  A --> F["반품 승인 / 거절"]
  A --> G["공지 관리"]
```

---

## 📢 공지 / QnA / 시스템 정책

### Notices

| Method | Endpoint | 설명 |
| --- | --- | --- |
| GET | `/api/v1/notices` | 공지 목록 조회 |
| GET | `/api/v1/notices/:id` | 공지 상세 조회 |
| POST | `/api/v1/admin/notices` | 관리자 공지 등록 |
| PATCH | `/api/v1/admin/notices/:id` | 관리자 공지 수정 |
| DELETE | `/api/v1/admin/notices/:id` | 관리자 공지 삭제 |

### QnA

- 사용자는 본인 QnA만 조회 가능
- 관리자는 전체 QnA 조회 가능
- QnA 상세는 작성자 또는 관리자만 접근 가능
- 삭제는 soft delete 방식으로 처리

### System Policy

다음 항목은 system policy로 관리합니다.

- FAQ
- 반품 정책
- 계좌 정보
- 배송 정책

값이 없어도 404를 반환하지 않고, 빈 값도 정상 응답으로 처리합니다.

---

## 🗄️ 데이터 모델 요약

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
  Category ||--o{ Product : contains
  Product ||--o{ ProductImage : has
  Product ||--o{ ProductOption : has
  Product ||--o{ ProductVariant : has
  Order ||--o{ OrderItem : contains
  Order ||--o| Return : has
  Order ||--o{ RefundLog : has
  User ||--o{ Ask : writes
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
│  │  ├─ auth
│  │  ├─ catalog
│  │  ├─ notices
│  │  ├─ orders
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
│  │  ├─ errors.ts
│  │  ├─ http-exception.filter.ts
│  │  ├─ pagination.ts
│  │  └─ response-transform.interceptor.ts
│  │
│  ├─ app.module.ts
│  └─ main.ts
│
├─ test
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

JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

COOKIE_SECURE=false
COOKIE_SAME_SITE=lax

AWS_REGION=ap-northeast-2
AWS_S3_BUCKET=your_bucket_name
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

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

## 🗄️ Prisma

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

## 👑 관리자 계정 생성

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

## ▶️ Production 실행

```bash
npm run start:prod
```

---

## 🧪 Test

```bash
npm test
```

E2E 테스트 설정이 필요한 경우 아래 명령을 사용할 수 있습니다.

```bash
npm run test:e2e
```

---

## 🚢 배포 운영 기준

Render 배포 기준으로 다음 흐름을 사용합니다.

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

## 🧪 Troubleshooting / Lessons Learned

### 1. 인증 만료 처리 책임이 모호해지는 문제

| 항목 | 내용 |
| --- | --- |
| Problem | 일반 API 요청 중 401이 발생했을 때 서버와 프론트가 각각 refresh/retry를 반복하면 인증 상태가 예측하기 어려워질 수 있었습니다. |
| Cause | Access Token 만료, Refresh Token 존재 여부, 로그인 모달 표시 책임이 명확히 나뉘어 있지 않았습니다. |
| Fix | 서버는 401을 명확히 반환하고, 프론트는 일반 API 요청 중 자동 refresh/retry를 반복하지 않도록 정책을 정리했습니다. 앱 최초 진입 시에만 refresh를 1회 시도하도록 분리했습니다. |
| Result | 인증 만료 상황에서 현재 화면을 유지한 채 로그인 모달을 표시할 수 있고, 인증 상태 처리 흐름을 예측 가능하게 만들었습니다. |

### 2. 주문 생성 시 옵션 조합 검증 책임이 모호한 문제

| 항목 | 내용 |
| --- | --- |
| Problem | 프론트에서 `variantId`를 직접 보내면 잘못된 옵션 조합이나 재고 상태를 신뢰하게 될 수 있었습니다. |
| Cause | 옵션 조합과 재고는 서버 DB 기준으로 검증되어야 하지만, 프론트가 내부 variant 구조를 직접 알면 책임이 흐려질 수 있었습니다. |
| Fix | 프론트는 `optionValues`만 보내고, 서버가 optionId 조합과 variant를 탐색한 뒤 재고를 검증하도록 구성했습니다. |
| Result | 주문 가능 여부를 서버 기준으로 판단할 수 있게 되었고, 옵션 조합 오류와 재고 부족 상황을 일관된 에러로 처리할 수 있게 되었습니다. |

### 3. 회원 / 비회원 주문 이후 접근 기준이 모호해지는 문제

| 항목 | 내용 |
| --- | --- |
| Problem | 회원 주문과 비회원 주문은 사용자 식별 방식이 다르기 때문에, 주문 생성 이후 조회/취소/반품 요청을 어떤 기준으로 허용해야 하는지 기준이 필요했습니다. |
| Cause | 회원은 Access Token 기준으로 본인 여부를 확인할 수 있지만, 비회원은 계정 정보가 없기 때문에 주문번호와 주문 시 입력한 휴대폰 번호를 기준으로 접근 권한을 확인해야 했습니다. |
| Fix | 주문 생성 API는 Optional JWT 인증을 사용해 회원/비회원 모두 접근 가능하게 하고, 주문 상세/취소/반품 요청은 회원이면 Access Token 기준, 비회원이면 주문번호와 휴대폰 번호 기준으로 검증하도록 분리했습니다. |
| Result | 로그인하지 않은 사용자도 주문할 수 있으면서, 주문 이후에도 주문번호와 휴대폰 번호를 통해 주문 조회, 취소 요청, 반품 요청까지 이어갈 수 있게 되었습니다. |

---

## 🔭 개선 예정

- 주문/반품 관리자 API의 필터 조건과 상태 요약 응답 개선
- 주문 상태 변경 이력 로그 추가
- 인증 만료, 비회원 주문, 반품/환불 상태 전환에 대한 E2E 테스트 보완
- 운영 환경에서 이미지 업로드 및 S3 예외 처리 케이스 정리
