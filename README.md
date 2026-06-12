# KAPOOL

군산대학교 학생을 위한 통학 카풀 예약 및 운행 관리 서비스입니다.

KAPOOL은 기존 오픈채팅 중심의 비정형 카풀 운영을 웹 기반 시스템으로 구조화하여, 운행 등록부터 예약, 채팅, 신고 운영까지 하나의 흐름으로 관리할 수 있도록 만든 프로젝트입니다.

## 문제 정의

군산대학교 통학 카풀은 학생들에게 실질적으로 필요한 이동 수단이지만, 기존 방식은 주로 오픈채팅방이나 개인 연락에 의존합니다. 이 방식은 빠르게 소통할 수 있다는 장점이 있지만, 운행 정보와 예약 상태가 명확하게 관리되지 않는 문제가 있습니다.

특히 다음과 같은 불편이 발생할 수 있습니다.

- 카풀 글이 채팅방 안에서 빠르게 묻혀 원하는 운행을 찾기 어렵습니다.
- 예약 요청, 승인, 취소 상태가 구조화되어 있지 않아 혼선이 생길 수 있습니다.
- 차주는 누가 예약을 요청했는지, 몇 좌석이 남았는지 직접 관리해야 합니다.
- 승객은 승인 여부와 운행 관련 대화를 한곳에서 확인하기 어렵습니다.
- 문제가 발생했을 때 신고 내용과 운행, 예약, 채팅 맥락을 함께 확인하기 어렵습니다.
- 관리자는 신고 처리 상태를 체계적으로 추적하기 어렵습니다.

KAPOOL은 이러한 문제를 해결하기 위해 카풀 운영에 필요한 정보를 데이터로 구조화하고, 역할별 화면과 API를 통해 예약, 채팅, 신고 처리 흐름을 명확하게 관리하도록 설계되었습니다.

## 프로젝트 소개

KAPOOL은 군산대학교 학생들의 통학 카풀 과정을 웹에서 관리하는 풀스택 프로젝트입니다. 단순히 카풀 목록을 보여주는 서비스가 아니라, 운행 등록, 예약 요청, 승인, 채팅, 신고 운영까지 연결된 하나의 카풀 관리 시스템을 목표로 합니다.

서비스는 승객, 차주, 관리자 역할을 기준으로 나뉩니다.

- 승객은 원하는 지역과 날짜의 카풀을 검색하고 예약을 요청할 수 있습니다.
- 차주는 직접 운행을 등록하고 들어온 예약 요청을 승인하거나 거절할 수 있습니다.
- 승인된 예약은 전용 채팅방으로 연결되어 운행 전 소통을 이어갈 수 있습니다.
- 문제가 발생하면 신고를 남기고, 관리자는 신고 내용과 관련 맥락을 확인해 처리할 수 있습니다.

프론트엔드는 모바일 환경을 우선으로 설계했으며, 백엔드는 NestJS API와 PostgreSQL 데이터베이스를 기반으로 인증, 예약, 채팅, 신고 관리 기능을 제공합니다.

## 주요 기능

### 사용자 기능

- 승객, 차주, 관리자 역할 기반 로그인
- 카풀 목록 조회 및 상세 정보 확인
- 지역, 날짜 기반 카풀 검색
- 승객 예약 요청 및 예약 취소
- 차주 운행 등록 및 예약 요청 관리
- 승인된 예약 기반 채팅방 제공
- 별도 카풀 요청 게시글 및 요청별 채팅방 제공

### 관리자 기능

- 신고 목록 확인
- 신고 상태 필터링 및 처리 상태 변경
- 신고별 상세 맥락 확인
- 신고자와 연결되는 운영 대화방 관리

### 시스템 기능

- NestJS API 기반 역할별 접근 제어
- Prisma와 PostgreSQL을 사용한 데이터 저장
- Socket.IO 기반 실시간 채팅
- 지난 운행 자동 종료 처리
- 프론트엔드와 백엔드가 공유하는 TypeScript 계약 관리

