// 인증 미들웨어
function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  res.redirect('/auth/login');
}

// 비인증 미들웨어 (이미 로그인한 사용자는 메인으로)
function isNotAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    return res.redirect('/');
  }
  next();
}

module.exports = {
  isAuthenticated,
  isNotAuthenticated
};

