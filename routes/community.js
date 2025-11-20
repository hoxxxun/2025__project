const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');
const Comment = require('../models/Comment');

// 인증 미들웨어
function isAuthenticated(req, res, next) {
  if (req.session.userId) {
    return next();
  }
  res.redirect('/auth/login');
}

// 커뮤니티 목록
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findByPk(req.session.userId);
    
    const posts = await Post.findAll({
      include: [{
        model: User,
        as: 'author',
        attributes: ['username', 'nickname']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.render('community/list', { 
      posts,
      user
    });
  } catch (error) {
    console.error('커뮤니티 목록 오류:', error);
    res.render('community/list', { 
      posts: [],
      user: null
    });
  }
});

// 게시글 작성 페이지
router.get('/write', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findByPk(req.session.userId);
    res.render('community/write', { 
      error: null,
      user
    });
  } catch (error) {
    console.error('게시글 작성 페이지 오류:', error);
    res.redirect('/community');
  }
});

// 게시글 작성 처리
router.post('/write', isAuthenticated, async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      const user = await User.findByPk(req.session.userId);
      return res.render('community/write', { 
        error: '제목과 내용을 입력해주세요.',
        user
      });
    }

    await Post.create({
      title,
      content,
      userId: req.session.userId
    });

    res.redirect('/community');
  } catch (error) {
    console.error('게시글 작성 오류:', error);
    const user = await User.findByPk(req.session.userId);
    res.render('community/write', { 
      error: '게시글 작성 중 오류가 발생했습니다.',
      user
    });
  }
});

// 게시글 상세보기
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'nickname']
        },
        {
          model: Comment,
          as: 'comments',
          include: [{
            model: User,
            as: 'commentAuthor',
            attributes: ['id', 'username', 'nickname']
          }],
          order: [['createdAt', 'DESC']]
        }
      ]
    });

    if (!post) {
      return res.redirect('/community');
    }

    // 조회수 증가
    await post.increment('views');

    const user = await User.findByPk(req.session.userId);
    res.render('community/detail', { 
      post,
      currentUserId: req.session.userId,
      user
    });
  } catch (error) {
    console.error('게시글 상세보기 오류:', error);
    res.redirect('/community');
  }
});

// 댓글 작성
router.post('/:id/comment', isAuthenticated, async (req, res) => {
  try {
    const { content } = req.body;
    const postId = req.params.id;

    if (!content || content.trim() === '') {
      return res.redirect(`/community/${postId}`);
    }

    const post = await Post.findByPk(postId);
    if (!post) {
      return res.redirect('/community');
    }

    await Comment.create({
      postId,
      userId: req.session.userId,
      content
    });

    res.redirect(`/community/${postId}`);
  } catch (error) {
    console.error('댓글 작성 오류:', error);
    res.redirect(`/community/${req.params.id}`);
  }
});

// 댓글 삭제
router.post('/:postId/comment/:commentId/delete', isAuthenticated, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const comment = await Comment.findByPk(commentId);

    if (!comment || comment.userId !== req.session.userId) {
      return res.redirect(`/community/${postId}`);
    }

    await comment.destroy();
    res.redirect(`/community/${postId}`);
  } catch (error) {
    console.error('댓글 삭제 오류:', error);
    res.redirect(`/community/${req.params.postId}`);
  }
});

// 게시글 수정 페이지
router.get('/:id/edit', isAuthenticated, async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id);

    if (!post) {
      return res.redirect('/community');
    }

    if (post.userId !== req.session.userId) {
      return res.redirect('/community');
    }

    const user = await User.findByPk(req.session.userId);
    res.render('community/edit', { 
      post, 
      error: null,
      user
    });
  } catch (error) {
    console.error('게시글 수정 페이지 오류:', error);
    res.redirect('/community');
  }
});

// 게시글 수정 처리
router.post('/:id/edit', isAuthenticated, async (req, res) => {
  try {
    const { title, content } = req.body;
    const post = await Post.findByPk(req.params.id);

    if (!post || post.userId !== req.session.userId) {
      return res.redirect('/community');
    }

    await post.update({ title, content });
    res.redirect(`/community/${post.id}`);
  } catch (error) {
    console.error('게시글 수정 오류:', error);
    res.redirect('/community');
  }
});

// 게시글 삭제
router.post('/:id/delete', isAuthenticated, async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id);

    if (!post || post.userId !== req.session.userId) {
      return res.redirect('/community');
    }

    await post.destroy();
    res.redirect('/community');
  } catch (error) {
    console.error('게시글 삭제 오류:', error);
    res.redirect('/community');
  }
});

module.exports = router;

