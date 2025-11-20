const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Compatibility = require('../models/Compatibility');
const { sequelize } = require('../config/database');
const axios = require('axios');

/**
 * 랜덤 성향 생성 함수
 * @param {Object} user - 사용자 정보
 * @returns {Array} 랜덤 성향 배열
 */
function generateRandomTraits(user) {
  const traitGroups = [
    ['진취적', '용감', '활발', '리더십'],
    ['낙천적', '긍정적', '친화력', '소통'],
    ['성실함', '책임감', '완벽주의', '신뢰성'],
    ['창의적', '예술적', '독창성', '상상력'],
    ['논리적', '분석적', '체계적', '집중력'],
    ['감성적', '공감능력', '배려심', '섬세함']
  ];

  // 입력값에 따른 랜덤 시드 생성
  let seed = user.birthYear + user.birthMonth + user.birthDay + user.username.charCodeAt(0);
  console.log('사용자 등록 시드:', seed);

  // 시드 기반으로 3-5개의 성향 선택
  const selectedTraits = [];
  const shuffledGroups = [...traitGroups].sort(() => {
    const result = Math.sin(seed) - 0.5;
    seed += 1;
    return result;
  });

  for (let i = 0; i < Math.min(5, shuffledGroups.length); i++) {
    const group = shuffledGroups[i];
    const randomIndex = Math.abs(Math.sin(seed + i)) * group.length;
    selectedTraits.push(group[Math.floor(randomIndex)]);
  }

  const traits = selectedTraits.slice(0, 3 + (seed % 3)); // 3-5개 선택
  console.log('생성된 초기 성향:', traits);

  return traits;
}

// 궁합 계산 헬퍼 함수
async function calculateCompatibility(user1, user2) {
  console.log(`🔮 AWS API 궁합 계산 시도: ${user1.username || 'User1'} ↔ ${user2.username || 'User2'}`);

  try {
    const requestData = {
      a: {
        gender: user1.gender === 'M' ? '남' : '여',
        year: user1.birthYear,
        month: user1.birthMonth,
        day: user1.birthDay
      },
      b: {
        gender: user2.gender === 'M' ? '남' : '여',
        year: user2.birthYear,
        month: user2.birthMonth,
        day: user2.birthDay
      },
      useLunar: true,
      debug: false
    };

    console.log(`📡 AWS API 요청 데이터:`, JSON.stringify(requestData, null, 2));

    const response = await axios.post('http://54.180.2.201/compat', requestData, {
      timeout: 10000
    });

    const score = response.data.compat?.matching_score || response.data.matching_score || 0;
    console.log(`✅ AWS API 성공: ${score}점 반환`);
    console.log(`📊 AWS API 응답 데이터:`, JSON.stringify(response.data, null, 2));

    return score;
  } catch (error) {
    console.error(`❌ AWS 궁합 계산 실패 (${user1.username || 'User1'} ↔ ${user2.username || 'User2'}):`, error.message);
    if (error.response) {
      console.error(`❌ AWS API 응답 상태: ${error.response.status}`);
      console.error(`❌ AWS API 응답 데이터:`, error.response.data);
    }

    console.log(`🔄 기본 알고리즘으로 전환`);

    // AWS API 실패 시 기본 계산 로직 사용
    const mockUser1 = {
      birthYear: user1.birthYear,
      birthMonth: user1.birthMonth,
      birthDay: user1.birthDay,
      gender: user1.gender,
      traits: user1.traits
    };
    const mockUser2 = {
      birthYear: user2.birthYear,
      birthMonth: user2.birthMonth,
      birthDay: user2.birthDay,
      gender: user2.gender,
      traits: user2.traits
    };

    // 기본 궁합 계산 (routes/matching.js의 로직)
    let score = 50;
    const ageDiff = Math.abs(mockUser1.birthYear - mockUser2.birthYear);
    if (ageDiff <= 5) score += 10;
    else if (ageDiff <= 10) score += 5;
    else score -= 5;

    if (mockUser1.gender !== mockUser2.gender) score += 5;

    const traits1 = JSON.parse(mockUser1.traits || '[]');
    const traits2 = JSON.parse(mockUser2.traits || '[]');
    const commonTraits = traits1.filter(t => traits2.includes(t)).length;
    score += commonTraits * 2;

    const finalScore = Math.max(20, Math.min(100, score));
    console.log(`📈 기본 알고리즘 결과: ${finalScore}점 (나이차이: ${ageDiff}년, 공통성향: ${commonTraits}개)`);

    return finalScore;
  }
}

// 기본 궁합 계산 함수 (auth.js용)
function calculateBasicCompatibility(user1, user2) {
  let score = 50; // 기본 점수

  // 나이 차이 고려
  const ageDiff = Math.abs(user1.birthYear - user2.birthYear);
  if (ageDiff <= 5) score += 10;
  else if (ageDiff <= 10) score += 5;
  else score -= 5;

  // 성별 호환
  if (user1.gender !== user2.gender) score += 5;

  // 성향 호환
  const traits1 = JSON.parse(user1.traits || '[]');
  const traits2 = JSON.parse(user2.traits || '[]');
  const commonTraits = traits1.filter(t => traits2.includes(t)).length;
  score += commonTraits * 3; // 공통 성향당 3점 추가

  return Math.max(20, Math.min(100, score)); // 최소 20점, 최대 100점
}

