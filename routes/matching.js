const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const User = require('../models/User');
const Compatibility = require('../models/Compatibility');
const axios = require('axios');

// 성향 데이터 파싱 헬퍼 함수
const parseTraits = (traitsJson) => {
  try {
    const traits = JSON.parse(traitsJson);
    return Array.isArray(traits) ? traits : [];
  } catch (error) {
    return [];
  }
};

// AWS API를 통한 궁합 계산
async function calculateCompatibilityAWS(user1, user2) {
  try {
    const response = await axios.post('http://54.180.2.201/compatibility', {
      user1: {
        birthYear: user1.birthYear,
        birthMonth: user1.birthMonth,
        birthDay: user1.birthDay,
        gender: user1.gender === 'M' ? '남' : '여',
        traits: parseTraits(user1.traits)
      },
      user2: {
        birthYear: user2.birthYear,
        birthMonth: user2.birthMonth,
        birthDay: user2.birthDay,
        gender: user2.gender === 'M' ? '남' : '여',
        traits: parseTraits(user2.traits)
      }
    }, {
      timeout: 10000
    });

    return response.data.compatibilityScore || 75.0;
  } catch (error) {
    console.error('AWS 궁합 계산 실패:', error.message);
    // 기본 계산 로직으로 폴백
    return calculateBasicCompatibility(user1, user2);
  }
}

// 기본 궁합 계산 (AWS API 실패 시)
function calculateBasicCompatibility(user1, user2) {
  let score = 50; // 기본 점수

  // 나이 차이 고려
  const ageDiff = Math.abs(user1.birthYear - user2.birthYear);
  if (ageDiff <= 5) score += 10;
  else if (ageDiff <= 10) score += 5;
  else score -= 5;

  // 성별 호환
  if (user1.gender !== user2.gender) score += 5;

  // 성향 호환 (간단 버전)
  const traits1 = parseTraits(user1.traits);
  const traits2 = parseTraits(user2.traits);
  const commonTraits = traits1.filter(t => traits2.includes(t)).length;
  score += commonTraits * 2;

  return Math.max(0, Math.min(100, score));
}

// 매칭 리스트 표시용 기본 궁합 계산 (실시간 계산)
function calculateBasicCompatibilityForDisplay(user1, user2) {
  let score = 50; // 기본 점수

  // 나이 차이 고려
  const ageDiff = Math.abs(user1.birthYear - user2.birthYear);
  if (ageDiff <= 5) score += 10;
  else if (ageDiff <= 10) score += 5;
  else score -= 5;

  // 성별 호환 (항상 다른 성별이므로 +5)
  score += 5;

  // 성향 호환
  const traits1 = parseTraits(user1.traits);
  const traits2 = parseTraits(user2.traits);
  const commonTraits = traits1.filter(t => traits2.includes(t)).length;
  score += commonTraits * 3; // 공통 성향당 3점

  return Math.max(20, Math.min(100, score)); // 20-100점 범위
}

// 미들웨어: 로그인 필요
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/auth/login');
  }
  next();
};

