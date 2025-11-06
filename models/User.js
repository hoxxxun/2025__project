const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  nickname: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  birthYear: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  birthMonth: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  birthDay: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  gender: {
    type: DataTypes.STRING(10),
    allowNull: true,
    validate: {
      isIn: [['M', 'F', 'male', 'female', '남', '여']]
    }
  },
  traits: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'JSON 형식의 성향 데이터 (예: ["강함", "용감", "충동", "변화"])'
  }
}, {
  tableName: 'users',
  timestamps: true
});

// 비밀번호 해싱 (저장 전)
User.beforeCreate(async (user) => {
  if (user.password) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
  }
});

User.beforeUpdate(async (user) => {
  if (user.changed('password')) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
  }
});

// 비밀번호 확인 메서드
User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = User;
