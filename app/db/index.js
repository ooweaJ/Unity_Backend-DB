const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'mysql',           // docker-compose 서비스 이름
    user: 'gameuser',        // 일반 계정 추천 (루트는 보안상 피함)
    password: 'gamepass',
    database: 'game_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;

