const db = require('../db');

// 로그인
exports.login = async (username, password) => {
    const [rows] = await db.query(
        'SELECT id FROM users WHERE username = ? AND password = ?',
        [username, password]
    );
    if (rows.length === 0) return null;
    return await exports.fetchFullUserData(rows[0].id);
};

// 유저 전체 데이터 조회
exports.fetchFullUserData = async (userId) => {
    const [userRows] = await db.query(
        'SELECT id, username, level, exp, gold, gem, selected_character_id FROM users WHERE id = ?',
        [userId]
    );
    if (userRows.length === 0) throw new Error('User not found');

    // 보유 캐릭터 + 초월 조각
    const [characters] = await db.query(`
        SELECT uc.character_id, uc.level, uc.exp, uc.enhance,
               COALESCE(ucs.amount, 0) AS shardAmount
        FROM user_characters uc
        LEFT JOIN user_character_shards ucs
               ON uc.user_id = ucs.user_id AND uc.character_id = ucs.character_id
        WHERE uc.user_id = ?`,
        [userId]
    );

    // 장착 장비 (인스턴스 정보 포함)
    const [equipped] = await db.query(`
        SELECT ei.character_id, ei.slot_type, ei.equip_instance_id,
               uie.item_id, uie.enhance AS equip_enhance
        FROM equipped_items ei
        JOIN user_items_equipment uie ON ei.equip_instance_id = uie.id
        WHERE ei.user_id = ?`,
        [userId]
    );

    characters.forEach(c => {
        c.equipped_items = equipped
            .filter(e => e.character_id === c.character_id)
            .map(e => ({
                slot_type: e.slot_type,
                equip_instance_id: e.equip_instance_id,
                item_id: e.item_id,
                enhance: e.equip_enhance
            }));
    });

    // 보유 장비 인스턴스 목록 (장착 중인 것 제외)
    const [equipment] = await db.query(
        `SELECT id AS equip_instance_id, item_id, enhance
         FROM user_items_equipment
         WHERE user_id = ?
           AND id NOT IN (SELECT equip_instance_id FROM equipped_items WHERE user_id = ?)`,
        [userId, userId]
    );

    // 소모품/재료 (스택형)
    const [items] = await db.query(
        'SELECT item_id, amount FROM user_items WHERE user_id = ?',
        [userId]
    );

    return {
        id: userRows[0].id,
        username: userRows[0].username,
        level: userRows[0].level,
        exp: userRows[0].exp,
        gold: userRows[0].gold,
        gem: userRows[0].gem,
        selected_character_id: userRows[0].selected_character_id,
        characters,
        equipment,
        items
    };
};

// 레벨업에 필요한 경험치: level * 100
const expRequired = (level) => level * 100;

// 전투 승리 후 경험치 지급 및 레벨업
exports.addBattleExp = async (userId, gainedExp) => {
    const conn = await db.getConnection();
    await conn.beginTransaction();
    try {
        const [rows] = await conn.query(
            'SELECT level, exp FROM users WHERE id = ? FOR UPDATE',
            [userId]
        );
        if (rows.length === 0) throw new Error('User not found');

        let { level, exp } = rows[0];
        exp += gainedExp;
        let leveledUp = false;

        while (exp >= expRequired(level)) {
            exp -= expRequired(level);
            level += 1;
            leveledUp = true;
        }

        await conn.query(
            'UPDATE users SET level = ?, exp = ? WHERE id = ?',
            [level, exp, userId]
        );

        await conn.commit();
        return { success: true, level, exp, leveledUp };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

// 선택 캐릭터 저장
exports.selectCharacter = async (userId, characterId) => {
    const [rows] = await db.query(
        'SELECT 1 FROM user_characters WHERE user_id = ? AND character_id = ?',
        [userId, characterId]
    );
    if (rows.length === 0) throw new Error('보유하지 않은 캐릭터입니다.');

    await db.query(
        'UPDATE users SET selected_character_id = ? WHERE id = ?',
        [characterId, userId]
    );
    return { success: true, selected_character_id: characterId };
};
