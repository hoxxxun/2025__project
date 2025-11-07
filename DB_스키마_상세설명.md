# Fortune For You - 데이터베이스 스키마 상세 설명

사주 기반 소개팅 플랫폼 **Fortune For You**의 데이터베이스 구조를 자세히 설명하는 문서입니다.

---

## 🙍 USERS (회원)

### 테이블 설명
사용자의 기본 정보, 인증 정보, 사주 정보, 성향 분석 결과를 저장하는 테이블입니다.

### 컬럼 상세 정보

**userId (PK)**: 유저의 고유 식별자입니다. (Primary Key, 기본 키)
- AUTO_INCREMENT로 자동 증가

**username**: 유저의 닉네임 또는 이름입니다.
- UNIQUE 제약으로 중복 방지

**password**: 로그인 시 사용할 비밀번호입니다.
- 💡 **중요**: DB에 저장 시 절대로 원본 그대로 저장하면 안 됩니다. 
- bcryptjs 같은 라이브러리를 사용해 **반드시 암호화(해싱)**해서 저장해야 합니다.

**email**: 유저의 이메일입니다.
- 로그인 ID로 사용하거나, 비밀번호 찾기 등에 사용됩니다.
- UNIQUE 제약으로 중복 방지

**birthYear, birthMonth, birthDay**: 이 서비스의 핵심 컬럼입니다. 
- 이 3가지 정보를 조합하여 유저의 **'사주'**를 계산하는 원본 데이터가 됩니다.

**gender**: 유저의 성별입니다.
- 궁합을 볼 때 중요한 요소가 될 수 있습니다.

**traits**: 개인 성향 분석 결과입니다.
- JSON 형식으로 AWS API로 분석한 성향 데이터를 저장
- 예: `["진취적", "낙천적", "성실함", "활동적"]`
- 로그인한 사용자만 저장되며, 미저장 시 NULL

**createdAt, updatedAt**: 타임스탬프입니다.
- 계정 생성 시간 및 마지막 수정 시간 기록

---

## 📝 POSTS (게시글)

### 테이블 설명
커뮤니티에 작성된 게시글 정보를 저장하는 테이블입니다.

### 컬럼 상세 정보

**postId (PK)**: 게시글의 고유 식별자입니다.
- AUTO_INCREMENT로 자동 증가

**userId (FK)**: USERS 테이블의 userId를 참조합니다.
- 이 게시글의 작성자가 누구인지 알려줍니다.
- 사용자 삭제 시 해당 게시글도 자동 삭제

**title**: 게시글 제목입니다.
- VARCHAR(200)으로 길이 제한

**content**: 게시글 본문 내용입니다.
- TEXT 타입으로 긴 텍스트 저장 가능

**views**: 조회수입니다. 
- 인기 글을 정렬하는 데 사용할 수 있습니다.
- 게시글 조회 시마다 +1 증가
- DEFAULT 0으로 초기값 설정

---

## 💬 COMMENTS (댓글)

### 테이블 설명
게시글에 달린 댓글 정보를 저장하는 테이블입니다.

### 컬럼 상세 정보

**commentId (PK)**: 댓글의 고유 식별자입니다.
- AUTO_INCREMENT로 자동 증가

**postId (FK)**: POSTS 테이블의 postId를 참조합니다.
- 이 댓글이 어떤 게시글에 달린 것인지 알려줍니다.
- ON DELETE CASCADE: 게시글 삭제 시 해당 댓글도 자동 삭제

**userId (FK)**: USERS 테이블의 userId를 참조합니다.
- 이 댓글의 작성자가 누구인지 알려줍니다.
- ON DELETE CASCADE: 사용자 삭제 시 해당 댓글도 자동 삭제

**content**: 댓글 내용입니다.
- TEXT 타입으로 긴 텍스트 저장 가능

**createdAt, updatedAt**: 타임스탬프입니다.
- 댓글 작성 시간 및 수정 시간 기록

---

## 🗨️ CHATROOMS (채팅방)

### 테이블 설명
1:1 채팅방 정보를 저장하는 테이블입니다. 두 사용자 간의 대화 공간을 관리합니다.

### 컬럼 상세 정보

**chatroomId (PK)**: 채팅방의 고유 식별자입니다.
- AUTO_INCREMENT로 자동 증가

**user1Id (FK)**: 1:1 채팅에 참여하는 첫 번째 유저입니다.
- USERS 테이블의 userId를 참조
- ON DELETE CASCADE: 사용자 삭제 시 채팅방도 자동 삭제

**user2Id (FK)**: 1:1 채팅에 참여하는 두 번째 유저입니다.
- USERS 테이블의 userId를 참조
- ON DELETE CASCADE: 사용자 삭제 시 채팅방도 자동 삭제

**lastMessage**: 채팅방 목록에서 마지막 대화 내용을 미리 보여주기 위한 컬럼입니다. ⭐
- UX에 좋은 기능으로, 앱 목록에서 "마지막 메시지 미리보기" 구현에 사용
- 가장 최근 메시지 내용이 저장됨

**lastMessageTime**: 마지막 메시지 시간입니다.
- 채팅방 목록을 시간순으로 정렬할 때 사용
- 새로운 메시지가 오면 자동 업데이트

**createdAt, updatedAt**: 타임스탬프입니다.
- 채팅방 생성 시간 및 수정 시간 기록

### 💡 중요한 설계 원칙

