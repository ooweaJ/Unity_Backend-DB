const db = require('./db/index');

async function migrate() {
    try {
        const conn = await db.getConnection();
        console.log('🚀 DB 스키마 마이그레이션 시작...');

        // 1. game_characters 수정
        await conn.query(`ALTER TABLE game_characters 
            ADD COLUMN IF NOT EXISTS base_max_level INT DEFAULT 30,
            ADD COLUMN IF NOT EXISTS base_max_enhance INT DEFAULT 5,
            ADD COLUMN IF NOT EXISTS transcend_material_id INT`);
        
        // 2. game_items 수정
        // MySQL 8.0.19+ supports IF NOT EXISTS for columns, but for older versions we might need a workaround.
        // Let's use a safe approach or assume it might fail if exists.
        try {
            await conn.query(`ALTER TABLE game_items ADD COLUMN slot_type VARCHAR(20)`);
        } catch(e) { /* 이미 있으면 무시 */ }
        try {
            await conn.query(`ALTER TABLE game_items ADD COLUMN effect_value INT DEFAULT 0`);
        } catch(e) { /* 이미 있으면 무시 */ }
        
        // 3. user_characters 수정
        try {
            await conn.query(`ALTER TABLE user_characters ADD COLUMN transcend_stage INT DEFAULT 0 AFTER enhance`);
        } catch(e) { /* 이미 있으면 무시 */ }

        // 4. equipped_items는 새로 만든 거라 initDatabase에서 이미 처리되었을 것 (혹시 모르니 다시 확인)
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

        console.log('✅ DB 스키마 업데이트 완료!');
        process.exit(0);
    } catch (err) {
        console.error('❌ 마이그레이션 실패:', err);
        process.exit(1);
    }
}

migrate();
