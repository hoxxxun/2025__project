const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const ChatRoom = require('./ChatRoom');

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  chatroomId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'chatrooms',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'messages',
  timestamps: true
});

// 관계 설정
Message.belongsTo(User, { foreignKey: 'userId', as: 'messageSender' });
Message.belongsTo(ChatRoom, { foreignKey: 'chatroomId', as: 'messageChatroom' });

module.exports = Message;