**UNIQUE KEY (user1Id, user2Id)**: 중복 채팅방 방지
- 이 설계는 채팅방 하나가 오직 두 명의 유저(user1과 user2) 사이에서만 존재한다는 것을 의미합니다.
- 같은 두 명의 유저가 채팅방을 여러 개 만드는 것을 DB 차원에서 방지합니다.

---

## 📨 MESSAGES (메시지)

### 테이블 설명
실시간 채팅 메시지를 저장하는 테이블입니다. Socket.IO를 통해 전송된 모든 메시지가 기록됩니다.

### 컬럼 상세 정보

**messageId (PK)**: 개별 메시지의 고유 식별자입니다.
- AUTO_INCREMENT로 자동 증가

**chatroomId (FK)**: CHATROOMS의 chatroomId를 참조합니다.
- 이 메시지가 어떤 채팅방에서 오고 간 것인지 알려줍니다.
- ON DELETE CASCADE: 채팅방 삭제 시 해당 메시지도 자동 삭제

**userId (FK)**: USERS 테이블의 userId를 참조합니다.
- 이 메시지를 보낸 사람이 누구인지 알려줍니다.
- ON DELETE CASCADE: 사용자 삭제 시 해당 메시지도 자동 삭제

**content**: 실제 메시지 내용(텍스트)입니다.
- TEXT 타입으로 긴 텍스트 저장 가능

**createdAt**: 메시지 전송 시간입니다.
- 메시지 순서를 정렬할 때 사용
- DEFAULT CURRENT_TIMESTAMP로 자동 기록

---

## ✨ COMPATIBILITIES (궁합 점수)

### 테이블 설명
두 사용자 간의 궁합 점수를 저장하는 테이블입니다. 사주 정보를 기반으로 계산된 매칭 점수를 보관합니다.

### 컬럼 상세 정보

**user1Id (FK)**: 궁합을 보는 첫 번째 유저입니다.
- USERS 테이블의 userId를 참조
- ON DELETE CASCADE: 사용자 삭제 시 관련 궁합 데이터도 자동 삭제

**user2Id (FK)**: 궁합을 보는 두 번째 유저입니다.
- USERS 테이블의 userId를 참조
- user1을 기준으로 user2의 점수를 저장합니다.
- ON DELETE CASCADE: 사용자 삭제 시 관련 궁합 데이터도 자동 삭제

**matchingScore**: 두 유저 간의 계산된 궁합 점수입니다. ⭐
- DECIMAL(5, 2) 타입으로 0.00 ~ 100.00 범위의 백분율 저장
- 사주 정보와 성향 데이터를 기반으로 계산됨

**traits1**: user1의 성향 데이터입니다.
- JSON 형식으로 저장된 성향 배열
- 궁합 계산에 사용된 성향 정보 기록

**traits2**: user2의 성향 데이터입니다.
- JSON 형식으로 저장된 성향 배열
- 궁합 계산에 사용된 성향 정보 기록

**calculatedAt**: 궁합 점수 계산 시간입니다.
- 언제 계산되었는지 추적할 수 있습니다.

### 💡 중요한 설계 개선 (PK 추가)

**복합 기본 키 (Composite Primary Key)**: (user1Id, user2Id) ⭐⭐

이 테이블에는 **복합 기본 키(Composite Primary Key)**를 반드시 적용해야 합니다.

**이유:**
- (user1: A, user2: B)의 점수가 한 번 저장되면, (user1: A, user2: B)가 또 저장되는 것을 DB 차원에서 막아줍니다.
- 중복된 궁합 점수 데이터를 방지하여 데이터 무결성을 보장합니다.
- 같은 두 유저에 대한 궁합 점수 업데이트가 자동으로 기존 레코드를 수정하도록 유도합니다.
- 저장 공간을 절약하고 쿼리 성능을 향상시킵니다.

---

## 📊 전체 구조 요약

| 테이블 | PK | FK | 주요 기능 |
|--------|----|----|---------|
| **USERS** | userId | - | 회원 정보, 사주 정보, 성향 분석 |
| **POSTS** | postId | userId | 커뮤니티 게시글 |
| **COMMENTS** | commentId | postId, userId | 게시글 댓글 |
| **CHATROOMS** | chatroomId | user1Id, user2Id | 1:1 채팅방 (UNIQUE 제약) |
| **MESSAGES** | messageId | chatroomId, userId | 실시간 메시지 저장 |
| **COMPATIBILITIES** | (user1Id, user2Id) | user1Id, user2Id | 궁합 점수 (복합 PK) |

---

## 🔐 보안 및 설계 고려사항

1. **비밀번호 암호화 (필수)**
   - bcryptjs로 반드시 해싱하여 저장

2. **외래 키 제약 (ON DELETE CASCADE)**
   - 데이터 무결성을 보장하고 고아 레코드 방지

3. **복합 기본 키**
   - CHATROOMS: (user1Id, user2Id) - 중복 채팅방 방지
   - COMPATIBILITIES: (user1Id, user2Id) - 중복 궁합 데이터 방지

4. **타임스탐프 자동화**
   - DEFAULT CURRENT_TIMESTAMP로 자동 관리

5. **JSON 타입 활용**
   - traits: 동적 배열 데이터 저장
   - 확장성 있는 데이터 구조 제공

---

**이 설계는 Fortune For You의 핵심 기능인 사주 기반 매칭, 커뮤니티, 실시간 채팅을 안정적으로 지원합니다.**

