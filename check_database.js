const { Sequelize } = require('sequelize');
const path = require('path');

// 환경변수 설정 (SQLite 사용 강제)
process.env.USE_SQLITE = 'true';

// config/database import (SQLite 설정 사용)
const { sequelize } = require('./config/database');

// 모델 import
const User = require('./models/User');
const Post = require('./models/Post');
const Comment = require('./models/Comment');
const ChatRoom = require('./models/ChatRoom');
const Message = require('./models/Message');
const Compatibility = require('./models/Compatibility');
const AutoMessage = require('./models/AutoMessage');

// 더미 데이터 생성 함수
async function createDummyUsers() {
  console.log('🎭 더미 사용자 생성 시작...\n');

  const dummyUsers = [
    // 남자 5명
    {
      username: '김철수',
      email: 'kim@example.com',
      password: 'password123',
      birthYear: 1995,
      birthMonth: 3,
      birthDay: 15,
      gender: '남'
    },
    {
      username: '이영호',
      email: 'lee@example.com',
      password: 'password123',
      birthYear: 1992,
      birthMonth: 7,
      birthDay: 22,
      gender: '남'
    },
    {
      username: '박민수',
      email: 'park@example.com',
      password: 'password123',
      birthYear: 1998,
      birthMonth: 11,
      birthDay: 8,
      gender: '남'
    },
    {
      username: '최지훈',
      email: 'choi@example.com',
      password: 'password123',
      birthYear: 1990,
      birthMonth: 1,
      birthDay: 30,
      gender: '남'
    },
    {
      username: '정우진',
      email: 'jung@example.com',
      password: 'password123',
      birthYear: 1996,
      birthMonth: 5,
      birthDay: 12,
      gender: '남'
    },

    // 여자 5명
    {
      username: '김지현',
      email: 'kimji@example.com',
      password: 'password123',
      birthYear: 1997,
      birthMonth: 9,
      birthDay: 18,
      gender: '여'
    },
    {
      username: '이서연',
      email: 'lee@example.com',
      password: 'password123',
      birthYear: 1994,
      birthMonth: 12,
      birthDay: 5,
      gender: '여'
    },
    {
      username: '박수진',
      email: 'parksu@example.com',
      password: 'password123',
      birthYear: 1999,
      birthMonth: 4,
      birthDay: 25,
      gender: '여'
    },
    {
      username: '최미나',
      email: 'choi@example.com',
      password: 'password123',
      birthYear: 1993,
      birthMonth: 8,
      birthDay: 14,
      gender: '여'
    },
    {
      username: '장원영',
      email: 'jang@example.com',
      password: 'password123',
      birthYear: 2004,
      birthMonth: 8,
      birthDay: 31,
      gender: '여'
    }
  ];

  let createdCount = 0;
  let skippedCount = 0;

  for (const userData of dummyUsers) {
    try {
      // 중복 확인
      const existingUser = await User.findOne({
        where: {
          [require('sequelize').Op.or]: [
            { username: userData.username },
            { email: userData.email }
          ]
        }
      });

      if (existingUser) {
        console.log(`⏭️  ${userData.username} - 이미 존재함 (스킵)`);
        skippedCount++;
        continue;
      }

      // 사용자 생성
      const newUser = await User.create(userData);
      console.log(`✅ ${userData.username} - 생성 완료 (ID: ${newUser.id})`);
      createdCount++;

    } catch (error) {
      console.error(`❌ ${userData.username} - 생성 실패:`, error.message);
    }
  }

  console.log(`\n🎭 더미 데이터 생성 완료:`);
  console.log(`  - 생성됨: ${createdCount}명`);
  console.log(`  - 스킵됨: ${skippedCount}명`);
  console.log(`  - 총 시도: ${dummyUsers.length}명\n`);

  // 더미 사용자 생성 후 모든 사용자 간 궁합 계산
  if (createdCount > 0) {
    await calculateAllCompatibilities();
  }
}

