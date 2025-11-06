-- ============================================================================
-- 아직 로그인, 채팅, 커뮤니티 기능만 구현되어 있습니다.

-- 1. Users 테이블 (사용자 정보)
-- ============================================================================
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL COMMENT '로그인 아이디',
    password VARCHAR(255) NOT NULL COMMENT '해시된 비밀번호',
    email VARCHAR(100) UNIQUE NOT NULL COMMENT '이메일 주소',
    birthYear INT COMMENT '태어난 년도',
    birthMonth INT COMMENT '태어난 월',
    birthDay INT COMMENT '태어난 일',
    gender VARCHAR(10) COMMENT '성별 (M: 남자, F: 여자)',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '가입 시간',
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_gender (gender),
    INDEX idx_birthYear (birthYear)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자 정보 테이블 (사주 기반 매칭 포함)';

-- ============================================================================
-- 2. Posts 테이블 (커뮤니티 게시글)
-- ============================================================================
CREATE TABLE posts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    userId INT NOT NULL COMMENT '작성자 ID',
    title VARCHAR(200) NOT NULL COMMENT '게시글 제목',
    content LONGTEXT NOT NULL COMMENT '게시글 내용',
    views INT DEFAULT 0 COMMENT '조회수',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '작성 시간',
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 시간',
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_userId (userId),
    INDEX idx_createdAt (createdAt DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='게시글 테이블';

-- ============================================================================
-- 3. Comments 테이블 (댓글)
-- ============================================================================
CREATE TABLE comments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    postId INT NOT NULL COMMENT '게시글 ID',
    userId INT NOT NULL COMMENT '댓글 작성자 ID',
    content LONGTEXT NOT NULL COMMENT '댓글 내용',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '작성 시간',
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 시간',
    FOREIGN KEY (postId) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_postId (postId),
    INDEX idx_userId (userId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='댓글 테이블';

-- ============================================================================
-- 4. ChatRooms 테이블 (1:1 채팅방)
-- ============================================================================
CREATE TABLE chatrooms (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user1Id INT NOT NULL COMMENT '채팅 참여자 1',
    user2Id INT NOT NULL COMMENT '채팅 참여자 2',
    lastMessage LONGTEXT COMMENT '마지막 메시지',
    lastMessageTime DATETIME COMMENT '마지막 메시지 시간',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '채팅방 생성 시간',
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 시간',
    FOREIGN KEY (user1Id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user2Id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE INDEX idx_users (user1Id, user2Id),
    INDEX idx_lastMessageTime (lastMessageTime DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='채팅방 테이블';

-- ============================================================================
-- 5. Messages 테이블 (채팅 메시지)
-- ============================================================================
CREATE TABLE messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    chatroomId INT NOT NULL COMMENT '채팅방 ID',
    userId INT NOT NULL COMMENT '메시지 발신자 ID',
    content LONGTEXT NOT NULL COMMENT '메시지 내용',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '발송 시간',
    FOREIGN KEY (chatroomId) REFERENCES chatrooms(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_roomId_createdAt (chatroomId, createdAt DESC),
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='메시지 테이블';


-- ============================================================================
-- 외래키 제약조건 
-- ============================================================================
-- ON DELETE CASCADE: 부모 레코드 삭제 시 자식 레코드도 자동 삭제
-- ON UPDATE RESTRICT: 부모 레코드 수정 시 제한 (기본값)
-- ============================================================================

-- ============================================================================
-- 주요 인덱스 헷갈리는 것들
-- ============================================================================
-- Users 테이블
--   - idx_username: UNIQUE (로그인 시 빠른 검색)
--   - idx_email: UNIQUE (이메일 중복 확인)
--
-- Posts 테이블
--   - idx_userId: 사용자별 게시글 조회
--   - idx_createdAt: 최신 게시글 정렬
--
-- Comments 테이블
--   - idx_postId: 게시글별 댓글 조회
--   - idx_userId: 사용자별 댓글 조회
--
-- ChatRooms 테이블
--   - idx_users: UNIQUE (중복 채팅방 방지)
--   - idx_lastMessageTime: 채팅방 목록 정렬
--
-- Messages 테이블
--   - idx_roomId_createdAt: 메시지 히스토리 조회
--   - idx_roomId_isRead: 미읽음 메시지 조회
-- ============================================================================
