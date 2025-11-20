const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AutoMessage = sequelize.define('AutoMessage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'auto_messages',
  timestamps: true
});

module.exports = AutoMessage;