// 모든 사용자 간 궁합 계산 함수
async function calculateAllCompatibilities() {
  console.log('💕 모든 사용자 간 궁합 계산 시작...\n');

  // 모든 사용자 조회
  const allUsers = await User.findAll({
    attributes: ['id', 'username', 'birthYear', 'birthMonth', 'birthDay', 'gender', 'traits']
  });

  console.log(`총 ${allUsers.length}명의 사용자 발견`);

  let compatibilityCount = 0;
  const Compatibility = require('./models/Compatibility');

  // 각 사용자 쌍에 대해 궁합 계산
  for (let i = 0; i < allUsers.length; i++) {
    for (let j = i + 1; j < allUsers.length; j++) {
      const user1 = allUsers[i];
      const user2 = allUsers[j];

      try {
        // 이미 존재하는 궁합 데이터 확인
        const existingComp = await Compatibility.findOne({
          where: {
            [require('sequelize').Op.or]: [
              { user1Id: user1.id, user2Id: user2.id },
              { user1Id: user2.id, user2Id: user1.id }
            ]
          }
        });

        if (existingComp) {
          console.log(`⏭️  ${user1.username} ↔ ${user2.username} - 이미 존재 (스킵)`);
          continue;
        }

        // 궁합 계산
        const matchingScore = await calculateCompatibility(user1, user2);

        // 궁합 데이터 저장
        await Compatibility.create({
          user1Id: user1.id,
          user2Id: user2.id,
          matchingScore,
          traits1: user1.traits,
          traits2: user2.traits,
          calculatedAt: new Date()
        });

        console.log(`✅ ${user1.username} ↔ ${user2.username} = ${matchingScore}점`);
        compatibilityCount++;

      } catch (error) {
        console.error(`❌ ${user1.username} ↔ ${user2.username} 계산 실패:`, error.message);
      }
    }
  }

  console.log(`\n💕 궁합 계산 완료: ${compatibilityCount}개 생성\n`);
}

// 자동 메시지 생성 함수
// AutoMessage 모델 동기화
async function syncAutoMessageModel() {
  try {
    await AutoMessage.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('✅ AutoMessage 모델 동기화 완료\n');
  } catch (error) {
    console.error('❌ AutoMessage 모델 동기화 실패:', error.message);
  }
}

async function createAutoMessages() {
  console.log('💬 자동 메시지 생성 시작...\n');

  const autoMessages = [
    "안녕하세요 :) 추천 목록에 있어서 인사 먼저 드려요!",
    "안녕하세요! 궁합이 잘 맞는다고 해서 인사 남겨요 :)",
    "반가워요! 서로 잘 알아갈 수 있으면 좋겠어요.",
    "안녕하세요! 추천을 받아서 연락드려요 :)",
    "반갑습니다! 궁합이 좋다고 하네요 😊",
    "안녕하세요! 서로 소통해볼까요? :)",
    "인사드려요! 좋은 인연이 되길 바래요 💕",
    "안녕하세요! 추천 목록에서 뵙고 연락드렸어요 :)",
    "반가워요! 궁합 점수가 높다고 하네요 ⭐",
    "안녕하세요! 서로 알아가보면 재미있을 것 같아요 :)"
  ];

  let createdCount = 0;
  let skippedCount = 0;

  for (const messageText of autoMessages) {
    try {
      // 중복 확인
      const existingMessage = await AutoMessage.findOne({
        where: { message: messageText }
      });

      if (existingMessage) {
        console.log(`⏭️  "${messageText.substring(0, 20)}..." - 이미 존재 (스킵)`);
        skippedCount++;
        continue;
      }

      // 메시지 생성
      await AutoMessage.create({
        message: messageText,
        isActive: true
      });

      console.log(`✅ "${messageText.substring(0, 20)}..." - 생성 완료`);
      createdCount++;

    } catch (error) {
      console.error(`❌ 메시지 생성 실패:`, error.message);
    }
  }

  console.log(`\n💬 자동 메시지 생성 완료:`);
  console.log(`  - 생성됨: ${createdCount}개`);
  console.log(`  - 스킵됨: ${skippedCount}개`);
  console.log(`  - 총 시도: ${autoMessages.length}개\n`);
}

