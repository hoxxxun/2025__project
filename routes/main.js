const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const User = require('../models/User');

// 메인 페이지 (로그인 여부 상관없음)
router.get('/', async (req, res) => {
  try {
    let user = null;

    // 로그인했으면 사용자 정보 조회
    if (req.session.userId) {
      user = await User.findByPk(req.session.userId);
    }

    res.render('main/index', {
      user: user,
      title: 'Fortune For You - 홈'
    });
  } catch (error) {
    console.error('메인 페이지 오류:', error);
    res.status(500).render('main/index', {
      error: '페이지를 불러오는 중 오류가 발생했습니다.'
    });
  }
});

// 개인 성향 분석 페이지
router.get('/analysis', async (req, res) => {
  try {
    let user = null;
    if (req.session.userId) {
      user = await User.findByPk(req.session.userId);
    }

    res.render('main/analysis', {
      user: user,
      title: '개인 성향 분석'
    });
  } catch (error) {
    console.error('개인 성향 분석 페이지 오류:', error);
    res.status(500).send('페이지를 불러오는 중 오류가 발생했습니다.');
  }
});

// 개인 성향 분석 API
router.post('/analysis', async (req, res) => {
  try {
    const { gender, year, month, day } = req.body;

    // 입력값 검증
    if (!gender || !year || !month || !day) {
      return res.status(400).json({
        success: false,
        message: '모든 필드를 입력해주세요.'
      });
    }

    // 입력값 범위 검증
    const parsedYear = parseInt(year);
    const parsedMonth = parseInt(month);
    const parsedDay = parseInt(day);

    if (parsedYear < 1900 || parsedYear > 2099) {
      return res.status(400).json({
        success: false,
        message: '올바른 연도를 입력해주세요. (1900~2099)'
      });
    }

    if (parsedMonth < 1 || parsedMonth > 12) {
      return res.status(400).json({
        success: false,
        message: '올바른 월을 입력해주세요. (1~12)'
      });
    }

    if (parsedDay < 1 || parsedDay > 31) {
      return res.status(400).json({
        success: false,
        message: '올바른 일을 입력해주세요. (1~31)'
      });
    }

    console.log('AWS API 요청 시작:', { gender, year: parsedYear, month: parsedMonth, day: parsedDay });

    // AWS 서버에 요청 (타임아웃 설정: 10초)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let response;
    try {
      response = await fetch('http://54.180.2.201/traits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          p: { 
            gender: gender === 'M' || gender === '남' ? '남' : '여', 
            year: parsedYear, 
            month: parsedMonth, 
            day: parsedDay 
          },
          useLunar: false,
          debug: false
        }),
        signal: controller.signal,
        timeout: 10000
      });
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('AWS 서버 응답 시간 초과 (10초). 나중에 다시 시도해주세요.');
      }
      throw fetchError;
    }

    if (!response.ok) {
      throw new Error(`AWS API 오류: HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('AWS API 응답 수신:', data);

    // 더미 데이터 (AWS API가 응답하지 않을 경우)
    const dummyTraits = ['진취적', '낙천적', '성실함', '활동적', '창의적', '친화력'];

    // AWS API 응답 형식 처리
    let traits = dummyTraits;
    console.log('=== AWS 응답 분석 시작 ===');
    console.log('data.traits:', data.traits);
    console.log('data.traits.strings:', data.traits?.strings);
    
    if (data.traits && data.traits.strings) {
      if (Array.isArray(data.traits.strings)) {
        // strings가 배열인 경우
        const stringsArray = data.traits.strings;
        console.log('strings는 배열:', stringsArray);
        console.log('배열 길이:', stringsArray.length);
        console.log('첫 번째 요소:', stringsArray[0]);
        console.log('첫 번째 요소 타입:', typeof stringsArray[0]);
        
        // 배열의 첫 번째 요소가 공백으로 구분된 문자열인지 확인
        if (stringsArray.length === 1 && typeof stringsArray[0] === 'string' && stringsArray[0].includes(' ')) {
          console.log('공백으로 구분된 문자열 발견, 분할 중...');
          // 공백으로 구분된 문자열을 배열로 변환
          traits = stringsArray[0].split(' ').filter(t => t.length > 0);
          console.log('분할 결과:', traits);
        } else {
          console.log('이미 분리된 배열 또는 다른 형식');
          traits = stringsArray;
        }
      } else if (typeof data.traits.strings === 'string') {
        console.log('strings는 문자열');
        // strings가 문자열인 경우 공백으로 분할
        traits = data.traits.strings.split(' ').filter(t => t.length > 0);
      }
    }

    console.log('=== 최종 성향 데이터 ===');
    console.log('최종 traits:', traits);
    console.log('타입:', typeof traits);
    console.log('배열 여부:', Array.isArray(traits));
    console.log('길이:', traits?.length);

    // 로그인한 사용자면 DB에 저장
    if (req.session.userId) {
      try {
        await User.update(
          { traits: JSON.stringify(traits) },
          { where: { id: req.session.userId } }
        );
        console.log('✓ 사용자 성향 데이터 저장 완료:', req.session.userId);
      } catch (dbError) {
        console.error('성향 데이터 저장 오류:', dbError);
        // 저장 실패해도 결과는 반환
      }
    }

    res.json({
      success: true,
      traits: traits,
      message: '성향 분석이 완료되었습니다.'
    });
  } catch (error) {
    console.error('성향 분석 오류:', error);
    
    // AWS 서버 연결 실패 시 더미 데이터 반환
    if (error.message.includes('AWS') || error.message.includes('타임아웃') || error.message.includes('ECONNREFUSED')) {
      console.warn('AWS 서버 연결 실패, 더미 데이터로 응답');
      return res.json({
        success: true,
        traits: ['진취적', '낙천적', '성실함', '활동적', '창의적', '친화력'],
        message: '성향 분석이 완료되었습니다. (기본 성향 데이터)'
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || '분석 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : '서버 오류'
    });
  }
});

module.exports = router;