// 매칭 리스트 페이지
router.get('/list', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.userId;

    // 현재 사용자 정보 조회
    const currentUser = await User.findByPk(currentUserId, {
      attributes: ['id', 'username', 'gender']
    });

    if (!currentUser) {
      return res.redirect('/auth/login');
    }

    // 현재 사용자의 성별에 따라 상대 성별 필터링
    let oppositeGenderFilter = [];
    if (currentUser.gender === 'M' || currentUser.gender === 'male' || currentUser.gender === '남') {
      oppositeGenderFilter = ['F', 'female', '여'];
    } else if (currentUser.gender === 'F' || currentUser.gender === 'female' || currentUser.gender === '여') {
      oppositeGenderFilter = ['M', 'male', '남'];
    } else {
      // 성별 미지정인 경우 빈 배열 (아무도 표시하지 않음)
      oppositeGenderFilter = [];
    }

    // 상대 성별의 모든 사용자 조회
    const allOppositeGenderUsers = await User.findAll({
      where: {
        id: { [Op.ne]: currentUserId }, // 자신 제외
        gender: { [Op.in]: oppositeGenderFilter } // 상대 성별 필터링
      },
      attributes: ['id', 'username', 'birthYear', 'gender', 'traits']
    });

    // 현재 사용자의 궁합 데이터 조회 (점수 내림차순)
    const compatibilities = await Compatibility.findAll({
      where: {
        [Op.or]: [
          { user1Id: currentUserId },
          { user2Id: currentUserId }
        ]
      },
      include: [
        {
          model: User,
          as: 'user1',
          attributes: ['id', 'username', 'birthYear', 'gender', 'traits']
        },
        {
          model: User,
          as: 'user2',
          attributes: ['id', 'username', 'birthYear', 'gender', 'traits']
        }
      ],
      order: [['matchingScore', 'DESC'], ['calculatedAt', 'DESC']]
    });

    // 사용자 친화적인 데이터로 변환
    const matches = allOppositeGenderUsers.map(user => {
      // 이 사용자와의 궁합 데이터 찾기
      const compatibility = compatibilities.find(comp => {
        return (comp.user1Id === user.id && comp.user2Id === currentUserId) ||
               (comp.user1Id === currentUserId && comp.user2Id === user.id);
      });

      if (compatibility) {
        // 궁합 데이터가 있는 경우
        const isUser1 = compatibility.user1Id === currentUserId;
        const userTraits = isUser1 ? compatibility.traits2 : compatibility.traits1;

        return {
          userId: user.id,
          username: user.username,
          birthYear: user.birthYear,
          age: new Date().getFullYear() - user.birthYear,
          gender: user.gender,
          matchingScore: compatibility.matchingScore,
          traits: parseTraits(userTraits),
          compatibilityLevel: getCompatibilityLevel(compatibility.matchingScore),
          calculatedAt: compatibility.calculatedAt,
          hasCompatibilityData: true
        };
      } else {
        // 궁합 데이터가 없는 경우 - 기본 점수 계산
        const basicScore = calculateBasicCompatibilityForDisplay(currentUser, user);

        return {
          userId: user.id,
          username: user.username,
          birthYear: user.birthYear,
          age: new Date().getFullYear() - user.birthYear,
          gender: user.gender,
          matchingScore: basicScore,
          traits: parseTraits(user.traits),
          compatibilityLevel: getCompatibilityLevel(basicScore),
          calculatedAt: null,
          hasCompatibilityData: false
        };
      }
    });

    res.render('matching/list', {
      matches,
      currentUser: req.session
    });

  } catch (error) {
    console.error('매칭 리스트 조회 오류:', error);
    res.status(500).render('error', { error: '매칭 데이터를 불러오는 중 오류가 발생했습니다.' });
  }
});

// 두 사람 궁합 분석 페이지
router.get('/compatibility', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.userId;
    const targetUserId = req.query.user;

    // 현재 사용자 정보 조회
    const user = await User.findByPk(currentUserId);

    let compatibilityData = null;
    let targetUser = null;

    // targetUserId가 제공되면 분석 결과 표시 모드로 동작
    if (targetUserId) {
      // 현재 사용자와 대상 사용자 간의 궁합 데이터 조회
      const compatibility = await Compatibility.findOne({
        where: {
          [Op.or]: [
            { user1Id: currentUserId, user2Id: targetUserId },
            { user1Id: targetUserId, user2Id: currentUserId }
          ]
        },
        include: [
          {
            model: User,
            as: 'compatUser1',
            attributes: ['id', 'username', 'birthYear', 'birthMonth', 'birthDay', 'gender', 'traits']
          },
          {
            model: User,
            as: 'compatUser2',
            attributes: ['id', 'username', 'birthYear', 'birthMonth', 'birthDay', 'gender', 'traits']
          }
        ]
      });

      if (compatibility) {
        // 현재 사용자와 대상 사용자를 구분
        const isCurrentUser1 = compatibility.user1Id === currentUserId;
        const currentUser = isCurrentUser1 ? compatibility.compatUser1 : compatibility.compatUser2;
        targetUser = isCurrentUser1 ? compatibility.compatUser2 : compatibility.compatUser1;

        compatibilityData = {
          matchingScore: compatibility.matchingScore,
          currentUser: {
            username: currentUser.username,
            birthYear: currentUser.birthYear,
            birthMonth: currentUser.birthMonth,
            birthDay: currentUser.birthDay,
            gender: currentUser.gender,
            traits: currentUser.traits ? JSON.parse(currentUser.traits) : []
          },
          targetUser: {
            username: targetUser.username,
            birthYear: targetUser.birthYear,
            birthMonth: targetUser.birthMonth,
            birthDay: targetUser.birthDay,
            gender: targetUser.gender,
            traits: targetUser.traits ? JSON.parse(targetUser.traits) : []
          },
          calculatedAt: compatibility.calculatedAt
        };
      }
    }

    res.render('matching/compatibility', {
      user: user,
      compatibilityData: compatibilityData,
      showResult: !!compatibilityData
    });

  } catch (error) {
    console.error('궁합 분석 페이지 오류:', error);
    res.status(500).render('error', { error: '페이지를 불러오는 중 오류가 발생했습니다.' });
  }
});