// 회원가입 페이지
router.get('/signup', (req, res) => {
  res.render('auth/signup');
});

// 회원가입 처리
router.post('/signup', async (req, res) => {
  try {
    console.log('회원가입 시도:', { username: req.body.username, email: req.body.email });

    const { username, password, confirmPassword, email, birthYear, birthMonth, birthDay, gender } = req.body;

    // 입력값 검증
    if (!username || !password || !confirmPassword || !email) {
      console.log('필수 입력값 누락');
      return res.status(400).render('auth/signup', { error: '사용자명, 이메일, 비밀번호는 필수입니다.' });
    }

    // 사용자명 길이 및 형식 검증
    if (username.length < 2 || username.length > 50) {
      console.log('사용자명 길이 문제:', username.length);
      return res.status(400).render('auth/signup', { error: '사용자명은 2자 이상 50자 이하여야 합니다.' });
    }

    // 한글 및 영문자, 숫자, 밑줄만 허용
    const usernameRegex = /^[a-zA-Z0-9가-힣_]+$/;
    if (!usernameRegex.test(username)) {
      console.log('사용자명 형식 문제:', username);
      return res.status(400).render('auth/signup', { error: '사용자명은 한글, 영문, 숫자, 밑줄(_)만 사용할 수 있습니다.' });
    }

    if (password !== confirmPassword) {
      console.log('비밀번호 불일치');
      return res.status(400).render('auth/signup', { error: '비밀번호가 일치하지 않습니다.' });
    }

    if (password.length < 6) {
      return res.status(400).render('auth/signup', { error: '비밀번호는 최소 6자 이상이어야 합니다.' });
    }

    if (!gender) {
      return res.status(400).render('auth/signup', { error: '성별을 선택해주세요.' });
    }

    if (!birthYear || !birthMonth || !birthDay) {
      return res.status(400).render('auth/signup', { error: '생년월일을 입력해주세요.' });
    }

    // 중복 확인
    console.log('중복 확인 시작...');
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      console.log('사용자명 중복 발견:', username);
      return res.status(409).render('auth/signup', { error: `사용자명 '${username}'은(는) 이미 사용중입니다.` });
    }

    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      console.log('이메일 중복 발견:', email);
      return res.status(409).render('auth/signup', { error: `이메일 '${email}'은(는) 이미 사용중입니다.` });
    }

    console.log('중복 확인 완료, 사용자 생성 시작...');

    // 사용자 생성 (일단 성향 분석 없이)
    const newUser = await User.create({
      username,
      password,
      email,
      birthYear: parseInt(birthYear),
      birthMonth: parseInt(birthMonth),
      birthDay: parseInt(birthDay),
      gender
    });

    // 회원가입 후 즉시 로그인
    req.session.userId = newUser.id;
    req.session.username = newUser.username;

    // 백그라운드에서 성향 분석 및 궁합 계산 실행
    setImmediate(async () => {
      try {
        await processUserRegistration(newUser);
      } catch (error) {
        console.error('사용자 등록 후처리 오류:', error);
      }
    });

    res.redirect('/');
  } catch (error) {
    console.error('회원가입 오류:', error);
    res.status(500).render('auth/signup', { error: '회원가입 중 오류가 발생했습니다.' });
  }
});

/**
 * 사용자 등록 후처리 함수 (성향 분석 + 궁합 계산)
 * @param {Object} newUser - 새로 생성된 사용자
 */
