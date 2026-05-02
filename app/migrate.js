const db = require('./db/index');

async function addColumnSafe(conn, table, column, definition) {
    try {
        await conn.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
        console.log(`✅ ${table}.${column} 컬럼 추가 완료`);
    } catch (err) {
        // 에러 코드 1060: Duplicate column name (이미 컬럼이 존재함)
        if (err.errno === 1060) {
            console.log(`ℹ️ ${table}.${column} 컬럼이 이미 존재하여 건너뜁니다.`);
        } else {
            throw err;
        }
    }
}

async function migrate() {
    try {
        const conn = await db.getConnection();
        console.log('🚀 DB 스키마 마이그레이션 시작 (호환 모드)...');

        // 1. game_characters 수정
        await addColumnSafe(conn, 'game_characters', 'base_max_level', 'INT DEFAULT 30');
        await addColumnSafe(conn, 'game_characters', 'base_max_enhance', 'INT DEFAULT 5');
        await addColumnSafe(conn, 'game_characters', 'transcend_material_id', 'INT');
        
        // 2. game_items 수정
        await addColumnSafe(conn, 'game_items', 'slot_type', 'VARCHAR(20)');
        await addColumnSafe(conn, 'game_items', 'effect_value', 'INT DEFAULT 0');
        
        // 3. user_characters 수정
        await addColumnSafe(conn, 'user_characters', 'transcend_stage', 'INT DEFAULT 0 AFTER enhance');

        // 4. users 수정 - 유저 경험치 및 선택 캐릭터
        await addColumnSafe(conn, 'users', 'exp', 'INT DEFAULT 0 AFTER level');
        await addColumnSafe(conn, 'users', 'selected_character_id', 'INT DEFAULT NULL AFTER gem');

        // 5. equipped_items 테이블 생성 (이미 있으면 생성 안함)
        await conn.query(`
            CREATE TABLE IF NOT EXISTS equipped_items (
                user_id      INT NOT NULL,
                character_id INT NOT NULL,
                slot_type    VARCHAR(20) NOT NULL,
                item_id      INT NOT NULL,
                PRIMARY KEY (user_id, character_id, slot_type),
                FOREIGN KEY (user_id, character_id) REFERENCES user_characters(user_id, character_id) ON DELETE CASCADE
            )
        `);

        console.log('✅ 모든 DB 스키마 업데이트 완료!');
        process.exit(0);
    } catch (err) {
        console.error('❌ 마이그레이션 실패:', err);
        process.exit(1);
    }
}

migrate();
