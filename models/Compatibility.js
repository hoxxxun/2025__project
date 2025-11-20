const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const Compatibility = sequelize.define('Compatibility', {
  user1Id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  user2Id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  matchingScore: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    validate: {
      min: 0.00,
      max: 100.00
    },
    comment: '궁합 점수 (0.00 ~ 100.00)'
  },
  traits1: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'user1의 성향 데이터 (JSON 형식)'
  },
  traits2: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'user2의 성향 데이터 (JSON 형식)'
  },
  calculatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: '궁합 계산 시간'
  }
}, {
  tableName: 'compatibilities',
  timestamps: false, // createdAt, updatedAt 사용하지 않음
  indexes: [
    {
      unique: true,
      fields: ['user1Id', 'user2Id']
    },
    {
      fields: ['user2Id', 'user1Id'] // 역방향 조회용 인덱스
    }
  ]
});

// 관계 설정
Compatibility.belongsTo(User, {
  foreignKey: 'user1Id',
  as: 'compatUser1',
  onDelete: 'CASCADE'
});
Compatibility.belongsTo(User, {
  foreignKey: 'user2Id',
  as: 'compatUser2',
  onDelete: 'CASCADE'
});

module.exports = Compatibility;