## 기술 스택

| 영역 | 사용 기술 |
| --- | --- |
| Frontend | React, Vite, TypeScript, Tailwind CSS |
| Backend | NestJS, TypeScript |
| Database | PostgreSQL, Prisma |
| Realtime | Socket.IO |
| Package | npm workspaces |
| Shared Contract | `packages/shared` |

## 프로젝트 구조

```txt
.
├── apps/
│   ├── web/                  # React/Vite 웹 앱
│   │   ├── public/           # 아이콘, manifest 등 정적 파일
│   │   └── src/
│   │       ├── App.tsx       # 라우팅과 세션 흐름
│   │       ├── components/   # 공통 UI 컴포넌트
│   │       ├── lib/          # API 함수, 테마, 유틸
│   │       └── screens/      # 로그인, 홈, 상세, 채팅, 관리자 화면
│   └── api/                  # NestJS API 서버
│       ├── prisma/           # Prisma schema, migration, seed
│       ├── src/              # auth, rides, reservations, chat, reports, admin
│       └── test/             # API 테스트
├── packages/
│   └── shared/               # 프론트엔드와 API가 공유하는 타입/계약
├── docs/                     # 기획, QA, 발표 자료 문서
├── docker-compose.yml        # 로컬 PostgreSQL 실행 환경
├── package.json              # 루트 workspace 스크립트
└── eslint.config.mjs         # 공통 ESLint 설정
```

## 실행 방법

### 1. 의존성 설치

```bash
npm install
```

### 2. PostgreSQL 실행

```bash
docker compose up -d postgres
```

로컬 PostgreSQL은 `localhost:55432` 포트를 사용합니다.

### 3. DB 마이그레이션 및 시드 데이터 생성

```bash
npm run db:migrate
npm run db:seed
```

### 4. API 서버 실행

```bash
npm run dev:api
```

### 5. 웹 앱 실행

```bash
npm run dev:web
```

웹 개발 서버는 다음 주소에서 실행됩니다.

```txt
http://127.0.0.1:5198
```

## 데모 계정

시드 데이터에는 역할별 데모 계정이 포함되어 있습니다.

| 역할 | 사용 방법 |
| --- | --- |
| 승객 | 로그인 화면의 승객 빠른 로그인 |
| 차주 | 로그인 화면의 차주 빠른 로그인 |
| 관리자 | `admin@kapool.local` / `kapool-local-demo` |

## 주요 명령어

```bash
npm run dev:web       # 웹 개발 서버 실행
npm run dev:api       # API 개발 서버 실행
npm run db:migrate    # DB migration 적용
npm run db:seed       # 로컬 seed 데이터 생성
npm run test:api      # API 테스트 실행
npm run lint          # 전체 lint 검사
npm run build         # 전체 workspace build
npm run preview:web   # 웹 production build preview
```

워크스페이스별 확인도 가능합니다.

```bash
npm run lint -w @kapool/web
npm run build -w @kapool/web
npm run lint -w @kapool/api
npm run build -w @kapool/api
npm run build -w @kapool/shared
```

## 검증 방법

최종 확인 시 아래 명령어를 실행합니다.

```bash
npm run test:api
npm run lint
npm run build
```

화면 변경이 포함된 경우 모바일 기준 뷰포트 `390x844`에서 직접 확인하고, 가로 스크롤이 발생하지 않는지 함께 점검합니다.

## 개발 메모

- 패키지 매니저는 npm을 사용합니다.
- 생성된 `dist/` 파일은 직접 수정하거나 커밋하지 않습니다.
- `.env`, API 키, 개인 인증 정보는 커밋하지 않습니다.
- Prisma enum, API validation 값, shared 타입, 프론트엔드 타입은 함께 맞춰야 합니다.
- KAPOOL의 UI 방향은 모바일 우선, 짙은 네이비 배경, 민트 포인트 컬러를 기준으로 합니다.
