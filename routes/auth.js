const express = require('express');
const router = express.Router();
const User = require('../models/User');

// 회원가입 페이지
router.get('/signup', (req, res) => {
  res.render('auth/signup');
});

// 회원가입 처리
router.post('/signup', async (req, res) => {
  try {
    const { username, password, confirmPassword, email, birthYear, birthMonth, birthDay, gender } = req.body;

    // 입력값 검증
    if (!username || !password || !confirmPassword || !email) {
      return res.status(400).render('auth/signup', { error: '사용자명, 이메일, 비밀번호는 필수입니다.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).render('auth/signup', { error: '비밀번호가 일치하지 않습니다.' });
    }

    if (!gender) {
      return res.status(400).render('auth/signup', { error: '성별을 선택해주세요.' });
    }

    if (!birthYear || !birthMonth || !birthDay) {
      return res.status(400).render('auth/signup', { error: '생년월일을 입력해주세요.' });
    }

    // 중복 확인
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(409).render('auth/signup', { error: '이미 존재하는 사용자명입니다.' });
    }

    // 사용자 생성
    const newUser = await User.create({
      username,
      password,
      email,
      birthYear: parseInt(birthYear),
      birthMonth: parseInt(birthMonth),
      birthDay: parseInt(birthDay),
      gender
    });

    // 회원가입 후 로그인
    req.session.userId = newUser.id;
    req.session.username = newUser.username;

    res.redirect('/');
  } catch (error) {
    console.error('회원가입 오류:', error);
    res.status(500).render('auth/signup', { error: '회원가입 중 오류가 발생했습니다.' });
  }
});

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

    res.redirect('/');
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

