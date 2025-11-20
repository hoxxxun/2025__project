const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const ChatRoom = sequelize.define('ChatRoom', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user1Id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  user2Id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  lastMessage: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  lastMessageTime: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'chatrooms',
  timestamps: true
});

// 관계 설정
ChatRoom.belongsTo(User, { foreignKey: 'user1Id', as: 'chatUser1' });
ChatRoom.belongsTo(User, { foreignKey: 'user2Id', as: 'chatUser2' });

module.exports = ChatRoom;

