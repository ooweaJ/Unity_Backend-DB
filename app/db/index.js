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

const initDatabase = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ DB 연결 성공! 가챠 및 캐릭터 시스템 테이블 생성 중...');

        // 1. 유저 테이블
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                level INT DEFAULT 1,
                gold INT DEFAULT 1000,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. 가챠 확률 테이블
        await connection.query(`
            CREATE TABLE IF NOT EXISTS gacha_probabilities (
                id INT AUTO_INCREMENT PRIMARY KEY,
                rarity VARCHAR(10) NOT NULL,
                percent FLOAT NOT NULL
            )
        `);

        // 3. 게임 전체 캐릭터 도감 테이블
        await connection.query(`
            CREATE TABLE IF NOT EXISTS game_characters (
                id INT PRIMARY KEY,
                name VARCHAR(50) NOT NULL,
                rarity VARCHAR(10) NOT NULL
            )
        `);

        // 4. 유저 보유 캐릭터 테이블 (exp, enhance 추가)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS user_characters (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                character_id INT NOT NULL,
                level INT DEFAULT 1,
                exp INT DEFAULT 0,
                enhance INT DEFAULT 0,
                obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX (user_id)
            )
        `);

        // 5. 캐릭터 조각 테이블
        await connection.query(`
            CREATE TABLE IF NOT EXISTS user_character_shards (
                user_id INT NOT NULL,
                character_id INT NOT NULL,
                amount INT DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, character_id)
            )
        `);

        console.log('✅ 모든 가챠/캐릭터 관련 스키마 준비 완료.');
        connection.release();
    } catch (err) {
        console.error('❌ DB 초기화 실패:', err);
    }
};

initDatabase();

module.exports = pool;

