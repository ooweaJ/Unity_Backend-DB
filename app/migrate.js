const db = require('./db/index');

async function addColumnSafe(conn, table, column, definition) {
    try {
        await conn.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
        console.log(`✅ ${table}.${column} 컬럼 추가 완료`);
    } catch (err) {
        if (err.errno === 1060) {
            console.log(`ℹ️  ${table}.${column} 이미 존재 — 건너뜀`);
        } else {
            throw err;
        }
    }
}

async function dropColumnSafe(conn, table, column) {
    try {
        await conn.query(`ALTER TABLE ${table} DROP COLUMN ${column}`);
        console.log(`✅ ${table}.${column} 컬럼 제거 완료`);
    } catch (err) {
        if (err.errno === 1091) {
            console.log(`ℹ️  ${table}.${column} 없음 — 건너뜀`);
        } else {
            throw err;
        }
    }
}

async function renameColumnSafe(conn, table, oldCol, newCol, definition) {
    try {
        await conn.query(`ALTER TABLE ${table} CHANGE ${oldCol} ${newCol} ${definition}`);
        console.log(`✅ ${table}.${oldCol} → ${newCol} 변경 완료`);
    } catch (err) {
        // 1054: Unknown column (이미 바뀐 경우)
        if (err.errno === 1054) {
            console.log(`ℹ️  ${table}.${oldCol} 없음 — 건너뜀`);
        } else {
            throw err;
        }
    }
}

async function migrate() {
    try {
        const conn = await db.getConnection();
        console.log('🚀 DB 스키마 마이그레이션 시작...');

        // ── 1. users 컬럼 추가 ────────────────────────────
        await addColumnSafe(conn, 'users', 'exp', 'INT DEFAULT 0 AFTER level');
        await addColumnSafe(conn, 'users', 'selected_character_id', 'INT DEFAULT NULL AFTER gem');

        // ── 2. game_characters 정리 ───────────────────────
        await addColumnSafe(conn, 'game_characters', 'base_max_level', 'INT DEFAULT 30');
        await addColumnSafe(conn, 'game_characters', 'transcend_material_id', 'INT');
        // base_max_enhance는 더 이상 사용하지 않으나 데이터 보존을 위해 유지

        // ── 3. game_items 정리 ────────────────────────────
        await addColumnSafe(conn, 'game_items', 'slot_type', 'VARCHAR(20)');
        await addColumnSafe(conn, 'game_items', 'effect_value', 'INT DEFAULT 0');

        // ── 4. user_characters: transcend_stage 제거 ─────
        // enhance 컬럼이 초월 단계를 담당하므로 transcend_stage는 중복
        await dropColumnSafe(conn, 'user_characters', 'transcend_stage');

        // ── 5. user_items_equipment 테이블 생성 ──────────
        await conn.query(`
            CREATE TABLE IF NOT EXISTS user_items_equipment (
                id          INT AUTO_INCREMENT PRIMARY KEY,
                user_id     INT NOT NULL,
                item_id     INT NOT NULL,
                enhance     INT DEFAULT 0,
                obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ user_items_equipment 테이블 준비 완료');

        // ── 6. equipped_items: item_id → equip_instance_id
        await renameColumnSafe(conn, 'equipped_items', 'item_id', 'equip_instance_id', 'INT NOT NULL');

        // ── 7. equipment_enhance_rates 테이블 생성 및 시딩
        await conn.query(`
            CREATE TABLE IF NOT EXISTS equipment_enhance_rates (
                from_enhance TINYINT NOT NULL PRIMARY KEY,
                success_rate FLOAT   NOT NULL,
                gold_cost    INT     NOT NULL
            )
        `);
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
        console.log('✅ equipment_enhance_rates 준비 완료');

        console.log('✅ 모든 DB 스키마 업데이트 완료!');
        process.exit(0);
    } catch (err) {
        console.error('❌ 마이그레이션 실패:', err);
        process.exit(1);
    }
}

migrate();