async function processUserRegistration(newUser) {
  try {
    console.log(`사용자 ${newUser.username} 등록 후처리 시작`);

    // 1. 성향 분석 실행 (AWS API 직접 호출 또는 랜덤 생성)
    let traits = [];
    try {
      const axios = require('axios');
      const response = await axios.post('http://54.180.2.201/traits', {
        birthYear: newUser.birthYear,
        birthMonth: newUser.birthMonth,
        birthDay: newUser.birthDay,
        gender: newUser.gender === 'M' ? '남' : '여'
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data && Array.isArray(response.data.traits)) {
        traits = response.data.traits;
      } else {
        // AWS API 실패 시 랜덤 성향 생성
        traits = generateRandomTraits(newUser);
      }
    } catch (error) {
      console.error('AWS API 성향 분석 실패:', error.message);
      // AWS API 실패 시 랜덤 성향 생성
      traits = generateRandomTraits(newUser);
    }

    // 2. 사용자 정보에 성향 업데이트
    await User.update({
      traits: JSON.stringify(traits)
    }, {
      where: { id: newUser.id }
    });

    console.log(`사용자 ${newUser.username} 성향 분석 완료:`, traits);

    // 3. 기존 사용자 목록 조회 (성별 필터링)
    const currentUserGender = newUser.gender;
    let oppositeGenderFilter = [];

    if (currentUserGender === 'M' || currentUserGender === 'male' || currentUserGender === '남') {
      oppositeGenderFilter = ['F', 'female', '여'];
    } else if (currentUserGender === 'F' || currentUserGender === 'female' || currentUserGender === '여') {
      oppositeGenderFilter = ['M', 'male', '남'];
    } else {
      // 성별이 지정되지 않은 경우 궁합 계산하지 않음
      oppositeGenderFilter = [];
    }

    let existingUsers = [];
    if (oppositeGenderFilter.length > 0) {
      existingUsers = await User.findAll({
        where: {
          id: { [require('sequelize').Op.ne]: newUser.id }, // 자신 제외
          gender: { [require('sequelize').Op.in]: oppositeGenderFilter } // 상대 성별 필터링
        },
        attributes: ['id', 'username', 'birthYear', 'birthMonth', 'birthDay', 'gender', 'traits']
      });
    }

    console.log(`기존 사용자 ${existingUsers.length}명 발견 (상대 성별 필터링 적용)`);

    if (existingUsers.length === 0) {
      console.log('기존 사용자가 없어 궁합 계산을 건너뜁니다.');
      return;
    }

    // 4. 각 기존 사용자와의 궁합 계산 및 저장 (트랜잭션 처리)
    const compatibilityRecords = [];
    const newUserWithTraits = { ...newUser.toJSON(), traits: JSON.stringify(traits) };

    // 트랜잭션 시작
    const transaction = await sequelize.transaction();

    try {
      for (const existingUser of existingUsers) {
        try {
          // 궁합 점수 계산 (AWS API 사용)
          const matchingScore = await calculateCompatibility(newUserWithTraits, existingUser);

          // 유효한 점수 범위 확인 (0-100)
          if (matchingScore < 0 || matchingScore > 100) {
            console.warn(`잘못된 궁합 점수: ${matchingScore}점 (0-100 범위로 조정)`);
            continue;
          }

          // 양방향으로 저장 (중복 방지)
          const user1Id = Math.min(newUser.id, existingUser.id);
          const user2Id = Math.max(newUser.id, existingUser.id);

          compatibilityRecords.push({
            user1Id,
            user2Id,
            matchingScore,
            traits1: user1Id === newUser.id ? JSON.stringify(traits) : existingUser.traits,
            traits2: user2Id === newUser.id ? JSON.stringify(traits) : existingUser.traits,
            calculatedAt: new Date()
          });

          console.log(`✅ 궁합 계산: ${newUser.username} ↔ ${existingUser.username} = ${matchingScore}점`);

        } catch (calcError) {
          console.error(`❌ 궁합 계산 실패 (${newUser.username} ↔ ${existingUser.username}):`, calcError.message);
          // 개별 계산 실패는 무시하고 계속 진행
        }
      }

      // 5. 궁합 데이터 일괄 저장
      if (compatibilityRecords.length > 0) {
        await Compatibility.bulkCreate(compatibilityRecords, {
          transaction,
          ignoreDuplicates: true, // 중복 방지
          updateOnDuplicate: ['matchingScore', 'traits1', 'traits2', 'calculatedAt'] // 중복 시 업데이트
        });
        console.log(`✅ ${compatibilityRecords.length}개의 궁합 데이터 저장 완료`);
      } else {
        console.log('⚠️ 저장할 궁합 데이터가 없습니다.');
      }

      // 트랜잭션 커밋
      await transaction.commit();

    } catch (bulkError) {
      // 트랜잭션 롤백
      await transaction.rollback();
      console.error('❌ 궁합 데이터 저장 실패:', bulkError);
      // 궁합 데이터 저장 실패해도 회원가입은 성공으로 처리 (사용자에게 영향 최소화)
    }

    console.log(`사용자 ${newUser.username} 등록 후처리 완료`);

  } catch (error) {
    console.error('사용자 등록 후처리 중 오류:', error);
  }
}

// 로그인 페이지
router.get('/login', (req, res) => {
  res.render('auth/login');
});

// 로그인 처리
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 입력값 검증
    if (!username || !password) {
      return res.status(400).render('auth/login', { error: '사용자명과 비밀번호를 입력해주세요.' });
    }

    // 사용자 조회
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(401).render('auth/login', { error: '로그인 실패: 사용자를 찾을 수 없습니다.' });
    }

    // 비밀번호 확인
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).render('auth/login', { error: '로그인 실패: 비밀번호가 일치하지 않습니다.' });
    }

    // 세션 설정
    req.session.userId = user.id;
    req.session.username = user.username;

    // 이전에 방문하려던 페이지가 있으면 그 페이지로 이동
    const returnTo = req.session.returnTo;
    if (returnTo) {
      delete req.session.returnTo; // 사용한 후 삭제
      res.redirect(returnTo);
    } else {
      res.redirect('/');
    }
  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).render('auth/login', { error: '로그인 중 오류가 발생했습니다.' });
  }
});

// 로그아웃
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send('로그아웃 중 오류가 발생했습니다.');
    }
    res.redirect('/');
  });
});

module.exports = router;

