const express = require('express');
const router = express.Router();
const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');
const User = require('../models/User');
const { Op } = require('sequelize');

// 인증 미들웨어
function isAuthenticated(req, res, next) {
  if (req.session.userId) {
    return next();
  }
  res.redirect('/auth/login');
}

// 채팅 목록
router.get('/list', isAuthenticated, async (req, res) => {
  try {
    const currentUser = await User.findByPk(req.session.userId);
    
    // 모든 사용자 조회 (자신 제외)
    const users = await User.findAll({
      where: { id: { [Op.ne]: req.session.userId } },
      attributes: ['id', 'username', 'nickname', 'bio'],
      order: [['createdAt', 'DESC']]
    });

    // 현재 사용자의 채팅방 조회
    const chatRooms = await ChatRoom.findAll({
      where: {
        [Op.or]: [
          { user1Id: req.session.userId },
          { user2Id: req.session.userId }
        ]
      },
      include: [
        { model: User, as: 'user1', attributes: ['id', 'username', 'nickname'] },
        { model: User, as: 'user2', attributes: ['id', 'username', 'nickname'] }
      ],
      order: [['lastMessageTime', 'DESC']]
    });

    res.render('chat/list', {
      user: currentUser,
      users,
      chatRooms
    });
  } catch (error) {
    console.error('채팅 목록 오류:', error);
    res.render('chat/list', {
      user: null,
      users: [],
      chatRooms: [],
      error: '채팅 목록을 불러오는데 실패했습니다.'
    });
  }
});

// 채팅방 생성 또는 기존 방으로 이동
router.post('/start', isAuthenticated, async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const currentUserId = req.session.userId;

    if (currentUserId == targetUserId) {
      return res.redirect('/matching/list');
    }

    // 기존 채팅방 확인
    let chatRoom = await ChatRoom.findOne({
      where: {
        [Op.or]: [
          { user1Id: currentUserId, user2Id: targetUserId },
          { user1Id: targetUserId, user2Id: currentUserId }
        ]
      }
    });

    // 없으면 새로 생성
    if (!chatRoom) {
      chatRoom = await ChatRoom.create({
        user1Id: currentUserId,
        user2Id: targetUserId
      });
    }

    res.redirect(`/chat/${chatRoom.id}`);
  } catch (error) {
    console.error('채팅방 생성 오류:', error);
    res.redirect('/matching/list');
  }
});

// 채팅방 (사용자 ID로 진입)
router.get('/room/:userId', isAuthenticated, async (req, res) => {
  try {
    const currentUserId = req.session.userId;
    const targetUserId = parseInt(req.params.userId);
    const currentUser = await User.findByPk(currentUserId);
    const otherUser = await User.findByPk(targetUserId);

    if (!otherUser) {
      return res.redirect('/chat/list');
    }

    // 기존 채팅방 확인
    let chatRoom = await ChatRoom.findOne({
      where: {
        [Op.or]: [
          { user1Id: currentUserId, user2Id: targetUserId },
          { user1Id: targetUserId, user2Id: currentUserId }
        ]
      }
    });

    // 없으면 새로 생성
    if (!chatRoom) {
      chatRoom = await ChatRoom.create({
        user1Id: currentUserId,
        user2Id: targetUserId
      });
    }

    // 메시지 조회
    const messages = await Message.findAll({
      where: { chatroomId: chatRoom.id },
      include: [{ model: User, as: 'sender', attributes: ['id', 'username', 'nickname'] }],
      order: [['createdAt', 'ASC']]
    });

    res.render('chat/room', {
      user: currentUser,
      otherUser: otherUser,
      roomId: chatRoom.id,
      messages: messages
    });
  } catch (error) {
    console.error('채팅방 오류:', error);
    res.redirect('/chat/list');
  }
});

// 메시지 저장 (API)
router.post('/:roomId/message', isAuthenticated, async (req, res) => {
  try {
    const { message } = req.body;
    const roomId = req.params.roomId;

    const newMessage = await Message.create({
      roomId,
      userId: req.session.userId,
      message
    });

    // 채팅방의 마지막 메시지 업데이트
    await ChatRoom.update({
      lastMessage: message,
      lastMessageTime: new Date()
    }, {
      where: { id: roomId }
    });

    res.json({ success: true, message: newMessage });
  } catch (error) {
    console.error('메시지 저장 오류:', error);
    res.json({ success: false, message: '메시지 전송 실패' });
  }
});

// 채팅방 목록 API (JSON)
router.get('/api/rooms', isAuthenticated, async (req, res) => {
  try {
    const chatRooms = await ChatRoom.findAll({
      where: {
        [Op.or]: [
          { user1Id: req.session.userId },
          { user2Id: req.session.userId }
        ]
      },
      include: [
        { model: User, as: 'user1', attributes: ['id', 'username', 'nickname'] },
        { model: User, as: 'user2', attributes: ['id', 'username', 'nickname'] }
      ],
      order: [['lastMessageTime', 'DESC']]
    });

    const rooms = chatRooms.map(room => {
      const otherUser = room.user1Id === req.session.userId ? room.user2 : room.user1;
      return {
        id: room.id,
        otherUserId: otherUser.id,
        otherUserName: otherUser.nickname || otherUser.username,
        lastMessage: room.lastMessage || '',
        lastMessageTime: room.lastMessageTime
      };
    });

    res.json(rooms);
  } catch (error) {
    console.error('채팅방 목록 API 오류:', error);
    res.json([]);
  }
});

module.exports = router;

