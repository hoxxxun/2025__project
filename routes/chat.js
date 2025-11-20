const express = require('express');
const router = express.Router();
const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');
const User = require('../models/User');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

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
    const rawUsers = await User.findAll({
      where: { id: { [Op.ne]: req.session.userId } },
      attributes: ['id', 'username', 'nickname', 'bio', 'birthYear', 'gender'],
      order: [['createdAt', 'DESC']]
    });

    // 나이 계산 및 데이터 가공
    const currentYear = new Date().getFullYear();
    const users = rawUsers.map(user => {
      const userData = user.toJSON();
      const birthYear = parseInt(userData.birthYear);
      userData.age = isNaN(birthYear) ? null : currentYear - birthYear;
      console.log(`사용자 ${userData.username}: 성별 = "${userData.gender}"`);
      return userData;
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

    res.redirect(`/chat/room/${targetUserId}`);
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
    const isNewRoom = !chatRoom;
    if (!chatRoom) {
      chatRoom = await ChatRoom.create({
        user1Id: currentUserId,
        user2Id: targetUserId
      });
    }

    // 메시지 조회
    const messages = await Message.findAll({
      where: { chatroomId: chatRoom.id },
      include: [{ model: User, as: 'messageSender', attributes: ['id', 'username', 'nickname'] }],
      order: [['createdAt', 'ASC']]
    });

    // 자동 메시지 랜덤 선택 (새 채팅방이고 메시지가 없을 때)
    let randomAutoMessage = null;
    if (isNewRoom && messages.length === 0) {
      const AutoMessage = require('../models/AutoMessage');
      const autoMessages = await AutoMessage.findAll({
        where: { isActive: true },
        order: sequelize.random()
      });
      if (autoMessages.length > 0) {
        randomAutoMessage = autoMessages[0].message;
      }
    }

    res.render('chat/room', {
      user: currentUser,
      otherUser: otherUser,
      roomId: chatRoom.id,
      messages: messages,
      isNewRoom: isNewRoom,
      randomAutoMessage: randomAutoMessage
    });
  } catch (error) {
    console.error('채팅방 오류:', error);
    res.redirect('/chat/list');
  }
});

// 랜덤 자동 메시지 가져오기
router.get('/get-random-auto-message', isAuthenticated, async (req, res) => {
  try {
    const AutoMessage = require('../models/AutoMessage');
    const autoMessages = await AutoMessage.findAll({
      where: { isActive: true },
      order: sequelize.random()
    });

    if (autoMessages.length === 0) {
      return res.status(404).json({
        success: false,
        error: '사용 가능한 자동 메시지가 없습니다.'
      });
    }

    res.json({
      success: true,
      message: autoMessages[0].message
    });

  } catch (error) {
    console.error('자동 메시지 가져오기 오류:', error);
    res.status(500).json({
      success: false,
      error: '자동 메시지를 가져올 수 없습니다.'
    });
  }
});

// 자동 메시지 전송
router.post('/send-auto-message', isAuthenticated, async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const currentUserId = req.session.userId;

    if (!targetUserId || targetUserId == currentUserId) {
      return res.status(400).json({
        success: false,
        error: '유효하지 않은 대상 사용자입니다.'
      });
    }

    // 대상 사용자 확인
    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: '대상 사용자를 찾을 수 없습니다.'
      });
    }

    // 채팅방 확인 또는 생성
    let chatRoom = await ChatRoom.findOne({
      where: {
        [Op.or]: [
          { user1Id: currentUserId, user2Id: targetUserId },
          { user1Id: targetUserId, user2Id: currentUserId }
        ]
      }
    });

    if (!chatRoom) {
      chatRoom = await ChatRoom.create({
        user1Id: currentUserId,
        user2Id: targetUserId
      });
    }

    // 랜덤 자동 메시지 선택
    const AutoMessage = require('../models/AutoMessage');
    const autoMessages = await AutoMessage.findAll({
      where: { isActive: true },
      order: sequelize.random()
    });

    if (autoMessages.length === 0) {
      return res.status(500).json({
        success: false,
        error: '사용 가능한 자동 메시지가 없습니다.'
      });
    }

    const selectedMessage = autoMessages[0].message;

    // 메시지 저장
    await Message.create({
      chatroomId: chatRoom.id,
      userId: currentUserId,
      content: selectedMessage,
      isRead: false
    });

    // 채팅방 마지막 메시지 업데이트
    await chatRoom.update({
      lastMessage: selectedMessage,
      lastMessageTime: new Date()
    });

    res.json({
      success: true,
      message: selectedMessage,
      roomId: chatRoom.id
    });

  } catch (error) {
    console.error('자동 메시지 전송 오류:', error);
    res.status(500).json({
      success: false,
      error: '자동 메시지 전송 중 오류가 발생했습니다.'
    });
  }
});

// 메시지 저장 (API)
router.post('/:roomId/message', isAuthenticated, async (req, res) => {
  try {
    const { message } = req.body;
    const roomId = req.params.roomId;

    const newMessage = await Message.create({
      chatroomId: roomId,
      userId: req.session.userId,
      content: message
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

