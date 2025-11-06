const { Sequelize } = require('sequelize');

// 데이터베이스 타입 선택 (개발: sqlite, 프로덕션: mysql)
const USE_SQLITE = process.env.USE_SQLITE === 'true' || process.env.NODE_ENV === 'development';

let sequelize;

if (USE_SQLITE) {
  // SQLite 설정 (개발용)
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: process.env.NODE_ENV === 'development' ? console.log : false
  });
  console.log('🗄️  SQLite 데이터베이스 사용 중');
} else {
  // MySQL 설정 (프로덕션용)
  sequelize = new Sequelize(
    process.env.DB_NAME || 'fortune_for_you',
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      dialect: 'mysql',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  );
  console.log('🗄️  MySQL 데이터베이스 사용 중');
}

module.exports = { sequelize };

