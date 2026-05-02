const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'gameuser',
    password: process.env.DB_PASSWORD || 'gamepass',
    database: process.env.DB_NAME || 'game_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const initDatabase = async () => {
    try {
        const conn = await pool.getConnection();
        console.log('✅ DB 연결 성공! 테이블 생성 중...');

        // ── 유저 ───────────────────────────────────────────
        await conn.query(`
            CREATE TABLE IF NOT EXISTS users (
                id                    INT AUTO_INCREMENT PRIMARY KEY,
                username              VARCHAR(50)  NOT NULL UNIQUE,
                password              VARCHAR(255) NOT NULL,
                level                 INT          DEFAULT 1,
                exp                   INT          DEFAULT 0,
                gold                  INT          DEFAULT 1000,
                gem                   INT          DEFAULT 0,
                selected_character_id INT          DEFAULT NULL,
                created_at            TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // ── 게임 캐릭터 도감 ───────────────────────────────
        await conn.query(`
            CREATE TABLE IF NOT EXISTS game_characters (
                character_id          INT PRIMARY KEY,
                name                  VARCHAR(50) NOT NULL,
                grade                 TINYINT     NOT NULL,  -- 1=노말 2=레어 3=에픽 4=전설
                base_max_level        INT DEFAULT 30,
                transcend_material_id INT                    -- 초월 재료 아이템 ID
            )
        `);

        // ── 게임 아이템 도감 ───────────────────────────────
        // type: 'equipment' | 'exp_potion' | 'transcend_mat'
        // slot_type: 'Weapon' | 'Armor' | 'Accessory' | 'Ring'  (equipment만 사용)
        // effect_value: exp_potion 경험치량
        await conn.query(`
            CREATE TABLE IF NOT EXISTS game_items (
                item_id      INT PRIMARY KEY,
                name         VARCHAR(50) NOT NULL,
                grade        TINYINT     NOT NULL,
                type         VARCHAR(20) NOT NULL,
                slot_type    VARCHAR(20),
                effect_value INT DEFAULT 0
            )
        `);

        // ── 유저 보유 캐릭터 ───────────────────────────────
        // enhance = 초월 단계 (0~5). +2 per stage, max level 40
        await conn.query(`
            CREATE TABLE IF NOT EXISTS user_characters (
                id           INT AUTO_INCREMENT PRIMARY KEY,
                user_id      INT NOT NULL,
                character_id INT NOT NULL,
                level        INT DEFAULT 1,
                exp          INT DEFAULT 0,
                enhance      INT DEFAULT 0,
                obtained_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uq_user_char (user_id, character_id)
            )
        `);

        // ── 유저 보유 장비 인스턴스 ────────────────────────
        // 장비는 강화 수치가 붙는 개별 객체이므로 스택형 user_items와 분리
        await conn.query(`
            CREATE TABLE IF NOT EXISTS user_items_equipment (
                id          INT AUTO_INCREMENT PRIMARY KEY,
                user_id     INT NOT NULL,
                item_id     INT NOT NULL,
                enhance     INT DEFAULT 0,
                obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // ── 유저 장착 장비 ─────────────────────────────────
        // equip_instance_id → user_items_equipment.id 참조
        await conn.query(`
            CREATE TABLE IF NOT EXISTS equipped_items (
                user_id           INT NOT NULL,
                character_id      INT NOT NULL,
                slot_type         VARCHAR(20) NOT NULL,
                equip_instance_id INT NOT NULL,
                PRIMARY KEY (user_id, character_id, slot_type),
                FOREIGN KEY (user_id, character_id) REFERENCES user_characters(user_id, character_id) ON DELETE CASCADE
            )
        `);

        // ── 캐릭터 초월 조각 ───────────────────────────────
        await conn.query(`
            CREATE TABLE IF NOT EXISTS user_character_shards (
                user_id      INT NOT NULL,
                character_id INT NOT NULL,
                amount       INT DEFAULT 0,
                updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, character_id)
            )
        `);

        // ── 유저 보유 소모품/재료 (스택형) ────────────────
        await conn.query(`
            CREATE TABLE IF NOT EXISTS user_items (
                id      INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                item_id INT NOT NULL,
                amount  INT DEFAULT 0,
                UNIQUE KEY uq_user_item (user_id, item_id)
            )
        `);

        // ── 장비 강화 확률 마스터 ──────────────────────────
        await conn.query(`
            CREATE TABLE IF NOT EXISTS equipment_enhance_rates (
                from_enhance TINYINT NOT NULL PRIMARY KEY,
                success_rate FLOAT   NOT NULL,
                gold_cost    INT     NOT NULL
            )
        `);

        // 강화 확률 초기 데이터 (없으면 삽입)
        await conn.query(`
            INSERT IGNORE INTO equipment_enhance_rates (from_enhance, success_rate, gold_cost) VALUES
            (0, 1.00,  500),
            (1, 1.00,  500),
            (2, 0.90, 1000),
            (3, 0.80, 1500),
            (4, 0.70, 2000),
            (5, 0.55, 3000),
            (6, 0.40, 5000),
            (7, 0.25, 8000)
        `);

        // ── 가챠 공용 등급 확률 ────────────────────────────
        await conn.query(`
            CREATE TABLE IF NOT EXISTS base_gacha_rates (
                grade TINYINT NOT NULL PRIMARY KEY,
                rate  FLOAT   NOT NULL
            )
        `);

        // ── 가챠 공용 보상 풀 ──────────────────────────────
        await conn.query(`
            CREATE TABLE IF NOT EXISTS base_reward_pool (
                id        INT AUTO_INCREMENT PRIMARY KEY,
                grade     TINYINT NOT NULL,
                type_id   INT     NOT NULL,  -- 1=캐릭터 2=아이템
                reward_id INT     NOT NULL
            )
        `);

        // ── 배너 ───────────────────────────────────────────
        await conn.query(`
            CREATE TABLE IF NOT EXISTS banners (
                banner_id INT          NOT NULL PRIMARY KEY,
                name      VARCHAR(100) NOT NULL,
                start_at  DATETIME     NOT NULL,
                end_at    DATETIME     NOT NULL
            )
        `);

        // ── 배너별 확률 오버라이드 ─────────────────────────
        await conn.query(`
            CREATE TABLE IF NOT EXISTS banner_tier_override (
                banner_id     INT     NOT NULL,
                grade         TINYINT NOT NULL,
                override_rate FLOAT   NOT NULL,
                PRIMARY KEY (banner_id, grade)
            )
        `);

        // ── 배너 픽업 보상 ─────────────────────────────────
        await conn.query(`
            CREATE TABLE IF NOT EXISTS banner_pickup (
                id        INT AUTO_INCREMENT PRIMARY KEY,
                banner_id INT     NOT NULL,
                grade     TINYINT NOT NULL,
                type_id   INT     NOT NULL,
                reward_id INT     NOT NULL
            )
        `);

        // ── 배너 보상 제외 ─────────────────────────────────
        await conn.query(`
            CREATE TABLE IF NOT EXISTS banner_exclude (
                id        INT AUTO_INCREMENT PRIMARY KEY,
                banner_id INT     NOT NULL,
                grade     TINYINT NOT NULL,
                reward_id INT     NOT NULL
            )
        `);

        console.log('✅ 모든 테이블 생성 완료.');
        conn.release();

    } catch (err) {
        console.error('❌ DB 초기화 실패:', err);
        process.exit(1);
    }
};

initDatabase();

module.exports = pool;