// 궁합 계산 함수
async function calculateCompatibility(user1, user2) {
  // 기본 계산 로직 (간단한 나이/성향 기반)
  try {
    // AWS API 시도
    const axios = require('axios');
    const response = await axios.post('http://54.180.2.201/compat', {
      a: {
        gender: user1.gender === '남' ? '남' : '여',
        year: user1.birthYear,
        month: user1.birthMonth,
        day: user1.birthDay
      },
      b: {
        gender: user2.gender === '남' ? '남' : '여',
        year: user2.birthYear,
        month: user2.birthMonth,
        day: user2.birthDay
      },
      useLunar: true,
      debug: false
    }, {
      timeout: 10000
    });

    return response.data.compat?.matching_score || response.data.matching_score || 50;

  } catch (error) {
    // AWS API 실패 시 기본 계산
    console.log(`AWS 궁합 계산 실패 (${user1.username} ↔ ${user2.username}): ${error.message}`);

    // 기본 계산: 나이 차이와 성별 호환성 기반
    const ageDiff = Math.abs(user1.birthYear - user2.birthYear);
    let baseScore = 70; // 기본 점수

    // 나이 차이에 따른 점수 조정
    baseScore -= ageDiff * 2;
    if (baseScore < 30) baseScore = 30;
    if (baseScore > 95) baseScore = 95;

    // 같은 성별이면 감점
    if (user1.gender === user2.gender) {
      baseScore -= 20;
    }

    // 랜덤 요소 추가 (±10)
    const randomFactor = (Math.random() - 0.5) * 20;
    baseScore += randomFactor;

    return Math.round(Math.max(20, Math.min(100, baseScore)));
  }
}

