# 🔮 Fortune For You - 사주 기반 소개팅 웹사이트

> **사주 정보를 기반으로 사용자 간의 궁합을 분석하고 매칭해주는 소개팅 플랫폼**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Node.js](https://img.shields.io/badge/Node.js-v14+-green)
![Express](https://img.shields.io/badge/Express-4.18+-blue)

---

## 📋 목차

- [프로젝트 개요](#-프로젝트-개요)
- [주요 기능](#-주요-기능)
- [기술 스택](#-기술-스택)
- [프로젝트 구조](#-프로젝트-구조)
- [설치 및 실행](#-설치-및-실행)
- [API 엔드포인트](#-api-엔드포인트)
- [데이터베이스 설계](#-데이터베이스-설계)
- [개발자 정보](#-개발자-정보)

---

## 🎯 프로젝트 개요

**Fortune For You**는 사용자의 생년월일(사주)을 기반으로 개인 성향을 분석하고, 다른 사용자와의 궁합을 계산해주는 소개팅 플랫폼입니다.

### 핵심 특징
- 🔮 **사주 기반 매칭**: 생년월일을 기반으로 궁합 계산
- ✨ **성향 분석**: AWS API를 활용한 개인 성향 분석
- 💬 **실시간 채팅**: Socket.IO 기반의 1:1 실시간 메시징
- 👥 **커뮤니티**: 게시글 및 댓글 기능으로 소통 공간 제공
- 🔐 **안전한 인증**: bcryptjs를 통한 비밀번호 암호화

---

## ✨ 주요 기능

### 1️⃣ 사용자 인증 (Authentication)
- **회원가입**: 이메일, 비밀번호, 사주 정보로 계정 생성
- **로그인**: 이메일과 비밀번호로 안전한 인증
- **세션 관리**: express-session을 통한 안전한 세션 관리
- **비밀번호 암호화**: bcryptjs를 사용한 해싱

### 2️⃣ 개인 성향 분석
- 생년월일과 성별 입력으로 성향 분석
- AWS API를 통한 사주 기반 성향 도출
- 분석 결과를 프로필에 태그 형태로 저장
- 이전 분석 결과 조회 가능

### 3️⃣ 실시간 채팅 (Real-time Messaging)
- **1:1 채팅**: Socket.IO를 통한 실시간 메시징
- **채팅방 목록**: 참여 중인 모든 채팅방 표시
- **메시지 저장**: 모든 메시지는 데이터베이스에 저장
- **타임스탬프**: 각 메시지의 생성 시간 기록

### 4️⃣ 커뮤니티 (Community)
- **게시글 작성**: 자유로운 주제로 글 작성 가능
- **게시글 조회**: 모든 사용자가 게시글 조회 가능
- **게시글 관리**: 작성자만 자신의 글 수정/삭제 가능
- **댓글 기능**: 게시글에 대한 의견 공유
- **조회수 추적**: 인기 글 정렬에 사용

### 5️⃣ 궁합 시스템 (Compatibility Matching)
- 두 사용자의 사주 정보 비교
- 성향 데이터 기반 궁합 점수 계산
- 데이터 중복 방지를 위한 복합 기본 키 구조

---

## 🚀 기술 스택

### Backend
| 기술 | 버전 | 설명 |
|------|------|------|
| Node.js | 14+ | 서버 런타임 |
| Express | 4.18+ | 웹 프레임워크 |
| Sequelize | 6.35+ | ORM (데이터베이스 관리) |
| Socket.IO | 4.6+ | 실시간 통신 라이브러리 |
| bcryptjs | 2.4+ | 비밀번호 암호화 |
| express-session | 1.17+ | 세션 관리 |

### Database
- **SQLite** (개발 환경)
- **MySQL** (프로덕션 환경)

### Frontend
- **EJS**: 템플릿 엔진
- **JavaScript**: 클라이언트 로직
- **CSS**: 스타일링

### 외부 API
- **AWS API**: 사주 기반 성향 분석 (http://54.180.2.201/traits)

---

## 📁 프로젝트 구조

```
fortune-for-you/
├── config/
│   └── database.js              # 데이터베이스 설정
├── middleware/
│   └── auth.js                  # 인증 미들웨어
├── models/
│   ├── User.js                  # 사용자 모델
│   ├── Post.js                  # 게시물 모델
│   ├── Comment.js               # 댓글 모델
│   ├── ChatRoom.js              # 채팅방 모델
│   └── Message.js               # 메시지 모델
├── routes/
│   ├── auth.js                  # 인증 라우트
│   ├── main.js                  # 메인 페이지 & 성향 분석
│   ├── community.js             # 커뮤니티 라우트
│   └── chat.js                  # 채팅 라우트
├── views/
│   ├── auth/                    # 인증 페이지 (로그인, 회원가입)
│   ├── community/               # 커뮤니티 페이지
│   ├── chat/                    # 채팅 페이지
│   ├── main/                    # 메인 & 분석 페이지
│   ├── matching/                # 매칭 페이지
│   └── layout/                  # 레이아웃 (헤더, 푸터)
├── public/
│   ├── css/
│   │   └── style.css            # 메인 스타일시트
│   └── js/
│       └── main.js              # 클라이언트 JavaScript
├── server.js                    # 메인 서버 파일
├── package.json                 # 프로젝트 의존성
├── .gitignore                   # Git 무시 파일
├── README.md                    # 이 파일
├── DB_스키마_상세설명.md         # 데이터베이스 스키마 상세 문서
├── 데이터베이스_스키마.sql       # 데이터베이스 SQL 파일
└── .env.example                 # 환경 변수 예제
```

---

## 💻 설치 및 실행

### 요구사항
- Node.js 14.0.0 이상
- npm 또는 yarn
- MySQL (프로덕션) 또는 SQLite (개발)

### 1단계: 프로젝트 클론
```bash
git clone https://github.com/hoxxxun/2025__project.git
cd 2025__project
```

### 2단계: 의존성 설치
```bash
npm install
```

### 3단계: 환경 변수 설정
```bash
# .env 파일 생성
cp .env.example .env
```

`.env` 파일 예제:
```env
# 서버 설정
PORT=3001
NODE_ENV=development

# 데이터베이스 설정 (개발 환경: SQLite 사용)
USE_SQLITE=true

# MySQL 설정 (프로덕션)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=fortune_for_you

# 세션 설정
SESSION_SECRET=your-secret-key-here

# AWS API
AWS_API_URL=http://54.180.2.201/traits
```

### 4단계: 실행

**개발 환경 (자동 새로고침)**
```bash
npm run dev
```

**프로덕션 환경**
```bash
npm start
```

### 5단계: 브라우저에서 접속
```
http://localhost:3001
```

---

## 📊 API 엔드포인트

### 인증 API
```http
POST   /auth/register          # 회원가입
POST   /auth/login             # 로그인
GET    /auth/logout            # 로그아웃
```

### 성향 분석 API
```http
GET    /analysis               # 분석 페이지 조회
POST   /analysis               # 성향 분석 요청
```

### 커뮤니티 API
```http
GET    /community/list         # 게시글 목록
GET    /community/detail/:id   # 게시글 상세 조회
POST   /community/write        # 게시글 작성
POST   /community/edit/:id     # 게시글 수정
POST   /community/delete/:id   # 게시글 삭제
POST   /community/comment      # 댓글 작성
```

### 채팅 API
```http
GET    /chat/list              # 채팅방 목록
GET    /chat/room/:id          # 채팅방 진입
POST   /chat/room/create       # 채팅방 생성
socket.emit('join-room')       # 채팅방 입장
socket.emit('send-message')    # 메시지 전송
socket.on('receive-message')   # 메시지 수신
```

---

## 🗄️ 데이터베이스 설계

### 테이블 구조

| 테이블 | PK | 주요 기능 | 특징 |
|--------|----|----|------|
| **USERS** | userId | 회원 정보, 사주 정보 | birthYear/Month/Day로 분리 저장 |
| **POSTS** | postId | 게시글 | views로 인기글 추적 |
| **COMMENTS** | commentId | 댓글 | ON DELETE CASCADE |
| **CHATROOMS** | chatroomId | 1:1 채팅방 | UNIQUE(user1Id, user2Id) |
| **MESSAGES** | messageId | 메시지 | 타임스탐프로 순서 관리 |
| **COMPATIBILITIES** | (user1Id, user2Id) | 궁합 점수 | 복합 기본 키 |

### 📌 핵심 설계 원칙
1. **사주 정보**: birthYear, birthMonth, birthDay를 분리하여 저장
2. **성향 분석**: JSON 형식으로 유연하게 저장
3. **데이터 무결성**: ON DELETE CASCADE로 고아 레코드 방지
4. **중복 방지**: 복합 기본 키로 중복 데이터 방지

자세한 내용은 **[DB_스키마_상세설명.md](./DB_스키마_상세설명.md)** 참고

---

## 🔐 보안 기능

1. **비밀번호 암호화**: bcryptjs를 사용한 안전한 해싱
2. **세션 관리**: express-session으로 안전한 세션 관리
3. **입력 검증**: 모든 요청에 유효성 검사 수행
4. **인증 미들웨어**: 로그인 필요한 라우트 보호
5. **SQL 인젝션 방지**: Sequelize ORM 사용

---

## 🛠️ 개발 팀

### 팀 구성
- **팀명**: 2025 팀프로젝트
- **프로젝트**: Fortune For You (사주 기반 소개팅 플랫폼)

---

## 📝 주요 문서

- **[데이터베이스 스키마 상세 설명](./DB_스키마_상세설명.md)**: 테이블 구조 및 컬럼 설명
- **[SQL 스키마](./데이터베이스_스키마.sql)**: 데이터베이스 생성 쿼리

---

## 🚀 향후 개선 계획

- [ ] 사용자 프로필 이미지 업로드
- [ ] 궁합 점수 계산 알고리즘 개선
- [ ] 추천 매칭 시스템 (AI 기반)
- [ ] 모바일 앱 개발
- [ ] 알림 시스템 추가
- [ ] 채팅 파일 공유 기능
- [ ] 블록 및 신고 시스템

---

## 📄 라이선스

이 프로젝트는 **MIT License** 하에 배포됩니다.

---

## 💬 기여하기

이 프로젝트에 기여하고 싶으신가요?

1. 저장소를 Fork합니다
2. Feature 브랜치를 생성합니다 (`git checkout -b feature/AmazingFeature`)
3. 변경사항을 커밋합니다 (`git commit -m 'Add some AmazingFeature'`)
4. 브랜치에 Push합니다 (`git push origin feature/AmazingFeature`)
5. Pull Request를 생성합니다

---

## 📞 연락처 및 지원

문제가 발생하거나 질문이 있으시면 GitHub Issues를 통해 연락해주세요.

---

**Made with ❤️ by Fortune For You Team**