// 매칭 우선순위 페이지
router.get('/preference', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.userId;

    // 현재 사용자의 상세 정보 조회
    const currentUser = await User.findByPk(currentUserId, {
      attributes: ['id', 'username', 'birthYear', 'birthMonth', 'birthDay', 'gender', 'traits']
    });

    if (!currentUser) {
      return res.status(404).render('error', { error: '사용자를 찾을 수 없습니다.' });
    }

    // 매칭 우선순위 계산을 위한 추가 정보
    const userTraits = parseTraits(currentUser.traits);

    res.render('matching/preference', {
      user: {
        ...currentUser.toJSON(),
        age: new Date().getFullYear() - currentUser.birthYear,
        traits: userTraits
      },
      session: req.session
    });

  } catch (error) {
    console.error('매칭 우선순위 조회 오류:', error);
    res.status(500).render('error', { error: '매칭 우선순위 데이터를 불러오는 중 오류가 발생했습니다.' });
  }
});

/**
 * 궁합 점수를 레벨로 변환
 * @param {number} score - 궁합 점수
 * @returns {Object} 레벨 정보
 */
function getCompatibilityLevel(score) {
  if (score >= 95) {
    return { level: 'destined', label: '운명에 가까운 궁합', color: '#1B5E20', icon: '💍' };
  } else if (score >= 90) {
    return { level: 'perfect', label: '완벽에 가까운 궁합', color: '#2E7D32', icon: '💎' };
  } else if (score >= 85) {
    return { level: 'excellent', label: '매우 좋은 궁합', color: '#388E3C', icon: '⭐⭐⭐⭐⭐' };
  } else if (score >= 80) {
    return { level: 'very-good', label: '상당히 좋은 궁합', color: '#43A047', icon: '⭐⭐⭐⭐' };
  } else if (score >= 75) {
    return { level: 'good', label: '좋은 궁합', color: '#4CAF50', icon: '⭐⭐⭐' };
  } else if (score >= 70) {
    return { level: 'above-average', label: '보통 이상의 궁합', color: '#FF9800', icon: '⭐⭐' };
  } else if (score >= 65) {
    return { level: 'average-plus', label: '평균 이상의 궁합', color: '#FF8F00', icon: '⭐⭐' };
  } else if (score >= 60) {
    return { level: 'average', label: '평균 궁합', color: '#FFC107', icon: '⭐' };
  } else if (score >= 55) {
    return { level: 'below-average', label: '보통 이하의 궁합', color: '#FFAB00', icon: '⭐' };
  } else if (score >= 50) {
    return { level: 'average', label: '평균 궁합', color: '#9E9E9E', icon: '⭐' };
  } else if (score >= 40) {
    return { level: 'challenging', label: '도전적인 궁합', color: '#FF7043', icon: '⚠️' };
  } else {
    return { level: 'low', label: '낮은 궁합', color: '#F44336', icon: '❌' };
  }
}

