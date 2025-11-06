require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const methodOverride = require('method-override');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');
const { sequelize } = require('./config/database');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// 모든 모델 import (관계 설정을 위해)
const User = require('./models/User');
const Post = require('./models/Post');
const Comment = require('./models/Comment');
const ChatRoom = require('./models/ChatRoom');
const Message = require('./models/Message');

// 모델 관계 설정
Comment.belongsTo(User, { foreignKey: 'userId', as: 'author' });
Comment.belongsTo(Post, { foreignKey: 'postId' });
User.hasMany(Comment, { foreignKey: 'userId' });
Post.hasMany(Comment, { foreignKey: 'postId', as: 'comments' });

// ChatRoom과 User 관계 설정
ChatRoom.belongsTo(User, { foreignKey: 'user1Id', as: 'user1' });
ChatRoom.belongsTo(User, { foreignKey: 'user2Id', as: 'user2' });
User.hasMany(ChatRoom, { foreignKey: 'user1Id', as: 'initiatedChats' });
User.hasMany(ChatRoom, { foreignKey: 'user2Id', as: 'receivedChats' });

// Message와 ChatRoom 관계 설정
Message.belongsTo(ChatRoom, { foreignKey: 'chatroomId' });
ChatRoom.hasMany(Message, { foreignKey: 'chatroomId' });

// Message와 User 관계 설정
Message.belongsTo(User, { foreignKey: 'userId', as: 'sender' });
User.hasMany(Message, { foreignKey: 'userId' });

// MySQL 연결 테스트
sequelize.authenticate()
  .then(() => {
    console.log('MySQL 연결 성공');
    // 테이블 자동 생성 (개발 환경에서만)
    return sequelize.sync({ force: process.env.NODE_ENV === 'development', alter: false });
  })
  .then(() => console.log('데이터베이스 동기화 완료'))
  .catch(err => console.error('MySQL 연결 실패:', err));

// 미들웨어 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

// 세션 스토어 설정
const USE_SQLITE = process.env.USE_SQLITE === 'true' || process.env.NODE_ENV === 'development';
let sessionStore;

if (!USE_SQLITE) {
  // MySQL 세션 스토어 (프로덕션용)
  sessionStore = new MySQLStore({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
}

// 세션 설정
const sessionConfig = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 // 24시간
  }
};

// MySQL 사용 시에만 store 설정
if (sessionStore) {
  sessionConfig.store = sessionStore;
}

app.use(session(sessionConfig));

// 뷰 엔진 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 라우트 import
const authRoutes = require('./routes/auth');
const mainRoutes = require('./routes/main');
const communityRoutes = require('./routes/community');
const chatRoutes = require('./routes/chat');

// 라우트 사용
app.use('/auth', authRoutes);
app.use('/', mainRoutes);
app.use('/community', communityRoutes);
app.use('/chat', chatRoutes);

// Socket.io 연결 처리

io.on('connection', (socket) => {
  console.log('새로운 사용자 연결:', socket.id);

  // 채팅방 입장
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`사용자 ${socket.id}가 방 ${roomId}에 입장`);
  });

  // 메시지 전송
  socket.on('send-message', async (data) => {
    try {
      const { roomId, content, userId, username } = data;
      
      // 메시지를 DB에 저장
      const newMessage = await Message.create({
        chatroomId: roomId,
        userId: userId,
        content: content
      });

      // 채팅방의 마지막 메시지 업데이트
      await ChatRoom.update({
        lastMessage: content,
        lastMessageTime: new Date()
      }, {
        where: { id: roomId }
      });

      const messageData = {
        userId,
        username,
        content,
        timestamp: new Date()
      };

      // 같은 방의 모든 사용자에게 메시지 전송
      io.to(roomId).emit('receive-message', messageData);
      
      console.log(`메시지 저장됨 - Room: ${roomId}, User: ${userId}`);
    } catch (error) {
      console.error('메시지 저장 오류:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('사용자 연결 해제:', socket.id);
  });
});

// 서버 시작
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`http://localhost:${PORT}`);
});

// Socket.io를 다른 파일에서 사용할 수 있도록 export
module.exports = { io };