async function checkDatabase() {
  try {
    console.log('🔍 데이터베이스 내용 확인\n');

    // 사용자 테이블 확인
    console.log('👥 사용자 테이블:');
    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'gender', 'traits', 'createdAt']
    });
    users.forEach(user => {
      console.log(`  - ID: ${user.id}, 이름: ${user.username}, 성별: ${user.gender}, 성향: ${user.traits || '없음'}`);
    });
    console.log(`  총 ${users.length}명의 사용자\n`);

    // 게시글 테이블 확인
    console.log('📝 게시글 테이블:');
    const posts = await Post.findAll({
      include: [{
        model: User,
        as: 'author',
        attributes: ['username']
      }],
      attributes: ['id', 'title', 'views', 'createdAt']
    });
    posts.forEach(post => {
      console.log(`  - ID: ${post.id}, 제목: "${post.title}", 작성자: ${post.author?.username || '알수없음'}, 조회수: ${post.views}`);
    });
    console.log(`  총 ${posts.length}개의 게시글\n`);

    // 댓글 테이블 확인
    console.log('💬 댓글 테이블:');
    const comments = await Comment.findAll({
      include: [{
        model: User,
        as: 'commentAuthor',
        attributes: ['username']
      }, {
        model: Post,
        as: 'relatedPost',
        attributes: ['title']
      }],
      attributes: ['id', 'content', 'createdAt']
    });
    comments.forEach(comment => {
      console.log(`  - ID: ${comment.id}, 내용: "${comment.content}", 작성자: ${comment.commentAuthor?.username || '알수없음'}, 게시글: "${comment.relatedPost?.title || '알수없음'}"`);
    });
    console.log(`  총 ${comments.length}개의 댓글\n`);

    // 채팅방 테이블 확인
    console.log('💭 채팅방 테이블:');
    const chatrooms = await ChatRoom.findAll({
      attributes: ['id', 'user1Id', 'user2Id', 'lastMessage', 'lastMessageTime', 'createdAt']
    });
    chatrooms.forEach(room => {
      console.log(`  - ID: ${room.id}, 참여자: ${room.user1Id} ↔ ${room.user2Id}, 마지막 메시지: "${room.lastMessage || '없음'}"`);
    });
    console.log(`  총 ${chatrooms.length}개의 채팅방\n`);

    // 메시지 테이블 확인
    console.log('💬 메시지 테이블:');
    const messages = await Message.findAll({
      include: [{
        model: User,
        as: 'messageSender',
        attributes: ['username']
      }, {
        model: ChatRoom,
        as: 'messageChatroom',
        attributes: ['id']
      }],
      attributes: ['id', 'content', 'isRead', 'createdAt'],
      limit: 10 // 최근 10개만 표시
    });
    messages.forEach(message => {
      console.log(`  - ID: ${message.id}, 채팅방: ${message.messageChatroom?.id || '알수없음'}, 보낸사람: ${message.messageSender?.username || '알수없음'}, 내용: "${message.content}", 읽음: ${message.isRead ? '예' : '아니오'}`);
    });
    console.log(`  총 ${messages.length}개의 메시지 (최근 10개만 표시)\n`);

    // 궁합 테이블 확인
    console.log('💕 궁합 테이블:');
    const compatibilities = await Compatibility.findAll({
      include: [{
        model: User,
        as: 'compatUser1',
        attributes: ['username']
      }, {
        model: User,
        as: 'compatUser2',
        attributes: ['username']
      }],
      attributes: ['user1Id', 'user2Id', 'matchingScore', 'calculatedAt']
    });
    compatibilities.forEach(comp => {
      console.log(`  - ${comp.compatUser1?.username || '알수없음'} ↔ ${comp.compatUser2?.username || '알수없음'}: ${comp.matchingScore}점`);
    });
    console.log(`  총 ${compatibilities.length}개의 궁합 데이터\n`);

    // 전체 통계
    console.log('📊 데이터베이스 통계:');
    console.log(`  - 사용자: ${users.length}명`);
    console.log(`  - 게시글: ${posts.length}개`);
    console.log(`  - 댓글: ${comments.length}개`);
    console.log(`  - 채팅방: ${chatrooms.length}개`);
    console.log(`  - 메시지: ${await Message.count()}개`);
    console.log(`  - 궁합 데이터: ${compatibilities.length}개`);

    console.log('\n✅ 데이터베이스 확인 완료!');

  } catch (error) {
    console.error('❌ 데이터베이스 확인 중 오류:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

// 모든 사용자 삭제 함수
async function deleteAllUsers() {
  console.log('🗑️  모든 사용자 삭제 시작...\n');

  try {
    // 먼저 모든 게시글 삭제 (외래 키 제약 조건으로 인한 삭제 실패 방지)
    console.log('📝 모든 게시글 삭제 중...');
    const Post = require('./models/Post');
    await Post.destroy({ where: {} });

    console.log('💬 모든 댓글 삭제 중...');
    const Comment = require('./models/Comment');
    await Comment.destroy({ where: {} });

    console.log('💭 모든 메시지 삭제 중...');
    const Message = require('./models/Message');
    await Message.destroy({ where: {} });

    console.log('🏠 모든 채팅방 삭제 중...');
    const ChatRoom = require('./models/ChatRoom');
    await ChatRoom.destroy({ where: {} });

    console.log('💕 모든 궁합 데이터 삭제 중...');
    await Compatibility.destroy({ where: {} });

    // 모든 사용자 조회
    const allUsers = await User.findAll({
      attributes: ['username']
    });

    if (allUsers.length === 0) {
      console.log('ℹ️  삭제할 사용자가 없습니다.\n');
      return;
    }

    const usernames = allUsers.map(user => user.username);
    console.log(`👥 사용자 삭제 시작: ${usernames.join(', ')}\n`);

    // 사용자 삭제 (관련 데이터가 이미 삭제되었으므로 순차적으로 삭제)
    for (const username of usernames) {
      try {
        const user = await User.findOne({ where: { username } });
        if (user) {
          await user.destroy();
          console.log(`✅ ${username} 삭제 완료`);
        }
      } catch (error) {
        console.error(`❌ ${username} 삭제 실패:`, error.message);
      }
    }

    console.log('\n🗑️  모든 사용자 삭제 완료!\n');

  } catch (error) {
    console.error('❌ 모든 사용자 삭제 실패:', error.message);
  }
}

// 특정 사용자 삭제 함수
async function deleteUsers(usernames) {
  console.log(`🗑️  사용자 삭제 시작: ${usernames.join(', ')}\n`);

  for (const username of usernames) {
    try {
      // 사용자 찾기
      const user = await User.findOne({
        where: { username }
      });

      if (!user) {
        console.log(`⏭️  ${username} - 존재하지 않음 (스킵)`);
        continue;
      }

      console.log(`🗑️  ${username} (ID: ${user.id}) 삭제 시작...`);

      // 1. 궁합 데이터 삭제 (CASCADE로 자동 삭제될 수 있음)
      const compatDeleted = await Compatibility.destroy({
        where: {
          [require('sequelize').Op.or]: [
            { user1Id: user.id },
            { user2Id: user.id }
          ]
        }
      });

      // 2. 채팅방 삭제 (CASCADE로 자동 삭제될 수 있음)
      const ChatRoom = require('./models/ChatRoom');
      const chatroomDeleted = await ChatRoom.destroy({
        where: {
          [require('sequelize').Op.or]: [
            { user1Id: user.id },
            { user2Id: user.id }
          ]
        }
      });

      // 3. 메시지 삭제 (CASCADE로 자동 삭제될 수 있음)
      const Message = require('./models/Message');
      const messageDeleted = await Message.destroy({
        where: { userId: user.id }
      });

      // 4. 댓글 삭제 (CASCADE로 자동 삭제될 수 있음)
      const Comment = require('./models/Comment');
      const commentDeleted = await Comment.destroy({
        where: { userId: user.id }
      });

      // 5. 게시글 삭제 (CASCADE로 자동 삭제될 수 있음)
      const Post = require('./models/Post');
      const postDeleted = await Post.destroy({
        where: { userId: user.id }
      });

      // 6. 사용자 삭제
      await user.destroy();

      console.log(`✅ ${username} 삭제 완료:`);
      console.log(`   - 궁합 데이터: ${compatDeleted}개`);
      console.log(`   - 채팅방: ${chatroomDeleted}개`);
      console.log(`   - 메시지: ${messageDeleted}개`);
      console.log(`   - 댓글: ${commentDeleted}개`);
      console.log(`   - 게시글: ${postDeleted}개\n`);

    } catch (error) {
      console.error(`❌ ${username} 삭제 실패:`, error.message);
    }
  }

  console.log('🗑️  사용자 삭제 작업 완료\n');
}

// 명령줄 인자로 옵션 확인
const args = process.argv.slice(2);
const shouldCreateDummy = args.includes('--create-dummy');
const shouldCalcCompat = args.includes('--calc-compat');
const shouldDeleteUsers = args.includes('--delete-users');
const shouldDeleteAllUsers = args.includes('--delete-all-users');
const shouldCreateAutoMessages = args.includes('--create-auto-messages');

async function main() {
  try {
    if (shouldCreateDummy) {
      await createDummyUsers();
    }
    if (shouldCalcCompat) {
      await calculateAllCompatibilities();
    }
    if (shouldDeleteUsers) {
      await deleteUsers(['test', '?????']);
    }
    if (shouldDeleteAllUsers) {
      await deleteAllUsers();
    }
    if (shouldCreateAutoMessages) {
      await syncAutoMessageModel();
      await createAutoMessages();
    }
    await checkDatabase();
  } catch (error) {
    console.error('❌ 메인 실행 중 오류:', error);
    process.exit(1);
  }
}

main();