// 두 사람 궁합 분석 API (/compat) - AWS API 직접 호출
router.post('/compat', async (req, res) => {
  try {
    const { a, b, useLunar = true, debug = false } = req.body;

    // 입력 검증
    if (!a || !b || !a.gender || !a.year || !a.month || !a.day ||
        !b.gender || !b.year || !b.month || !b.day) {
      return res.status(400).json({
        ok: false,
        error: '두 사람의 성별과 생년월일 정보가 모두 필요합니다.'
      });
    }

    try {
      // AWS API에 요청
      const response = await axios.post('http://54.180.2.201/compat', {
        a: {
          gender: a.gender,
          year: parseInt(a.year),
          month: parseInt(a.month),
          day: parseInt(a.day)
        },
        b: {
          gender: b.gender,
          year: parseInt(b.year),
          month: parseInt(b.month),
          day: parseInt(b.day)
        },
        useLunar,
        debug
      }, {
        timeout: 10000
      });

      // 응답 반환
      res.json({
        ok: true,
        compat: {
          matching_score: response.data.compat?.matching_score || response.data.matching_score || 0
        }
      });

    } catch (awsError) {
      console.error('AWS 궁합 분석 API 실패:', awsError.message);

      // AWS API 실패 시 기본 계산 로직 사용
      const mockUser1 = {
        birthYear: parseInt(a.year),
        birthMonth: parseInt(a.month),
        birthDay: parseInt(a.day),
        gender: a.gender === '남' ? 'M' : 'F',
        traits: '[]' // 기본 성향 없음
      };

      const mockUser2 = {
        birthYear: parseInt(b.year),
        birthMonth: parseInt(b.month),
        birthDay: parseInt(b.day),
        gender: b.gender === '남' ? 'M' : 'F',
        traits: '[]' // 기본 성향 없음
      };

      const fallbackScore = calculateBasicCompatibility(mockUser1, mockUser2);

      console.log(`기본 궁합 계산 사용: ${fallbackScore}점`);

      res.json({
        ok: true,
        compat: {
          matching_score: fallbackScore
        }
      });
    }

  } catch (error) {
    console.error('궁합 분석 API 오류:', error.message);
    res.status(500).json({
      ok: false,
      error: '궁합 분석 중 오류가 발생했습니다.'
    });
  }
});

// 두 사람 간 궁합 실시간 계산 API
router.post('/calculate', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.userId;
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ error: '상대방 사용자 ID가 필요합니다.' });
    }

    // 현재 사용자와 대상 사용자 정보 조회
    const [currentUser, targetUser] = await Promise.all([
      User.findByPk(currentUserId, {
        attributes: ['id', 'username', 'birthYear', 'birthMonth', 'birthDay', 'gender', 'traits']
      }),
      User.findByPk(targetUserId, {
        attributes: ['id', 'username', 'birthYear', 'birthMonth', 'birthDay', 'gender', 'traits']
      })
    ]);

    if (!currentUser || !targetUser) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    // 실시간 궁합 계산
    const compatibilityScore = await calculateCompatibilityAWS(currentUser, targetUser);

    res.json({
      success: true,
      compatibility: {
        score: compatibilityScore,
        level: getCompatibilityLevel(compatibilityScore),
        user1: {
          id: currentUser.id,
          username: currentUser.username,
          traits: parseTraits(currentUser.traits)
        },
        user2: {
          id: targetUser.id,
          username: targetUser.username,
          traits: parseTraits(targetUser.traits)
        },
        calculatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('궁합 실시간 계산 오류:', error);
    res.status(500).json({ error: '궁합 계산 중 오류가 발생했습니다.' });
  }
});

// 궁합 상세 정보 API (AJAX용)
router.get('/detail/:userId', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.userId;
    const targetUserId = parseInt(req.params.userId);

    // 두 사용자 간의 궁합 데이터 조회
    const compatibility = await Compatibility.findOne({
      where: {
        [Op.or]: [
          { user1Id: currentUserId, user2Id: targetUserId },
          { user1Id: targetUserId, user2Id: currentUserId }
        ]
      },
      include: [
        {
          model: User,
          as: 'user1',
          attributes: ['id', 'username', 'birthYear', 'gender', 'traits']
        },
        {
          model: User,
          as: 'user2',
          attributes: ['id', 'username', 'birthYear', 'gender', 'traits']
        }
      ]
    });

    if (!compatibility) {
      return res.status(404).json({ error: '궁합 데이터를 찾을 수 없습니다.' });
    }

    const isUser1 = compatibility.user1Id === currentUserId;
    const matchedUser = isUser1 ? compatibility.user2 : compatibility.user1;
    const userTraits = isUser1 ? compatibility.traits2 : compatibility.traits1;

    const result = {
      userId: matchedUser.id,
      username: matchedUser.username,
      birthYear: matchedUser.birthYear,
      age: new Date().getFullYear() - matchedUser.birthYear,
      gender: matchedUser.gender,
      matchingScore: compatibility.matchingScore,
      traits: parseTraits(userTraits),
      compatibility: getCompatibilityLevel(compatibility.matchingScore),
      calculatedAt: compatibility.calculatedAt
    };

    res.json(result);

  } catch (error) {
    console.error('궁합 상세 조회 오류:', error);
    res.status(500).json({ error: '궁합 상세 정보를 불러오는 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
